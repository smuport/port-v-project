import { AfterViewInit, Component, ViewChild } from "@angular/core";
import { CanvasProComponent, ViewportInteractionConfig } from "@smuport/ngx-canvas-pro";
import { Subject, debounceTime } from "rxjs";
import { MapLayer } from "./map.layer";


@Component({
  selector: 'app-map-demo',
  template: `
    <div class="map-container">
      <canvas-pro
        #canvasPro
        [interactionConfig]="interactionConfig"
      ></canvas-pro>
    </div>
  `,
  styles: [
    `
      .map-container {
        width: 1000px; // 100*100视口
        height: 1000px;
        background-color: #f0f0f0;
        border: 1px solid #ccc;
      }
    `,
  ],
  standalone: true,
  imports: [CanvasProComponent],
})
export class MapDemoComponent implements AfterViewInit {
  @ViewChild('canvasPro', { static: true })
  canvasPro!: CanvasProComponent;

  private mapLayer!: MapLayer;
  private viewportChangeSubject = new Subject<void>();

  // 交互配置
  interactionConfig: ViewportInteractionConfig = {
    drag: {
      default: 'pan',
      shift: 'none',
      ctrl: 'none',
      alt: 'zoom',
    },
    wheel: {
      default: 'zoom',
      shift: 'pan-horizontal',
      ctrl: 'none',
      alt: 'none',
    },
  };

  ngAfterViewInit(): void {
    // 获取 TransformService 实例

    // 创建地图图层
    this.mapLayer = new MapLayer('map-layer');
    this.canvasPro.addLayer(this.mapLayer);

    // 启动 Canvas Pro
    this.canvasPro.startDataflow();
    this.canvasPro.startAnimation();
    this.canvasPro.startListenEvent();

    // 设置视口变化监听
    this.setupViewportChange监听();

    // 初始更新可见格子
    this.updateVisibleCells();
  }

  private setupViewportChange监听(): void {
    // 监听视口变化
    this.viewportChangeSubject
      .pipe(debounceTime(50)) // 50ms 防抖
      .subscribe(() => {
        this.updateVisibleCells();
      });

    // 重写 drawVierport 方法，在每次渲染时检查视口变化
    const originalDrawVierport = this.canvasPro.drawVierport.bind(this.canvasPro);
    this.canvasPro.drawVierport = () => {
      originalDrawVierport();
      this.viewportChangeSubject.next();
    };
  }

  private updateVisibleCells(): void {
    // 计算当前视口的可见区域
    const viewportSize = this.canvasPro['viewportService'].getViewportSize();
    const { translatePos, scale } = this.canvasPro['transformService'];

    // 计算实际可见区域
    const visibleArea = {
      x: -translatePos.x,
      y: -translatePos.y,
      width: viewportSize.width / scale,
      height: viewportSize.height / scale,
    };

    // 更新地图图层的可见格子
    this.mapLayer.updateVisibleCells(visibleArea);
  }
}