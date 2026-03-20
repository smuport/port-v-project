---
name: ngx-canvas-pro
description: "Use when building or modifying canvas rendering features with @smuport/ngx-canvas-pro. Covers Layer setup, push/pull dataflow, animation loop, interaction config, event names (dbclick/frameselect), viewport sizing, and common integration pitfalls in this repository."
argument-hint: "目标功能 + 数据来源模式(push/pull) + 是否需要框选/缩放/旋转"
user-invocable: true
---

# Ngx Canvas Pro Skill

## When To Use
- 需要新增或重构基于 `CanvasProComponent` 的画布页面。
- 需要实现/排查 `Layer`、`Renderable`、`SvgLayer`、交互事件、框选能力。
- 需要将业务数据接入 `push` / `pull` 数据流并启动动画渲染。

## Repository Facts To Respect
- 本仓库中 `ngx-canvas-pro` 是独立可发布库（Nx `@nx/angular:package`）。
- Demo 入口在 `apps/canvas-pro-demo`，是验证行为的首选参考。
- 不要改写深层内部实现来适配业务，优先在业务层通过 `Layer`、`CustomRenderable`、`SvgRenderable` 扩展。

## Correct Usage Procedure
1. 在 standalone 组件 `imports` 中引入 `CanvasProComponent`，模板使用 `<canvas-pro #canvasPro ...></canvas-pro>`。
2. 在 `ngAfterViewInit` 或等价时机创建图层并调用 `canvasPro.addLayer(layer)`。
3. 每个 `Layer` 至少满足：`setTrigger(...)` + `addRenderable(...)`，否则 `addLayer` 会被判定为无效。
4. 根据数据模式选择：
   - `push`：`setPushMode()` + `setTrigger(data$)`。
   - `pull`：`setPullMode()` + `setTrigger(tick$)` + `setDataSource(data$)`。
5. 图层都添加完成后再启动：`startDataflow()` -> `startAnimation()` -> `startListenEvent()`。
6. 需要自定义调度时，给 `CanvasProComponent` 传入 `controlDataflow`，统一控制多个 trigger 合并策略。
7. 需要支持框选时，交互配置将拖拽映射到 `frame-select`，并监听 `frameselect` 事件。
8. 当业务数据尺寸变化时，更新 layer 尺寸并同步视口尺寸，避免可视区域与内容错位。

## Event Contract Notes
- 双击事件名是 `dbclick`（不是 `dblclick`）。
- 框选事件名是 `frameselect`。
- 事件从后添加图层向前传播，若需终止后续层处理，调用 `evt.stopPropagation()`。

## Quality Checklist
- `Layer.isValid()` 返回 true。
- 图层添加后只启动一套 dataflow/animation/event 订阅，避免重复启动。
- `interactionConfig` 映射与产品交互要求一致（默认/shift/ctrl/alt）。
- 缩放/平移后 `drawVierport()` 仍能正确绘制并保留框选矩形。

## References
- [Canvas Pro Usage Checklist](./references/usage-checklist.md)
