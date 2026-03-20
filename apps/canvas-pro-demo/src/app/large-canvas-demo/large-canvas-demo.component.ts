import { Component, OnInit, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CanvasProComponent,
  Layer,
  CustomRenderable,
  ViewportInteractionConfig,
  CpDbClickEvent,
} from '@smuport/ngx-canvas-pro';
import { TransformService } from '@smuport/ngx-canvas-pro';
import { BehaviorSubject, of, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 超大画布 Demo - 性能优化版
 * 
 * 使用两个 Layer 分离渲染：
 * 1. Grid Layer: 绘制超大网格和方块（使用 tiles，只渲染一次）
 * 2. Overlay Layer: 绘制高亮框（普通 canvas，频繁更新）
 */
@Component({
  selector: 'app-large-canvas-demo',
  standalone: true,
  imports: [CommonModule, CanvasProComponent],
  template: `
    <div class="demo-container">
      <div class="info-panel">
        <h2>超大画布渲染 Demo</h2>
        <div class="stats">
          <div class="stat-item">
            <label>画布尺寸:</label>
            <span>{{ canvasWidth }} x {{ canvasHeight }} px</span>
          </div>
          <div class="stat-item">
            <label>Grid Tiles:</label>
            <span>{{ tileCount }}</span>
          </div>
          <div class="stat-item">
            <label>图形数量:</label>
            <span>{{ rectCount }}</span>
          </div>
          <div class="stat-item">
            <label>使用 Tiles:</label>
            <span [class.active]="isUsingTiles">{{ isUsingTiles ? '是' : '否' }}</span>
          </div>
        </div>
        <div class="controls">
          <button (click)="regenerate()">重新生成</button>
          <button (click)="clearSelection()">清除高亮</button>
          <button (click)="zoomToFit()">适应视图</button>
        </div>
        <div class="legend">
          <h4>操作说明:</h4>
          <ul>
            <li>按住 Shift + 滚轮: 缩放</li>
            <li>按住 Shift + 拖拽: 平移</li>
            <li>双击方块: 高亮显示</li>
          </ul>
        </div>
        <div class="performance-note">
          <small>✓ 使用双 Layer 架构，高亮不影响 Grid 性能</small>
        </div>
      </div>
      
      <div class="canvas-wrapper">
        <canvas-pro
          #canvasPro
          [interactionConfig]="interactionConfig"
          style="width: 100%; height: 100%;"
        ></canvas-pro>
        
        <div class="mini-map" *ngIf="isUsingTiles">
          <div class="mini-map-title">Tiles 分布</div>
          <div class="tiles-preview">
            <div 
              *ngFor="let tile of tiles; let i = index" 
              class="tile-indicator"
              [style.left.%]="(tile.x / canvasWidth) * 100"
              [style.top.%]="(tile.y / canvasHeight) * 100"
              [style.width.%]="(tile.width / canvasWidth) * 100"
              [style.height.%]="(tile.height / canvasHeight) * 100"
              [title]="'Tile ' + i + ': (' + tile.x + ',' + tile.y + ') ' + tile.width + 'x' + tile.height"
            ></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .demo-container {
      display: flex;
      height: 100vh;
      background: #f5f5f5;
    }
    
    .info-panel {
      width: 300px;
      padding: 20px;
      background: white;
      border-right: 1px solid #ddd;
      box-shadow: 2px 0 4px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    h2 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 20px;
    }
    
    .stats {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .stat-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 4px;
    }
    
    .stat-item label {
      font-weight: 500;
      color: #666;
    }
    
    .stat-item span {
      color: #333;
      font-family: monospace;
    }
    
    .stat-item span.active {
      color: #52c41a;
      font-weight: bold;
    }
    
    .controls {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    button {
      padding: 10px 16px;
      border: 1px solid #d9d9d9;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    button:hover {
      border-color: #40a9ff;
      color: #40a9ff;
    }
    
    button:active {
      background: #e6f7ff;
    }
    
    .legend {
      padding: 12px;
      background: #f8f9fa;
      border-radius: 4px;
    }
    
    .legend h4 {
      margin: 0 0 10px 0;
      color: #333;
    }
    
    .legend ul {
      margin: 0;
      padding-left: 20px;
      color: #666;
      font-size: 14px;
    }
    
    .legend li {
      margin: 4px 0;
    }
    
    .performance-note {
      padding: 8px 12px;
      background: #f6ffed;
      border: 1px solid #b7eb8f;
      border-radius: 4px;
      color: #52c41a;
    }
    
    .canvas-wrapper {
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    
    .mini-map {
      position: absolute;
      bottom: 20px;
      right: 20px;
      width: 200px;
      height: 120px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      padding: 10px;
    }
    
    .mini-map-title {
      font-size: 12px;
      font-weight: 500;
      color: #666;
      margin-bottom: 8px;
      text-align: center;
    }
    
    .tiles-preview {
      position: relative;
      width: 100%;
      height: calc(100% - 24px);
      background: #f5f5f5;
      border: 1px solid #e8e8e8;
    }
    
    .tile-indicator {
      position: absolute;
      background: #1890ff;
      border: 1px solid #096dd9;
      opacity: 0.6;
      transition: opacity 0.2s;
    }
    
    .tile-indicator:hover {
      opacity: 0.9;
      background: #40a9ff;
    }
  `]
})
export class LargeCanvasDemoComponent implements OnInit, AfterViewInit {
  @ViewChild('canvasPro', { static: true }) canvasPro!: CanvasProComponent;

  // 画布尺寸
  canvasWidth = 50000;
  canvasHeight = 3000;
  
  // 统计信息
  tileCount = 0;
  rectCount = 0;
  isUsingTiles = false;
  tiles: Array<{x: number, y: number, width: number, height: number}> = [];
  
  // 数据流 - Grid Layer 用（只包含静态数据）
  private gridDataSubject = new BehaviorSubject<GridData>({
    rects: []
  });
  
  // 数据流 - Overlay Layer 用（只包含选中状态）
  private overlayDataSubject = new BehaviorSubject<OverlayData>({
    selectedRect: null
  });
  
  // 所有方块数据（内存中保留，用于点击检测）
  private allRects: LargeRect[] = [];
  
  // 交互配置
  interactionConfig: ViewportInteractionConfig = {
    drag: {
      default: 'none',
      shift: 'pan',
      ctrl: 'none',
      alt: 'none',
    },
    wheel: {
      default: 'none',
      shift: 'zoom',
      ctrl: 'none',
      alt: 'none',
    },
  };

  private gridLayer!: Layer<GridData>;
  private overlayLayer!: Layer<OverlayData>;

  constructor(
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.generateData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.setupLayers();
      this.cdr.detectChanges();
    });
  }

  /**
   * 生成随机数据
   */
  generateData() {
    const rects: LargeRect[] = [];
    const cols = 1000;
    const rows = 60;
    const cellWidth = this.canvasWidth / cols;
    const cellHeight = this.canvasHeight / rows;
    
    // 生成网格状彩色方块
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (Math.random() > 0.3) {
          const hue = (col / cols) * 360;
          const saturation = 60 + Math.random() * 30;
          const lightness = 40 + Math.random() * 40;
          
          rects.push({
            id: `rect-${row}-${col}`,
            x: col * cellWidth + 2,
            y: row * cellHeight + 2,
            width: cellWidth - 4,
            height: cellHeight - 4,
            color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
            row,
            col
          });
        }
      }
    }
    
    // 添加一些大圆形作为装饰
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * this.canvasWidth;
      const y = Math.random() * this.canvasHeight;
      const radius = 20 + Math.random() * 50;
      
      rects.push({
        id: `circle-${i}`,
        x,
        y,
        width: radius * 2,
        height: radius * 2,
        color: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.3)`,
        row: -1,
        col: -1,
        isCircle: true,
        radius
      });
    }
    
    this.allRects = rects;
    this.rectCount = rects.length;
    
    // 更新 Grid Layer 数据
    this.gridDataSubject.next({ rects });
  }

  /**
   * 设置图层 - 使用双 Layer 架构
   */
  setupLayers() {
    // 1. 创建 Grid Layer（超大画布，使用 tiles）
    this.gridLayer = new Layer<GridData>('grid-layer', this.canvasWidth, this.canvasHeight);
    this.gridLayer.setPushMode();
    this.gridLayer.setTrigger(this.gridDataSubject);
    
    // 设置 Grid 渲染器
    const gridRenderable = new CustomRenderable<GridData>(
      (ctx, data) => this.renderGrid(ctx, data)
    );
    this.gridLayer.addRenderable(gridRenderable);
    
    // 获取 tiles 信息用于显示
    this.isUsingTiles = this.gridLayer.isUsingTiles();
    this.tiles = this.gridLayer.getTiles().map(t => ({
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height
    }));
    this.tileCount = this.tiles.length;
    
    // 2. 创建 Overlay Layer（高亮框，不使用 tiles）
    const overlayWidth = 50000;
    const overlayHeight = 3000;
    this.overlayLayer = new Layer<OverlayData>('overlay-layer', overlayWidth, overlayHeight);
    this.overlayLayer.setPushMode();
    this.overlayLayer.setTrigger(this.overlayDataSubject);
    
    // 设置 Overlay 渲染器
    const overlayRenderable = new CustomRenderable<OverlayData>(
      (ctx, data) => this.renderOverlay(ctx, data)
    );
    this.overlayLayer.addRenderable(overlayRenderable);
    
    // 3. 添加点击事件到 Grid Layer
    this.overlayLayer.addEventListener('dbclick', (evt: CpDbClickEvent) => {
      this.handleClick(evt);
    });
    
    // 4. 添加两个 Layer 到 CanvasPro（注意顺序：Grid 在下，Overlay 在上）
    this.canvasPro.addLayer(this.gridLayer);
    this.canvasPro.addLayer(this.overlayLayer);
    
    // 5. 启动（不启动动画，因为 Grid 是静态的，Overlay 通过数据流更新）
    this.canvasPro.startDataflow();
    this.canvasPro.startAnimation(); // 禁用持续动画循环
    this.canvasPro.startListenEvent();
    
    // 适应视图
    setTimeout(() => this.zoomToFit(), 100);
  }

  /**
   * 渲染 Grid Layer - 只绘制一次，不常变
   */
  private renderGrid(ctx: OffscreenCanvasRenderingContext2D, data: GridData) {
    // 清空画布
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    // 绘制网格线
    this.drawGridLines(ctx);
    
    // 绘制坐标轴标签
    this.drawAxisLabels(ctx);
    
    // 绘制所有方块
    for (const rect of data.rects) {
      this.drawRect(ctx, rect);
    }
  }

  /**
   * 渲染 Overlay Layer - 只绘制高亮框，频繁更新
   */
  private renderOverlay(ctx: OffscreenCanvasRenderingContext2D, data: OverlayData) {
    // 清空画布（透明）
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    // 只绘制选中框
    if (data.selectedRect) {
      const rect = data.selectedRect;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 15;
      ctx.strokeRect(
        rect.x - 3,
        rect.y - 3,
        rect.width + 6,
        rect.height + 6
      );
      ctx.shadowBlur = 0;
      
      // 绘制标签背景
      const label = `Row ${rect.row + 1}, Col ${rect.col + 1}`;
      ctx.font = 'bold 14px Arial';
      const textMetrics = ctx.measureText(label);
      const textWidth = textMetrics.width;
      const textHeight = 20;
      const padding = 6;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(
        rect.x,
        rect.y - textHeight - padding * 2,
        textWidth + padding * 2,
        textHeight + padding
      );
      
      // 绘制标签文字
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, rect.x + padding, rect.y - textHeight / 2 - padding);
    }
    console.log('Overlay rendered with selectedRect:', data.selectedRect ? data.selectedRect.id : 'none');
  }

  /**
   * 绘制网格线
   */
  private drawGridLines(ctx: OffscreenCanvasRenderingContext2D) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    // 垂直线
    for (let x = 0; x <= this.canvasWidth; x += 1000) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvasHeight);
      ctx.stroke();
    }
    
    // 水平线
    for (let y = 0; y <= this.canvasHeight; y += 500) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvasWidth, y);
      ctx.stroke();
    }
  }

  /**
   * 绘制坐标轴标签
   */
  private drawAxisLabels(ctx: OffscreenCanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // X 轴标签
    for (let x = 0; x <= this.canvasWidth; x += 5000) {
      ctx.fillText(`${x / 1000}k`, x, 10);
    }
    
    // Y 轴标签
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let y = 0; y <= this.canvasHeight; y += 1000) {
      ctx.fillText(`${y}`, 10, y);
    }
  }

  /**
   * 绘制单个方块
   */
  private drawRect(ctx: OffscreenCanvasRenderingContext2D, rect: LargeRect) {
    ctx.fillStyle = rect.color;
    
    if (rect.isCircle && rect.radius) {
      ctx.beginPath();
      ctx.arc(rect.x + rect.radius, rect.y + rect.radius, rect.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      this.roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  /**
   * 绘制圆角矩形路径
   */
  private roundRect(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * 处理双击事件
   */
  private handleClick(evt: CpDbClickEvent): void {
    const axis = evt.getAxis();
    const clickPoint = { x: axis.x, y: axis.y };
    
    console.log('[Click] Click at Layer coordinates:', clickPoint);
    console.log('[Click] Canvas size:', this.canvasWidth, 'x', this.canvasHeight);
    
    // 检查坐标范围是否合理
    if (clickPoint.x < 0 || clickPoint.x > this.canvasWidth || 
        clickPoint.y < 0 || clickPoint.y > this.canvasHeight) {
      console.error('[Click] Coordinate out of bounds!');
    }
    
    // 查找点击的方块
    let clickedRect: LargeRect | null = null;
    let checkCount = 0;
    
    for (let i = this.allRects.length - 1; i >= 0; i--) {
      const rect = this.allRects[i];
      checkCount++;
      
      // 只检查可见范围内的方块（优化）
      if (rect.x > clickPoint.x + 100 || rect.x + rect.width < clickPoint.x - 100 ||
          rect.y > clickPoint.y + 100 || rect.y + rect.height < clickPoint.y - 100) {
        continue;
      }
      
      if (this.containsPoint(rect, clickPoint)) {
        clickedRect = rect;
        console.log('[Click] Found rect:', rect.id, 'at', rect.x, rect.y, 'size', rect.width, rect.height);
        break;
      }
    }
    
    console.log('[Click] Checked', checkCount, 'rects');
    
    if (!clickedRect) {
      console.log('[Click] No rect found at', clickPoint);
    }
    
    // 只更新 Overlay Layer，不触发 Grid Layer 重绘
    this.overlayDataSubject.next({
      selectedRect: clickedRect
    });
    
    if (clickedRect) {
      console.log('Selected:', clickedRect.id);
    }
  }

  /**
   * 判断点是否在矩形内
   */
  private containsPoint(rect: LargeRect, point: { x: number; y: number }): boolean {
    return point.x >= rect.x && 
           point.x <= rect.x + rect.width &&
           point.y >= rect.y && 
           point.y <= rect.y + rect.height;
  }

  /**
   * 清除高亮
   */
  clearSelection() {
    this.overlayDataSubject.next({ selectedRect: null });
  }

  /**
   * 重新生成数据
   */
  regenerate() {
    this.generateData();
    // 清除高亮
    this.clearSelection();
  }

  /**
   * 适应视图
   */
  zoomToFit() {
    this.canvasPro.fitViewportToParent();
  }
}

/**
 * Grid Layer 数据接口
 */
interface GridData {
  rects: LargeRect[];
}

/**
 * Overlay Layer 数据接口
 */
interface OverlayData {
  selectedRect: LargeRect | null;
}

/**
 * 矩形数据接口
 */
interface LargeRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  row: number;
  col: number;
  isCircle?: boolean;
  radius?: number;
}
