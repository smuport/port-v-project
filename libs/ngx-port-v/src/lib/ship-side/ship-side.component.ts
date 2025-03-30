import { CommonModule } from '@angular/common';
import { Component, ViewChild, AfterViewInit, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { CanvasProComponent, CustomRenderable, Layer, ViewportInteractionConfig } from '@smuport/ngx-canvas-pro';
import { BehaviorSubject, interval, startWith } from 'rxjs';
import { Cell, VesBaySideView, Vessel } from '../model/vessel';

@Component({
  selector: 'app-ship-side',
  templateUrl: './ship-side.component.html',
  styleUrls: ['./ship-side.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    CanvasProComponent,
  ]
})
export class ShipSideComponent implements AfterViewInit {
  private _vesselData!: Vessel;
  @Input() set vesselData(data: Vessel) {
    this._vesselData = this.measureVessel(data, this.config.width, this.config.height);
    this._vesselData = data;
    this.vesselDataUpdateSubject.next(data);
  };
  get vesselData(): Vessel {
    return this._vesselData;
  };
  vesselDataUpdateSubject = new BehaviorSubject<Vessel | null>(null);
  @Input() config: { width: number; height: number; } = {
    width: 24,
    height: 12,
  };
  @Output() onVesselBaySelected = new EventEmitter<string[]>();
  @Input() fillCell: (data: any) => string = (data: any) => 'red';
  @ViewChild('canvasContainer') canvasContainer!: ElementRef;
  @ViewChild('canvasPro', { static: true })
  canvasPro!: CanvasProComponent;

  modalWidth: number = 0;

  //绘制矩形
  isDragging = false;
  startDragPos = { x: 0, y: 0 };
  rectDragPos = { x: 0, y: 0 };
  
  // 添加交互配置
  interactionConfig: ViewportInteractionConfig = {
    drag: {
      default: 'none',     // 默认禁用平移
      shift: 'pan',        // 按住 shift 键可以平移
      ctrl: 'none',
      alt: 'none'
    },
    wheel: {
      default: 'none',     // 默认禁用缩放
      shift: 'none',
      ctrl: 'none',
      alt: 'none'
    }
  };

  constructor() { }

  ngAfterViewInit(): void {
    this.drawRect();
    if (this.canvasContainer) {
      const canvasElement: HTMLElement = this.canvasContainer.nativeElement;
      canvasElement.style.width = `${this.vesselData.allWidth}px`;
      canvasElement.style.height = `${this.vesselData.allHeight + 150}px`;
    }
    
    // 设置交互配置
    this.canvasPro.interactionConfig = this.interactionConfig;
    
    const vessel = this.getVesselLayer('vessel');
    this.canvasPro.addLayer(vessel);
    const vesselBay = this.getVesselBayLayer('vesselBay');
    this.canvasPro.addLayer(vesselBay);
    this.drawLayers();
    
    // 添加键盘事件监听，用于更改鼠标样式
    this.setupKeyboardEvents();
  }
  
  // 添加键盘事件处理方法
  setupKeyboardEvents(): void {
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Shift') {
        this.canvasPro.viewport.nativeElement.style.cursor = 'move';
      }
    });

    window.addEventListener('keyup', (event) => {
      if (event.key === 'Shift') {
        this.canvasPro.viewport.nativeElement.style.cursor = 'default';
      }
    });
  }

  drawRect() {
    const overlayCanvas = document.getElementById('overlayCanvas') as HTMLCanvasElement;
    const overlayCtx = overlayCanvas.getContext('2d')!;
    overlayCanvas.width = this.vesselData.allWidth;
    overlayCanvas.height = this.vesselData.allHeight + 150;
    this.canvasPro.viewport.nativeElement.addEventListener('mousedown', event => {
      // 只有在没有按下 Shift 键时才启用选择框
      if (!event.shiftKey) {
        this.isDragging = true;
        this.startDragPos = { x: event.offsetX, y: event.offsetY };
      }
    })
    this.canvasPro.viewport.nativeElement.addEventListener('mousemove', event => {
      if (this.isDragging) {
        this.rectDragPos.x = event.offsetX - this.startDragPos.x;
        this.rectDragPos.y = event.offsetY - this.startDragPos.y;
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        overlayCtx.strokeStyle = 'blue';
        overlayCtx.lineWidth = 2;
        overlayCtx.save();
        overlayCtx.strokeRect(
          this.startDragPos.x,
          this.startDragPos.y,
          this.rectDragPos.x,
          this.rectDragPos.y
        );
        overlayCtx.restore();
      }
    });
    this.canvasPro.viewport.nativeElement.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        const rect = {
          x: this.startDragPos.x,
          y: this.startDragPos.y,
          width: this.rectDragPos.x,
          height: this.rectDragPos.y
        };
        const selectedBays = this.baysInRect(rect);
        this.onVesselBaySelected.emit(selectedBays);
      }
    });
    
    // 添加鼠标离开事件处理
    this.canvasPro.viewport.nativeElement.addEventListener('mouseleave', () => {
      if (this.isDragging) {
        this.isDragging = false;
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      }
    });
  }

  measureVessel(vessel: Vessel, cellWidth: number, cellHeight: number) {
    let minDTier = 999;
    let maxDTier = 0;
    let maxHTier = 0;
    let groupAmount = 0;
    let singleAmount = 0;
    let hullWidth = 0;
    let allWidth = 0;
    let hullHeight = 0;
    let deckHeight = 0;
    let allHeight = 0;
    let bayName = '';
    vessel.vesBaySideViews.forEach((vesBaySideView: VesBaySideView) => {
      if (vesBaySideView.bayName != bayName) {
        if (vesBaySideView.bayType === 'front') {
          groupAmount = groupAmount + 1
        } else if (vesBaySideView.bayType === 'single') {
          singleAmount = singleAmount + 1
        }
      }
      bayName = vesBaySideView.bayName;
      vesBaySideView.cells.forEach((cell: Cell) => {
        if (vesBaySideView.dh === 'D') {
          if (+cell.tier < minDTier) {
            minDTier = +cell.tier
          }
          if (+cell.tier > maxDTier) {
            maxDTier = + cell.tier
          }
        } else if (vesBaySideView.dh === 'H') {
          if (+cell.tier > maxHTier) {
            maxHTier = + cell.tier
          }
        }
      })
    })

    hullWidth = (groupAmount * 2 + singleAmount) * cellWidth + (groupAmount + singleAmount - 1) * cellWidth / 4;
    allWidth = hullWidth + cellWidth * 5;
    hullHeight = maxHTier * cellHeight / 2 + cellHeight / 2;
    deckHeight = (maxDTier - minDTier) / 2 * cellHeight + 120;
    allHeight = hullHeight + deckHeight;

    vessel.hullWidth = hullWidth;
    vessel.allWidth = allWidth;
    vessel.deckHeight = deckHeight;
    vessel.allHeight = allHeight;

    let y: number;
    let x: number = cellWidth;
    let interval: number = cellWidth / 4

    vessel.vesBaySideViews.forEach((vesBaySideView: VesBaySideView) => {
      if (vesBaySideView.bayName != bayName) {
        vesBaySideView.bayType === 'back' ? x = x + cellWidth : x = x + cellWidth + interval;
      }
      bayName = vesBaySideView.bayName;
      if (vesBaySideView.dh === 'D') {
        vesBaySideView.cells.forEach((cell: Cell, index: number) => {
          const firstTier = +vesBaySideView.cells[0].tier;
          y = deckHeight - ((firstTier - minDTier) / 2 + index + 1) * cellHeight;
          cell.x = x;
          cell.y = y;
        })
      } else if (vesBaySideView.dh === 'H') {
        vesBaySideView.cells.forEach((cell: Cell) => {
          y = allHeight - (+cell.tier / 2) * cellHeight;
          cell.x = x;
          cell.y = y;
        })
      }
    })
    return vessel
  }

  getVesselLayer(layerName: string) {
    const insLayer = new Layer<any>(layerName);
    const insSource = this.vesselDataUpdateSubject.asObservable();
    insLayer.setDataSource(insSource);
    const layerTrigger = interval(5 * 60 * 1000).pipe(startWith(0));
    insLayer.setTrigger(layerTrigger);
    insLayer.updateCanvasSize(this.vesselData.allWidth, this.vesselData.allHeight + 150);
    insLayer.addRenderable(new CustomRenderable<Vessel | null>(
      null,
      (ctx, data) => {
        this.renderVessel(ctx, data);
        this.canvasPro.updateViewportSize();
      }
    ))
    // insLayer.setRenderer((ctx, data) => {
    //   this.renderVessel(ctx, data);
    //   this.canvasPro.updateViewportSize();
    // });
    // this.canvasPro.updateViewportSize();
    return insLayer
  }


  baysInRect(rect: { x: number; y: number; width: number; height: number }) {
    const selectedBays: string[] = [];
    this.vesselData.vesBaySideViews.forEach(item => {
      item.cells.forEach((cell: Cell) => {
        const bayX = cell.x;
        if (
          (bayX >= rect.x &&
            bayX + this.config.width <= rect.x + rect.width) || (bayX + this.config.width <= rect.x && bayX >= rect.x + rect.width)
        ) {
          if (item.bayName && !selectedBays.includes(item.bayName)) {
            selectedBays.push(item.bayName);

          }
        }
      })
    });
    return selectedBays
  }

  renderVessel(ctx: OffscreenCanvasRenderingContext2D, data: Vessel | null) {
    if (!data) {
      return;
    }
    ctx.clearRect(0, 0, this.canvasPro.viewport.nativeElement.width, this.canvasPro.viewport.nativeElement.height);
    const width = this.config.width;
    const height = this.config.height;
    const allHeight = data.allHeight;
    const allWidth = data.allWidth - this.config.width;
    const deckHeight = data.deckHeight;
    const startX = 0;
    const startY = deckHeight - 2 * height;
    ctx.beginPath();
    ctx.moveTo(startX, startY + height * 3 / 2);
    ctx.lineTo(startX + 2 * width, startY + 2 * height);
    ctx.lineTo(startX + allWidth - width * 3 / 2, startY + 2 * height);
    ctx.lineTo(startX + allWidth - width * 3 / 2, startY + height);
    ctx.lineTo(startX + allWidth + width, startY + height);
    ctx.lineTo(startX + allWidth + width / 2, (allHeight + (startY + height)) / 2);
    ctx.lineTo(startX + allWidth, (allHeight + (startY + height)) / 2);
    ctx.lineTo(startX + allWidth - width / 2, allHeight);
    ctx.lineTo(startX + 2 * width, allHeight);
    ctx.lineTo(startX, startY + height * 3 / 2);
    ctx.closePath();

    ctx.stroke();
    const gradient = ctx.createLinearGradient(startX, 0, startX + allWidth, 0);
    gradient.addColorStop(0, 'red');
    gradient.addColorStop(0.7, 'red');
    gradient.addColorStop(1, 'black');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.lineWidth = 2;

    data.vesBaySideViews.forEach((item: VesBaySideView) => {
      item.cells.forEach((cell: Cell) => {
        ctx.beginPath();
        ctx.fillStyle = 'white';
        ctx.fillRect(cell.x, cell.y, width, height);
        ctx.strokeRect(cell.x, cell.y, width, height);
        ctx.closePath();
      })
    });

    ctx.font = 'lighter 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'black';
    data.vesBaySideViews.forEach((item: any) => {
      ctx.fillText(
        item.bayName,
        item.cells[0].x + this.config.width / 2,
        data.allHeight + this.config.height
      );
    });
  }

  drawLayers() {
    this.canvasPro.startDataflow();
    this.canvasPro.startAnimation();
    this.canvasPro.startListenEvent();
  }

  getVesselBayLayer(layerName: string) {
    const insLayer = new Layer<any>(layerName);
    const insSource = this.vesselDataUpdateSubject.asObservable();
    insLayer.setDataSource(insSource);
    const layerTrigger = interval(5 * 60 * 1000).pipe(startWith(0));
    insLayer.setTrigger(layerTrigger);
    insLayer.updateCanvasSize(this.vesselData.allWidth, this.vesselData.allHeight + 150);
    insLayer.addRenderable(new CustomRenderable<Vessel | null>(
      null,
      (ctx, data) => {
        this.renderVesselBay(ctx, data);
        this.canvasPro.updateViewportSize();
      }
    ));

    return insLayer;
  }

  renderVesselBay(ctx: OffscreenCanvasRenderingContext2D, data: Vessel<VesBaySideView<Cell>> | null) {
    if (!data) return;
    ctx.clearRect(0, 0, this.canvasPro.viewport.nativeElement.width, this.canvasPro.viewport.nativeElement.height);
    const width = this.config.width;
    const height = this.config.height;
    console.log(data);
    ctx.lineWidth = 2;
    data.vesBaySideViews.forEach((item: VesBaySideView) => {
      item.cells.forEach((cell: Cell) => {
        ctx.beginPath();
        ctx.fillStyle = this.fillCell(cell.data)
        ctx.fillRect(cell.x, cell.y, width, height);
        ctx.strokeRect(cell.x, cell.y, width, height);
        ctx.closePath();
      })
    });

    data.loadInstruct.forEach((item: any) => {
      const startY = item.dh == 'D' ? 6 * height : data.allHeight + 9 * height
      ctx.beginPath();
      ctx.moveTo(item.x, startY);
      ctx.lineTo(item.x + width / 2, startY + height);
      ctx.lineTo(item.x + width, startY);
      ctx.lineTo(item.x, startY);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = '#007BFF';
      ctx.fill();
      ctx.font = 'lighter 18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'black';
      ctx.fillText(
        item.loadAmount,
        item.x + width / 2,
        startY - height
      );
    })
    data.unloadInstruct.forEach((item: any) => {
      const startY = item.dh == 'D' ? 2 * height : data.allHeight + 5 * height
      ctx.beginPath();
      ctx.moveTo(item.x, startY);
      ctx.lineTo(item.x + width / 2, startY - height);
      ctx.lineTo(item.x + width, startY);
      ctx.lineTo(item.x, startY);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = 'rgb(255, 100, 100)';
      ctx.fill();
      ctx.font = 'lighter 18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'black';
      ctx.fillText(
        item.unloadAmount,
        item.x + width / 2,
        startY + height
      );
    })
  }

}
