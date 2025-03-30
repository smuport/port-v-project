import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Crane, Task, QcwpConfig } from './qcwp.model';

@Component({
  selector: 'app-qcwp',
  templateUrl: './qcwp.component.html',
  styleUrls: ['./qcwp.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class QcwpComponent implements OnInit, AfterViewInit {
  @ViewChild('ganttChart', { static: false }) ganttChart!: ElementRef<HTMLCanvasElement>;
  
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
  
  private ctx!: CanvasRenderingContext2D;
  
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
  
  @HostListener('window:resize')
  onResize(): void {
    this.resizeCanvas();
    this.drawGanttChart();
  }
  
  private resizeCanvas(): void {
    if (!this.ganttChart) return;
    
    const container = this.ganttChart.nativeElement.parentElement as HTMLElement;
    const canvas = this.ganttChart.nativeElement;
    
    canvas.width = container.clientWidth;
    canvas.height = 500;
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
    const canvas = this.ganttChart.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    
    this.resizeCanvas();
  }
  
  private drawGanttChart(): void {
    if (!this.ctx || !this.ganttChart) return;
    
    const canvas = this.ganttChart.nativeElement;
    
    // 清空画布
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制背景网格和坐标
    this.drawGrid();
    
    // 绘制每个岸桥的任务
    for (const craneId in this.assignedTasks) {
      const tasks = this.assignedTasks[craneId];
      let currentTime = 0;
      
      // 为每个岸桥选择一个颜色
      const colorIndex = (parseInt(craneId) - 1) % this.config.craneColors.length;
      const color = this.config.craneColors[colorIndex];
      
      tasks.forEach(task => {
        // 计算任务在甘特图中的位置
        const x = this.config.leftPadding + ((task.bayNumber - 1) / 2) * this.config.bayWidth;
        const y = currentTime * this.config.timeHeight;
        
        // 计算任务的高度（时间）
        const taskTime = task.containerCount * this.config.unitTime;
        const height = taskTime * this.config.timeHeight;
        
        // 绘制任务块
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - this.config.taskWidth/2, y, this.config.taskWidth, height);
        
        // 绘制任务边框
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x - this.config.taskWidth/2, y, this.config.taskWidth, height);
        
        // 绘制任务信息
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // 绘制岸桥名称
        this.ctx.fillText(`岸桥 ${craneId}`, x, y + height / 2 - 10);
        // 绘制贝位号
        this.ctx.fillText(`贝位: ${task.bayNumber}`, x, y + height / 2);
        // 绘制箱量
        this.ctx.fillText(`${task.containerCount}箱`, x, y + height / 2 + 10);
        
        // 更新当前时间
        currentTime += taskTime;
      });
    }
  }
  
  private drawGrid(): void {
    // 设置网格样式
    this.ctx.strokeStyle = '#ddd';
    this.ctx.lineWidth = 0.5;
    
    const canvas = this.ganttChart.nativeElement;
    
    // 绘制水平时间线
    for (let i = 0; i <= 200; i++) {
      const y = i * this.config.timeHeight * 10; // 每10分钟一条主线
      
      if (y > canvas.height) break;
      
      // 绘制主时间线
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(canvas.width, y);
      
      // 主时间线加粗
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      
      // 标记时间
      this.ctx.fillStyle = '#333';
      this.ctx.font = '10px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`${i * 10}分钟`, 5, y - 5);
      
      // 绘制次要时间线
      this.ctx.lineWidth = 0.5;
      for (let j = 1; j < 10; j++) {
        const minorY = y + j * this.config.timeHeight;
        if (minorY > canvas.height) break;
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, minorY);
        this.ctx.lineTo(canvas.width, minorY);
        this.ctx.stroke();
      }
    }
    
    // 绘制垂直贝位线
    const bayNumbers = [2, 6, 10, 14, 18, 22, 26, 30, 34, 38, 42];
    
    bayNumbers.forEach(bayNumber => {
      // 计算贝位位置
      const x = this.config.leftPadding + ((bayNumber - 1) / 2) * this.config.bayWidth;
      
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, canvas.height);
      
      // 贝位线加粗
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      
      // 标记贝位号
      this.ctx.fillStyle = '#333';
      this.ctx.font = '10px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`贝位 ${bayNumber}`, x, 15);
    });
    
    // 绘制左侧预留区域的边界线
    this.ctx.beginPath();
    this.ctx.moveTo(this.config.leftPadding, 0);
    this.ctx.lineTo(this.config.leftPadding, canvas.height);
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = '#999';
    this.ctx.stroke();
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

