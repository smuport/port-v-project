import { Injectable } from '@angular/core';
import { DragState, ViewportInteractionConfig } from '../interaction';
import { CpClickEvent, CpDbClickEvent } from '../event';
import { CanvasProComponent } from '../canvas-pro.component';
import { Layer } from '../layer';

@Injectable()
export class InteractionHandler {
  // 拖拽状态
  dragState: DragState = {
    isDragging: false,
    startPos: { x: 0, y: 0 },
    currentPos: { x: 0, y: 0 },
    deltaX: 0,
    deltaY: 0,
  };

  // 点击状态跟踪
  clickState = {
    // 记录点击开始的时间戳
    startTime: 0,
    // 记录点击开始时的坐标位置
    startPos: { x: 0, y: 0 },
    // 标记当前是否为有效点击状态
    isClick: false,
    // 判定为点击事件的最大移动距离阈值（像素）
    clickThreshold: 5,
    // 判定为点击事件的最大持续时间阈值（毫秒）
    clickTimeThreshold: 300,
    // 记录上一次点击的时间戳，用于双击检测
    lastClickTime: 0,
    // 记录上一次点击的坐标位置，用于双击检测
    lastClickPos: { x: 0, y: 0 },
    // 判定为双击事件的最大时间间隔阈值（毫秒）
    doubleClickTimeThreshold: 300,
    // 判定为双击事件的两次点击最大距离阈值（像素）
    doubleClickDistanceThreshold: 10,
    // 用于延迟处理单击事件的定时器，防止与双击事件冲突
    clickTimer: null as any,
  };

  // 键盘修饰键状态
  modifierKeys = {
    shift: false,
    ctrl: false,
    alt: false,
  };

  // 存储组件引用
  private component!: CanvasProComponent;

  constructor() {}

  // 初始化处理器
  initialize(component: any) {
    this.component = component;
  }

  // 鼠标按下事件处理
  handleMouseDown(event: MouseEvent) {
    this.dragState.isDragging = true;
    this.dragState.startPos = { x: event.clientX, y: event.clientY };
    this.dragState.currentPos = { x: event.clientX, y: event.clientY };
    this.dragState.deltaX = 0;
    this.dragState.deltaY = 0;

    // 记录点击开始时间和位置
    this.clickState.startTime = Date.now();
    this.clickState.startPos = { x: event.clientX, y: event.clientY };
    this.clickState.isClick = true;
  }

  // 鼠标移动事件处理
  handleMouseMove(
    event: MouseEvent,
    interactionConfig: ViewportInteractionConfig
  ) {
    if (!this.dragState.isDragging) return;
  
    // 更新拖拽状态
    this.dragState.currentPos = { x: event.clientX, y: event.clientY };
    this.dragState.deltaX = event.clientX - this.dragState.startPos.x;
    this.dragState.deltaY = event.clientY - this.dragState.startPos.y;
  
    // 检查移动距离是否超过点击阈值
    const dx = Math.abs(event.clientX - this.clickState.startPos.x);
    const dy = Math.abs(event.clientY - this.clickState.startPos.y);
    if (
      dx > this.clickState.clickThreshold ||
      dy > this.clickState.clickThreshold
    ) {
      this.clickState.isClick = false;
    }
  
    // 确定当前使用的交互模式
    let interactionMode = interactionConfig.drag?.default || 'pan';
  
    if (this.modifierKeys.shift && interactionConfig.drag?.shift) {
      interactionMode = interactionConfig.drag.shift;
    } else if (this.modifierKeys.ctrl && interactionConfig.drag?.ctrl) {
      interactionMode = interactionConfig.drag.ctrl;
    } else if (this.modifierKeys.alt && interactionConfig.drag?.alt) {
      interactionMode = interactionConfig.drag.alt;
    }
  
    // 根据交互模式执行相应操作
    switch (interactionMode) {
      case 'pan':
        this.component.handlePan(event, this.dragState.startPos);
        break;
      case 'zoom':
        this.component.handleDragZoom(event);
        break;
      case 'rotate':
        this.component.handleRotate(event, this.dragState.startPos);
        break;
      case 'frame-select':
        this.component.handleFrameSelect(event);
        break;
      case 'custom':
        if (interactionConfig.drag?.customHandler) {
          interactionConfig.drag.customHandler(
            event,
            this.component,
            this.dragState
          );
        }
        break;
      case 'none':
      default:
        // 不执行任何操作
        break;
    }
  
    // 更新起始位置为当前位置，用于计算下一帧的增量
    this.dragState.startPos = { x: event.clientX, y: event.clientY };
  }

  // 鼠标松开事件处理
  handleMouseUp(event: MouseEvent | FocusEvent) {
    this.setDragging(false);

    // 通知组件可能需要结束框选
    this.component.finishFrameSelect();

    if (event && 'button' in event) {
      if (event.button === 0) {
        if (this.component.viewportCtx) {
          this.component.viewportCtx.canvas.style.cursor = '';
        }

        // 检查是否是点击事件
        if (this.clickState.isClick) {
          const currentTime = Date.now();
          const timeElapsed = currentTime - this.clickState.startTime;

          // 如果时间也在阈值内，则可能是点击或双击
          if (timeElapsed < this.clickState.clickTimeThreshold) {
            // 检查是否是双击
            const timeSinceLastClick =
              currentTime - this.clickState.lastClickTime;
            const dx = Math.abs(event.clientX - this.clickState.lastClickPos.x);
            const dy = Math.abs(event.clientY - this.clickState.lastClickPos.y);
            const isDoubleClick =
              timeSinceLastClick < this.clickState.doubleClickTimeThreshold &&
              dx < this.clickState.doubleClickDistanceThreshold &&
              dy < this.clickState.doubleClickDistanceThreshold;

            if (isDoubleClick) {
              // 如果是双击，清除之前设置的单击定时器
              if (this.clickState.clickTimer) {
                clearTimeout(this.clickState.clickTimer);
                this.clickState.clickTimer = null;
              }

              // 处理双击事件
              this.handleDoubleClick(event as MouseEvent);
              // 重置最后点击时间，防止连续多次双击
              this.clickState.lastClickTime = 0;
            } else {
              // 存储当前事件对象的副本，用于延迟处理
              const eventCopy = new MouseEvent(event.type, event as MouseEvent);

              // 延迟处理单击事件，给双击检测留出时间
              this.clickState.clickTimer = setTimeout(() => {
                // 处理单击事件
                this.handleClick(eventCopy);
                this.clickState.clickTimer = null;
              }, this.clickState.doubleClickTimeThreshold);

              // 更新最后点击信息
              this.clickState.lastClickTime = currentTime;
              this.clickState.lastClickPos = {
                x: event.clientX,
                y: event.clientY,
              };
            }
          }
        }
      }
    }
  }

  // 处理点击事件
  handleClick(event: MouseEvent): void {
    console.log('单击事件触发', this.component.getAxis(event));

    // 创建并触发点击事件
    const cpClickEvent = new CpClickEvent(this.component.getAxis(event));
    this.component.triggerEvent(cpClickEvent);
  }

  // 处理双击事件
  handleDoubleClick(event: MouseEvent): void {
    console.log('双击事件触发', this.component.getAxis(event));

    // 创建并触发双击事件
    const cpDbClickEvent = new CpDbClickEvent(this.component.getAxis(event));
    this.component.triggerEvent(cpDbClickEvent);
  }

  // 处理滚轮事件
  handleWheel(event: WheelEvent, interactionConfig: ViewportInteractionConfig) {
    event.preventDefault();

    // 确定当前使用的交互模式
    let interactionMode = interactionConfig.wheel?.default || 'zoom';

    if (this.modifierKeys.shift && interactionConfig.wheel?.shift) {
      interactionMode = interactionConfig.wheel.shift;
    } else if (this.modifierKeys.ctrl && interactionConfig.wheel?.ctrl) {
      interactionMode = interactionConfig.wheel.ctrl;
    } else if (this.modifierKeys.alt && interactionConfig.wheel?.alt) {
      interactionMode = interactionConfig.wheel.alt;
    }

    // 根据交互模式执行相应操作
    switch (interactionMode) {
      case 'zoom':
        this.component.handleWheelZoom(event);
        break;
      case 'pan-vertical':
        this.component.handleWheelPanVertical(event);
        break;
      case 'pan-horizontal':
        this.component.handleWheelPanHorizontal(event);
        break;
      case 'custom':
        if (interactionConfig.wheel?.customHandler) {
          interactionConfig.wheel.customHandler(event, this.component);
        }
        break;
      case 'none':
      default:
        // 不执行任何操作
        break;
    }
  }

  // 键盘按下事件
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Shift') this.modifierKeys.shift = true;
    if (event.key === 'Control' || event.key === 'Meta')
      this.modifierKeys.ctrl = true;
    if (event.key === 'Alt') this.modifierKeys.alt = true;
  }

  // 键盘松开事件
  handleKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Shift') this.modifierKeys.shift = false;
    if (event.key === 'Control' || event.key === 'Meta')
      this.modifierKeys.ctrl = false;
    if (event.key === 'Alt') this.modifierKeys.alt = false;
  }

  // 在 InteractionHandler 中添加获取拖拽状态的方法
  // 添加获取拖拽状态的方法
  isDragging(): boolean {
    return this.dragState.isDragging;
  }
  
  // 添加设置拖拽状态的方法
  setDragging(dragging: boolean): void {
    this.dragState.isDragging = dragging;
  }
}
