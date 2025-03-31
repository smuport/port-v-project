import { Renderable } from '@smuport/ngx-canvas-pro';
import { GanttConfig } from './gantt.model';

export class GridRenderable extends Renderable<GanttConfig> {
  private config: GanttConfig;

  constructor(config: GanttConfig) {
    super();
    this.config = config;
  }

  override setData(data: GanttConfig): void {
    super.setData(data);
    this.config = data;
  }

  override getData(): GanttConfig {
    return this.config;
  }

  updateConfig(config: GanttConfig): void {
    this.config = config;
  }

  render(ctx: OffscreenCanvasRenderingContext2D): void {
    const { startDate, endDate, rowHeight, columnWidth, headerHeight, colors } = this.config;
    
    // 计算总天数
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // 计算总宽度和高度
    const totalWidth = totalDays * columnWidth;
    const totalHeight = 1500; // 假设最多显示30个任务
    
    // 绘制背景
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, totalWidth, totalHeight);
    
    // 绘制水平网格线
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 0.5;
    
    for (let y = headerHeight; y <= totalHeight; y += rowHeight) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(totalWidth, y);
      ctx.stroke();
    }
    
    // 绘制垂直网格线（每天一条）
    for (let day = 0; day <= totalDays; day++) {
      const x = day * columnWidth;
      
      // 获取当前日期
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      
      // 判断是否是周末
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      
      // 判断是否是今天
      const isToday = this.isToday(currentDate);
      
      // 绘制日期背景
      if (isWeekend) {
        ctx.fillStyle = colors.weekend;
        ctx.fillRect(x, 0, columnWidth, totalHeight);
      } else if (isToday) {
        ctx.fillStyle = colors.today;
        ctx.fillRect(x, 0, columnWidth, totalHeight);
      }
      
      // 绘制垂直线
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, totalHeight);
      ctx.stroke();
    }
  }

  extractData(data: any): GanttConfig {
    if (data && data.startDate) {
      return data;
    }
    return this.config;
  }

  // 实现 SVG 渲染方法（空实现，因为我们只使用 Canvas 渲染网格）
  renderSvg(svgRoot: SVGElement): SVGElement {
    return svgRoot;
  }

  // 判断日期是否是今天
  private isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }
}