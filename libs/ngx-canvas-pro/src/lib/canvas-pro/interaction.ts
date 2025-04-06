import { CanvasProComponent } from './canvas-pro.component';

// 拖拽状态接口
export interface DragState {
  isDragging: boolean;
  startPos: { x: number; y: number };
  currentPos: { x: number; y: number };
  deltaX: number;
  deltaY: number;
}

// 拖拽行为类型
export type DragInteractionMode = 'pan' | 'zoom' | 'rotate' | 'none' | 'custom' | 'frame-select';

// 滚轮行为类型
export type WheelInteractionMode =
  | 'zoom'
  | 'pan-vertical'
  | 'pan-horizontal'
  | 'none'
  | 'custom';

// 添加新的接口定义
export interface ViewportInteractionConfig {
  // 拖拽行为配置
  drag?: {
    // 默认拖拽行为（无修饰键）
    default?: DragInteractionMode;
    // Shift 键 + 拖拽
    shift?: DragInteractionMode;
    // Ctrl/Cmd 键 + 拖拽
    ctrl?: DragInteractionMode;
    // Alt 键 + 拖拽
    alt?: DragInteractionMode;
    // 自定义拖拽处理函数
    customHandler?: (
      event: MouseEvent,
      component: CanvasProComponent,
      dragState: DragState
    ) => void;
  };
  // 滚轮行为配置
  wheel?: {
    // 默认滚轮行为,建议将default 设为 none ,不然会对页面滚动有影响
    default?: WheelInteractionMode;
    // Shift 键 + 滚轮
    shift?: WheelInteractionMode;
    // Ctrl/Cmd 键 + 滚轮
    ctrl?: WheelInteractionMode;
    // Alt 键 + 滚轮
    alt?: WheelInteractionMode;
    // 自定义滚轮处理函数
    customHandler?: (event: WheelEvent, component: CanvasProComponent) => void;
  };
}
