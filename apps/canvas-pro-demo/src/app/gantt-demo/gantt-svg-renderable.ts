import { Renderable } from '@smuport/ngx-canvas-pro';
import { GanttTask, GanttConfig } from './gantt.model';

export class GanttSvgRenderable extends Renderable<GanttTask[]> {
  private tasks: GanttTask[] = [];
  private config: GanttConfig;
  private svgNamespace = 'http://www.w3.org/2000/svg';
  // 添加点击事件回调
  private onTaskClick: (task: GanttTask) => void = () => {};

  constructor(tasks: GanttTask[] = [], config: GanttConfig) {
    super();
    this.tasks = tasks;
    this.config = config;
  }

  // 设置任务点击事件处理函数
  setTaskClickHandler(handler: (task: GanttTask) => void): void {
    this.onTaskClick = handler;
  }

  override setData(data: GanttTask[]): void {
    super.setData(data);
    this.tasks = data;
  }

  override getData(): GanttTask[] {
    return this.tasks;
  }

  updateConfig(config: GanttConfig): void {
    this.config = config;
  }

  // 实现 Canvas 渲染方法
  render(ctx: OffscreenCanvasRenderingContext2D): void {
    // 不在 Canvas 上渲染任何内容
  }

  // 实现 SVG 渲染方法
  renderSvg(svgRoot: SVGElement): SVGElement {
    // 清除现有内容
    while (svgRoot.firstChild) {
      svgRoot.removeChild(svgRoot.firstChild);
    }
    
    // 确保 SVG 元素可以接收鼠标事件
    svgRoot.style.pointerEvents = 'auto';
    
    const { startDate, columnWidth, rowHeight, headerHeight, colors } = this.config;
    
    // 添加日期刻度文本
    this.renderDateScale(svgRoot);
    
    // 渲染每个任务
    this.tasks.forEach((task, index) => {
      const y = headerHeight + index * rowHeight;
      
      // 计算任务开始和结束的 x 坐标
      const startDays = this.getDaysDifference(startDate, task.startDate);
      const endDays = this.getDaysDifference(startDate, task.endDate);
      const taskWidth = (endDays - startDays) * columnWidth;
      const x = startDays * columnWidth;
      
      // 创建任务组，用于包装任务相关元素
      const taskGroup = document.createElementNS(this.svgNamespace, 'g');
      taskGroup.setAttribute('class', 'task-group');
      taskGroup.setAttribute('data-task-id', task.id);
      
      // 创建任务矩形
      const taskRect = document.createElementNS(this.svgNamespace, 'rect') as SVGRectElement;
      taskRect.setAttribute('x', x.toString());
      taskRect.setAttribute('y', (y + rowHeight * 0.2).toString());
      taskRect.setAttribute('width', taskWidth.toString());
      taskRect.setAttribute('height', (rowHeight * 0.6).toString());
      taskRect.setAttribute('rx', '3');
      taskRect.setAttribute('ry', '3');
      taskRect.setAttribute('fill', task.color || colors.taskDefault);
      taskRect.setAttribute('stroke', colors.taskBorder);
      taskRect.setAttribute('stroke-width', '1');
      taskRect.setAttribute('cursor', 'pointer');
      taskRect.style.pointerEvents = 'auto';
      
      // 添加点击事件监听器
      taskRect.addEventListener('click', (event) => {
        event.stopPropagation();
        this.onTaskClick(task);
      });
      
      taskGroup.appendChild(taskRect);
      
      // 创建进度条
      if (task.progress > 0) {
        const progressRect = document.createElementNS(this.svgNamespace, 'rect') as SVGRectElement;
        progressRect.setAttribute('x', x.toString());
        progressRect.setAttribute('y', (y + rowHeight * 0.2).toString());
        progressRect.setAttribute('width', (taskWidth * task.progress / 100).toString());
        progressRect.setAttribute('height', (rowHeight * 0.6).toString());
        progressRect.setAttribute('rx', '3');
        progressRect.setAttribute('ry', '3');
        progressRect.setAttribute('fill', this.darkenColor(task.color || colors.taskDefault, 20));
        progressRect.style.pointerEvents = 'none';; // 进度条不接收事件
        taskGroup.appendChild(progressRect);
      }
      
      // 创建任务名称文本
      const taskText = document.createElementNS(this.svgNamespace, 'text') as SVGTextElement;
      taskText.setAttribute('x', (x + 5).toString());
      taskText.setAttribute('y', (y + rowHeight * 0.6).toString());
      taskText.setAttribute('fill', colors.text);
      taskText.setAttribute('font-size', '12px');
      taskText.setAttribute('font-family', 'Arial, sans-serif');
      taskText.textContent = task.name;
      taskText.style.pointerEvents = 'none'; // 文本不接收事件
      taskGroup.appendChild(taskText);
      
      svgRoot.appendChild(taskGroup);
      
      // 渲染依赖关系
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach(depId => {
          const depTask = this.tasks.find(t => t.id === depId);
          if (depTask) {
            const depIndex = this.tasks.indexOf(depTask);
            const depY = headerHeight + depIndex * rowHeight;
            const depEndDays = this.getDaysDifference(startDate, depTask.endDate);
            const depEndX = depEndDays * columnWidth;
            
            // 创建依赖线
            const path = document.createElementNS(this.svgNamespace, 'path') as SVGPathElement;
            const d = `M ${depEndX} ${depY + rowHeight * 0.5} 
                       L ${depEndX + 10} ${depY + rowHeight * 0.5} 
                       L ${depEndX + 10} ${y + rowHeight * 0.5} 
                       L ${x} ${y + rowHeight * 0.5}`;
            path.setAttribute('d', d);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', '#999');
            path.setAttribute('stroke-width', '1');
            path.setAttribute('marker-end', 'url(#arrowhead)');
            path.style.pointerEvents = 'none'; // 依赖线不接收事件
            svgRoot.appendChild(path);
          }
        });
      }
    });
    
    // 添加箭头标记定义
    const defs = document.createElementNS(this.svgNamespace, 'defs');
    const marker = document.createElementNS(this.svgNamespace, 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '0');
    marker.setAttribute('refY', '3.5');
    marker.setAttribute('orient', 'auto');
    
    const polygon = document.createElementNS(this.svgNamespace, 'polygon');
    polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
    polygon.setAttribute('fill', '#999');
    
    marker.appendChild(polygon);
    defs.appendChild(marker);
    svgRoot.appendChild(defs);
    
    return svgRoot;
  }

  // 渲染日期刻度
  private renderDateScale(svgRoot: SVGElement): void {
    const { startDate, endDate, columnWidth, headerHeight, colors } = this.config;
    
    // 计算总天数
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // 渲染日期刻度
    for (let day = 0; day <= totalDays; day++) {
      const x = day * columnWidth;
      
      // 获取当前日期
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      
      // 创建日期文本
      const dateText = document.createElementNS(this.svgNamespace, 'text');
      dateText.setAttribute('x', (x + 5).toString());
      dateText.setAttribute('y', (headerHeight * 0.5).toString());
      dateText.setAttribute('fill', colors.text);
      dateText.setAttribute('font-size', '12px');
      dateText.setAttribute('font-family', 'Arial, sans-serif');
      
      // 格式化日期
      const dateStr = `${currentDate.getDate()}/${currentDate.getMonth() + 1}`;
      dateText.textContent = dateStr;
      
      svgRoot.appendChild(dateText);
      
      // 如果是月份的第一天，添加月份标签
      if (currentDate.getDate() === 1 || day === 0) {
        const monthText = document.createElementNS(this.svgNamespace, 'text');
        monthText.setAttribute('x', (x + 5).toString());
        monthText.setAttribute('y', (headerHeight * 0.25).toString());
        monthText.setAttribute('fill', colors.text);
        monthText.setAttribute('font-size', '14px');
        monthText.setAttribute('font-weight', 'bold');
        monthText.setAttribute('font-family', 'Arial, sans-serif');
        
        // 格式化月份
        const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
        monthText.textContent = monthNames[currentDate.getMonth()];
        
        svgRoot.appendChild(monthText);
      }
    }
  }

  extractData(data: any): GanttTask[] {
    if (data && Array.isArray(data)) {
      return data;
    }
    return this.tasks;
  }

  // override intersects(selection: { x: number; y: number; w: number; h: number }): boolean {
  //   // 简单实现：检查是否有任务在选择框内
  //   return this.tasks.some(task => {
  //     const startDays = this.getDaysDifference(this.config.startDate, task.startDate);
  //     const endDays = this.getDaysDifference(this.config.startDate, task.endDate);
  //     const x = startDays * this.config.columnWidth;
  //     const width = (endDays - startDays) * this.config.columnWidth;
      
  //     // 找到任务在列表中的索引
  //     const index = this.tasks.indexOf(task);
  //     const y = this.config.headerHeight + index * this.config.rowHeight;
  //     const height = this.config.rowHeight;
      
  //     // 检查矩形相交
  //     return !(
  //       x + width < selection.x ||
  //       x > selection.x + selection.w ||
  //       y + height < selection.y ||
  //       y > selection.y + selection.h
  //     );
  //   });
  // }

  // 计算两个日期之间的天数差
  private getDaysDifference(date1: Date, date2: Date): number {
    return Math.ceil((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
  }

  // 使颜色变暗的辅助函数
  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    
    return '#' + (
      0x1000000 +
      (R < 0 ? 0 : R) * 0x10000 +
      (G < 0 ? 0 : G) * 0x100 +
      (B < 0 ? 0 : B)
    ).toString(16).slice(1);
  }
}