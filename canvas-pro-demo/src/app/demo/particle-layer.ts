import { Observable, Subject, of, interval, merge } from 'rxjs';
import { Layer, CpBaseEvent, RenderConfigurator } from '@smuport/ngx-canvas-pro';
import { ParticleAnimation } from './particle-animation';
import { ParticleRenderable } from './particle-renderable';
import { Particle, ParticleSystemConfig } from './particle.model';

export interface TrailEffectConfig {
  trailLength: number;
  fadeRate: number;
  colors: string[];
}

export class ParticleLayer extends Layer {
  private particles: Particle[] = [];
  private particleRenderable: ParticleRenderable;
  private config: ParticleSystemConfig;
  private hasTrailEffect = false;
  private trailConfig?: TrailEffectConfig;

  constructor(name: string, config: ParticleSystemConfig) {
    super(name);
    this.config = config;
    
    // 创建渲染配置器
    const configurator = new RenderConfigurator<Particle, any>();
    configurator.addRule({
      renderPath: 'fillStyle',
      transform: (_: any, particle: Particle) => particle.color
    }).addRule({
      renderPath: 'globalAlpha',
      transform: (_: any, particle: Particle) => particle.alpha
    }).addRule({
      renderPath: 'shadowBlur',
      transform: (_: any, particle: Particle) => particle.radius * 2
    }).addRule({
      renderPath: 'shadowColor',
      transform: (_: any, particle: Particle) => particle.color
    });
    
    // 创建粒子渲染器
    this.particleRenderable = new ParticleRenderable(this.particles, this.config);
    
    // 创建动画控制器
    this.animation = new ParticleAnimation(this.particleRenderable);
    
    // 设置数据源
    this.dataSource = of(this.particles);
    this.trigger = of(null);
    
    // 初始化画布
    this.initCanvas();
  }

  private initCanvas(): void {
    // 创建离屏画布
    this.canvas = new OffscreenCanvas(1000, 1000);
    this.ctx = this.canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  }

  override render(data: Particle[]): void {
    if (!this.ctx) {
      return;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particleRenderable.render(this.ctx);
  }

  // 启动粒子系统
  start(): void {
    // // 创建定时流 - 每100ms发射一次
    // const timerStream = interval(100);
    
    // // 合并定时流和点击事件流
    // const mergedStream = merge(
    //   timerStream,
    // );
    // this.setTrigger(mergedStream); // 设置触发器为合并后的流
    
  }

  // 设置尾迹效果
  setTrailEffect(enabled: boolean, config?: TrailEffectConfig): void {
    this.hasTrailEffect = enabled;
    this.trailConfig = config;
    
    // 将尾迹配置传递给渲染器
    if (this.particleRenderable) {
      this.particleRenderable.setTrailEffect(enabled, config);
    }
  }

  // 更新发射器位置
  updateEmitterPosition(x: number, y: number): void {
    this.config.emitterX = x;
    this.config.emitterY = y;
  }

  // 添加触发爆发的方法
  triggerExplosion(): void {
    // 临时增加发射率和粒子数量以产生爆发效果
    const originalEmissionRate = this.config.emissionRate;
    const originalMaxParticles = this.config.maxParticles;
    
    // 设置爆发参数
    this.config.emissionRate = 200; // 瞬间大量发射
    this.config.maxParticles += 100; // 临时增加最大粒子数
    
    
    // // 恢复原始参数
    // setTimeout(() => {
    //   this.config.emissionRate = originalEmissionRate;
    //   this.config.maxParticles = originalMaxParticles;
    // }, 100);
  }
  
}