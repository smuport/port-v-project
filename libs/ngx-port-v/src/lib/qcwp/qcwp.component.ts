import { Component, ViewChild, AfterViewInit, HostListener, OnDestroy, Input, input, effect, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Crane, QcwpConfig } from './qcwp.model';
import { CanvasProComponent, CustomRenderable, Layer, SvgLayer, SvgRenderable, ViewportInteractionConfig } from '@smuport/ngx-canvas-pro';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { ShipSideComponent } from '../ship-side/ship-side.component';
import { HandlingTask, Vessel } from '../model/vessel';
import { QcwpService } from './qcwp.service';

@Component({
  selector: 'app-qcwp',
  templateUrl: './qcwp.component.html',
  styleUrls: ['./qcwp.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, CanvasProComponent, ShipSideComponent]
})
export class QcwpComponent implements AfterViewInit, OnDestroy {

  // CanvasPro 相关变量
  private ganttLayer!: SvgLayer;
  private gridLayer!: Layer;
  private ganttData$ = new Subject<any>();
  private gridData$ = new Subject<any>();
  private destroy$ = new Subject<void>();
  // 添加折叠状态变量 
  isShipSideCollapsed = false;
  cranes = input.required<Crane[]>();
  selectedCrane: Crane | null = null;
  tasks: HandlingTask[] = [];
  assignedTasks: { [key: string]: HandlingTask[] } = {};
  vesselDataUpdateSubject = new BehaviorSubject<Vessel>(undefined!);
  handlingTaskLayer!: SvgLayer;
  private _shipSide!: ShipSideComponent;
  @ViewChild('ganttCanvas', { static: false }) ganttCanvas!: CanvasProComponent;
  @ViewChild('shipSide', { static: false }) set shipSide(v: ShipSideComponent) {
    this._shipSide = v;
    if (v && !this.handlingTaskLayer) {
      this.handlingTaskLayer = this.getSvgHandlingTaskLayer('handlingTask');
      this.shipSide.addLayer(this.handlingTaskLayer);
    }

  } ;

  get shipSide(): ShipSideComponent {
    return this._shipSide;
  }
  

  
  // 常量配置，与原始 demo 保持一致
  @Input() config: QcwpConfig = {
    unitTime: 2.5, // 单位箱子的作业时间（分钟）
    bayWidth: 27, // 甘特图中基数贝位的宽度
    timeHeight: 2, // 甘特图中每分钟的高度
    taskWidth: 48, // 任务块的宽度
    leftPadding: 48, // 左侧预留空间
    craneColors: [
      '#FFB5C2', // 马卡龙粉红
      '#87CEEB', // 马卡龙天蓝
      '#FFE5B4', // 马卡龙杏色
      '#B4E1D2', // 马卡龙薄荷绿
      '#E6A4B4', // 马卡龙玫瑰
      '#B8A6D9', // 马卡龙薰衣草
      '#FFD9B4', // 马卡龙橙色
      '#A5DEE5', // 马卡龙湖蓝
      '#F7D794', // 马卡龙柠檬黄
      '#E7A8D1', // 马卡龙紫罗兰
      '#98D6EA', // 马卡龙蓝莓
      '#F4B5C1'  // 马卡龙桃子
    ]
  };

  @Input() ganttChartInteractionConfig: ViewportInteractionConfig = {
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

  @Input() vesselSideViewInteractionConfig: ViewportInteractionConfig = {
    drag: {
      default: 'frame-select',     // 默认禁用平移
      shift: 'none',        // 按住 shift 键可以平移
      ctrl: 'none',
      alt: 'none'
    },
    wheel: {
      default: 'none',     // 默认禁用缩放
      shift: 'pan-horizontal',        // 按住 shift 键可以水平缩放
      ctrl: 'zoom',
      alt: 'pan-vertical'
    }
  };

  shipSideConfig = input<{ width: number; height: number; }>({
    width: 24,
    height: 12,
  })

  vessel = input.required<Vessel>();

  qcwp = input<{[key: string]: HandlingTask[]}>();
  qcwpChange = output<{[key: string]: HandlingTask[]}>();
  cranesChange = output<Crane[]>();
  constructor(private qcwpService: QcwpService) {
    effect(() => {
      const vessel = this.vessel();
      const qcwp = this.qcwp();

      if (vessel) {
        this.vesselDataUpdateSubject.next(vessel)
        this.initTasks(vessel);
      }

      if (vessel && qcwp) {
        const allQcwpTasks: HandlingTask[] = []
        Object.values(qcwp).forEach(tasks => allQcwpTasks.push(...tasks))
        this.mergeTasks(vessel, allQcwpTasks);
        if (vessel.handlingTasks) {
          for (const task of vessel.handlingTasks) {
            if (task.assignedQcCode) {
              if (!this.assignedTasks[task.assignedQcCode]) {
                this.assignedTasks[task.assignedQcCode] = []
              }
              this.assignedTasks[task.assignedQcCode].push(task);
            }
          }
        }
        
        
      } 
      this.drawGanttChart();
      this.updateQcTotalAmount();
    });

  }
  



  ngAfterViewInit() {
    console.log('afterShipSideViewInit')
    // this.handlingTaskLayer = this.getSvgHandlingTaskLayer('handlingTask');
    // this.shipSide.addLayer(this.handlingTaskLayer);
    this.initGanttChart();
    this.drawGanttChart();
  }
  



  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  updateQcTotalAmount() {
    // this.handlingTaskLayer.render(this.vessel());
    const qcTotalAmount: {[key: string]: number} = {}

    Object.entries(this.assignedTasks).forEach(([craneId, tasks]) => {
      qcTotalAmount[craneId] = tasks.reduce((sum, task) => sum + task.amount, 0);
    });
    this.cranes().forEach(c => c.count = qcTotalAmount[c.id]);
  }



  onHandlingTaskSelected(selectedTasks: HandlingTask[]) {
    if (!this.selectedCrane) {
      alert('请先选择一台岸桥');
      return;
    }
    // 先要对任务块进行排序，按贝位降序，同贝位先卸后装，如果是type卸船则dh按先D后H，装船则先H后D
    // 取出该岸桥已分配的任务，同一重新排序
    let qcAssignedTasks = this.assignedTasks[this.selectedCrane.id];
    if (!qcAssignedTasks) {
      qcAssignedTasks = []
    }
    const allTasks = [...qcAssignedTasks, ...selectedTasks];
        // 实现自定义排序逻辑
        this.qcwpService.sortTasksByOperationRules(allTasks);
        // allTasks.sort((a, b) => {
        //   // 1. 首先按贝位号降序排序
        //   if (+b.bay !== +a.bay) {
        //     return +b.bay - +a.bay;
        //   }
          
        //   // 2. 同贝位，先卸后装
        //   if (a.type !== b.type) {
        //     return a.type === 'unload' ? -1 : 1;
        //   }
          
        //   // 3. 根据作业类型决定DH顺序
        //   if (a.dh !== b.dh) {
        //     if (a.type === 'unload') {
        //       // 卸船时先D后H
        //       return a.dh === 'D' ? -1 : 1;
        //     } else {
        //       // 装船时先H后D
        //       return a.dh === 'H' ? -1 : 1;
        //     }
        //   }
          
        //   return 0;
        // });

    this.assignedTasks[this.selectedCrane.id] = [];
    for (const task of allTasks) {
      this.assignTask(task);
    }
    this.handlingTaskLayer.render(this.vessel());
    this.updateQcTotalAmount();

    
    // const qcTotalAmount: {[key: string]: number} = {}

    // Object.entries(this.assignedTasks).forEach(([craneId, tasks]) => {
    //   qcTotalAmount[craneId] = tasks.reduce((sum, task) => sum + task.amount, 0);
    // });

    // this.cranes().forEach(c => c.count = qcTotalAmount[c.id]);

    this.qcwpChange.emit(this.assignedTasks);
    // this.shipSide.canvasPro.drawVierport();
    
  }
  
  @HostListener('window:resize')
  onResize(): void {
    this.ganttCanvas.fitViewportToParent()

  }

  mergeTasks(vessel: Vessel, tasks: HandlingTask[]) {
    for (const task of tasks) {
      const existingTask = vessel.handlingTasks?.find(t => t.bay+t.dh+t.type === task.bay+task.dh+task.type);
      if (existingTask) {
        existingTask.assignedQcCode = task.assignedQcCode;
        existingTask.sequence = task.sequence;
      } else {
        console.log(`任务 ${task.bay}${task.dh}${task.type} 不存在`)
      }
    }
  }
  
  initTasks(vessel: Vessel): void {
    if (vessel.handlingTasks) {
      this.tasks = [...vessel.handlingTasks]
    }
  }
  
  selectCrane(crane: Crane): void {
    this.selectedCrane = crane;
  }
  
  isTaskAssigned(task: HandlingTask | null): boolean {
    if (!task) return false;
    for (const craneId in this.assignedTasks) {
      if (this.assignedTasks[craneId].some(t => t.bay+t.dh+t.type === task.bay+task.dh+task.type)) {
        return true;
      }
    }
    return false;
  }
  
  getTaskCraneId(task: HandlingTask): string | null {
    for (const craneId in this.assignedTasks) {
      if (this.assignedTasks[craneId].some(t => t.bay+t.dh+t.type === task.bay+task.dh+task.type)) {
        return craneId;
      }
    }
    return null;
  }

    // 校验岸桥任务分配是否符合排序规则
    validateTaskAssignment(): boolean {
      // 遍历所有岸桥的任务分配
      for (const craneId in this.assignedTasks) {
        const tasks = this.assignedTasks[craneId];
        
        // 检查相邻任务是否符合排序规则
        for (let i = 0; i < tasks.length - 1; i++) {
          const currentTask = tasks[i];
          const nextTask = tasks[i + 1];
          
          // 2. 如果是同一贝位，检查装卸顺序
          if (+currentTask.bay === +nextTask.bay) {
            // 卸船任务应该在装船任务之前
            if (currentTask.type === 'load' && nextTask.type === 'unload') {
              console.error(`岸桥 ${craneId} 的任务顺序违反先卸后装规则：`,
                `贝位 ${currentTask.bay} 的装船任务在卸船任务之前`);
              return false;
            }
            
            // 3. 如果是同一贝位同一类型，检查DH顺序
            if (currentTask.type === nextTask.type) {
              if (currentTask.type === 'unload') {
                // 卸船时应该是先D后H
                if (currentTask.dh === 'H' && nextTask.dh === 'D') {
                  console.error(`岸桥 ${craneId} 的卸船任务顺序违反先D后H规则：`,
                    `贝位 ${currentTask.bay}`);
                  return false;
                }
              } else {
                // 装船时应该是先H后D
                if (currentTask.dh === 'D' && nextTask.dh === 'H') {
                  console.error(`岸桥 ${craneId} 的装船任务顺序违反先H后D规则：`,
                    `贝位 ${currentTask.bay}`);
                  return false;
                }
              }
            }
          }
        }
      }
      
      return true;
    }
  
  private assignTask(task: HandlingTask | null): void {
    if (!task) return;
    if (!this.selectedCrane) {
      // alert('请先选择一台岸桥');
      return;
    }
    
    if (!this.assignedTasks[this.selectedCrane.id]) {
      this.assignedTasks[this.selectedCrane.id] = [];
    }
    
    // 检查任务是否已分配给任何岸桥
    for (const craneId in this.assignedTasks) {
      const taskIndex = this.assignedTasks[craneId].findIndex(t => t.bay+t.dh+t.type === task.bay+task.dh+task.type);
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
    task.assignedQcCode = this.selectedCrane.id;
    const seq = this.assignedTasks[this.selectedCrane.id].length;
    task.sequence = seq;
        // 添加校验
    if (!this.validateTaskAssignment()) {
      alert('任务分配顺序不符合规则，请检查！');
      // 可以在这里添加回滚逻辑
    }
    this.drawGanttChart();
  }
  
  removeTask(index: number): void {
    if (!this.selectedCrane || !this.assignedTasks[this.selectedCrane.id]) return;
    
    const task = this.assignedTasks[this.selectedCrane.id].splice(index, 1);
    task[0].assignedQcCode = undefined;
    task[0].sequence = undefined
    // this.handlingTaskLayer.render(this.vessel());
    this.handlingTaskLayer.render(this.vessel());
    this.updateQcTotalAmount();
    this.drawGanttChart();
    this.qcwpChange.emit(this.assignedTasks);
  }
  
  moveTask(fromIndex: number, toIndex: number): void {
    if (!this.selectedCrane || !this.assignedTasks[this.selectedCrane.id]) return;
    
    const tasks = this.assignedTasks[this.selectedCrane.id];
    const task = tasks.splice(fromIndex, 1)[0];
    tasks.splice(toIndex, 0, task);
    // this.handlingTaskLayer.render(this.vessel());
    this.drawGanttChart();
    this.handlingTaskLayer.render(this.vessel());
    this.updateQcTotalAmount();
    this.qcwpChange.emit(this.assignedTasks);
  }

  autoAssignTasks(): void {
    const cranes = this.cranes();
    if (cranes.length === 0 || this.tasks.length === 0) {
      alert('没有可用的岸桥或任务');
      return;
    }

    const result = this.qcwpService.autoAssignTasks(this.tasks, cranes, {
      unitTime: this.config.unitTime
    });

    this.assignedTasks = result.assignedTasks;

    // const qcTotalAmount: {[key: string]: number} = {}
    // Object.entries(this.assignedTasks).forEach(([craneId, tasks]) => {
    //   qcTotalAmount[craneId] = tasks.reduce((sum, task) => sum + task.amount, 0);
    // });

    // this.cranes().forEach(c => c.count = qcTotalAmount[c.id]);

    // 更新UI
    this.drawGanttChart();
    this.handlingTaskLayer.render(this.vessel());
    this.updateQcTotalAmount();
    // this.handlingTaskLayer.render(this.vessel());
    alert(`自动安排完成！预计总完成时间: ${result.completionTime.toFixed(1)} 分钟`);
    this.qcwpChange.emit(this.assignedTasks);
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
      const color = this.getCraneColor(craneId);
      
      tasks.forEach((task: HandlingTask) => {
        // 计算任务在甘特图中的位置
        const x = this.config.leftPadding + ((+task.bay) / 2) * this.config.bayWidth;
        const y = currentTime * this.config.timeHeight;
        
        // 计算任务的高度（时间）
        const taskTime = task.amount * this.config.unitTime;
        const height = taskTime * this.config.timeHeight;
        
        // 创建任务块 SVG 组
        const taskId = `${task.bay}-${task.dh}-${task.type}`
        const taskGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        taskGroup.setAttribute('data-task-id', taskId);
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
          console.log(`任务 ${taskId} 被点击`);
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
        bayText.textContent = `贝位: ${task.bay}`;
        
        // 添加文本 - 箱量
        const containerText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        containerText.setAttribute('x', x.toString());
        containerText.setAttribute('y', (y + height / 2 + 10).toString());
        containerText.setAttribute('text-anchor', 'middle');
        containerText.setAttribute('fill', '#fff');
        containerText.setAttribute('font-size', '10px');
        containerText.textContent = `${task.amount}箱`;
        
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
      const y = i * this.config.timeHeight * 30; // 每10分钟一条主线
      
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
      ctx.fillText(`${(i / 2).toFixed(1)} 小时`, 5, y - 5);
      
      // 绘制次要时间线
      ctx.lineWidth = 0.5;
      for (let j = 1; j < 3; j++) {
        const minorY = y + j * this.config.timeHeight * 10;
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
  
  getTaskColor(task: HandlingTask | null): string {
    if (!task) return '';
    const craneId = this.getTaskCraneId(task);
    if (craneId) {
      const colorIndex = (parseInt(craneId) - 1) % this.config.craneColors.length;
      return this.config.craneColors[colorIndex];
    }
    return '';
  }
  
  getCraneColor(craneId: string): string {
    const craneIdx = this.cranes().findIndex(c => c.id === craneId);
    let colorIndex = 0
    if (craneIdx) {
      colorIndex = (craneIdx) % this.config.craneColors.length;
    } 
    return this.config.craneColors[colorIndex];
  }
  
  // 添加切换折叠状态的方法
  toggleShipSide(): void {
    this.isShipSideCollapsed = !this.isShipSideCollapsed;
  }


  renderSvgHandlingTask(svgHost: SVGElement, data: Vessel) {
    // 清空现有SVG元素
    while (svgHost.firstChild) {
      svgHost.removeChild(svgHost.firstChild);
    }
  
    const width = this.shipSideConfig().width;
    const height = this.shipSideConfig().height;

     // 创建装船指令三角形
     data.handlingTasks?.forEach((task) => {
      let startY = 0;
      if (task.amount <= 0) return;
      if (task.type === 'load') {
        startY = task.dh == 'D' ? 6 * height : data.allHeight + 9 * height;

      } else {
        startY = task.dh == 'D' ? 2 * height : data.allHeight + 5 * height;

      }
      
      // 创建SVG三角形
      const triangle = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      // 创建文本元素显示装载数量
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');


      const x = this.shipSide.getBaynoX(+task.bay) + width / 2
      if (task.type === 'load') {
        triangle.setAttribute('points', 
          `${x},${startY} ${x + width/2},${startY + height} ${x + width},${startY}`
        );
        text.setAttribute('y', (startY - height).toString());
        // triangle.setAttribute('fill', '#007BFF');
      } else {
        triangle.setAttribute('points', 
        `${x},${startY} ${x + width/2},${startY - height} ${x + width},${startY}`);
        text.setAttribute('y', (startY + height).toString());
      // triangle.setAttribute('fill', 'rgb(255, 100, 100)');
      }

      if (task.assignedQcCode) {
        triangle.setAttribute('fill', this.getCraneColor(task.assignedQcCode));
      } else {
        triangle.setAttribute('fill','lightgrey');
      }

      
      triangle.setAttribute('stroke', 'black');
      triangle.setAttribute('stroke-width', '1');
      // 添加数据属性用于选择
      triangle.setAttribute('x', x.toString());
      triangle.setAttribute('y', startY.toString());
      triangle.setAttribute('data-task-id', `${task.bay}-${task.dh}-${task.type}`);
      
      
      text.setAttribute('x', (x + width/2).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('font-family', 'Arial');
      text.setAttribute('font-size', '18px');
      text.setAttribute('font-weight', 'lighter');
      text.setAttribute('fill', 'black');
      text.textContent = task.amount.toString();
      if (task.sequence) {
        text.textContent += `(${task.sequence})`
      }
      triangle.style.cursor = 'pointer';
      triangle.addEventListener('mouseup', () => {
        this.onHandlingTaskSelected([task]);
        console.log(`${task.type}指令: ${task.amount} 箱, 贝位: ${task.bay}`);
      });
      // triangle.addEventListener('click', () => {
      //   // this.onHandlingTaskSelected([task]);
      //   console.log(`${task.type}指令: ${task.amount} 箱, 贝位: ${task.bay}`);
      // });
      // // 添加交互效果
      // triangle.addEventListener('mouseover', () => {
      //   triangle.setAttribute('fill', '#0056b3');
      //   triangle.setAttribute('stroke-width', '2');
      // });
      
      
      // triangle.addEventListener('mouseout', () => {
      //   triangle.setAttribute('fill', '#007BFF');
      //   triangle.setAttribute('stroke-width', '1');
      // });
      


      
      // 将元素添加到SVG图层
      svgHost.appendChild(triangle);
      svgHost.appendChild(text);
    });
  }

  getSvgHandlingTaskLayer(layerName: string) {
    const svgRenderable = new SvgRenderable(
      (svgHost: SVGElement, data: Vessel) => {
        this.renderSvgHandlingTask(svgHost, data);
      }
    );
    svgRenderable.setSelectionChecker((selection) => {
      const selectedTasks: HandlingTask[] = [];
      // 遍历所有SVG元素
      svgRenderable.svgs.forEach((child) => {
        if (child instanceof SVGPolygonElement) {
          // 检查是否有任何点在选择框内
          let isIntersecting = false;
          const x = child.getAttribute('x');
          const y = child.getAttribute('y');
          if (!x || !y) return;
          if (+x >= selection.x && 
            +x <= selection.x + selection.w &&
            +y >= selection.y && 
            +y <= selection.y + selection.h) {
          isIntersecting = true;
          }
          if (isIntersecting) {
            // 获取关联的数据
            const taskId = child.getAttribute('data-task-id');
            if (!taskId) return;
            const v: Vessel = svgRenderable.getData();
            const task = v.handlingTasks?.find((t) => `${t.bay}-${t.dh}-${t.type}` === taskId && t.amount > 0);
            if (task) {
              selectedTasks.push(task);
            }
          }
        }
      });
      
      // 如果有选中的任务，触发事件
      console.log(selectedTasks)
      if (selectedTasks.length > 0) {
        this.onHandlingTaskSelected(selectedTasks)
        // this.onHandlingTaskSelected.emit(selectedTasks);
      }
      
      return selectedTasks;
    });
    
    const svgLayer = new SvgLayer<Vessel>(layerName);
    svgLayer.setPushMode()
      .setTrigger(this.vesselDataUpdateSubject)
      .addRenderable(svgRenderable);
    
    return svgLayer;
  }

  // 获取更深的颜色（用于边框高亮）
  getDarkerColor(color: string): string {
    // 如果是十六进制颜色
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      
      // 使颜色变暗 30%
      const darkerR = Math.max(0, Math.floor(r * 0.7));
      const darkerG = Math.max(0, Math.floor(g * 0.7));
      const darkerB = Math.max(0, Math.floor(b * 0.7));
      
      return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`;
    }
    
    // 如果是 rgb 或 rgba 颜色
    if (color.startsWith('rgb')) {
      const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1], 10);
        const g = parseInt(rgbMatch[2], 10);
        const b = parseInt(rgbMatch[3], 10);
        
        // 使颜色变暗 30%
        const darkerR = Math.max(0, Math.floor(r * 0.7));
        const darkerG = Math.max(0, Math.floor(g * 0.7));
        const darkerB = Math.max(0, Math.floor(b * 0.7));
        
        return `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
      }
    }
    
    // 默认返回原色
    return color;
  }

  changeCranes(): void {
    // 这里可以实现添加岸桥的逻辑
    // 例如打开一个对话框让用户输入岸桥信息
    console.log('添加岸桥');
    this.cranesChange.emit(this.cranes());
    // 如果你有事件发射器，可以触发一个事件通知父组件
    // this.addCraneRequest.emit();
  }


}


