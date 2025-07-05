import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CanvasProComponent, CpDbClickEvent, Layer, ViewportInteractionConfig } from '@smuport/ngx-canvas-pro';
import { BehaviorSubject, of } from 'rxjs';
import { Vescell, VescellMarkerConfig, VesselBay } from '../model/vessel-bay';


@Component({
  selector: 'app-vessel-bay',
  templateUrl: './vessel-bay.component.html',
  styleUrls: ['./vessel-bay.component.css'],
  standalone: true,
  imports: [
    CanvasProComponent,
  ]
})
export class VesselBayComponent implements AfterViewInit {
  private _vesselBayData!: VesselBay
  private _defaultVescellMarkerConfig: VescellMarkerConfig = {
    cross: false,
    dj: false,
    ref: false,
    danger: '',
    jobModel:  'single',
    height: false,
  }
  @Input() set vesselBayData(data: VesselBay
  ) {
    this._vesselBayData = data;
    this.vesselBayData$.next(data);
  };
  get vesselBayData(): VesselBay<any> {
    return this._vesselBayData;
  };

  @Input() config: { width: number; height: number } = {
    width: 24,
    height: 12,
  };
  @Input() fillContainer: (data: Vescell<unknown>) => string = (data: Vescell<unknown>) => 'white';
  @Input() textContainer: (data: Vescell<unknown>) => string = (data: Vescell<unknown>) => '';
  @Input() set vescellMarkerConfig(vescellMarkerConfig: Partial<VescellMarkerConfig>) {
    this._defaultVescellMarkerConfig = {
      ...this._defaultVescellMarkerConfig,
      ...vescellMarkerConfig,
    }
  }
  get vescellMarkerConfig(): VescellMarkerConfig {
    return this._defaultVescellMarkerConfig;
  }

  @ViewChild('canvasContainer') canvasContainer!: ElementRef;
  @ViewChild('canvasPro', { static: true }) canvasPro!: CanvasProComponent;

  @Output() vescellDbClick = new EventEmitter<Vescell<unknown>>();


  vesselBayData$ = new BehaviorSubject<VesselBay>(undefined!);


  vesselBayBackgroungData!: VesselBay;

  containerStyles = {
    "22G": { name: '20英尺干货箱', color: 'green' },
    "25G": { name: '20英尺干活高箱', color: 'red' },
    "22V": { name: '20英尺挂衣箱', color: 'blue' },
    "22U": { name: '20英尺开顶箱', color: 'orange' },
    "22R": { name: '20英尺冷冻箱', color: 'yellow' },
    "25R": { name: '20英尺冷高箱', color: 'cyan' },
    "22T": { name: '20英尺油罐箱', color: 'purple' },
    "22P": { name: '20英尺框架箱', color: 'magenta' },
    "42G": { name: '40英尺干货箱', color: 'pink' },
    "45G": { name: '40英尺干活高箱', color: 'limegreen' },
    "42V": { name: '40英尺挂衣箱', color: 'teal' },
    "42U": { name: '40英尺开顶箱', color: 'lavender' },
    "42R": { name: '40英尺冷冻箱', color: 'lightyellow' },
    "45R": { name: '40英尺冷高箱', color: 'lightgreen' },
    "42T": { name: '40英尺油罐箱', color: 'brown' },
    "42P": { name: '40英尺框架箱', color: 'olive' },
    "L2G": { name: '45英尺干货箱', color: 'plum' },
    "L5G": { name: '45英尺干活高箱', color: 'coral' },
    "L2V": { name: '45英尺挂衣箱', color: 'sienna' },
    "L2U": { name: '45英尺开顶箱', color: 'thistle' },
    "L2R": { name: '45英尺冷冻箱', color: 'tomato' },
    "L5R": { name: '45英尺冷高箱', color: 'turquoise' },
    "L2T": { name: '45英尺油罐箱', color: 'tan' },
    "L2P": { name: '45英尺框架箱', color: 'navy' }
  };

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


  ngAfterViewInit(): void {
    if (this.canvasContainer) {
      const divElement: HTMLElement = this.canvasContainer.nativeElement;
      divElement.style.height = `${this.vesselBayData.bayHeight}px`;
      divElement.style.width = `${this.vesselBayData.bayWidth}px`;
    }
    this.vesselBayBackgroungData = this.vesselBayData
    this.draw();
  }

  draw() {
    this.updateData(this.vesselBayData);
    const vesselBayLayer = this.getVesselBayLayer('vesselBay');
    this.canvasPro.addLayer(vesselBayLayer);
    const vesselBayBackgroundLayer = this.getVesselBayBackgroundLayer('vesselBayBackground');
    this.canvasPro.addLayer(vesselBayBackgroundLayer);
    this.drawLayers();
  }

  updateData(vesselbayData: VesselBay) {
    this.vesselBayData$.next(vesselbayData);
  }

  getVesselBayBackgroundLayer(layerName: string) {
    const insLayer = new Layer(layerName);
    const insSource = of(this.vesselBayBackgroungData);
    insLayer.setPushMode();
    insLayer.setTrigger(insSource);
    insLayer.setRenderer((ctx, data) => {
      insLayer.updateCanvasSize(data.bayWidth, data.bayHeight);
      this.canvasPro.updateViewportSize(data.bayWidth, data.bayHeight);
      this.renderVesselBayBackground(ctx, data);
    });
    return insLayer;
  }

  getVesselBayLayer(layerName: string) {
    const insLayer = new Layer(layerName);
    const insSource = this.vesselBayData$;
    insLayer.setPushMode();
    insLayer.setTrigger(insSource);
    insLayer.addEventListener('dbclick', (evt: CpDbClickEvent, data: VesselBay) => {
      const axis = evt.getAxis();
      const qcClick = data.vescells.find((item) => {
        const startX = item.x
        const startY = item.y;
        return (
          axis.x >= startX &&
          axis.x <= startX + this.config.width &&
          axis.y >= startY &&
          axis.y <= startY + this.config.height
        )
      });
      if (qcClick) {
        this.vescellDbClick.emit(qcClick);
      }

    })
    // this.canvasPro.drawVierport();
    insLayer.setRenderer((ctx, data) => {
      insLayer.updateCanvasSize(data.bayWidth, data.bayHeight);
      this.canvasPro.updateViewportSize(data.bayWidth, data.bayHeight);
      this.renderVesselBay(ctx, data);
    });
    return insLayer;
  }

  renderVesselBayBackground(
    ctx: OffscreenCanvasRenderingContext2D,
    data: VesselBay
  ) {
    const mid = this.finmid(data.vescells, '01')
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.font = 'lighter 8px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    data.vescells.forEach((item: Vescell<any>) => {
      ctx.beginPath();
      const ifOnly = this.getMarkerValue(this.vescellMarkerConfig.dj, item, data);
      if (this.getMarkerValue(this.vescellMarkerConfig.cross, item, data)) {
        ctx.strokeStyle = "black";
        ctx.moveTo(item.x, item.y);
        ctx.lineTo(item.x + this.config.width, item.y + this.config.height);
        ctx.stroke();
      }
      ctx.strokeStyle = ifOnly ? 'red' : 'black';
      ctx.strokeRect(item.x, item.y, this.config.width, this.config.height);
      ctx.closePath();
    });

    ctx.fillStyle = 'black'

    const colOuterList = data.vescells
      .filter((item: Vescell) => {
        return item.dh == 'D';
      })
      .filter((item: Vescell, index, self) => {
        const identifier = item.col + '_' + item.x;
        return (
          index ===
          self.findIndex(
            (item: Vescell) => item.col + '_' + item.x === identifier
          )
        );
      });

    const colInterList = data.vescells
      .filter((item: Vescell) => {
        return item.dh == 'H';
      })
      .filter((item: Vescell, index, self) => {
        const identifier = item.col + '_' + item.x;
        return (
          index ===
          self.findIndex(
            (item: Vescell) => item.col + '_' + item.x === identifier
          )
        );
      });

    const colList = [...colOuterList, ...colInterList];

    colList.forEach((item: Vescell) => {
      ctx.fillText(
        item.col,
        item.x + this.config.width / 2,
        item.y + this.config.height * 2
      );
    });
    const tierList = data.vescells.filter(
      (item: { tier: string; y: number }, index, self: any[]) => {
        const identifier = item.tier + '_' + item.y;
        return (
          index ===
          self.findIndex(
            (item: { tier: string; y: number }) =>
              item.tier + '_' + item.y === identifier
          )
        );
      }
    );
    const maxObj = data.vescells.reduce(
      (max: Vescell, current: Vescell) => {
        return current.col > max.col ? current : max;
      },
      data.vescells[0]
    );

    tierList.forEach((item: Vescell) => {
      ctx.fillText(item.tier, maxObj.x - 20, item.y + this.config.height / 2);
    });
    ctx.font = 'lighter 20px Arial';
    ctx.fillText('Bay  ' + data.bayName, mid, 10);
  }

  renderVesselBay(
    ctx: OffscreenCanvasRenderingContext2D,
    data: VesselBay
  ) {
    const mid = this.finmid(data.vescells, '01')
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.font = 'lighter 8px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    data.vescells.forEach((item: Vescell<any>) => {
      ctx.beginPath();
      const containerStyle = this.fillContainer(item)
      if (containerStyle) {
        ctx.fillStyle = containerStyle;
        ctx.fillRect(item.x, item.y, this.config.width, this.config.height);
      }
      ctx.closePath();
    });

    data.vescells.forEach((item: Vescell) => {
      const containerText = this.textContainer(item)
      if (containerText) {
        ctx.fillStyle = this.isDarkColor(ctx, item.x + this.config.width / 2, item.y + this.config.height / 4) ? "#FFFFFF" : "#000000";
        ctx.fillText(
          containerText,
          item.x + this.config.width / 2,
          item.y + this.config.height / 2
        );
      }
    });
  }

  finmid(vescells: Vescell[], value: string) {
    for (const item of vescells) {
      if (item.col === value) {
        return item.x;
      }
    }
    return 0;
  }

  drawLayers() {
    this.canvasPro.startDataflow();
    this.canvasPro.startAnimation();
    this.canvasPro.startListenEvent();
  }


  isDarkColor(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number) {
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const luminance = 0.299 * pixel[0] + 0.587 * pixel[1] + 0.114 * pixel[2];
    return luminance < 128;
  }

  // 在类中添加一个辅助方法
  private getMarkerValue<T>(
    marker: T | ((vescell: Vescell<unknown>, vesselBay: VesselBay<unknown>) => T),
     vescell: Vescell<unknown>,
    vesselBay: VesselBay<unknown>): T {
    return typeof marker === 'function' 
      ? (marker as ((vescell: Vescell<unknown>, vesselBay: VesselBay<unknown>) => T))(vescell, vesselBay) 
      : marker;
  }
}
