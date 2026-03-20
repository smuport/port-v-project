# Port V Component Playbook

## 1) Ship Side

```html
<app-ship-side
  [vessel]="vessel"
  [config]="{ width: 30, height: 15 }"
  [fillCell]="fillCellFn"
  (vesselBaySelected)="onBaySelected($event)"
></app-ship-side>
```

Use for:
- 船侧贝位总览与贝位选择。
- 处理作业任务（handling task）可视化联动。

## 2) Vessel Bay

```html
<app-vessel-bay
  [vesselBayData]="bay"
  [config]="{ width: 48, height: 24 }"
  [fillContainer]="fillVesselBayContainer"
  [textContainer]="textVesselBayContainer"
  [interactionConfig]="interactionConfig"
  (vescellFrameSelect)="selectVescells($event)"
  (vescellDbClick)="onVesselBayDbClick($event)"
></app-vessel-bay>
```

Use for:
- 船贝位格位渲染、多选框选、双击查看。

## 3) Yard Bay

```html
<app-yard-bay
  [yardBayData]="filteredData"
  [fillYardPoses]="fillYardPoses"
  [textYardPoses]="textYardPoses"
  [groupBy]="groupBy"
  [orderBy]="orderBy"
  [interactionConfig]="interactionConfig"
  (yardPosFrameSelect)="selectYardPoses($event)"
  (yardPosDbClick)="onYardPosDbClick($event)"
></app-yard-bay>
```

Use for:
- 场位分组、排序、框选、增量 patch 更新。

## 4) QCWP

```html
<app-qcwp
  [vessel]="vessel"
  [cranes]="cranes"
  [qcwp]="initialAssignedTasks"
  (cranesChange)="onCranesUpdated($event)"
  (qcwpChange)="onQcwpUpdated($event)"
></app-qcwp>
```

Use for:
- 桥吊任务分配与调度结果编辑。

## 5) Common Pitfalls
- 组件是 standalone，忘记加到 `imports` 会直接模板报错。
- 框选结果通常是局部变化，建议 patch，不建议整量重建。
- 业务层筛选/排序变化后要确保触发组件重算布局。

## 6) Verification Commands

```bash
nx serve canvas-pro-demo --configuration=development
nx test ngx-port-v
nx build ngx-port-v
```
