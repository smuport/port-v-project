/**
 * 岸桥分路计划自动安排算法
 * 目标：最小化总完成时间
 * 约束：相邻岸桥不能交叉作业
 * 目标：箱量大的任务块尽量优先安排作业
 */

// 计算任务完成时间（分钟）
function calculateTaskTime(task, unitTime) {
    return task.containerCount * unitTime;
}

// 计算岸桥移动时间（分钟）
function calculateMoveTime(fromBay, toBay, moveTimePerBay) {
    // 计算贝位之间的距离
    const distance = Math.abs(fromBay - toBay);
    // 每个贝位移动需要的时间
    return distance * moveTimePerBay;
}

// 计算岸桥完成所有任务的总时间
function calculateTotalTime(tasks, unitTime, moveTimePerBay) {
    if (tasks.length === 0) return 0;
    
    let totalTime = calculateTaskTime(tasks[0], unitTime);
    let currentBay = tasks[0].bayNumber;
    
    for (let i = 1; i < tasks.length; i++) {
        // 添加岸桥移动时间
        totalTime += calculateMoveTime(currentBay, tasks[i].bayNumber, moveTimePerBay);
        // 添加任务处理时间
        totalTime += calculateTaskTime(tasks[i], unitTime);
        // 更新当前贝位
        currentBay = tasks[i].bayNumber;
    }
    
    return totalTime;
}

// 自动安排岸桥分路计划
function autoAssignTasks(tasks, craneCount, unitTime, moveTimePerBay = 0.5) {
    // 如果没有任务或岸桥，返回空结果
    if (tasks.length === 0 || craneCount <= 0) {
        return {};
    }
    
    // 按贝位号从小到大排序任务
    const sortedTasks = [...tasks].sort((a, b) => a.bayNumber - b.bayNumber);
    
    // 初始化岸桥分配结果
    const assignment = {};
    for (let i = 1; i <= craneCount; i++) {
        assignment[i] = [];
    }
    
    // 将船舶贝位划分为大致相等的几个区域，每个区域分配给一个岸桥
    const maxBayNumber = Math.max(...tasks.map(task => task.bayNumber));
    const minBayNumber = Math.min(...tasks.map(task => task.bayNumber));
    const bayRange = maxBayNumber - minBayNumber + 1;
    const sectionSize = bayRange / craneCount;
    
    // 为每个岸桥分配工作区域
    const craneSections = [];
    for (let i = 0; i < craneCount; i++) {
        const startBay = minBayNumber + Math.floor(i * sectionSize);
        const endBay = (i === craneCount - 1) ? maxBayNumber : minBayNumber + Math.floor((i + 1) * sectionSize) - 1;
        craneSections.push({ craneId: i + 1, startBay, endBay });
    }
    
    // 根据贝位区域分配任务
    for (const task of sortedTasks) {
        // 找到任务所在的贝位区域对应的岸桥
        let targetCraneId = 1;
        for (const section of craneSections) {
            if (task.bayNumber >= section.startBay && task.bayNumber <= section.endBay) {
                targetCraneId = section.craneId;
                break;
            }
        }
        
        // 将任务分配给对应岸桥
        assignment[targetCraneId].push(task);
    }
    
    // 对每个岸桥的任务进行贝位优化排序（最近邻算法）
    for (let craneId = 1; craneId <= craneCount; craneId++) {
        if (assignment[craneId].length <= 1) continue;
        
        // 按贝位号排序，确保从小到大处理
        assignment[craneId].sort((a, b) => a.bayNumber - b.bayNumber);
        
        // 使用最近邻算法优化任务顺序
        const optimizedTasks = [assignment[craneId][0]];
        const remainingTasks = [...assignment[craneId].slice(1)];
        
        while (remainingTasks.length > 0) {
            const lastTask = optimizedTasks[optimizedTasks.length - 1];
            let nearestIndex = 0;
            let minDistance = Math.abs(lastTask.bayNumber - remainingTasks[0].bayNumber);
            
            // 找到最近的下一个任务
            for (let i = 1; i < remainingTasks.length; i++) {
                const distance = Math.abs(lastTask.bayNumber - remainingTasks[i].bayNumber);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestIndex = i;
                }
            }
            
            // 添加最近的任务到优化列表
            optimizedTasks.push(remainingTasks[nearestIndex]);
            remainingTasks.splice(nearestIndex, 1);
        }
        
        // 更新岸桥任务顺序
        assignment[craneId] = optimizedTasks;
    }
    
    // 对每个岸桥的任务进行优化排序
    for (let craneId = 1; craneId <= craneCount; craneId++) {
        if (assignment[craneId].length <= 1) continue;
        
        // 首先按箱量从大到小排序，找出箱量最大的任务作为起点
        assignment[craneId].sort((a, b) => b.containerCount - a.containerCount);
        
        // 选择箱量最大的任务作为起始任务
        const optimizedTasks = [assignment[craneId][0]];
        const remainingTasks = [...assignment[craneId].slice(1)];
        
        // 使用评估函数选择后续任务
        while (remainingTasks.length > 0) {
            const lastTask = optimizedTasks[optimizedTasks.length - 1];
            let bestIndex = 0;
            let bestScore = evaluateNextTask(lastTask, remainingTasks[0]);
            
            // 找到最佳的下一个任务（综合考虑距离和箱量）
            for (let i = 1; i < remainingTasks.length; i++) {
                const score = evaluateNextTask(lastTask, remainingTasks[i]);
                if (score > bestScore) {
                    bestScore = score;
                    bestIndex = i;
                }
            }
            
            // 添加最佳任务到优化列表
            optimizedTasks.push(remainingTasks[bestIndex]);
            remainingTasks.splice(bestIndex, 1);
        }
        
        // 更新岸桥任务顺序
        assignment[craneId] = optimizedTasks;
    }
    
    // 验证相邻岸桥是否有交叉作业
    let valid = true;
    for (let i = 1; i < craneCount; i++) {
        const currentCraneTasks = assignment[i];
        const nextCraneTasks = assignment[i + 1];
        
        if (currentCraneTasks.length > 0 && nextCraneTasks.length > 0) {
            const maxBayOfCurrentCrane = Math.max(...currentCraneTasks.map(task => task.bayNumber));
            const minBayOfNextCrane = Math.min(...nextCraneTasks.map(task => task.bayNumber));
            
            if (maxBayOfCurrentCrane > minBayOfNextCrane) {
                valid = false;
                console.warn(`检测到岸桥 ${i} 和岸桥 ${i + 1} 有交叉作业`);
            }
        }
    }
    
    if (!valid) {
        console.warn('存在岸桥交叉作业，尝试重新分配...');
        // 如果存在交叉作业，使用更简单的方法：按贝位顺序平均分配
        for (let i = 1; i <= craneCount; i++) {
            assignment[i] = [];
        }
        
        // 每个岸桥分配相邻的贝位任务
        for (let i = 0; i < sortedTasks.length; i++) {
            const craneId = (i % craneCount) + 1;
            assignment[craneId].push(sortedTasks[i]);
        }
        
        // 确保每个岸桥的任务按贝位排序
        for (let i = 1; i <= craneCount; i++) {
            assignment[i].sort((a, b) => a.bayNumber - b.bayNumber);
        }
    }
    
    return assignment;
}

// 评估下一个任务的得分（综合考虑距离和箱量）
function evaluateNextTask(currentTask, nextTask) {
    // 计算贝位距离（越近越好）
    const distance = Math.abs(currentTask.bayNumber - nextTask.bayNumber);
    const distanceScore = 1 / (distance + 1); // 避免除以零
    
    // 箱量得分（越大越好）
    const containerScore = nextTask.containerCount / 30; // 假设最大箱量为30，归一化
    
    // 综合得分：距离近的和箱量大的任务得分高
    // 权重可以调整：这里箱量权重为0.7，距离权重为0.3
    return (containerScore * 0.7) + (distanceScore * 0.3);
}

// 导出函数
window.autoAssignTasks = autoAssignTasks;