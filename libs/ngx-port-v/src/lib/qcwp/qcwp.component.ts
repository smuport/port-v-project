import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Crane, Task, QcwpConfig } from './qcwp.model';
import { CanvasProComponent, CustomRenderable, Layer, ViewportInteractionConfig } from '@smuport/ngx-canvas-pro';
import { of, Subject } from 'rxjs';

@Component({
  selector: 'app-qcwp',
  templateUrl: './qcwp.component.html',
  styleUrls: ['./qcwp.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, CanvasProComponent]
})
export class QcwpComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('ganttCanvas', { static: false }) ganttCanvas!: CanvasProComponent;
  
  craneCount: number = 3;
  cranes: Crane[] = [];
  selectedCrane: Crane | null = null;
  tasks: Task[] = [];
  assignedTasks: { [key: string]: Task[] } = {};
  
  // 常量配置，与原始 demo 保持一致
  config: QcwpConfig = {
    unitTime: 2, // 单位箱子的作业时间（分钟）
    bayWidth: 50, // 甘特图中贝位的宽度
    timeHeight: 10, // 甘特图中每分钟的高度
    taskWidth: 40, // 任务块的宽度
    leftPadding: 100, // 左侧预留空间
    craneColors: ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'] // 岸桥颜色
  };

  interactionConfig: ViewportInteractionConfig = {
    wheel: {
      default: 'pan-vertical', // 默认滚轮行为为垂直平移
      shift: 'pan-vertical',   // Shift + 滚轮也是垂直平移
      ctrl: 'pan-vertical',    // Ctrl + 滚轮也是垂直平移
      alt: 'pan-vertical'      // Alt + 滚轮也是垂直平移
    },
    drag: {
      default: 'none',          // 默认拖拽行为为平移（可以上下左右）
      shift: 'none',
      ctrl: 'none',
      alt: 'none'
    }
  }
  
  // CanvasPro 相关变量
  private ganttLayer!: Layer;
  private gridLayer!: Layer;
  private ganttData$ = new Subject<any>();
  private gridData$ = new Subject<any>();
  private destroy$ = new Subject<void>();
  
  // 任务类型分类
  taskTypes = {
    deckUnload: { title: '舱面卸船', tasks: [] as Task[] },
    deckLoad: { title: '舱面装船', tasks: [] as Task[] },
    holdUnload: { title: '舱内卸船', tasks: [] as Task[] },
    holdLoad: { title: '舱内装船', tasks: [] as Task[] }
  };
  
  ngOnInit(): void {
    this.initTasks();
    this.generateCranes();
  }
  
  ngAfterViewInit(): void {
    this.initGanttChart();
    this.drawGanttChart();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  @HostListener('window:resize')
  onResize(): void {
    if (this.ganttCanvas) {
      this.drawGanttChart();
    }
  }
  
  initTasks(): void {
    // 初始化示例任务，与原始 demo 保持一致
    this.tasks = [
      { id: '1', bayNumber: 2, location: '舱面', operation: '装船', containerCount: 5 },
      { id: '2', bayNumber: 6, location: '舱面', operation: '装船', containerCount: 27 },
      { id: '3', bayNumber: 6, location: '舱内', operation: '装船', containerCount: 40 },
      { id: '4', bayNumber: 6, location: '舱面', operation: '卸船', containerCount: 24 },
      { id: '5', bayNumber: 6, location: '舱内', operation: '卸船', containerCount: 24 },
      { id: '6', bayNumber: 14, location: '舱面', operation: '装船', containerCount: 14 },
      { id: '7', bayNumber: 14, location: '舱内', operation: '卸船', containerCount: 24 },
      { id: '8', bayNumber: 14, location: '舱面', operation: '卸船', containerCount: 24 },
      { id: '9', bayNumber: 14, location: '舱内', operation: '装船', containerCount: 33 },
      { id: '10', bayNumber: 18, location: '舱面', operation: '装船', containerCount: 32 },
      { id: '11', bayNumber: 18, location: '舱内', operation: '装船', containerCount: 65 },
      { id: '12', bayNumber: 22, location: '舱面', operation: '装船', containerCount: 24 },
      { id: '13', bayNumber: 26, location: '舱面', operation: '装船', containerCount: 24 },
      { id: '14', bayNumber: 34, location: '舱面', operation: '装船', containerCount: 11 },
      { id: '15', bayNumber: 34, location: '舱面', operation: '卸船', containerCount: 24 },
      { id: '16', bayNumber: 34, location: '舱内', operation: '装船', containerCount: 33 },
      { id: '17', bayNumber: 34, location: '舱内', operation: '卸船', containerCount: 24 },
      { id: '18', bayNumber: 38, location: '舱面', operation: '装船', containerCount: 22 },
      { id: '19', bayNumber: 38, location: '舱面', operation: '卸船', containerCount: 24 },
      { id: '20', bayNumber: 42, location: '舱面', operation: '装船', containerCount: 24 },
      { id: '21', bayNumber: 42, location: '舱面', operation: '卸船', containerCount: 25 },
    ];
    
    // 分类任务
    this.categorizeTasks();
  }
  
  categorizeTasks(): void {
    // 清空分类
    this.taskTypes.deckUnload.tasks = [];
    this.taskTypes.deckLoad.tasks = [];
    this.taskTypes.holdUnload.tasks = [];
    this.taskTypes.holdLoad.tasks = [];
    
    // 按贝位号排序任务
    this.tasks.sort((a, b) => a.bayNumber - b.bayNumber);
    
    // 分类任务
    this.tasks.forEach(task => {
      if (task.location === '舱面' && task.operation === '卸船') {
        this.taskTypes.deckUnload.tasks.push(task);
      } else if (task.location === '舱面' && task.operation === '装船') {
        this.taskTypes.deckLoad.tasks.push(task);
      } else if (task.location === '舱内' && task.operation === '卸船') {
        this.taskTypes.holdUnload.tasks.push(task);
      } else if (task.location === '舱内' && task.operation === '装船') {
        this.taskTypes.holdLoad.tasks.push(task);
      }
    });
  }
  
  generateCranes(): void {
    this.cranes = [];
    for (let i = 1; i <= this.craneCount; i++) {
      this.cranes.push({
        id: i.toString(),
        name: `岸桥 ${i}`
      });
    }
    this.selectedCrane = null;
    this.assignedTasks = {};
    this.drawGanttChart();
  }
  
  selectCrane(crane: Crane): void {
    this.selectedCrane = crane;
  }
  
  isTaskAssigned(task: Task | null): boolean {
    if (!task) return false;
    for (const craneId in this.assignedTasks) {
      if (this.assignedTasks[craneId].some(t => t.id === task.id)) {
        return true;
      }
    }
    return false;
  }
  
  getTaskCraneId(task: Task): string | null {
    for (const craneId in this.assignedTasks) {
      if (this.assignedTasks[craneId].some(t => t.id === task.id)) {
        return craneId;
      }
    }
    return null;
  }
  
  assignTask(task: Task | null): void {
    if (!task) return;
    if (!this.selectedCrane) {
      alert('请先选择一台岸桥');
      return;
    }
    
    if (!this.assignedTasks[this.selectedCrane.id]) {
      this.assignedTasks[this.selectedCrane.id] = [];
    }
    
    // 检查任务是否已分配给任何岸桥
    for (const craneId in this.assignedTasks) {
      const taskIndex = this.assignedTasks[craneId].findIndex(t => t.id === task.id);
      if (taskIndex !== -1) {
        // 如果任务已分配给当前选中的岸桥，则不做任何操作
        if (craneId === this.selectedCrane.id) {
          return;
        }
        // 如果任务已分配给其他岸桥，则从其他岸桥中移除
        this.assignedTasks[craneId].splice(taskIndex, 1);
      }
    }
    
    this.assignedTasks[this.selectedCrane.id].push(task);
    this.drawGanttChart();
  }
  
  removeTask(index: number): void {
    if (!this.selectedCrane || !this.assignedTasks[this.selectedCrane.id]) return;
    
    this.assignedTasks[this.selectedCrane.id].splice(index, 1);
    this.drawGanttChart();
  }
  
  moveTask(fromIndex: number, toIndex: number): void {
    if (!this.selectedCrane || !this.assignedTasks[this.selectedCrane.id]) return;
    
    const tasks = this.assignedTasks[this.selectedCrane.id];
    const task = tasks.splice(fromIndex, 1)[0];
    tasks.splice(toIndex, 0, task);
    this.drawGanttChart();
  }
  
  autoAssignTasks(): void {
    if (this.cranes.length === 0) {
      alert('请先生成岸桥');
      return;
    }
    
    // 清空当前分配
    this.assignedTasks = {};
    
    // 按贝位号排序任务
    const sortedTasks = [...this.tasks].sort((a, b) => a.bayNumber - b.bayNumber);
    
    // 为每个岸桥创建时间线
    const craneTimelines: { [key: string]: number } = {};
    this.cranes.forEach(crane => {
      craneTimelines[crane.id] = 0;
      this.assignedTasks[crane.id] = [];
    });
    
    // 分配任务
    sortedTasks.forEach(task => {
      // 找到当前完成时间最早的岸桥
      let earliestCraneId = this.cranes[0].id;
      let earliestTime = craneTimelines[earliestCraneId];
      
      for (const craneId in craneTimelines) {
        if (craneTimelines[craneId] < earliestTime) {
          earliestTime = craneTimelines[craneId];
          earliestCraneId = craneId;
        }
      }
      
      // 分配任务给该岸桥
      this.assignedTasks[earliestCraneId].push(task);
      
      // 更新岸桥时间线
      craneTimelines[earliestCraneId] += task.containerCount * this.config.unitTime;
    });
    
    // 计算总完成时间
    let maxCompletionTime = 0;
    for (const craneId in craneTimelines) {
      if (craneTimelines[craneId] > maxCompletionTime) {
        maxCompletionTime = craneTimelines[craneId];
      }
    }
    
    alert(`自动安排完成！预计总完成时间: ${maxCompletionTime.toFixed(1)} 分钟`);
    this.drawGanttChart();
  }
  
  private initGanttChart(): void {
    if (!this.ganttCanvas) return;
    
    // 创建网格图层
    this.gridLayer = new Layer('grid-layer', 15000, 1500);
    this.gridLayer.setDataSource(this.gridData$);
    this.gridLayer.setTrigger(of(true));
    
    // 添加网格渲染器
    this.gridLayer.addRenderable(new CustomRenderable(
        null,
        (ctx: OffscreenCanvasRenderingContext2D) => {
            this.drawGrid(ctx);
          }
    ));

    
    // 创建甘特图图层
    this.ganttLayer = new Layer('gantt-layer', 15000, 1500);
    this.ganttLayer.setDataSource(this.ganttData$);
    this.ganttLayer.setTrigger(of(true));
    
    // 添加甘特图渲染器
    this.ganttLayer.addRenderable(new CustomRenderable(
        null,
        (ctx: OffscreenCanvasRenderingContext2D, data) => {
            this.drawGanttTasks(ctx, data);
          }
    ));

    
    // 添加图层到画布
    this.ganttCanvas.addLayer(this.gridLayer);
    this.ganttCanvas.addLayer(this.ganttLayer);
    
    // 配置交互行为 - 设置滚轮只能上下平移
    
    // 启动数据流
    this.ganttCanvas.startDataflow();
    this.ganttCanvas.startAnimation();
    this.ganttCanvas.startListenEvent(); 
  }
  
  private drawGanttChart(): void {
    if (!this.ganttCanvas) return;
    
    // 更新网格数据
    this.gridData$.next({});
    
    // 更新甘特图数据
    this.ganttData$.next({
      assignedTasks: this.assignedTasks,
      config: this.config
    });
    
    // 重绘画布
    this.ganttCanvas.drawVierport();
  }
  
  private drawGrid(ctx: OffscreenCanvasRenderingContext2D): void {
    // 设置网格样式
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;
    
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    // 绘制水平时间线
    for (let i = 0; i <= 200; i++) {
      const y = i * this.config.timeHeight * 10; // 每10分钟一条主线
      
      if (y > height) break;
      
      // 绘制主时间线
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      
      // 主时间线加粗
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // 标记时间
      ctx.fillStyle = '#333';
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`${i * 10}分钟`, 5, y - 5);
      
      // 绘制次要时间线
      ctx.lineWidth = 0.5;
      for (let j = 1; j < 10; j++) {
        const minorY = y + j * this.config.timeHeight;
        if (minorY > height) break;
        
        ctx.beginPath();
        ctx.moveTo(0, minorY);
        ctx.lineTo(width, minorY);
        ctx.stroke();
      }
    }
    
    // 绘制垂直贝位线
    const bayNumbers = [2, 6, 10, 14, 18, 22, 26, 30, 34, 38, 42];
    
    bayNumbers.forEach(bayNumber => {
      // 计算贝位位置
      const x = this.config.leftPadding + ((bayNumber - 1) / 2) * this.config.bayWidth;
      
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      
      // 贝位线加粗
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // 标记贝位号
      ctx.fillStyle = '#333';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`贝位 ${bayNumber}`, x, 15);
    });
    
    // 绘制左侧预留区域的边界线
    ctx.beginPath();
    ctx.moveTo(this.config.leftPadding, 0);
    ctx.lineTo(this.config.leftPadding, height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#999';
    ctx.stroke();
  }
  
  private drawGanttTasks(ctx: OffscreenCanvasRenderingContext2D, data: any): void {
    const { assignedTasks, config } = data;
    
    // 绘制每个岸桥的任务
    for (const craneId in assignedTasks) {
      const tasks = assignedTasks[craneId];
      let currentTime = 0;
      
      // 为每个岸桥选择一个颜色
      const colorIndex = (parseInt(craneId) - 1) % config.craneColors.length;
      const color = config.craneColors[colorIndex];
      
      tasks.forEach((task: Task) => {
        // 计算任务在甘特图中的位置
        const x = config.leftPadding + ((task.bayNumber - 1) / 2) * config.bayWidth;
        const y = currentTime * config.timeHeight;
        
        // 计算任务的高度（时间）
        const taskTime = task.containerCount * config.unitTime;
        const height = taskTime * config.timeHeight;
        
        // 绘制任务块
        ctx.fillStyle = color;
        ctx.fillRect(x - config.taskWidth/2, y, config.taskWidth, height);
        
        // 绘制任务边框
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - config.taskWidth/2, y, config.taskWidth, height);
        
        // 绘制任务信息
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 绘制岸桥名称
        ctx.fillText(`岸桥 ${craneId}`, x, y + height / 2 - 10);
        // 绘制贝位号
        ctx.fillText(`贝位: ${task.bayNumber}`, x, y + height / 2);
        // 绘制箱量
        ctx.fillText(`${task.containerCount}箱`, x, y + height / 2 + 10);
        
        // 更新当前时间
        currentTime += taskTime;
      });
    }
  }
  
  getTaskColor(task: Task | null): string {
    if (!task) return '';
    const craneId = this.getTaskCraneId(task);
    if (craneId) {
      const colorIndex = (parseInt(craneId) - 1) % this.config.craneColors.length;
      return this.config.craneColors[colorIndex];
    }
    return '';
  }
  
  getCraneColor(craneId: string): string {
    const colorIndex = (parseInt(craneId) - 1) % this.config.craneColors.length;
    return this.config.craneColors[colorIndex];
  }
  
  // 添加以下方法到组件类中
  getBayTask(type: string, bayNumber: number): Task | null {
    let tasks: Task[] = [];
    
    switch (type) {
      case 'deckUnload':
        tasks = this.taskTypes.deckUnload.tasks;
        break;
      case 'deckLoad':
        tasks = this.taskTypes.deckLoad.tasks;
        break;
      case 'holdUnload':
        tasks = this.taskTypes.holdUnload.tasks;
        break;
      case 'holdLoad':
        tasks = this.taskTypes.holdLoad.tasks;
        break;
    }
    
    const task = tasks.find(t => t.bayNumber === bayNumber);
    return task || null;
  }
  
  hasBayTask(type: string, bayNumber: number): boolean {
    return this.getBayTask(type, bayNumber) !== null;
  }
}

