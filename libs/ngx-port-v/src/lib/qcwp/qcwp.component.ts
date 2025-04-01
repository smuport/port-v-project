import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, HostListener, OnDestroy, Input, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Crane, Task, QcwpConfig } from './qcwp.model';
import { CanvasProComponent, CustomRenderable, Layer, SvgLayer, SvgRenderable, ViewportInteractionConfig } from '@smuport/ngx-canvas-pro';
import { of, Subject } from 'rxjs';
import { ShipSideComponent } from '../ship-side/ship-side.component';
import { HandlingTask, Vessel } from '../model/vessel';

@Component({
  selector: 'app-qcwp',
  templateUrl: './qcwp.component.html',
  styleUrls: ['./qcwp.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, CanvasProComponent, ShipSideComponent]
})
export class QcwpComponent implements OnInit, AfterViewInit, OnDestroy {
  // 添加折叠状态变量
  isShipSideCollapsed = false;

  @ViewChild('ganttCanvas', { static: false }) ganttCanvas!: CanvasProComponent;
  
  craneCount: number = 3;
  cranes: Crane[] = [];
  selectedCrane: Crane | null = null;
  tasks: Task[] = [];
  assignedTasks: { [key: string]: Task[] } = {};
  
  // 常量配置，与原始 demo 保持一致
  config: QcwpConfig = {
    unitTime: 2.5, // 单位箱子的作业时间（分钟）
    bayWidth: 27, // 甘特图中基数贝位的宽度
    timeHeight: 5, // 甘特图中每分钟的高度
    taskWidth: 48, // 任务块的宽度
    leftPadding: 48, // 左侧预留空间
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
  private ganttLayer!: SvgLayer;
  private gridLayer!: Layer;
  private ganttData$ = new Subject<any>();
  private gridData$ = new Subject<any>();
  private destroy$ = new Subject<void>();
  // private _vessel: Vessel | null = null;
  vessel = input.required<Vessel>();

  constructor() {
    effect(() => {
      const value = this.vessel();
      if (value) {
        // this._vessel = value;
        this.initTasks(value);
      }
    });
  }
  

  ngOnInit(): void {

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



  onHandlingTaskSelected($event: HandlingTask[]) {
    const tasks: Task[] = [];
    for (const handingTask of $event) {
      tasks.push({
        id: `${handingTask.bay}-${handingTask.dh}-${handingTask.amount}`,
        bayNumber: +handingTask.bay,
        location: handingTask.dh,
        operation: handingTask.type,
        containerCount: handingTask.amount
      });
      // this.tasks.push({
      //   id: `${task.bay}-${task.dh}-${task.amount}`,
      //   bayNumber: +task.bay,
      //   location: task.dh,
      //   operation: task.type,
      //   containerCount: task.amount
      // });
    }
    for (const task of tasks) {
      this.assignTask(task);
    }
    
  }
  
//   @HostListener('window:resize')
//   onResize(): void {
//     if (this.ganttCanvas) {
//       this.drawGanttChart();
//     }
//   }
  
  initTasks(vessel: Vessel): void {
    // 初始化示例任务，与原始 demo 保持一致
    for (const task of vessel.loadInstruct) {
      this.tasks.push({
        id: `${task.bay}-${task.dh}-${task.loadAmount}`,
        bayNumber: +task.bay,
        location: task.dh,
        operation: 'load',
        containerCount: task.loadAmount
      });
    }
    for (const task of vessel.unloadInstruct) {
      this.tasks.push({
        id: `${task.bay}-${task.dh}-${task.unloadAmount}`,
        bayNumber: +task.bay,
        location: task.dh,
        operation: 'load',
        containerCount: task.unloadAmount
      });
    }
    // this.tasks = [
    //   { id: '1', bayNumber: 2, location: '舱面', operation: '装船', containerCount: 5 },
    //   { id: '2', bayNumber: 6, location: '舱面', operation: '装船', containerCount: 27 },
    //   { id: '3', bayNumber: 6, location: '舱内', operation: '装船', containerCount: 40 },
    //   { id: '4', bayNumber: 6, location: '舱面', operation: '卸船', containerCount: 24 },
    //   { id: '5', bayNumber: 6, location: '舱内', operation: '卸船', containerCount: 24 },
    //   { id: '6', bayNumber: 14, location: '舱面', operation: '装船', containerCount: 14 },
    //   { id: '7', bayNumber: 14, location: '舱内', operation: '卸船', containerCount: 24 },
    //   { id: '8', bayNumber: 14, location: '舱面', operation: '卸船', containerCount: 24 },
    //   { id: '9', bayNumber: 14, location: '舱内', operation: '装船', containerCount: 33 },
    //   { id: '10', bayNumber: 18, location: '舱面', operation: '装船', containerCount: 32 },
    //   { id: '11', bayNumber: 18, location: '舱内', operation: '装船', containerCount: 65 },
    //   { id: '12', bayNumber: 22, location: '舱面', operation: '装船', containerCount: 24 },
    //   { id: '13', bayNumber: 26, location: '舱面', operation: '装船', containerCount: 24 },
    //   { id: '14', bayNumber: 34, location: '舱面', operation: '装船', containerCount: 11 },
    //   { id: '15', bayNumber: 34, location: '舱面', operation: '卸船', containerCount: 24 },
    //   { id: '16', bayNumber: 34, location: '舱内', operation: '装船', containerCount: 33 },
    //   { id: '17', bayNumber: 34, location: '舱内', operation: '卸船', containerCount: 24 },
    //   { id: '18', bayNumber: 38, location: '舱面', operation: '装船', containerCount: 22 },
    //   { id: '19', bayNumber: 38, location: '舱面', operation: '卸船', containerCount: 24 },
    //   { id: '20', bayNumber: 42, location: '舱面', operation: '装船', containerCount: 24 },
    //   { id: '21', bayNumber: 42, location: '舱面', operation: '卸船', containerCount: 25 },
    // ];
    
  //   // 分类任务
  //   this.categorizeTasks();
  // }
  
  // categorizeTasks(): void {
  //   // 清空分类
  //   this.taskTypes.deckUnload.tasks = [];
  //   this.taskTypes.deckLoad.tasks = [];
  //   this.taskTypes.holdUnload.tasks = [];
  //   this.taskTypes.holdLoad.tasks = [];
    
  //   // 按贝位号排序任务
  //   this.tasks.sort((a, b) => a.bayNumber - b.bayNumber);
    
  //   // 分类任务
  //   this.tasks.forEach(task => {
  //     if (task.location === '舱面' && task.operation === '卸船') {
  //       this.taskTypes.deckUnload.tasks.push(task);
  //     } else if (task.location === '舱面' && task.operation === '装船') {
  //       this.taskTypes.deckLoad.tasks.push(task);
  //     } else if (task.location === '舱内' && task.operation === '卸船') {
  //       this.taskTypes.holdUnload.tasks.push(task);
  //     } else if (task.location === '舱内' && task.operation === '装船') {
  //       this.taskTypes.holdLoad.tasks.push(task);
  //     }
  //   });
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
    
    // 创建网格图层 (仍然使用 Canvas)
    this.gridLayer = new Layer('grid-layer', 1500, 15000);
    this.gridLayer.setDataSource(this.gridData$);
    this.gridLayer.setTrigger(of(true));
   
    
    // 添加网格渲染器
    this.gridLayer.addRenderable(new CustomRenderable(
        (ctx: OffscreenCanvasRenderingContext2D) => {
            this.drawGrid(ctx);
          }
    ));
    
    // 创建甘特图图层 (使用 SVG)
    this.ganttLayer = new SvgLayer('gantt-layer', 1500, 1500);
    this.ganttLayer.setDataSource(this.ganttData$);
    this.ganttLayer.setTrigger(of(true));
    this.ganttLayer.addRenderable(new SvgRenderable(
        (svgRoot: SVGElement) => {
            this.drawGanttTasksSvg(svgRoot);
          }
    ));
    
    // 启用 SVG 图层的鼠标事件
    this.ganttLayer.svgElement.style.pointerEvents = 'all';
    
    // 添加图层到画布
    this.ganttCanvas.addLayer(this.gridLayer);
    this.ganttCanvas.addLayer(this.ganttLayer);
    
    // 启动数据流
    this.ganttCanvas.startDataflow();
    this.ganttCanvas.startAnimation();
    this.ganttCanvas.startListenEvent(); 
  }

  // 新增 SVG 绘制甘特图任务的方法
  private drawGanttTasksSvg(svgRoot: SVGElement): void {
    // 清空现有的 SVG 元素
    while (svgRoot.firstChild) {
      svgRoot.removeChild(svgRoot.firstChild);
    }
    
    // 绘制每个岸桥的任务
    for (const craneId in this.assignedTasks) {
      const tasks = this.assignedTasks[craneId];
      let currentTime = 0;
      
      // 为每个岸桥选择一个颜色
      const colorIndex = (parseInt(craneId) - 1) % this.config.craneColors.length;
      const color = this.config.craneColors[colorIndex];
      
      tasks.forEach((task: Task) => {
        // 计算任务在甘特图中的位置
        const x = this.config.leftPadding + ((task.bayNumber) / 2) * this.config.bayWidth;
        const y = currentTime * this.config.timeHeight;
        
        // 计算任务的高度（时间）
        const taskTime = task.containerCount * this.config.unitTime;
        const height = taskTime * this.config.timeHeight;
        
        // 创建任务块 SVG 组
        const taskGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        taskGroup.setAttribute('data-task-id', task.id);
        taskGroup.setAttribute('data-crane-id', craneId);
        
        // 创建任务块矩形
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', (x - this.config.taskWidth/2).toString());
        rect.setAttribute('y', y.toString());
        rect.setAttribute('width', this.config.taskWidth.toString());
        rect.setAttribute('height', height.toString());
        rect.setAttribute('fill', color);
        rect.setAttribute('stroke', '#333');
        rect.setAttribute('stroke-width', '1');
        
        // 添加点击事件
        taskGroup.addEventListener('click', (event) => {
          // 可以在这里添加任务块的点击事件处理
          console.log(`任务 ${task.id} 被点击`);
        });
        
        // 添加文本 - 岸桥名称
        const craneText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        craneText.setAttribute('x', x.toString());
        craneText.setAttribute('y', (y + height / 2 - 10).toString());
        craneText.setAttribute('text-anchor', 'middle');
        craneText.setAttribute('fill', '#fff');
        craneText.setAttribute('font-size', '10px');
        craneText.textContent = `岸桥 ${craneId}`;
        
        // 添加文本 - 贝位号
        const bayText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        bayText.setAttribute('x', x.toString());
        bayText.setAttribute('y', (y + height / 2).toString());
        bayText.setAttribute('text-anchor', 'middle');
        bayText.setAttribute('fill', '#fff');
        bayText.setAttribute('font-size', '10px');
        bayText.textContent = `贝位: ${task.bayNumber}`;
        
        // 添加文本 - 箱量
        const containerText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        containerText.setAttribute('x', x.toString());
        containerText.setAttribute('y', (y + height / 2 + 10).toString());
        containerText.setAttribute('text-anchor', 'middle');
        containerText.setAttribute('fill', '#fff');
        containerText.setAttribute('font-size', '10px');
        containerText.textContent = `${task.containerCount}箱`;
        
        // 将所有元素添加到任务组
        taskGroup.appendChild(rect);
        taskGroup.appendChild(craneText);
        taskGroup.appendChild(bayText);
        taskGroup.appendChild(containerText);
        
        // 将任务组添加到 SVG 图层
        svgRoot.appendChild(taskGroup);
        
        // 更新当前时间
        currentTime += taskTime;
      });
    }
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
    for (let i = 0; i <= 2000; i++) {
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
    const bayNumbers = [2, 6, 10, 14, 18, 22, 26, 30, 34, 38, 42, 46, 50, 54, 58, 62, 66, 70];
    
    bayNumbers.forEach(bayNumber => {
      // 计算贝位位置
      const x = this.config.leftPadding + ((bayNumber) / 2) * this.config.bayWidth;
      
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      
      // 贝位线加粗
      ctx.lineWidth = 2;
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
  
  // 添加切换折叠状态的方法
  toggleShipSide(): void {
    this.isShipSideCollapsed = !this.isShipSideCollapsed;
  }
}

