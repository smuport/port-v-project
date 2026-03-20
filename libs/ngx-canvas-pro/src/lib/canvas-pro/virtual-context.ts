import { LayerTile } from './layer';

/**
 * 路径操作类型
 */
type PathOperation =
  | { type: 'moveTo'; x: number; y: number }
  | { type: 'lineTo'; x: number; y: number }
  | { type: 'bezierCurveTo'; cp1x: number; cp1y: number; cp2x: number; cp2y: number; x: number; y: number }
  | { type: 'quadraticCurveTo'; cpx: number; cpy: number; x: number; y: number }
  | { type: 'arc'; x: number; y: number; radius: number; startAngle: number; endAngle: number; counterclockwise?: boolean }
  | { type: 'arcTo'; x1: number; y1: number; x2: number; y2: number; radius: number }
  | { type: 'ellipse'; x: number; y: number; radiusX: number; radiusY: number; rotation: number; startAngle: number; endAngle: number; counterclockwise?: boolean }
  | { type: 'rect'; x: number; y: number; width: number; height: number }
  | { type: 'closePath' };

/**
 * Canvas 状态接口
 */
interface CanvasState {
  transform: DOMMatrix;
  clipPath: Path2D | null;
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  miterLimit: number;
  lineDash: number[];
  lineDashOffset: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  direction: CanvasDirection;
  globalAlpha: number;
  globalCompositeOperation: GlobalCompositeOperation;
  imageSmoothingEnabled: boolean;
  imageSmoothingQuality: ImageSmoothingQuality;
  filter: string;
}

/**
 * 虚拟 Canvas 2D 上下文
 * 
 * 将绘制命令自动分发到多个 tiles，对用户透明
 * 解决超大画布（超过浏览器 canvas 尺寸限制）的渲染问题
 */
export class VirtualContext {
  // 关联的 tiles
  private tiles: LayerTile[];
  
  // Layer 总尺寸
  private layerWidth: number;
  private layerHeight: number;
  
  // 状态堆栈
  private stateStack: CanvasState[] = [];
  
  // 当前状态
  private currentState: CanvasState;
  
  // 路径缓存
  private pathOperations: PathOperation[] = [];
  private isPathOpen = false;
  
  // canvas 代理对象
  private canvasProxy: {
    width: number;
    height: number;
    ownerContext: VirtualContext;
  };

  constructor(tiles: LayerTile[], layerWidth: number, layerHeight: number) {
    this.tiles = tiles;
    this.layerWidth = layerWidth;
    this.layerHeight = layerHeight;
    
    this.currentState = this.createDefaultState();
    
    this.canvasProxy = {
      width: layerWidth,
      height: layerHeight,
      ownerContext: this
    };
  }

  /**
   * 创建默认状态
   */
  private createDefaultState(): CanvasState {
    const matrix = new DOMMatrix();
    matrix.a = 1; matrix.b = 0; matrix.c = 0;
    matrix.d = 1; matrix.e = 0; matrix.f = 0;
    
    return {
      transform: matrix,
      clipPath: null,
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      miterLimit: 10,
      lineDash: [],
      lineDashOffset: 0,
      shadowColor: 'rgba(0, 0, 0, 0)',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      direction: 'inherit',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'low',
      filter: 'none'
    };
  }

  // ==================== 属性访问器 ====================
  
  get canvas(): typeof this.canvasProxy {
    return this.canvasProxy;
  }

  // ==================== 样式属性代理 ====================
  
  get fillStyle(): string | CanvasGradient | CanvasPattern {
    return this.currentState.fillStyle;
  }
  
  set fillStyle(value: string | CanvasGradient | CanvasPattern) {
    this.currentState.fillStyle = value;
    this.syncStateToTiles('fillStyle', value);
  }
  
  get strokeStyle(): string | CanvasGradient | CanvasPattern {
    return this.currentState.strokeStyle;
  }
  
  set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
    this.currentState.strokeStyle = value;
    this.syncStateToTiles('strokeStyle', value);
  }
  
  get lineWidth(): number {
    return this.currentState.lineWidth;
  }
  
  set lineWidth(value: number) {
    this.currentState.lineWidth = value;
    this.syncStateToTiles('lineWidth', value);
  }
  
  get lineCap(): CanvasLineCap {
    return this.currentState.lineCap;
  }
  
  set lineCap(value: CanvasLineCap) {
    this.currentState.lineCap = value;
    this.syncStateToTiles('lineCap', value);
  }
  
  get lineJoin(): CanvasLineJoin {
    return this.currentState.lineJoin;
  }
  
  set lineJoin(value: CanvasLineJoin) {
    this.currentState.lineJoin = value;
    this.syncStateToTiles('lineJoin', value);
  }
  
  get miterLimit(): number {
    return this.currentState.miterLimit;
  }
  
  set miterLimit(value: number) {
    this.currentState.miterLimit = value;
    this.syncStateToTiles('miterLimit', value);
  }
  
  get shadowColor(): string {
    return this.currentState.shadowColor;
  }
  
  set shadowColor(value: string) {
    this.currentState.shadowColor = value;
    this.syncStateToTiles('shadowColor', value);
  }
  
  get shadowBlur(): number {
    return this.currentState.shadowBlur;
  }
  
  set shadowBlur(value: number) {
    this.currentState.shadowBlur = value;
    this.syncStateToTiles('shadowBlur', value);
  }
  
  get shadowOffsetX(): number {
    return this.currentState.shadowOffsetX;
  }
  
  set shadowOffsetX(value: number) {
    this.currentState.shadowOffsetX = value;
    this.syncStateToTiles('shadowOffsetX', value);
  }
  
  get shadowOffsetY(): number {
    return this.currentState.shadowOffsetY;
  }
  
  set shadowOffsetY(value: number) {
    this.currentState.shadowOffsetY = value;
    this.syncStateToTiles('shadowOffsetY', value);
  }
  
  get font(): string {
    return this.currentState.font;
  }
  
  set font(value: string) {
    this.currentState.font = value;
    this.syncStateToTiles('font', value);
  }
  
  get textAlign(): CanvasTextAlign {
    return this.currentState.textAlign;
  }
  
  set textAlign(value: CanvasTextAlign) {
    this.currentState.textAlign = value;
    this.syncStateToTiles('textAlign', value);
  }
  
  get textBaseline(): CanvasTextBaseline {
    return this.currentState.textBaseline;
  }
  
  set textBaseline(value: CanvasTextBaseline) {
    this.currentState.textBaseline = value;
    this.syncStateToTiles('textBaseline', value);
  }
  
  get direction(): CanvasDirection {
    return this.currentState.direction;
  }
  
  set direction(value: CanvasDirection) {
    this.currentState.direction = value;
    this.syncStateToTiles('direction', value);
  }
  
  get globalAlpha(): number {
    return this.currentState.globalAlpha;
  }
  
  set globalAlpha(value: number) {
    this.currentState.globalAlpha = value;
    this.syncStateToTiles('globalAlpha', value);
  }
  
  get globalCompositeOperation(): GlobalCompositeOperation {
    return this.currentState.globalCompositeOperation;
  }
  
  set globalCompositeOperation(value: GlobalCompositeOperation) {
    this.currentState.globalCompositeOperation = value;
    this.syncStateToTiles('globalCompositeOperation', value);
  }
  
  get imageSmoothingEnabled(): boolean {
    return this.currentState.imageSmoothingEnabled;
  }
  
  set imageSmoothingEnabled(value: boolean) {
    this.currentState.imageSmoothingEnabled = value;
    this.syncStateToTiles('imageSmoothingEnabled', value);
  }
  
  get imageSmoothingQuality(): ImageSmoothingQuality {
    return this.currentState.imageSmoothingQuality;
  }
  
  set imageSmoothingQuality(value: ImageSmoothingQuality) {
    this.currentState.imageSmoothingQuality = value;
    this.syncStateToTiles('imageSmoothingQuality', value);
  }
  
  get filter(): string {
    return this.currentState.filter;
  }
  
  set filter(value: string) {
    this.currentState.filter = value;
    this.syncStateToTiles('filter', value);
  }

  // ==================== 状态同步 ====================
  
  private syncStateToTiles<K extends keyof CanvasState>(key: K, value: CanvasState[K]): void {
    for (const tile of this.tiles) {
      (tile.ctx as any)[key] = value;
    }
  }
  
  private applyFullStateToTile(tileCtx: OffscreenCanvasRenderingContext2D): void {
    const state = this.currentState;
    
    tileCtx.fillStyle = state.fillStyle;
    tileCtx.strokeStyle = state.strokeStyle;
    tileCtx.lineWidth = state.lineWidth;
    tileCtx.lineCap = state.lineCap;
    tileCtx.lineJoin = state.lineJoin;
    tileCtx.miterLimit = state.miterLimit;
    tileCtx.setLineDash(state.lineDash);
    tileCtx.lineDashOffset = state.lineDashOffset;
    tileCtx.shadowColor = state.shadowColor;
    tileCtx.shadowBlur = state.shadowBlur;
    tileCtx.shadowOffsetX = state.shadowOffsetX;
    tileCtx.shadowOffsetY = state.shadowOffsetY;
    tileCtx.font = state.font;
    tileCtx.textAlign = state.textAlign;
    tileCtx.textBaseline = state.textBaseline;
    tileCtx.direction = state.direction;
    tileCtx.globalAlpha = state.globalAlpha;
    tileCtx.globalCompositeOperation = state.globalCompositeOperation;
    tileCtx.imageSmoothingEnabled = state.imageSmoothingEnabled;
    tileCtx.imageSmoothingQuality = state.imageSmoothingQuality;
    tileCtx.filter = state.filter;
    
    const t = state.transform;
    tileCtx.setTransform(t.a, t.b, t.c, t.d, t.e, t.f);
  }

  // ==================== 变换矩阵 ====================
  
  getTransform(): DOMMatrix {
    return this.currentState.transform;
  }
  
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  setTransform(matrix?: DOMMatrix2DInit): void;
  setTransform(a?: number | DOMMatrix2DInit, b?: number, c?: number, d?: number, e?: number, f?: number): void {
    let matrix: DOMMatrix;
    
    if (typeof a === 'object' || a === undefined) {
      const init = a || { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
      matrix = new DOMMatrix(init as any);
    } else {
      matrix = new DOMMatrix([a, b!, c!, d!, e!, f!]);
    }
    
    this.currentState.transform = matrix;
    this.syncTransformToTiles();
  }
  
  resetTransform(): void {
    this.setTransform(1, 0, 0, 1, 0, 0);
  }
  
  translate(x: number, y: number): void {
    this.currentState.transform.translateSelf(x, y);
    this.syncTransformToTiles();
  }
  
  rotate(angle: number): void {
    this.currentState.transform.rotateSelf(angle * 180 / Math.PI);
    this.syncTransformToTiles();
  }
  
  scale(x: number, y?: number): void {
    this.currentState.transform.scaleSelf(x, y ?? x);
    this.syncTransformToTiles();
  }
  
  private syncTransformToTiles(): void {
    const t = this.currentState.transform;
    for (const tile of this.tiles) {
      tile.ctx.setTransform(t.a, t.b, t.c, t.d, t.e, t.f);
    }
  }

  // ==================== 状态堆栈 ====================
  
  save(): void {
    const currentTransform = this.currentState.transform;
    const savedState: CanvasState = {
      ...this.currentState,
      transform: new DOMMatrix([currentTransform.a, currentTransform.b, currentTransform.c, currentTransform.d, currentTransform.e, currentTransform.f]),
      lineDash: [...this.currentState.lineDash],
      clipPath: this.currentState.clipPath ? new Path2D(this.currentState.clipPath) : null
    };
    
    this.stateStack.push(savedState);
    
    for (const tile of this.tiles) {
      tile.ctx.save();
    }
  }
  
  restore(): void {
    if (this.stateStack.length === 0) return;
    
    this.currentState = this.stateStack.pop()!;
    
    for (const tile of this.tiles) {
      tile.ctx.restore();
    }
  }

  // ==================== 路径绘制 ====================
  
  beginPath(): void {
    this.pathOperations = [];
    this.isPathOpen = true;
    
    for (const tile of this.tiles) {
      tile.ctx.beginPath();
    }
  }
  
  closePath(): void {
    this.pathOperations.push({ type: 'closePath' });
    
    for (const tile of this.tiles) {
      tile.ctx.closePath();
    }
  }
  
  moveTo(x: number, y: number): void {
    if (!this.isPathOpen) this.beginPath();
    this.pathOperations.push({ type: 'moveTo', x, y });
    
    for (const tile of this.tiles) {
      tile.ctx.moveTo(x - tile.x, y - tile.y);
    }
  }
  
  lineTo(x: number, y: number): void {
    if (!this.isPathOpen) {
      this.moveTo(x, y);
      return;
    }
    this.pathOperations.push({ type: 'lineTo', x, y });
    
    for (const tile of this.tiles) {
      tile.ctx.lineTo(x - tile.x, y - tile.y);
    }
  }
  
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    this.pathOperations.push({ type: 'bezierCurveTo', cp1x, cp1y, cp2x, cp2y, x, y });
    
    for (const tile of this.tiles) {
      tile.ctx.bezierCurveTo(
        cp1x - tile.x, cp1y - tile.y,
        cp2x - tile.x, cp2y - tile.y,
        x - tile.x, y - tile.y
      );
    }
  }
  
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.pathOperations.push({ type: 'quadraticCurveTo', cpx, cpy, x, y });
    
    for (const tile of this.tiles) {
      tile.ctx.quadraticCurveTo(cpx - tile.x, cpy - tile.y, x - tile.x, y - tile.y);
    }
  }
  
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {
    this.pathOperations.push({ type: 'arc', x, y, radius, startAngle, endAngle, counterclockwise });
    
    for (const tile of this.tiles) {
      tile.ctx.arc(x - tile.x, y - tile.y, radius, startAngle, endAngle, counterclockwise);
    }
  }
  
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
    this.pathOperations.push({ type: 'arcTo', x1, y1, x2, y2, radius });
    
    for (const tile of this.tiles) {
      tile.ctx.arcTo(x1 - tile.x, y1 - tile.y, x2 - tile.x, y2 - tile.y, radius);
    }
  }
  
  ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {
    this.pathOperations.push({ type: 'ellipse', x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise });
    
    for (const tile of this.tiles) {
      tile.ctx.ellipse(x - tile.x, y - tile.y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise);
    }
  }
  
  rect(x: number, y: number, width: number, height: number): void {
    this.pathOperations.push({ type: 'rect', x, y, width, height });
    
    for (const tile of this.tiles) {
      tile.ctx.rect(x - tile.x, y - tile.y, width, height);
    }
  }

  // ==================== 路径填充和描边 ====================
  
  fill(fillRule?: CanvasFillRule): void;
  fill(path: Path2D, fillRule?: CanvasFillRule): void;
  fill(pathOrRule?: Path2D | CanvasFillRule, fillRule?: CanvasFillRule): void {
    if (pathOrRule instanceof Path2D) {
      this.fillPath2D(pathOrRule, fillRule);
    } else {
      this.fillCurrentPath(pathOrRule);
    }
  }
  
  private fillCurrentPath(fillRule: CanvasFillRule = 'nonzero'): void {
    const bounds = this.calculatePathBounds();
    
    for (const tile of this.tiles) {
      if (this.intersects(bounds, tile)) {
        this.applyFullStateToTile(tile.ctx);
        tile.ctx.fill(fillRule);
      }
    }
    
    this.isPathOpen = false;
  }
  
  private fillPath2D(path: Path2D, fillRule: CanvasFillRule = 'nonzero'): void {
    for (const tile of this.tiles) {
      this.applyFullStateToTile(tile.ctx);
      tile.ctx.save();
      tile.ctx.translate(-tile.x, -tile.y);
      tile.ctx.fill(path, fillRule);
      tile.ctx.restore();
    }
  }
  
  stroke(): void;
  stroke(path: Path2D): void;
  stroke(path?: Path2D): void {
    if (path) {
      this.strokePath2D(path);
    } else {
      this.strokeCurrentPath();
    }
  }
  
  private strokeCurrentPath(): void {
    const bounds = this.calculatePathBounds();
    
    for (const tile of this.tiles) {
      if (this.intersects(bounds, tile)) {
        this.applyFullStateToTile(tile.ctx);
        tile.ctx.stroke();
      }
    }
    
    this.isPathOpen = false;
  }
  
  private strokePath2D(path: Path2D): void {
    for (const tile of this.tiles) {
      this.applyFullStateToTile(tile.ctx);
      tile.ctx.save();
      tile.ctx.translate(-tile.x, -tile.y);
      tile.ctx.stroke(path);
      tile.ctx.restore();
    }
  }
  
  clip(fillRule?: CanvasFillRule): void;
  clip(path: Path2D, fillRule?: CanvasFillRule): void;
  clip(pathOrRule?: Path2D | CanvasFillRule, fillRule?: CanvasFillRule): void {
    if (pathOrRule instanceof Path2D) {
      for (const tile of this.tiles) {
        tile.ctx.save();
        tile.ctx.translate(-tile.x, -tile.y);
        tile.ctx.clip(pathOrRule, fillRule);
        tile.ctx.restore();
      }
    } else {
      const rule = pathOrRule || 'nonzero';
      for (const tile of this.tiles) {
        tile.ctx.clip(rule);
      }
    }
  }

  // ==================== 矩形绘制 ====================
  
  clearRect(x: number, y: number, width: number, height: number): void {
    const rect = { x, y, width, height };
    
    for (const tile of this.tiles) {
      if (this.intersectsRect(rect, tile)) {
        const intersection = this.calculateIntersection(rect, tile);
        tile.ctx.clearRect(
          intersection.x - tile.x,
          intersection.y - tile.y,
          intersection.width,
          intersection.height
        );
      }
    }
  }
  
  fillRect(x: number, y: number, width: number, height: number): void {
    const rect = { x, y, width, height };
    
    for (const tile of this.tiles) {
      if (this.intersectsRect(rect, tile)) {
        this.applyFullStateToTile(tile.ctx);
        const intersection = this.calculateIntersection(rect, tile);
        tile.ctx.fillRect(
          intersection.x - tile.x,
          intersection.y - tile.y,
          intersection.width,
          intersection.height
        );
      }
    }
  }
  
  strokeRect(x: number, y: number, width: number, height: number): void {
    const rect = { x, y, width, height };
    
    for (const tile of this.tiles) {
      if (this.intersectsRect(rect, tile)) {
        this.applyFullStateToTile(tile.ctx);
        tile.ctx.strokeRect(x - tile.x, y - tile.y, width, height);
      }
    }
  }

  // ==================== 文本绘制 ====================
  
  fillText(text: string, x: number, y: number, maxWidth?: number): void {
    // 估算文本边界
    const metrics = this.measureText(text);
    const textBounds = this.calculateTextBounds(x, y, metrics);
    
    for (const tile of this.tiles) {
      if (this.intersectsRect(textBounds, tile)) {
        this.applyFullStateToTile(tile.ctx);
        const localX = x - tile.x;
        const localY = y - tile.y;
        
        if (maxWidth !== undefined) {
          tile.ctx.fillText(text, localX, localY, maxWidth);
        } else {
          tile.ctx.fillText(text, localX, localY);
        }
      }
    }
  }
  
  strokeText(text: string, x: number, y: number, maxWidth?: number): void {
    for (const tile of this.tiles) {
      this.applyFullStateToTile(tile.ctx);
      const localX = x - tile.x;
      const localY = y - tile.y;
      
      if (maxWidth !== undefined) {
        tile.ctx.strokeText(text, localX, localY, maxWidth);
      } else {
        tile.ctx.strokeText(text, localX, localY);
      }
    }
  }
  
  measureText(text: string): TextMetrics {
    if (this.tiles.length > 0) {
      this.tiles[0].ctx.font = this.currentState.font;
      return this.tiles[0].ctx.measureText(text);
    }
    return {
      width: text.length * 10,
      fontBoundingBoxAscent: 10,
      fontBoundingBoxDescent: 2,
    } as TextMetrics;
  }
  
  private calculateTextBounds(x: number, y: number, metrics: TextMetrics): { x: number; y: number; width: number; height: number } {
    const width = metrics.width;
    const ascent = metrics.fontBoundingBoxAscent || 10;
    const descent = metrics.fontBoundingBoxDescent || 2;
    const height = ascent + descent;
    
    let startX = x;
    switch (this.currentState.textAlign) {
      case 'center': startX = x - width / 2; break;
      case 'end':
      case 'right': startX = x - width; break;
    }
    
    let startY = y - ascent;
    switch (this.currentState.textBaseline) {
      case 'top': startY = y; break;
      case 'middle': startY = y - height / 2; break;
      case 'bottom': startY = y - height; break;
    }
    
    return { x: startX, y: startY, width, height };
  }

  // ==================== 图像绘制 ====================
  
  drawImage(image: CanvasImageSource, dx: number, dy: number): void;
  drawImage(image: CanvasImageSource, dx: number, dy: number, dWidth: number, dHeight: number): void;
  drawImage(image: CanvasImageSource, sx: number, sy: number, sWidth: number, sHeight: number, dx: number, dy: number, dWidth: number, dHeight: number): void;
  drawImage(image: CanvasImageSource, ...args: number[]): void {
    if (args.length === 2) {
      const [dx, dy] = args;
      const width = (image as HTMLImageElement).width || 0;
      const height = (image as HTMLImageElement).height || 0;
      this.drawImageImpl(image, 0, 0, width, height, dx, dy, width, height);
    } else if (args.length === 4) {
      const [dx, dy, dWidth, dHeight] = args;
      const width = (image as HTMLImageElement).width || 0;
      const height = (image as HTMLImageElement).height || 0;
      this.drawImageImpl(image, 0, 0, width, height, dx, dy, dWidth, dHeight);
    } else if (args.length === 8) {
      this.drawImageImpl(image, args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
    }
  }
  
  private drawImageImpl(
    image: CanvasImageSource,
    sx: number, sy: number, sWidth: number, sHeight: number,
    dx: number, dy: number, dWidth: number, dHeight: number
  ): void {
    const destRect = { x: dx, y: dy, width: dWidth, height: dHeight };
    
    for (const tile of this.tiles) {
      if (this.intersectsRect(destRect, tile)) {
        this.applyFullStateToTile(tile.ctx);
        const localDx = dx - tile.x;
        const localDy = dy - tile.y;
        tile.ctx.drawImage(image, sx, sy, sWidth, sHeight, localDx, localDy, dWidth, dHeight);
      }
    }
  }

  // ==================== 渐变和 Pattern ====================
  
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient {
    // 创建虚拟渐变，延迟到使用时再在各 tile 上创建
    return new VirtualGradient('linear', x0, y0, x1, y1, this.tiles);
  }
  
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient {
    return new VirtualGradient('radial', x0, y0, x1, y1, this.tiles, r0, r1);
  }
  
  createPattern(image: CanvasImageSource, repetition: string | null): CanvasPattern | null {
    if (this.tiles.length === 0) return null;
    return this.tiles[0].ctx.createPattern(image, repetition);
  }

  // ==================== 像素操作 ====================
  
  createImageData(width: number, height: number): ImageData;
  createImageData(imageData: ImageData): ImageData;
  createImageData(widthOrData: number | ImageData, height?: number): ImageData {
    if (widthOrData instanceof ImageData) {
      return new ImageData(widthOrData.width, widthOrData.height);
    }
    return new ImageData(widthOrData, height!);
  }
  
  getImageData(sx: number, sy: number, sw: number, sh: number): ImageData {
    const imageData = this.createImageData(sw, sh);
    const rect = { x: sx, y: sy, width: sw, height: sh };
    
    for (const tile of this.tiles) {
      if (this.intersectsRect(rect, tile)) {
        const intersection = this.calculateIntersection(rect, tile);
        const tileData = tile.ctx.getImageData(
          intersection.x - tile.x,
          intersection.y - tile.y,
          intersection.width,
          intersection.height
        );
        this.mergeImageData(imageData, tileData, intersection.x - sx, intersection.y - sy);
      }
    }
    
    return imageData;
  }
  
  putImageData(imageData: ImageData, dx: number, dy: number): void;
  putImageData(imageData: ImageData, dx: number, dy: number, dirtyX: number, dirtyY: number, dirtyWidth: number, dirtyHeight: number): void;
  putImageData(imageData: ImageData, dx: number, dy: number, dirtyX?: number, dirtyY?: number, dirtyWidth?: number, dirtyHeight?: number): void {
    const rect = {
      x: dx + (dirtyX || 0),
      y: dy + (dirtyY || 0),
      width: dirtyWidth ?? imageData.width,
      height: dirtyHeight ?? imageData.height
    };
    
    for (const tile of this.tiles) {
      if (this.intersectsRect(rect, tile)) {
        const intersection = this.calculateIntersection(rect, tile);
        const sourceX = intersection.x - dx;
        const sourceY = intersection.y - dy;
        
        tile.ctx.putImageData(
          this.extractImageData(imageData, sourceX, sourceY, intersection.width, intersection.height),
          intersection.x - tile.x,
          intersection.y - tile.y
        );
      }
    }
  }

  // ==================== 辅助方法 ====================
  
  private calculateIntersection(
    rect: { x: number; y: number; width: number; height: number },
    tile: LayerTile
  ): { x: number; y: number; width: number; height: number } {
    const x1 = Math.max(rect.x, tile.x);
    const y1 = Math.max(rect.y, tile.y);
    const x2 = Math.min(rect.x + rect.width, tile.x + tile.width);
    const y2 = Math.min(rect.y + rect.height, tile.y + tile.height);
    
    return {
      x: x1,
      y: y1,
      width: Math.max(0, x2 - x1),
      height: Math.max(0, y2 - y1)
    };
  }
  
  private intersectsRect(
    rect: { x: number; y: number; width: number; height: number },
    tile: LayerTile
  ): boolean {
    return !(rect.x + rect.width <= tile.x ||
             rect.x >= tile.x + tile.width ||
             rect.y + rect.height <= tile.y ||
             rect.y >= tile.y + tile.height);
  }
  
  private calculatePathBounds(): { x: number; y: number; width: number; height: number } {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const op of this.pathOperations) {
      switch (op.type) {
        case 'moveTo':
        case 'lineTo':
          minX = Math.min(minX, op.x);
          minY = Math.min(minY, op.y);
          maxX = Math.max(maxX, op.x);
          maxY = Math.max(maxY, op.y);
          break;
        case 'arc':
          minX = Math.min(minX, op.x - op.radius);
          minY = Math.min(minY, op.y - op.radius);
          maxX = Math.max(maxX, op.x + op.radius);
          maxY = Math.max(maxY, op.y + op.radius);
          break;
        case 'rect':
          minX = Math.min(minX, op.x);
          minY = Math.min(minY, op.y);
          maxX = Math.max(maxX, op.x + op.width);
          maxY = Math.max(maxY, op.y + op.height);
          break;
      }
    }
    
    const padding = this.currentState.lineWidth;
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    };
  }
  
  private intersects(bounds: { x: number; y: number; width: number; height: number }, tile: LayerTile): boolean {
    return this.intersectsRect(bounds, tile);
  }
  
  private mergeImageData(target: ImageData, source: ImageData, offsetX: number, offsetY: number): void {
    for (let y = 0; y < source.height; y++) {
      for (let x = 0; x < source.width; x++) {
        const sourceIdx = (y * source.width + x) * 4;
        const targetIdx = ((y + offsetY) * target.width + (x + offsetX)) * 4;
        
        if (targetIdx >= 0 && targetIdx < target.data.length - 3) {
          target.data[targetIdx] = source.data[sourceIdx];
          target.data[targetIdx + 1] = source.data[sourceIdx + 1];
          target.data[targetIdx + 2] = source.data[sourceIdx + 2];
          target.data[targetIdx + 3] = source.data[sourceIdx + 3];
        }
      }
    }
  }
  
  private extractImageData(source: ImageData, x: number, y: number, width: number, height: number): ImageData {
    const result = new ImageData(width, height);
    
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const sourceIdx = ((y + py) * source.width + (x + px)) * 4;
        const targetIdx = (py * width + px) * 4;
        
        if (sourceIdx >= 0 && sourceIdx < source.data.length - 3) {
          result.data[targetIdx] = source.data[sourceIdx];
          result.data[targetIdx + 1] = source.data[sourceIdx + 1];
          result.data[targetIdx + 2] = source.data[sourceIdx + 2];
          result.data[targetIdx + 3] = source.data[sourceIdx + 3];
        }
      }
    }
    
    return result;
  }
  
  // ==================== 其他 API ====================
  
  isPointInPath(x: number, y: number, fillRule?: CanvasFillRule): boolean;
  isPointInPath(path: Path2D, x: number, y: number, fillRule?: CanvasFillRule): boolean;
  isPointInPath(pathOrX: Path2D | number, xOrY?: number | CanvasFillRule, yOrFillRule?: number | CanvasFillRule, fillRule?: CanvasFillRule): boolean {
    let x: number, y: number;
    
    if (pathOrX instanceof Path2D) {
      x = xOrY as number;
      y = yOrFillRule as number;
    } else {
      x = pathOrX;
      y = xOrY as number;
    }
    
    for (const tile of this.tiles) {
      if (x >= tile.x && x < tile.x + tile.width &&
          y >= tile.y && y < tile.y + tile.height) {
        return tile.ctx.isPointInPath(x - tile.x, y - tile.y);
      }
    }
    return false;
  }
  
  isPointInStroke(x: number, y: number): boolean;
  isPointInStroke(path: Path2D, x: number, y: number): boolean;
  isPointInStroke(pathOrX: Path2D | number, x?: number, y?: number): boolean {
    // 简化实现
    return false;
  }
  
  setLineDash(segments: number[]): void {
    this.currentState.lineDash = [...segments];
    for (const tile of this.tiles) {
      tile.ctx.setLineDash(segments);
    }
  }
  
  getLineDash(): number[] {
    return [...this.currentState.lineDash];
  }
  
  set lineDashOffset(value: number) {
    this.currentState.lineDashOffset = value;
    this.syncStateToTiles('lineDashOffset', value);
  }
  
  get lineDashOffset(): number {
    return this.currentState.lineDashOffset;
  }
}

/**
 * 虚拟渐变类 - 延迟到实际使用时才在各 tile 上创建渐变
 */
class VirtualGradient implements CanvasGradient {
  private type: 'linear' | 'radial';
  private x0: number;
  private y0: number;
  private x1: number;
  private y1: number;
  private r0?: number;
  private r1?: number;
  private tiles: LayerTile[];
  private colorStops: Array<{ offset: number; color: string }> = [];
  private tileGradients: Map<OffscreenCanvasRenderingContext2D, CanvasGradient> = new Map();
  
  constructor(
    type: 'linear' | 'radial',
    x0: number, y0: number, x1: number, y1: number,
    tiles: LayerTile[],
    r0?: number, r1?: number
  ) {
    this.type = type;
    this.x0 = x0;
    this.y0 = y0;
    this.x1 = x1;
    this.y1 = y1;
    this.tiles = tiles;
    this.r0 = r0;
    this.r1 = r1;
  }
  
  addColorStop(offset: number, color: string): void {
    this.colorStops.push({ offset, color });
    
    // 同步到已创建的渐变
    for (const gradient of this.tileGradients.values()) {
      gradient.addColorStop(offset, color);
    }
  }
  
  /**
   * 获取指定 tile 的渐变（内部使用）
   */
  getGradientForTile(tileCtx: OffscreenCanvasRenderingContext2D): CanvasGradient {
    if (this.tileGradients.has(tileCtx)) {
      return this.tileGradients.get(tileCtx)!;
    }
    
    let gradient: CanvasGradient;
    
    if (this.type === 'linear') {
      gradient = tileCtx.createLinearGradient(this.x0, this.y0, this.x1, this.y1);
    } else {
      gradient = tileCtx.createRadialGradient(
        this.x0, this.y0, this.r0 || 0,
        this.x1, this.y1, this.r1 || 0
      );
    }
    
    for (const stop of this.colorStops) {
      gradient.addColorStop(stop.offset, stop.color);
    }
    
    this.tileGradients.set(tileCtx, gradient);
    return gradient;
  }
}
