import { Component, OnInit, OnDestroy, ViewChild, HostListener } from '@angular/core';
import { CanvasProComponent, CpClickEvent, CpDbClickEvent } from '@smuport/ngx-canvas-pro';
import { ParticleLayer } from './particle-layer';

@Component({
  selector: 'app-particle-demo',
  template: `
    <div class="demo-container">
      <canvas-pro #canvasPro></canvas-pro>
    </div>
  `,
  styles: [`
    .demo-container {
      width: 100%;
      height: 100vh;
      background-color: #000;
    }
  `],
  standalone: true,
  imports: [CanvasProComponent]
})
export class ParticleDemoComponent implements OnInit, OnDestroy {
    @ViewChild('canvasPro', { static: true })
    canvasPro!: CanvasProComponent;
  private backgroundLayer!: ParticleLayer;
  private foregroundLayer!: ParticleLayer;
  private effectsLayer!: ParticleLayer;
  private meteorLayer!: ParticleLayer; // 新增流星图层

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
      emitterRadius: 500
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
      emitterRadius: 300
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
      emitterRadius: 10
    });

    // 创建流星粒子层 - 从右上角到左下角划过的流星
    this.meteorLayer = new ParticleLayer('meteor', {
      maxParticles: 20,       // 更多流星
      emissionRate: 3,        // 更高的发射率
      minSpeed: 250,          // 更快的最小速度
      maxSpeed: 450,          // 更快的最大速度
      minRadius: 3,           // 更大的最小半径
      maxRadius: 6,           // 更大的最大半径
      minLife: 1.5,           // 稍长的最小生命周期
      maxLife: 3.5,           // 稍长的最大生命周期
      colors: ['#FFFFFF', '#F0F8FF', '#E6E6FA', '#B0C4DE', '#ADD8E6'],  // 更多颜色变化
      gravity: 7.5,
      wind: -10.5,             // 更强的风力
      friction: 0.98,
      emitterRadius: 20,      // 更大的发射半径，使流星出现位置更分散
      emitterX: window.innerWidth,
      emitterY: 0
    });
    
    // 为流星设置更明显的尾迹效果
    this.meteorLayer.setTrailEffect(true, {
      trailLength: 20,        // 更长的尾迹
      fadeRate: 0.08,         // 更慢的淡出速率
      colors: ['#FFFFFF', '#F0F8FF', '#E6E6FA']
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
    this.canvasPro.addLayer(this.meteorLayer);  // 添加流星层
    this.canvasPro.addLayer(this.effectsLayer);
  }

  private startAnimation(): void {
    // 启动各层
    // this.backgroundLayer.start();
    // this.foregroundLayer.start();
    // this.effectsLayer.start();
    // this.meteorLayer.start();  // 启动流星层

    // 启动 Canvas Pro 的动画和数据流
    this.canvasPro.startDataflow();
    this.canvasPro.startAnimation();
    this.canvasPro.startListenEvent();
  }
}