import { Renderable, RenderStyle } from '@smuport/ngx-canvas-pro';
import { Particle, ParticleSystemConfig } from './particle.model';
import { TrailEffectConfig } from './particle-layer';

export interface ParticleRenderStyle extends RenderStyle {
  fillStyle: string;
  globalAlpha: number;
  shadowBlur: number;
  shadowColor: string;
}

export class ParticleRenderable extends Renderable<
  Particle[],
  ParticleRenderStyle
> {
  private particles: Particle[] = [];
  private config: ParticleSystemConfig;
  private lastEmitTime: number = 0;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private hasTrailEffect = false;
  private trailConfig?: TrailEffectConfig;
  private particleTrails: Map<
    string,
    { x: number; y: number; alpha: number; color: string }[]
  > = new Map();

  constructor(particles: Particle[] = [], config: ParticleSystemConfig) {
    super(particles);
    this.config = config;
    this.particles = particles;
  }

  extractData(data: any): Particle[] {
    if (Array.isArray(data)) {
      return data as Particle[];
    }
    return [];
  }

  // 设置尾迹效果
  setTrailEffect(enabled: boolean, config?: TrailEffectConfig): void {
    this.hasTrailEffect = enabled;
    this.trailConfig = config;

    if (!enabled) {
      // 清除所有尾迹
      this.particleTrails.clear();
    }
  }

  //   override render(ctx: OffscreenCanvasRenderingContext2D): void {
  //     this.canvasWidth = ctx.canvas.width;
  //     this.canvasHeight = ctx.canvas.height;

  //     // 清除画布
  //     ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

  //     // 如果启用了尾迹效果，先渲染尾迹
  //     if (this.hasTrailEffect && this.trailConfig) {
  //       this.renderTrails(ctx);
  //     }

  //     // 渲染所有粒子
  //     for (const particle of this.particles) {
  //       ctx.save();

  //       // 设置透明度
  //       ctx.globalAlpha = particle.alpha;

  //       // 设置阴影
  //       ctx.shadowBlur = particle.radius * 2;
  //       ctx.shadowColor = particle.color;

  //       // 设置填充颜色
  //       ctx.fillStyle = particle.color;

  //       // 绘制粒子
  //       ctx.beginPath();
  //       ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
  //       ctx.fill();

  //       ctx.restore();

  //       // 如果启用了尾迹效果，更新粒子的尾迹
  //       if (this.hasTrailEffect && this.trailConfig) {
  //         this.updateParticleTrail(particle);
  //       }
  //     }
  //   }

  // 渲染所有粒子的尾迹
  private renderTrails(ctx: OffscreenCanvasRenderingContext2D): void {
    // 遍历所有粒子的尾迹
    this.particleTrails.forEach((trail, particleId) => {
      // 如果尾迹为空，跳过

      if (trail.length === 0) return;

      // 渲染尾迹
      for (const point of trail) {
        ctx.save();

        // 设置透明度
        ctx.globalAlpha = point.alpha;

        // 设置填充颜色
        ctx.fillStyle = point.color;

        // 绘制尾迹点
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    });
  }

  // 更新粒子状态
  updateParticles(deltaTime: number): void {
    const now = Date.now();

    // 发射新粒子
    if (now - this.lastEmitTime > 1000 / this.config.emissionRate) {
      this.emitParticle();
      this.lastEmitTime = now;
    }

    // 更新现有粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];

      // 更新生命周期
      particle.life -= deltaTime;
      if (particle.life <= 0) {
        // 当粒子生命周期结束时，清除其尾迹
        if (this.hasTrailEffect) {
          this.particleTrails.delete(particle.id);
        }
        this.particles.splice(i, 1);
        continue;
      }

      // 更新透明度
      particle.alpha = particle.life / particle.maxLife;

      // 应用物理效果
      const gravity = this.config.gravity || 0;
      const wind = this.config.wind || 0;
      const friction = this.config.friction || 0.99;

      // 计算速度分量
      let vx = Math.cos(particle.direction) * particle.speed;
      let vy = Math.sin(particle.direction) * particle.speed;

      // 应用风和重力
      vx += wind;
      vy += gravity;

      // 应用摩擦力
      vx *= friction;
      vy *= friction;

      // 更新速度和方向
      particle.speed = Math.sqrt(vx * vx + vy * vy);
      particle.direction = Math.atan2(vy, vx);

      // 更新位置
      particle.x += vx * deltaTime;
      particle.y += vy * deltaTime;

      // 如果启用了尾迹效果，更新粒子的尾迹
      if (this.hasTrailEffect && this.trailConfig) {
        this.updateParticleTrail(particle);
      }

      // 边界检查
      if (
        particle.x < -particle.radius ||
        particle.x > this.canvasWidth + particle.radius ||
        particle.y < -particle.radius ||
        particle.y > this.canvasHeight + particle.radius
      ) {
        // 当粒子离开视图时，清除其尾迹
        if (this.hasTrailEffect) {
          this.particleTrails.delete(particle.id);
        }
        this.particles.splice(i, 1);
      }
    }
  }

  // 更新粒子的尾迹
  private updateParticleTrail(particle: Particle): void {
    if (!this.trailConfig) return;

    // 获取粒子的尾迹
    let trail = this.particleTrails.get(particle.id);

    // 如果尾迹不存在，创建新的尾迹
    if (!trail) {
      trail = [];
      this.particleTrails.set(particle.id, trail);
    }

    // 添加新的尾迹点
    trail.unshift({
      x: particle.x,
      y: particle.y,
      alpha: particle.alpha,
      color: particle.color,
    });

    // 限制尾迹长度
    if (trail.length > this.trailConfig.trailLength) {
      trail.pop();
    }

    // 更新尾迹点的透明度
    for (let i = 0; i < trail.length; i++) {
      trail[i].alpha *= 1 - this.trailConfig.fadeRate;
    }

    // 移除透明度太低的尾迹点
    const minAlpha = 0.05;
    while (trail.length > 0 && trail[trail.length - 1].alpha < minAlpha) {
      trail.pop();
    }
  }

  override render(ctx: OffscreenCanvasRenderingContext2D): void {
    this.canvasWidth = ctx.canvas.width;
    this.canvasHeight = ctx.canvas.height;

    // 不在这里清除画布，让父层处理清除操作
    // ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    // 如果启用了尾迹效果，先渲染尾迹
    if (this.hasTrailEffect && this.trailConfig) {
      this.renderTrails(ctx);
    }

    // 渲染所有粒子
    for (const particle of this.particles) {
      ctx.save();

      // 设置透明度
      ctx.globalAlpha = particle.alpha;

      // 设置阴影
      ctx.shadowBlur = particle.radius * 2;
      ctx.shadowColor = particle.color;

      // 设置填充颜色
      ctx.fillStyle = particle.color;

      // 绘制粒子
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 调试信息：输出尾迹数量
    // console.log(
    //   `尾迹数量: ${this.particleTrails.size}, 粒子数量: ${this.particles.length}`
    // );
  }

  // 发射新粒子
  private emitParticle(): void {
    if (this.particles.length >= this.config.maxParticles) {
      return;
    }

    const emitterX =
      this.config.emitterX !== undefined
        ? this.config.emitterX
        : this.canvasWidth / 2;
    const emitterY =
      this.config.emitterY !== undefined
        ? this.config.emitterY
        : this.canvasHeight / 2;
    const emitterRadius = this.config.emitterRadius || 0;

    // 随机角度
    const angle = Math.random() * Math.PI * 2;
    // 随机距离
    const distance = Math.random() * emitterRadius;

    // 计算发射位置
    const x = emitterX + Math.cos(angle) * distance;
    const y = emitterY + Math.sin(angle) * distance;

    // 随机方向
    const direction = Math.random() * Math.PI * 2;

    // 随机速度
    const speed =
      this.config.minSpeed +
      Math.random() * (this.config.maxSpeed - this.config.minSpeed);

    // 随机半径
    const radius =
      this.config.minRadius +
      Math.random() * (this.config.maxRadius - this.config.minRadius);

    // 随机生命周期
    const life =
      this.config.minLife +
      Math.random() * (this.config.maxLife - this.config.minLife);

    // 随机颜色
    const color =
      this.config.colors[Math.floor(Math.random() * this.config.colors.length)];

    // 创建新粒子
    const particle: Particle = {
      id: crypto.randomUUID(),
      x,
      y,
      radius,
      color,
      speed,
      direction,
      alpha: 1,
      life,
      maxLife: life,
    };

    this.particles.push(particle);
  }
}
