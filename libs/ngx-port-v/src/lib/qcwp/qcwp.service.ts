import { Injectable } from '@angular/core';
import { Crane } from './qcwp.model';
import { HandlingTask } from '../model/vessel';
export interface Container {
  ctnno: string;
  block: string;
  seq: number;
  bay: string;
  dh: string;
  type: 'load' | 'unload';
  qcCode?: string;
  conflict?: boolean;
  estimatedTime?: number; // 预计作业时间点（分钟）
}

@Injectable({
  providedIn: 'root'
})
export class QcwpService {
  // 计算任务完成时间（分钟）
  private calculateTaskTime(task: HandlingTask, unitTime: number): number {
    return task.amount * unitTime;
  }

  // 计算岸桥移动时间（分钟）
  private calculateMoveTime(fromBay: number, toBay: number, moveTimePerBay = 0.5): number {
    const distance = Math.abs(fromBay - toBay);
    return distance * moveTimePerBay;
  }

  // 计算岸桥完成所有任务的时间
  private calculateCraneCompletionTime(tasks: HandlingTask[], unitTime: number, initialBay?: number): number {
    if (tasks.length === 0) return 0;
    
    let time = 0;
    let currentBay = initialBay !== undefined ? initialBay : +tasks[0].bay;
    
    tasks.forEach(task => {
      // 添加移动时间
      time += this.calculateMoveTime(currentBay, +task.bay);
      // 添加作业时间
      time += this.calculateTaskTime(task, unitTime);
      // 更新当前位置
      currentBay = +task.bay;
    });
    
    return time;
  }

  // 对任务按贝位号排序
  private sortTasksByBay(tasks: HandlingTask[]): HandlingTask[] {
    return [...tasks].sort((a, b) => +a.bay - +b.bay);
  }

  // 对任务按作业规则排序（同贝位内）
  sortTasksByOperationRules(tasks: HandlingTask[]): HandlingTask[] {
    tasks.sort((a, b) => {
        // 1. 首先按贝位号排序（降序）
        if (+a.bay !== +b.bay) {
        return 0;
        // return +b.bay - +a.bay;
        }
        
        // 2. 同贝位，先卸后装
        if (a.type !== b.type) {
        return a.type === 'unload' ? -1 : 1;
        }
        
        // 3. 根据作业类型决定DH顺序
        if (a.dh !== b.dh) {
        if (a.type === 'unload') {
            // 卸船时先D后H
            return a.dh === 'D' ? -1 : 1;
        } else {
            // 装船时先H后D
            return a.dh === 'H' ? -1 : 1;
        }
        }
        
        return 0;
    });
    
    return tasks;
  }

  /**
   * 自动分配岸桥任务
   * @param tasks 所有待分配的任务
   * @param cranes 可用的岸桥
   * @param config 配置参数
   * @returns 分配结果和完成时间
   */
  autoAssignTasks(tasks: HandlingTask[], cranes: Crane[], config: { unitTime: number }): {
    assignedTasks: { [key: string]: HandlingTask[] };
    completionTime: number;
  } {
    console.log('开始自动分配任务...');
    console.log(`总任务数: ${tasks.length}, 岸桥数: ${cranes.length}`);
    
    if (cranes.length === 0 || tasks.length === 0) {
      return { assignedTasks: {}, completionTime: 0 };
    }

    // 按贝位号排序任务
    const sortedTasks = this.sortTasksByBay(tasks);
    
    // 计算贝位范围
    const minBay = Math.min(...sortedTasks.map(t => +t.bay));
    const maxBay = Math.max(...sortedTasks.map(t => +t.bay));
    console.log(`贝位范围: ${minBay} - ${maxBay}`);
    
    // 初始化结果
    const assignedTasks: { [key: string]: HandlingTask[] } = {};
    cranes.forEach(crane => {
      assignedTasks[crane.id] = [];
    });
    
    // 按贝位分组
    const tasksByBay: { [bay: string]: HandlingTask[] } = {};
    sortedTasks.forEach(task => {
      if (!tasksByBay[task.bay]) {
        tasksByBay[task.bay] = [];
      }
      tasksByBay[task.bay].push(task);
    });
    
    // 对每个贝位内的任务按作业规则排序
    Object.keys(tasksByBay).forEach(bay => {
        
      tasksByBay[bay] = this.sortTasksByOperationRules(tasksByBay[bay]);
    });
    
    // 方法1: 贝位区域划分策略
    this.assignTasksByBaySection(tasksByBay, cranes, assignedTasks);
    
    // 方法2: 负载均衡优化
    this.balanceWorkload(assignedTasks, cranes, config.unitTime);
    
    // 最终排序和编号
    Object.keys(assignedTasks).forEach(craneId => {
      // 按贝位排序
      assignedTasks[craneId] = this.sortTasksByOperationRules(assignedTasks[craneId]);
      
      // 更新任务序号和岸桥编号
      assignedTasks[craneId].forEach((task, index) => {
        task.assignedQcCode = craneId;
        task.sequence = index + 1;
      });
    });
    
    // 计算总完成时间
    let maxCompletionTime = 0;
    const craneCompletionTimes: { [key: string]: number } = {};
    
    Object.entries(assignedTasks).forEach(([craneId, tasks]) => {
      const time = this.calculateCraneCompletionTime(tasks, config.unitTime);
      craneCompletionTimes[craneId] = time;
      maxCompletionTime = Math.max(maxCompletionTime, time);
    });
    
    // 输出最终分配结果
    console.log('最终分配结果:');
    Object.entries(assignedTasks).forEach(([craneId, tasks]) => {
      console.log(`岸桥 ${craneId}: ${tasks.length} 个任务, 完成时间: ${craneCompletionTimes[craneId].toFixed(1)} 分钟`);
      if (tasks.length > 0) {
        console.log(`  贝位范围: ${Math.min(...tasks.map(t => +t.bay))} - ${Math.max(...tasks.map(t => +t.bay))}`);
      }
    });
    console.log(`总完成时间: ${maxCompletionTime.toFixed(1)} 分钟`);
    
    return {
      assignedTasks,
      completionTime: maxCompletionTime
    };
  }
  
  /**
   * 按贝位区域划分策略分配任务
   */
  private assignTasksByBaySection(
    tasksByBay: { [bay: string]: HandlingTask[] }, 
    cranes: Crane[], 
    assignedTasks: { [key: string]: HandlingTask[] }
  ): void {
    // 获取所有贝位并排序
    const bays = Object.keys(tasksByBay).map(Number).sort((a, b) => a - b);
    
    if (bays.length === 0) return;
    
    const minBay = bays[0];
    const maxBay = bays[bays.length - 1];
    const bayRange = maxBay - minBay + 1;
    
    // 计算每个岸桥的贝位区域
    const sectionSize = bayRange / cranes.length;
    
    console.log(`按贝位区域划分: 贝位范围 ${minBay}-${maxBay}, 每个岸桥负责约 ${sectionSize.toFixed(1)} 个贝位`);
    
    // 为每个岸桥分配工作区域
    const craneSections = cranes.map((crane, index) => {
      const startBay = minBay + Math.floor(index * sectionSize);
      const endBay = index === cranes.length - 1 
        ? maxBay 
        : minBay + Math.floor((index + 1) * sectionSize) - 1;
      
      console.log(`岸桥 ${crane.id} 负责贝位区域: ${startBay}-${endBay}`);
      
      return { 
        craneId: crane.id, 
        startBay, 
        endBay 
      };
    });
    
    // 分配任务
    bays.forEach(bay => {
      // 确保 tasksByBay[bay] 存在且是数组
      const tasks = tasksByBay[bay.toString().padStart(2, '0')];
      if (!tasks || !Array.isArray(tasks)) {
        console.log(`警告: 贝位 ${bay} 没有有效的任务数组`);
        return;
      }
      
      const section = craneSections.find(s => bay >= s.startBay && bay <= s.endBay);
      
      if (section) {
        assignedTasks[section.craneId].push(...tasks);
        console.log(`贝位 ${bay} 的 ${tasks.length} 个任务分配给岸桥 ${section.craneId}`);
      } else {
        // 找不到对应区域，分配给最近的岸桥
        let nearestCraneId = cranes[0].id;
        let minDistance = Infinity;
        
        craneSections.forEach(section => {
          const distance = Math.min(
            Math.abs(bay - section.startBay),
            Math.abs(bay - section.endBay)
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            nearestCraneId = section.craneId;
          }
        });
        
        assignedTasks[nearestCraneId].push(...tasks);
        console.log(`贝位 ${bay} 的 ${tasks.length} 个任务分配给最近的岸桥 ${nearestCraneId}`);
      }
    });
  }
  
  /**
   * 负载均衡优化
   * 尝试将任务从负载重的岸桥转移到负载轻的岸桥
   */
  private balanceWorkload(
    assignedTasks: { [key: string]: HandlingTask[] }, 
    cranes: Crane[], 
    unitTime: number
  ): void {
    console.log('开始负载均衡优化...');
    
    // 计算每个岸桥的当前负载
    const craneWorkloads: { [key: string]: number } = {};
    cranes.forEach(crane => {
      craneWorkloads[crane.id] = this.calculateCraneCompletionTime(assignedTasks[crane.id], unitTime);
    });
    
    // 输出初始负载情况
    console.log('初始负载情况:');
    Object.entries(craneWorkloads).forEach(([craneId, workload]) => {
      console.log(`岸桥 ${craneId}: ${workload.toFixed(1)} 分钟`);
    });
    
    // 获取最大和最小负载的岸桥
    let iterations = 0;
    const maxIterations = 10; // 防止无限循环
    let improved = true;
    
    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;
      
      // 按负载从高到低排序岸桥
      const sortedCranes = [...cranes].sort((a, b) => 
        craneWorkloads[b.id] - craneWorkloads[a.id]
      );
      
      const highestCrane = sortedCranes[0];
      const lowestCrane = sortedCranes[sortedCranes.length - 1];
      
      // 如果负载差异不大，则不需要继续优化
      if (craneWorkloads[highestCrane.id] - craneWorkloads[lowestCrane.id] < 5) {
        console.log(`负载差异小于5分钟，停止优化`);
        break;
      }
      
      console.log(`迭代 ${iterations}: 尝试从岸桥 ${highestCrane.id} (${craneWorkloads[highestCrane.id].toFixed(1)}分钟) 转移任务到岸桥 ${lowestCrane.id} (${craneWorkloads[lowestCrane.id].toFixed(1)}分钟)`);
      
      // 获取负载最高岸桥的任务，按贝位排序并遵循作业规则
      const highestCraneTasks = this.sortTasksByOperationRules([...assignedTasks[highestCrane.id]])
      
      // 尝试转移边缘贝位的任务
      let transferred = false;
      
      // 尝试转移最右侧的任务
      for (let i = highestCraneTasks.length - 1; i >= 0; i--) {
        const task = highestCraneTasks[i];
        const bay = +task.bay;
        
        // 检查转移后是否会导致交叉作业
        const wouldCauseCrossing = this.checkTaskTransferCrossing(
          bay, 
          assignedTasks, 
          highestCrane.id, 
          lowestCrane.id
        );
        
        if (wouldCauseCrossing) {
            console.log("产生交叉作业，跳过")
          continue;
        }
        
        // 计算转移后的负载变化
        const highestCraneNewTasks = assignedTasks[highestCrane.id].filter(t => t !== task);
        const lowestCraneNewTasks = [...assignedTasks[lowestCrane.id], task];
        
        const newHighestWorkload = this.calculateCraneCompletionTime(highestCraneNewTasks, unitTime);
        const newLowestWorkload = this.calculateCraneCompletionTime(lowestCraneNewTasks, unitTime);
        
        // 如果转移后可以减少最大完成时间，则执行转移
        if (Math.max(newHighestWorkload, newLowestWorkload) < craneWorkloads[highestCrane.id]) {
          console.log(`转移贝位 ${bay} 的任务从岸桥 ${highestCrane.id} 到岸桥 ${lowestCrane.id}`);
          
          // 执行转移
          assignedTasks[highestCrane.id] = highestCraneNewTasks;
          assignedTasks[lowestCrane.id] = lowestCraneNewTasks;
          
          // 更新负载
          craneWorkloads[highestCrane.id] = newHighestWorkload;
          craneWorkloads[lowestCrane.id] = newLowestWorkload;
          
          transferred = true;
          improved = true;
          break;
        }
      }
      
      // 如果右侧没有可转移的任务，尝试转移左侧任务
      if (!transferred) {
        for (let i = 0; i < highestCraneTasks.length; i++) {
          const task = highestCraneTasks[i];
          const bay = +task.bay;
          
          // 检查转移后是否会导致交叉作业
          const wouldCauseCrossing = this.checkTaskTransferCrossing(
            bay, 
            assignedTasks, 
            highestCrane.id, 
            lowestCrane.id
          );
          
          if (wouldCauseCrossing) {
            console.log("尝试转移左侧任务，产生交叉作业，跳过")
            continue;
          }
          
          // 计算转移后的负载变化
          const highestCraneNewTasks = assignedTasks[highestCrane.id].filter(t => t !== task);
          const lowestCraneNewTasks = [...assignedTasks[lowestCrane.id], task];
          
          const newHighestWorkload = this.calculateCraneCompletionTime(highestCraneNewTasks, unitTime);
          const newLowestWorkload = this.calculateCraneCompletionTime(lowestCraneNewTasks, unitTime);
          
          // 如果转移后可以减少最大完成时间，则执行转移
          if (Math.max(newHighestWorkload, newLowestWorkload) < craneWorkloads[highestCrane.id]) {
            console.log(`转移贝位 ${bay} 的任务从岸桥 ${highestCrane.id} 到岸桥 ${lowestCrane.id}`);
            
            // 执行转移
            assignedTasks[highestCrane.id] = highestCraneNewTasks;
            assignedTasks[lowestCrane.id] = lowestCraneNewTasks;
            
            // 更新负载
            craneWorkloads[highestCrane.id] = newHighestWorkload;
            craneWorkloads[lowestCrane.id] = newLowestWorkload;
            
            improved = true;
            break;
          }
        }
      }
    }
    
    // 输出最终负载情况
    console.log('优化后负载情况:');
    Object.entries(craneWorkloads).forEach(([craneId, workload]) => {
      console.log(`岸桥 ${craneId}: ${workload.toFixed(1)} 分钟`);
    });
  }
  
  /**
   * 检查任务转移是否会导致交叉作业
   */
  private checkTaskTransferCrossing(
    bay: number,
    assignedTasks: { [key: string]: HandlingTask[] },
    fromCraneId: string,
    toCraneId: string
  ): boolean {
    // 获取所有岸桥的贝位范围
    const craneBayRanges: { [key: string]: { min: number, max: number } } = {};
    
    Object.entries(assignedTasks).forEach(([craneId, tasks]) => {
      if (tasks.length === 0) {
        craneBayRanges[craneId] = { min: Infinity, max: -Infinity };
        return;
      }
      
      const bays = tasks.map(t => +t.bay);
      craneBayRanges[craneId] = {
        min: Math.min(...bays),
        max: Math.max(...bays)
      };
    });
    
    // 模拟转移后的贝位范围
    const fromCraneTasks = assignedTasks[fromCraneId].filter(t => +t.bay !== bay);
    const toCraneTasks = [...assignedTasks[toCraneId], { bay: bay.toString() } as HandlingTask];
    
    const newFromRange = fromCraneTasks.length === 0 
      ? { min: Infinity, max: -Infinity }
      : {
          min: Math.min(...fromCraneTasks.map(t => +t.bay)),
          max: Math.max(...fromCraneTasks.map(t => +t.bay))
        };
    
    const newToRange = {
      min: Math.min(...toCraneTasks.map(t => +t.bay)),
      max: Math.max(...toCraneTasks.map(t => +t.bay))
    };
    
    // 检查是否有交叉
    for (const [craneId, range] of Object.entries(craneBayRanges)) {
      if (craneId === fromCraneId || craneId === toCraneId) continue;
      
      // 检查与fromCrane的交叉
      if (
        (newFromRange.min < range.max && newFromRange.max > range.min) &&
        !(newFromRange.min === Infinity && newFromRange.max === -Infinity)
      ) {
        return true;
      }
      
      // 检查与toCrane的交叉
      if (newToRange.min < range.max && newToRange.max > range.min) {
        return true;
      }
    }
    
    // 检查fromCrane和toCrane之间是否有交叉
    if (
      newFromRange.min < newToRange.max && 
      newFromRange.max > newToRange.min &&
      !(newFromRange.min === Infinity && newFromRange.max === -Infinity)
    ) {
      return true;
    }
    
    return false;
  }


  // 岸桥分路计划已指定完成，知道每个岸桥作业哪些贝位以及具体的作业顺序，
// 现在给定n个集装箱个集装箱已经它所属的装卸任务块，以及作业顺序；
// 判断按照这个顺序执行，是否会发生作业冲突，
// 作业冲突定义，以1个小时为周期，计算1小时能不同的岸桥是否从同一个箱区取箱，
// 将发生冲突的箱子打上冲突标记 conflict = true
// 示例集装箱数据
// [
// {ctnno: "TESU11111111", block: "Q2A", "qcCode": "QC01", "seq": 1},
// [{ctnno: "TESU11111111", block: "Q2A", "qcCode": "QC01", "seq": 2},
// {ctnno: "TESU11111111", block: "Q2A", "qcCode": "QC01", "seq": 3},
// {ctnno: "TESU11111111", block: "Q2A", "qcCode": "QC02", "seq": 1},
//]
// 编写一个函数去完成上述功能



/**
 * 检测集装箱作业冲突
 * @param qcwp 岸桥作业任务数组
 * @param containers 集装箱数组
 * @param containerPerHour 每小时处理的集装箱数量
 * @returns 标记了冲突的集装箱数组
 */
detectContainerConflicts(qcwp: HandlingTask[], containers: Container[], containerPerHour = 30): Container[] {
  if (!containers || containers.length === 0 || !qcwp || qcwp.length === 0) {
    return [];
  }

  console.log(`开始检测集装箱作业冲突，共 ${containers.length} 个集装箱，${qcwp.length} 个作业任务`);
  
  // 按岸桥和序列号组织任务
  const qcTasks: { [qcCode: string]: HandlingTask[] } = {};
  qcwp.forEach(task => {
    if (task.assignedQcCode) {
      if (!qcTasks[task.assignedQcCode]) {
        qcTasks[task.assignedQcCode] = [];
      }
      qcTasks[task.assignedQcCode].push(task);
    }
  });
  
  // 对每个岸桥的任务按序列号排序
  Object.keys(qcTasks).forEach(qcCode => {
    qcTasks[qcCode].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  });
  
  // 计算每个任务块的开始时间
  const taskStartTimes: { [key: string]: number } = {};
  const minutesPerContainer = 60 / containerPerHour;
  
  Object.entries(qcTasks).forEach(([qcCode, tasks]) => {
    let currentTime = 0;
    
    tasks.forEach(task => {
      // 创建任务唯一标识
      const taskKey = `${qcCode}_${task.bay}_${task.dh}_${task.type}`;
      taskStartTimes[taskKey] = currentTime;
      
      // 更新时间（根据任务箱量计算）
      currentTime += task.amount * minutesPerContainer;
    });
  });
  
  // 为每个集装箱分配时间
  containers.forEach(container => {
    // 找到集装箱对应的任务，不使用qcCode进行匹配
    let matchedTask: HandlingTask | undefined;
    let matchedQcCode: string | undefined;
    
    // 遍历所有岸桥任务，查找匹配的任务
    Object.entries(qcTasks).forEach(([qcCode, tasks]) => {
      const task = tasks.find(t => 
        t.bay === container.bay && 
        t.dh === container.dh && 
        t.type === container.type
      );
      
      if (task) {
        matchedTask = task;
        matchedQcCode = qcCode;
      }
    });
    
    if (matchedTask && matchedQcCode) {
      // 找到匹配的任务，计算时间并分配岸桥
      const taskKey = `${matchedQcCode}_${container.bay}_${container.dh}_${container.type}`;
      const taskStartTime = taskStartTimes[taskKey];
      
      container.estimatedTime = taskStartTime + (container.seq - 1) * minutesPerContainer;
      // container.qcCode = matchedQcCode; // 设置集装箱的岸桥编号
    } else {
      console.warn(`无法找到集装箱 ${container.ctnno} 对应的任务 (bay: ${container.bay}, dh: ${container.dh}, type: ${container.type})`);
      container.estimatedTime = 0;
    }
    
    // 初始化冲突标记
    container.conflict = false;
  });
  
  // 按时间段检测冲突
  const timeWindowSize = 60; // 1小时时间窗口（分钟）
  const blockConflicts: { [timeWindow: string]: { [block: string]: string[] } } = {};
  
  // 按估计时间排序集装箱
  const sortedContainers = [...containers].sort((a, b) => 
    (a.estimatedTime || 0) - (b.estimatedTime || 0)
  );
  
  // 检测冲突
  sortedContainers.forEach(container => {
    // 计算时间窗口
    const timeWindow = Math.floor((container.estimatedTime || 0) / timeWindowSize);
    const timeWindowKey = `window_${timeWindow}`;
    
    // 初始化时间窗口
    if (!blockConflicts[timeWindowKey]) {
      blockConflicts[timeWindowKey] = {};
    }
    
    // 初始化箱区
    if (!blockConflicts[timeWindowKey][container.block]) {
      blockConflicts[timeWindowKey][container.block] = [];
    }
    
    // 检查是否有其他岸桥在同一时间窗口操作同一箱区
    const qcCodesForBlock = blockConflicts[timeWindowKey][container.block];
    
    if (qcCodesForBlock.length > 0 && container.qcCode && !qcCodesForBlock.includes(container.qcCode)) {
      // 存在冲突
      container.conflict = true;
      
      // 标记同一时间窗口同一箱区的其他集装箱为冲突
      sortedContainers.forEach(otherContainer => {
        if (
          otherContainer.block === container.block &&
          Math.floor((otherContainer.estimatedTime || 0) / timeWindowSize) === timeWindow &&
          otherContainer.qcCode !== container.qcCode
        ) {
          otherContainer.conflict = true;
        }
      });
    }
    
    // 添加当前岸桥到箱区记录
    if (container.qcCode && !qcCodesForBlock.includes(container.qcCode)) {
      qcCodesForBlock.push(container.qcCode);
    }
  });
  
  // 统计冲突数量
  const conflictCount = sortedContainers.filter(c => c.conflict).length;
  console.log(`检测完成，发现 ${conflictCount} 个冲突集装箱`);
  
  return sortedContainers;
}
}
