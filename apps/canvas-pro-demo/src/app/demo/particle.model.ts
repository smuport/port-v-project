export interface Particle {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
  direction: number; // 角度，以弧度表示
  alpha: number;
  life: number;
  maxLife: number;
}

export interface ParticleSystemConfig {
  maxParticles: number;
  emissionRate: number; // 每秒发射的粒子数
  minSpeed: number;
  maxSpeed: number;
  minRadius: number;
  maxRadius: number;
  minLife: number; // 生命周期（秒）
  maxLife: number;
  colors: string[];
  gravity?: number;
  wind?: number;
  friction?: number;
  emitterX?: number; // 发射器X位置
  emitterY?: number; // 发射器Y位置
  emitterRadius?: number; // 发射范围
}
