// 地图图层类
import { Layer } from '@smuport/ngx-canvas-pro';
import { of } from 'rxjs';

// 地图格子接口
interface GridCell {
  x: number;
  y: number;
  width: number;
  height: number;
  number: number;
}

export class MapLayer extends Layer {
  private gridSize = 2000; // 网格总大小
  private cellSize = 10; // 每个格子大小
  private visibleCells: GridCell[] = []; // 可见格子

  constructor(name: string) {
    // 创建1000x1000的离屏画布
    super(name, 1000, 1000);
    // 初始化
  }

  // 更新可见区域的格子
  updateVisibleCells(viewport: { x: number; y: number; width: number; height: number }): void {
    // 清空可见格子
    this.visibleCells = [];

    // 计算可见区域的格子范围
    const startX = Math.max(0, Math.floor(viewport.x / this.cellSize));
    const startY = Math.max(0, Math.floor(viewport.y / this.cellSize));
    const endX = Math.min(this.gridSize / this.cellSize - 1, Math.ceil((viewport.x + viewport.width) / this.cellSize));
    const endY = Math.min(this.gridSize / this.cellSize - 1, Math.ceil((viewport.y + viewport.height) / this.cellSize));

    // 生成可见格子
    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const cell: GridCell = {
          x: x * this.cellSize,
          y: y * this.cellSize,
          width: this.cellSize,
          height: this.cellSize,
          number: y * (this.gridSize / this.cellSize) + x
        };
        this.visibleCells.push(cell);
      }
    }

    // 触发重新渲染
    this.setTrigger(of(null));
  }

  override render(data: any): void {
    if (!this.ctx) return;
    
    // 清除画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 渲染可见格子
    this.visibleCells.forEach(cell => {
      this.renderCell(cell);
    });
  }

  private renderCell(cell: GridCell): void {
    if (!this.ctx) return;

    // 绘制格子边框
    this.ctx.strokeStyle = '#ccc';
    this.ctx.lineWidth = 0.5;
    this.ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);

    // 绘制格子编号
    this.ctx.fillStyle = '#333';
    this.ctx.font = '8px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(
      cell.number.toString(),
      cell.x + cell.width / 2,
      cell.y + cell.height / 2
    );
  }
}// 地图图层类