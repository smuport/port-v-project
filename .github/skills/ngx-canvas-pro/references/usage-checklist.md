# Canvas Pro Usage Checklist

## 1) Minimal Wiring

```ts
@ViewChild('canvasPro', { static: true })
canvasPro!: CanvasProComponent;

ngAfterViewInit() {
  const layer = new Layer<MyData>('main');
  layer
    .setPushMode()
    .setTrigger(this.data$)
    .addRenderable(new CustomRenderable((ctx, data) => {
      layer.updateSize(data.width, data.height);
      this.canvasPro.updateViewportSize(data.width, data.height);
      // draw with ctx
    }));

  this.canvasPro.addLayer(layer);
  this.canvasPro.startDataflow();
  this.canvasPro.startAnimation();
  this.canvasPro.startListenEvent();
}
```

## 2) Push vs Pull Dataflow
- Push mode:
  - `trigger` 直接携带最新数据。
  - 适合 `BehaviorSubject`、事件流直接产出渲染 payload。
- Pull mode:
  - `trigger` 只作为时钟/触发器，`dataSource` 提供真实数据。
  - 适合轮询、分帧处理、按需拉取状态。

## 3) Interaction Config
- 推荐只开放必要操作，避免误操作。
- 常见组合：
  - `drag.default: 'pan'`
  - `drag.shift: 'frame-select'`
  - `wheel.default: 'zoom'`
  - `wheel.shift: 'pan-horizontal'`

## 4) Known Pitfalls In This Repo
- 事件名拼写必须与库保持一致：`dbclick`、`frameselect`。
- `addLayer` 前忘记 `addRenderable` 会导致图层无效。
- 业务代码重复调用启动方法可能造成重复订阅与性能问题。
- 大尺寸图层可能进入 tiles 渲染模式，性能排查时要先确认是否触发 tile 分片。

## 5) Verification Commands

```bash
nx serve canvas-pro-demo --configuration=development
nx test ngx-canvas-pro
nx build ngx-canvas-pro
```
