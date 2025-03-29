import { Subject } from 'rxjs';
import { AnimationObject } from '@smuport/ngx-canvas-pro';
import { Particle } from './particle.model';
import { ParticleRenderable } from './particle-renderable';

export class ParticleAnimation extends AnimationObject<Particle[]> {
  private lastTime: number = 0;
  private renderable: ParticleRenderable;

  constructor(renderable: ParticleRenderable) {
    // 初始化 AnimationObject，提供初始数据和回调函数
    super(
      [], // 初始空粒子数组
      (currentData, targetData) => {
        // 动画回调函数
        const now = Date.now();
        if (this.lastTime === 0) {
          this.lastTime = now;
          return [currentData, false];
        }

        const deltaTime = (now - this.lastTime) / 1000; // 转换为秒
        this.lastTime = now;

        // 更新粒子状态
        this.renderable.updateParticles(deltaTime);

        // 返回更新后的数据和变更标志
        return [currentData, true]; // 粒子系统总是在变化
      },
      (currentData, targetData) => {
        // 更新回调函数
        // 当有新数据时，直接使用新数据
        if (targetData) {
          return targetData;
        }
        return currentData;
      }
    );

    this.renderable = renderable;
  }

  // 不需要重写 update 方法，因为父类的实现已经足够

  // 不需要重写 animate 方法，因为父类的实现已经足够
}
