import { Observable, Subject, of, interval, merge } from 'rxjs';
import {
  Layer,
  CpBaseEvent,
  RenderConfigurator,
} from '@smuport/ngx-canvas-pro';
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
  private originalConfig?: ParticleSystemConfig; // 添加原始配置属性

  constructor(name: string, config: ParticleSystemConfig) {
    super(name);
    this.config = config;
    this.originalConfig = { ...config }; // 保存初始配置的副本

    // 创建渲染配置器
    const configurator = new RenderConfigurator<Particle, any>();
    configurator
      .addRule({
        renderPath: 'fillStyle',
        transform: (_: any, particle: Particle) => particle.color,
      })
      .addRule({
        renderPath: 'globalAlpha',
        transform: (_: any, particle: Particle) => particle.alpha,
      })
      .addRule({
        renderPath: 'shadowBlur',
        transform: (_: any, particle: Particle) => particle.radius * 2,
      })
      .addRule({
        renderPath: 'shadowColor',
        transform: (_: any, particle: Particle) => particle.color,
      });

    // 创建粒子渲染器
    this.particleRenderable = new ParticleRenderable(
      this.particles,
      this.config
    );
    this.addRenderable(this.particleRenderable);

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
    this.ctx = this.canvas.getContext(
      '2d'
    ) as OffscreenCanvasRenderingContext2D;
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
  
  // 更新颜色
  updateColors(colors: string[]): void {
    this.config.colors = colors;
  }
  
  // 更新粒子大小
  updateSizes(sizeFactor: number): void {
    // 保存原始配置的引用
    const originalConfig = this.originalConfig || { ...this.config };
    this.originalConfig = originalConfig;
    
    // 应用大小因子
    this.config.minRadius = originalConfig.minRadius * sizeFactor;
    this.config.maxRadius = originalConfig.maxRadius * sizeFactor;
  }
  
  // 手动发射指定数量的粒子
  emitParticles(count: number): void {
    for (let i = 0; i < count; i++) {
      this.emitParticle();
    }
  }
  
  // 发射单个粒子的辅助方法
  private emitParticle(): void {
    if (this.particles.length >= this.config.maxParticles) {
      return; // 如果已达到最大粒子数，则不再发射
    }
    
    // 创建新粒子
    const angle = Math.random() * Math.PI * 2; // 随机角度
    const speed = this.config.minSpeed + Math.random() * (this.config.maxSpeed - this.config.minSpeed);
    
    // 在发射器半径范围内随机位置
    const distance = Math.random() * (this.config.emitterRadius ?? 5);
    const offsetX = Math.cos(angle) * distance;
    const offsetY = Math.sin(angle) * distance;
    
    const x = (this.config.emitterX || 0) + offsetX;
    const y = (this.config.emitterY || 0) + offsetY;
    
    // 随机选择颜色
    const color = this.config.colors[Math.floor(Math.random() * this.config.colors.length)];
    
    // 随机半径和生命周期
    const radius = this.config.minRadius + Math.random() * (this.config.maxRadius - this.config.minRadius);
    const life = this.config.minLife + Math.random() * (this.config.maxLife - this.config.minLife);
    
    // 创建粒子对象，符合Particle接口定义
    const particle: Particle = {
      id: Math.random().toString(36).substring(2, 9), // 生成随机ID
      x,
      y,
      radius,
      color,
      speed,
      direction: angle, // 使用之前计算的角度
      alpha: 1,
      life,
      maxLife: life,
    };
    
    // 添加到粒子数组
    this.particles.push(particle);
  }
}
