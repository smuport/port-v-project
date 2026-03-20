---
name: ngx-port-v
description: "Use when building port visualization features with @smuport/ngx-port-v. Covers standalone component integration (app-ship-side/app-vessel-bay/app-yard-bay/app-qcwp), required inputs/outputs, data shape expectations, and how ngx-port-v relies on ngx-canvas-pro rendering lifecycle in this repository."
argument-hint: "组件名(ship-side/vessel-bay/yard-bay/qcwp) + 输入数据来源 + 交互需求"
user-invocable: true
---

# Ngx Port V Skill

## When To Use
- 需要快速接入或改造港口可视化组件：`ShipSideComponent`、`VesselBayComponent`、`YardBayComponent`、`QcwpComponent`。
- 需要处理贝位框选、多选、任务分配等交互。
- 需要排查 `ngx-port-v` 与 `ngx-canvas-pro` 联动时的行为问题。

## Repository Facts To Respect
- `ngx-port-v` 在 Nx 中显式依赖 `ngx-canvas-pro`。
- 该库是 standalone 组件风格，业务接入时应直接在组件 `imports` 中引入目标组件。
- 最完整用法样例在 `apps/canvas-pro-demo/src/app/*-demo`。

## Correct Usage Procedure
1. 从 `@smuport/ngx-port-v` 按需导入组件与模型类型。
2. 在宿主 standalone 组件 `imports` 中注册目标组件。
3. 准备输入模型：
   - `ShipSideComponent`: `vessel`。
   - `VesselBayComponent`: `vesselBayData` + 可选 `config/fillContainer/textContainer/...`。
   - `YardBayComponent`: `yardBayData` + 可选 `fillYardPoses/textYardPoses/groupBy/orderBy`。
   - `QcwpComponent`: `vessel`、`cranes`、`qcwp`。
4. 模板监听输出事件（如框选、双击、任务变化），在业务层维护选择态与补丁更新。
5. 涉及多选逻辑时，优先在业务层维护 `Map` / `Set`，然后调用库组件的 patch 方法更新视图。
6. 若需要定制交互，给组件传 `interactionConfig`，不要硬改库内部默认配置。

## Integration Notes
- `ngx-port-v` 内部会创建并驱动 `CanvasProComponent` 图层流程；业务层通常只需提供数据和回调。
- 当输入数据结构缺字段时，优先补齐模型，而不是在渲染流程中写兜底分支。
- 大数据量场景下，先避免频繁整体替换数组，可通过组件提供的 patch 能力增量更新。

## Component Entry Points
- `app-ship-side`
- `app-vessel-bay`
- `app-yard-bay`
- `app-qcwp`

## Quality Checklist
- 输入数据类型与字段语义匹配库模型定义。
- 双击/框选等输出事件在宿主组件被正确消费。
- 交互配置满足产品操作预期，不与默认快捷键冲突。
- 样式层改动在容器缩放与滚动场景下仍稳定。

## References
- [Port V Component Playbook](./references/component-playbook.md)
