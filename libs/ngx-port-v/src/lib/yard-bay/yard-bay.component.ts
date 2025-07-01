import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CanvasProComponent, CpDbClickEvent, CustomRenderable, Layer, ViewportInteractionConfig } from '@smuport/ngx-canvas-pro';
import { VisualYardBay, VisualYardPos, YardBay } from '../model/yard-bay';

@Component({
  selector: 'app-yard-bay',
  standalone: true,
  imports: [CanvasProComponent],
  templateUrl: './yard-bay.component.html',
  styleUrl: './yard-bay.component.scss'
})
export class YardBayComponent implements AfterViewInit {
  @ViewChild('canvasContainer', { static: true })
  canvasContainer!: ElementRef
  @ViewChild('canvasPro', { static: true })
  canvasPro!: CanvasProComponent;
  private _yardBayData: YardBay[] = [];
  @Input()
  get yardBayData(): YardBay[] {
    return this._yardBayData;
  }
  set yardBayData(value: any[]) {
    this._yardBayData = value;
    this.updateData()
  }
  @Input() fillYardPoses: (yardPos: VisualYardPos<unknown>) => string | CanvasGradient = () => 'white';
  @Input() textYardPoses: (yardPos: VisualYardPos<unknown>) => string[] = () => [];
  @Input() groupBy: (bay: YardBay) => string | null = () => null;
  @Input() orderBy: (a: YardBay, b: YardBay) => number = () => 0;
  @Output() heightCalculated = new EventEmitter<number>();
  @Output() yardPosDbClick = new EventEmitter<VisualYardPos<any>>();

  yardBayData$ = new BehaviorSubject<YardBay[]>(undefined!);
  processedData: YardBay[] = [];
  cellWidth: number = 50;
  cellHeight: number = 50;
  bayMarginX: number = 80;
  bayMarginY: number = 80;
  rowMarginY: number = 80;
  yardBayGroupMap: { [key: string]: YardBay[] } = {};
  containerWidth: number = 0;
  containerHeight: number = 0;

  // 添加交互配置
  @Input() interactionConfig: ViewportInteractionConfig = {
    drag: {
      default: 'none',     // 默认禁用平移
      shift: 'frame-select',        // 按住 shift 键可以平移
      ctrl: 'zoom',
      alt: 'pan'
    },
    wheel: {
      default: 'none',     // 默认禁用缩放
      shift: 'pan-horizontal',        // 按住 shift 键可以水平缩放
      ctrl: 'zoom',
      alt: 'pan-vertical'
    }
  };

  getWidth() {
    this.containerWidth = this.canvasContainer.nativeElement.clientWidth;
  }

  ngAfterViewInit(): void {
    this.initLayers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const affectedProps = ['orderBy', 'groupBy'];
    const shouldRecalculate = affectedProps.some(prop => {
      return changes[prop] && !changes[prop].isFirstChange();
    });
    if (shouldRecalculate) {
      this.calculateLayout();
    }
  }

  calculateLayout() {
    if (!this.yardBayData || this.yardBayData.length === 0 || this.containerWidth <= 0) {
      return;
    }
    this.applyGroupAndSort();
    this.updateCanvas();
    this.heightCalculated.emit(this.containerHeight);
  }

  getCalculatedHeight(): number {
    return this.containerHeight;
  }

  getCalculatedWidth(): number {
    return this.containerWidth;
  }

  private updateCanvas() {
    if (!this.canvasContainer?.nativeElement || !this.canvasPro) return;
    const container = this.canvasContainer.nativeElement;
    container.style.width = `${this.containerWidth}px`;
    container.style.height = `${this.containerHeight}px`;
    this.canvasPro.updateViewportSize(this.containerWidth, this.containerHeight);
  }

  // 分组和排序
  applyGroupAndSort() {
    const grouped: { [key: string]: YardBay[] } = {};
    if (this.groupBy) {
      for (const bay of this.yardBayData) {
        const groupKey = this.groupBy(bay);
        if (groupKey !== null && groupKey !== undefined && groupKey !== '') {
          if (!grouped[groupKey]) {
            grouped[groupKey] = [];
          }
          grouped[groupKey].push(bay);
        }
      }
    }
    if (Object.keys(grouped).length === 0) {
      grouped['all'] = [...this.yardBayData];
    }
    for (const key in grouped) {
      if (grouped.hasOwnProperty(key)) {
        grouped[key].sort(this.orderBy);
      }
    }
    this.yardBayGroupMap = grouped;
    this.transformYardBaysData();
  }

  // 计算坐标生成标准数据
  transformYardBaysData(): void {
    this.containerHeight = 0;
    let currentX = 40;
    let currentY = 40;
    let maxRowHeight = 0;
    const result: YardBay[] = [];
    const groupKeys = Object.keys(this.yardBayGroupMap);
    const hasGroups = groupKeys.length > 1;

    for (let i = 0; i < groupKeys.length; i++) {
      const groupKey = groupKeys[i];
      const bays = this.yardBayGroupMap[groupKey];
      if (hasGroups && i > 0) {
        currentY = this.containerHeight + this.rowMarginY + 50;
      }
      for (const bay of bays) {
        const bayWidth = bay.maxCol * this.cellWidth;
        const bayHeight = bay.maxTier * this.cellHeight;
        // 是否换行
        const shouldWrap = currentX + bayWidth > this.containerWidth;
        if (shouldWrap) {
          currentX = 40;
          currentY += maxRowHeight + this.rowMarginY;
          maxRowHeight = 0;
        }
        const transformedBay: VisualYardBay<any> = {
          yardBay: bay.yardBay,
          x: currentX,
          y: currentY,
          width: 0,
          height: 0,
          maxCol: bay.maxCol,
          maxTier: bay.maxTier,
          yardPoses: []
        };
        const allPositions: { [key: string]: VisualYardPos<any> } = {};
        // 已有数据格子
        if (bay.yardPoses) {
          for (const yardPose of bay.yardPoses) {
            const posKey = `${yardPose.col}-${yardPose.tier}`;
            allPositions[posKey] = {
              ...yardPose,
              x: currentX + (yardPose.col - 1) * this.cellWidth,
              y: currentY + (bay.maxTier - yardPose.tier) * this.cellHeight,
              height: this.cellHeight,
              width: this.cellWidth,
              data: yardPose.data || null
            };
          }
        }
        // 空格子
        for (let tier = 1; tier <= bay.maxTier; tier++) {
          for (let col = 1; col <= bay.maxCol; col++) {
            const posKey = `${col}-${tier}`;
            if (!allPositions[posKey]) {
              allPositions[posKey] = {
                yardPos: `${bay.yardBay}${col}${tier}`,
                x: currentX + (col - 1) * this.cellWidth,
                y: currentY + (bay.maxTier - tier) * this.cellHeight,
                height: this.cellHeight,
                width: this.cellWidth,
                col,
                tier,
                data: null
              };
            }
          }
        }
        transformedBay.yardPoses = Object.values(allPositions);
        result.push(transformedBay);
        // 更新位置
        const bayBottomY = currentY + bayHeight;
        if (bayBottomY > this.containerHeight) {
          this.containerHeight = bayBottomY;
        }
        currentX += bayWidth + this.bayMarginX;
        if (bayHeight > maxRowHeight) {
          maxRowHeight = bayHeight;
        }
      }
      if (hasGroups && i < groupKeys.length - 1) {
        currentX = 40;
        maxRowHeight = 0;
      }
    }
    this.processedData = result;
    this.containerHeight += this.rowMarginY;
    this.yardBayData$.next(this.processedData);
  }

  getYardBayLayer() {
    console.log('创建layer');
    const yardBaysLayer = new Layer<VisualYardBay<unknown>[]>('yardBaysLayer');
    yardBaysLayer.setPushMode();
    yardBaysLayer.setTrigger(this.yardBayData$);
    yardBaysLayer.addEventListener('dbclick', (evt: CpDbClickEvent, data: VisualYardBay<unknown>[]) => {
      const axis = evt.getAxis();
      data.forEach((yardBay: VisualYardBay<unknown>) => {
        const qcClick = yardBay.yardPoses.find((item) => {
          const startX = item.x
          const startY = item.y;
          return (
            axis.x >= startX &&
            axis.x <= startX + item.width &&
            axis.y >= startY &&
            axis.y <= startY + item.height
          )
        });
        if (qcClick) {
          this.yardPosDbClick.emit(qcClick);
          return
        }
      })
    })
    yardBaysLayer.addRenderable(new CustomRenderable<VisualYardBay<unknown>[]>((ctx, data) => {
      yardBaysLayer.updateCanvasSize(this.containerWidth, this.containerHeight);
      this.renderYardBay(ctx, data);
    }))
    return yardBaysLayer;
  }

  updateData() {
    this.getWidth();
    this.calculateLayout();
  }

  initLayers() {
    this.addLayer(this.getYardBayLayer());
    this.drawLayers();
  }

  addLayer(layer: Layer) {
    this.canvasPro.addLayer(layer);
  }

  drawLayers() {
    this.canvasPro.startDataflow();
    this.canvasPro.startAnimation();
    this.canvasPro.startListenEvent();
  }

  renderYardBay(
    ctx: OffscreenCanvasRenderingContext2D,
    yardBays: VisualYardBay<any>[]
  ): void {
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let lastGroup: string | null = null;
    let groupMaxY = 0;
    let isFirstGroup = true;

    for (const bay of yardBays) {
      const currentGroup = this.groupBy ? this.groupBy(bay) : null;
      const isNewGroup = currentGroup !== null && currentGroup !== '' && currentGroup !== lastGroup;
      if (isNewGroup) {
        if (!isFirstGroup) {
          this.drawGroupSeparator(
            ctx,
            bay.y - 50,
            this.containerWidth,
          );
        }
        this.drawGroupHeader(
          ctx,
          currentGroup!,
          bay.x,
          bay.y - 30
        );
        lastGroup = currentGroup;
        isFirstGroup = false;
      }
      const bayBottomY = bay.y + (bay.maxTier * bay.yardPoses[0].height);
      if (bayBottomY > groupMaxY) {
        groupMaxY = bayBottomY;
      }
      this.drawYardBayTitle(ctx, bay);
      for (const yardPos of bay.yardPoses) {
        ctx.strokeRect(yardPos.x, yardPos.y, yardPos.width, yardPos.height);
        this.drawPositionLabels(ctx, yardPos);

        const fillStyle = this.fillYardPoses(yardPos);
        ctx.fillStyle = fillStyle;
        ctx.fillRect(yardPos.x, yardPos.y, yardPos.width, yardPos.height);

        const textList = this.textYardPoses(yardPos);
        if (textList && textList.length > 0) {
          this.drawPositionText(ctx, yardPos, textList);
        }
      }
    }
  }

  drawGroupHeader(
    ctx: OffscreenCanvasRenderingContext2D,
    groupKey: string,
    x: number,
    y: number
  ) {
    const text = groupKey;
    ctx.fillStyle = '#096DD9';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(text, 0, y);
  }

  // 绘制分组分隔线
  drawGroupSeparator(
    ctx: OffscreenCanvasRenderingContext2D,
    y: number,
    width: number,
  ) {
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawYardBayTitle(
    ctx: OffscreenCanvasRenderingContext2D,
    singleYardBay: VisualYardBay<any>
  ) {
    const { yardBay, x, y, maxCol, maxTier, yardPoses } = singleYardBay;
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.font = '16px Arial';
    const centerX = x + (maxCol * yardPoses[0].width) / 2;
    const bottomY = y + maxTier * yardPoses[0].height + 40;
    ctx.fillText(yardBay, centerX, bottomY);
  }

  drawPositionLabels(
    ctx: OffscreenCanvasRenderingContext2D,
    yardPos: VisualYardPos<unknown>
  ) {
    ctx.fillStyle = 'black';
    ctx.font = '13px Arial';
    // 在第一列绘制层号
    if (yardPos.col === 1) {
      ctx.textAlign = 'right';
      ctx.fillText(yardPos.tier.toString(), yardPos.x - 10, yardPos.y + yardPos.height / 2);
    }
    // 在第一层绘制列号
    if (yardPos.tier === 1) {
      ctx.textAlign = 'center';
      ctx.fillText(yardPos.col.toString(), yardPos.x + yardPos.width / 2, yardPos.y + yardPos.height + 15);
    }
  }

  drawPositionText(
    ctx: OffscreenCanvasRenderingContext2D,
    yardPos: VisualYardPos<unknown>,
    textList: string[]
  ) {
    const maxFontSize = yardPos.height * 0.2;
    const fontSize = Math.max(maxFontSize, 10)
    const textHeight = fontSize * 1.2 * textList.length;
    const startY = yardPos.y + (yardPos.height - textHeight) / 2 + fontSize / 2;
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.font = `${fontSize}px Arial`;
    // 绘制每一行文本
    textList.forEach((line, i) => {
      const yPosition = startY + i * fontSize * 1.2;
      ctx.fillText(line, yardPos.x + yardPos.width / 2, yPosition);
    });
  }
}
