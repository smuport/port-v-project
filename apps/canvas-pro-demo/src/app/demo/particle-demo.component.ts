import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  HostListener,
} from '@angular/core';
import {
  CanvasProComponent,
  CpClickEvent,
  CpDbClickEvent,
  ViewportInteractionConfig,
  DragState
} from '@smuport/ngx-canvas-pro';
import { ParticleLayer } from './particle-layer';

@Component({
  selector: 'app-particle-demo',
  template: `
    <div class="demo-container">
      <canvas-pro #canvasPro [interactionConfig]="interactionConfig"></canvas-pro>
      
      <!-- 添加操作面板 -->
      <div class="control-panel" [class.collapsed]="isPanelCollapsed">
        <div class="panel-header" (click)="togglePanel()">
          <h3>操作指南 {{ isPanelCollapsed ? '▼' : '▲' }}</h3>
        </div>
        @if (!isPanelCollapsed) {
          <div class="panel-content">
            <h4>鼠标操作</h4>
            <ul>
              <li><strong>拖拽</strong>: 平移画布</li>
              <li><strong>双击</strong>: 在点击位置创建爆炸效果</li>
              <li><strong>滚轮</strong>: 缩放画布</li>
            </ul>
            
            <h4>组合键操作</h4>
            <ul>
              <li><strong>Shift + 拖拽</strong>: 创建粒子轨迹</li>
              <li><strong>Ctrl + 拖拽</strong>: 旋转画布</li>
              <li><strong>Alt + 拖拽</strong>: 缩放画布</li>
              <li><strong>Ctrl + 滚轮</strong>: 切换粒子颜色</li>
              <li><strong>Alt + 滚轮</strong>: 调整粒子大小</li>
              <li><strong>Shift + 滚轮</strong>: 水平平移画布</li>
            </ul>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .demo-container {
        width: 100%;
        height: 100vh;
        background-color: #000;
        position: relative;
      }
      
      .control-panel {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 250px;
        background-color: rgba(0, 0, 0, 0.7);
        border-radius: 8px;
        color: white;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        transition: all 0.3s ease;
        z-index: 1000;
      }
      
      .panel-header {
        padding: 10px 15px;
        cursor: pointer;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .panel-header h3 {
        margin: 0;
        font-size: 16px;
        display: flex;
        justify-content: space-between;
      }
      
      .panel-content {
        padding: 10px 15px;
        max-height: 300px;
        overflow-y: auto;
      }
      
      .panel-content h4 {
        margin: 10px 0 5px;
        font-size: 14px;
        color: #00BFFF;
      }
      
      .panel-content ul {
        margin: 0;
        padding-left: 20px;
      }
      
      .panel-content li {
        margin-bottom: 5px;
        font-size: 13px;
      }
      
      .panel-content strong {
        color: #FFA500;
      }
      
      .collapsed {
        width: 150px;
      }
    `,
  ],
  standalone: true,
  imports: [CanvasProComponent],
})
export class ParticleDemoComponent implements OnInit, OnDestroy {
  @ViewChild('canvasPro', { static: true })
  canvasPro!: CanvasProComponent;
  private backgroundLayer!: ParticleLayer;
  private foregroundLayer!: ParticleLayer;
  private effectsLayer!: ParticleLayer;
  private meteorLayer!: ParticleLayer; // 流星图层
  private trailLayer!: ParticleLayer; // 新增轨迹图层
  
  // 添加面板折叠状态
  isPanelCollapsed = false;
  
  // 粒子配置状态
  private particleConfig = {
    size: 1.0,
    colorIndex: 0,
    colorSets: [
      ['#1E90FF', '#00BFFF', '#87CEFA', '#B0E0E6'], // 蓝色系
      ['#FF4500', '#FF6347', '#FF7F50', '#FFA07A'], // 红色系
      ['#FFD700', '#FFA500', '#FF8C00', '#FF7F50'], // 黄色系
      ['#FFFFFF', '#F0F8FF', '#E6E6FA', '#B0C4DE'], // 白色系
      ['#32CD32', '#00FA9A', '#00FF7F', '#7FFF00']  // 绿色系
    ]
  };
  
  // 自定义交互配置
  interactionConfig: ViewportInteractionConfig = {
    drag: {
      default: 'pan',
      shift: 'custom', // Shift + 拖拽创建粒子轨迹
      ctrl: 'rotate',
      alt: 'zoom',
      customHandler: this.handleTrailEffect.bind(this)
    },
    wheel: {
      default: 'zoom',
      shift: 'pan-horizontal',
      ctrl: 'custom', // Ctrl + 滚轮改变粒子颜色
      alt: 'custom',  // Alt + 滚轮改变粒子大小
      customHandler: this.handleParticleConfig.bind(this)
    }
  };

  // 切换面板折叠状态
  togglePanel(): void {
    this.isPanelCollapsed = !this.isPanelCollapsed;
  }

  ngOnInit(): void {
    // 获取 CanvasProComponent 实例
    setTimeout(() => {
      this.setupLayers();
      this.startAnimation();
    }, 0);
  }

  ngOnDestroy(): void {
    // 清理资源
  }

  // 添加创建爆炸特效的方法
  private createExplosion(x: number, y: number): void {
    // 更新特效层的发射器位置
    this.effectsLayer.updateEmitterPosition(x, y);

    // 触发特效层的爆发
    this.effectsLayer.triggerExplosion();
  }
  
  // 自定义拖拽处理函数 - 创建粒子轨迹
  private handleTrailEffect(event: MouseEvent, component: CanvasProComponent, dragState: DragState): void {
    // 设置鼠标样式
    component.viewportCtx.canvas.style.cursor = 'crosshair';
    
    // 获取转换后的坐标
    const pos = this.canvasPro.getAxis(event);
    
    // 在当前位置创建粒子
    this.trailLayer.updateEmitterPosition(pos.x, pos.y);
    this.trailLayer.emitParticles(3); // 每次移动发射3个粒子
  }
  
  // 自定义滚轮处理函数 - 改变粒子配置
  private handleParticleConfig(event: WheelEvent, component: CanvasProComponent): void {
    // 检查是否按下了Ctrl键（改变颜色）
    if (event.ctrlKey || event.metaKey) {
      // 根据滚轮方向切换颜色集
      if (event.deltaY > 0) {
        this.particleConfig.colorIndex = (this.particleConfig.colorIndex + 1) % this.particleConfig.colorSets.length;
      } else {
        this.particleConfig.colorIndex = (this.particleConfig.colorIndex - 1 + this.particleConfig.colorSets.length) % this.particleConfig.colorSets.length;
      }
      
      // 应用新的颜色集
      const newColors = this.particleConfig.colorSets[this.particleConfig.colorIndex];
      this.updateLayerColors(newColors);
      
      console.log(`颜色集已更改为: ${this.particleConfig.colorIndex + 1}/${this.particleConfig.colorSets.length}`);
    }
    
    // 检查是否按下了Alt键（改变大小）
    if (event.altKey) {
      // 根据滚轮方向调整大小
      if (event.deltaY > 0) {
        this.particleConfig.size = Math.max(0.5, this.particleConfig.size - 0.1);
      } else {
        this.particleConfig.size = Math.min(3.0, this.particleConfig.size + 0.1);
      }
      
      // 应用新的大小
      this.updateLayerSizes(this.particleConfig.size);
      
      console.log(`粒子大小已调整为: ${this.particleConfig.size.toFixed(1)}`);
    }
  }
  
  // 更新所有图层的颜色
  private updateLayerColors(colors: string[]): void {
    this.backgroundLayer.updateColors(colors);
    this.foregroundLayer.updateColors(colors);
    this.effectsLayer.updateColors(colors);
    this.trailLayer.updateColors(colors);
  }
  
  // 更新所有图层的粒子大小
  private updateLayerSizes(sizeFactor: number): void {
    this.backgroundLayer.updateSizes(sizeFactor);
    this.foregroundLayer.updateSizes(sizeFactor);
    this.effectsLayer.updateSizes(sizeFactor);
    this.trailLayer.updateSizes(sizeFactor);
  }

  private setupLayers(): void {
    // 创建背景粒子层 - 缓慢移动的小粒子
    this.backgroundLayer = new ParticleLayer('background', {
      maxParticles: 100,
      emissionRate: 10,
      minSpeed: 5,
      maxSpeed: 15,
      minRadius: 1,
      maxRadius: 3,
      minLife: 10,
      maxLife: 20,
      colors: ['#1E90FF', '#00BFFF', '#87CEFA', '#B0E0E6'],
      gravity: 0.1,
      wind: 0.05,
      friction: 0.99,
      emitterRadius: 500,
    });

    // 创建前景粒子层 - 中等大小的粒子
    this.foregroundLayer = new ParticleLayer('foreground', {
      maxParticles: 50,
      emissionRate: 5,
      minSpeed: 20,
      maxSpeed: 40,
      minRadius: 3,
      maxRadius: 8,
      minLife: 5,
      maxLife: 10,
      colors: ['#FF4500', '#FF6347', '#FF7F50', '#FFA07A'],
      gravity: 0.2,
      wind: -0.1,
      friction: 0.98,
      emitterRadius: 300,
    });

    // 创建特效粒子层 - 爆炸效果
    this.effectsLayer = new ParticleLayer('effects', {
      maxParticles: 200,
      emissionRate: 50,
      minSpeed: 50,
      maxSpeed: 150,
      minRadius: 2,
      maxRadius: 6,
      minLife: 1,
      maxLife: 3,
      colors: ['#FFD700', '#FFA500', '#FF8C00', '#FF7F50'],
      gravity: 0.5,
      wind: 0,
      friction: 0.95,
      emitterRadius: 10,
    });

    // 创建流星粒子层 - 从右上角到左下角划过的流星
    this.meteorLayer = new ParticleLayer('meteor', {
      maxParticles: 20,
      emissionRate: 3,
      minSpeed: 250,
      maxSpeed: 450,
      minRadius: 3,
      maxRadius: 6,
      minLife: 1.5,
      maxLife: 3.5,
      colors: ['#FFFFFF', '#F0F8FF', '#E6E6FA', '#B0C4DE', '#ADD8E6'],
      gravity: 7.5,
      wind: -10.5,
      friction: 0.98,
      emitterRadius: 20,
      emitterX: window.innerWidth,
      emitterY: 0,
    });
    
    // 创建轨迹粒子层 - 用于自定义交互
    this.trailLayer = new ParticleLayer('trail', {
      maxParticles: 500,
      emissionRate: 0, // 不自动发射，由交互触发
      minSpeed: 10,
      maxSpeed: 30,
      minRadius: 2,
      maxRadius: 5,
      minLife: 1,
      maxLife: 3,
      colors: ['#32CD32', '#00FA9A', '#00FF7F', '#7FFF00'], // 绿色系
      gravity: 0.2,
      wind: 0,
      friction: 0.95,
      emitterRadius: 5,
    });
    
    // 为轨迹设置尾迹效果
    this.trailLayer.setTrailEffect(true, {
      trailLength: 10,
      fadeRate: 0.1,
      colors: ['#32CD32', '#00FA9A', '#00FF7F'],
    });

    // 为流星设置更明显的尾迹效果
    this.meteorLayer.setTrailEffect(true, {
      trailLength: 20,
      fadeRate: 0.08,
      colors: ['#FFFFFF', '#F0F8FF', '#E6E6FA'],
    });

    this.effectsLayer.addEventListener('dbclick', (event: CpDbClickEvent) => {
      // 爆炸特效触发后，在点击位置创建爆炸特效
      event.stopPropagation();
      console.log(event);
      this.createExplosion(event.getAxis().x, event.getAxis().y);
    });

    // 添加层到 Canvas Pro
    this.canvasPro.addLayer(this.backgroundLayer);
    this.canvasPro.addLayer(this.foregroundLayer);
    this.canvasPro.addLayer(this.meteorLayer);
    this.canvasPro.addLayer(this.trailLayer); // 添加轨迹层
    this.canvasPro.addLayer(this.effectsLayer);
  }

  private startAnimation(): void {
    // 启动 Canvas Pro 的动画和数据流
    this.canvasPro.startDataflow();
    this.canvasPro.startAnimation();
    this.canvasPro.startListenEvent();
  }
}
