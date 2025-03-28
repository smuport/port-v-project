# ngx-canvas-pro

一个强大的 Angular 画布渲染库，用于创建复杂的交互式图形和动画。

## 特性

- 多层渲染系统，支持独立的图层管理
- 高性能的 OffscreenCanvas 渲染
- 灵活的事件处理系统
- 可自定义的渲染对象
- 动画支持
- 组件化的渲染架构

## 安装

```bash
npm install @smuport/ngx-canvas-pro
```

## 基本用法
### 1. 导入模块
```typescript
import { CanvasProComponent } from '@smuport/ngx-canvas-pro';

@Component({
  // ...
  imports: [CanvasProComponent],
  // ...
})
export class YourComponent {}
 ```
```

### 2. 在模板中使用
```html
<canvas-pro #canvasPro></canvas-pro>
 ```

### 3. 创建图层
```typescript
import { Layer, RenderConfigurator } from '@smuport/ngx-canvas-pro';

// 创建一个图层
const layer = new Layer('myLayer');

// 添加到 Canvas Pro
this.canvasPro.addLayer(layer);
 ```


### 4. 添加渲染对象

```typescript
import { Renderable } from '@smuport/ngx-canvas-pro';

// 创建自定义渲染对象
class MyRenderable extends Renderable<MyData, MyStyle> {
  // 实现渲染逻辑
  override render(ctx: OffscreenCanvasRenderingContext2D): void {
    // 绘制代码
  }
}

// 添加到图层
layer.addRenderable(new MyRenderable(data));
```


### 5. 启动渲染
```typescript
// 启动数据流
this.canvasPro.startDataflow();

// 启动动画
this.canvasPro.startAnimation();

// 启动事件监听
this.canvasPro.startListenEvent();
 ```

## 高级功能
### 事件处理
Canvas Pro 提供了丰富的事件处理机制，包括点击、双击、拖拽等：

```typescript
// 添加事件监听
layer.addEventListener('click', (event: CpClickEvent, data: any) => {
  console.log('点击事件', event.getAxis(), data);
});

// 触发事件
layer.triggerEvent(new CpClickEvent({ x: 100, y: 100 }));
 ```


### 动画系统
使用 AnimationObject 创建动画效果：

```typescript
import { AnimationObject } from '@smuport/ngx-canvas-pro';

// 创建动画对象
const animation = new AnimationObject<MyData>(
  initialData,
  (currentData, targetData) => {
    // 动画逻辑
    return [updatedData, hasChanged];
  }
);

// 设置到图层
layer.setAnimation(animation);
 ```


### 渲染配置器
使用 RenderConfigurator 管理渲染样式：

```typescript
import { RenderConfigurator } from '@smuport/ngx-canvas-pro';

// 创建配置器
const configurator = new RenderConfigurator<MyData, MyStyle>();

// 添加样式规则
configurator.addRule({
  renderPath: 'fillStyle',
  transform: (data) => data.color
});

// 应用到渲染对象
const renderable = new MyRenderable(data, configurator);
 ```


## 示例
### 粒子系统
创建一个粒子动画系统：

```typescript
// 创建粒子图层
const particleLayer = new ParticleLayer('particles', {
  maxParticles: 100,
  emissionRate: 10,
  minSpeed: 5,
  maxSpeed: 15,
  colors: ['#1E90FF', '#00BFFF', '#87CEFA']
});

// 添加到 Canvas Pro
this.canvasPro.addLayer(particleLayer);

// 启动粒子系统
particleLayer.start();
 ```

## API 参考
### CanvasProComponent
Canvas Pro 的主组件，管理图层和渲染循环。

### Layer
表示一个独立的渲染图层，可以包含多个渲染对象。

### Renderable
渲染对象的基类，定义了如何渲染数据。

### AnimationObject
管理动画状态和更新逻辑。

### RenderConfigurator
配置渲染样式和规则。

## 贡献
欢迎提交 Issue 和 Pull Request！

## 许可证
MIT
