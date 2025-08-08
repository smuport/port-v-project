import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';

@Directive({
  selector: '[appMultiSelect]',
  standalone: true,
})
export class MultiSelectDirective<T = unknown> {
  @Input() items: T[] = [];
  @Input() itemIdField = 'id';
  @Input() selectedField = 'selected';
  @Input() customSelectionLogic:
    | ((item: T, event?: KeyboardEvent | MouseEvent) => boolean)
    | null = null;

  @Output() selectionChange = new EventEmitter<T[]>();

  private lastSelectedItemId: string | null = null;
  private lastShiftSelectedRange: [number, number] | null = null;

  /**
   * 选择项目
   * @param clickedItemId 当前鼠标点击项目ID
   * @param event 键盘或鼠标事件
   */
  selectItem(clickedItemId: string, event?: KeyboardEvent | MouseEvent) {
    const changedItems: T[] = [];
    const currentIndex = this.items.findIndex(
      (item) => this.getPropertyValue(item, this.itemIdField) === clickedItemId
    );

    // 如果找不到项目，直接返回
    if (currentIndex === -1) return;

    // 如果有自定义选择逻辑，则使用它
    if (this.customSelectionLogic) {
      const item = this.items[currentIndex];
      const shouldSelect = this.customSelectionLogic(item, event);
      this.setPropertyValue(item, this.selectedField, shouldSelect);
      changedItems.push(item);
      this.selectionChange.emit(changedItems);
      return;
    }

    // Shift多选逻辑
    if (event?.shiftKey && this.lastSelectedItemId) {
      const anchorIndex = this.items.findIndex(
        (item) =>
          this.getPropertyValue(item, this.itemIdField) ===
          this.lastSelectedItemId
      );
      if (this.lastShiftSelectedRange) {
        const [s, e] = this.lastShiftSelectedRange;
        for (let i = s; i <= e; i++) {
          if (i !== anchorIndex) {
            this.setPropertyValue(this.items[i], this.selectedField, false);
            changedItems.push(this.items[i]);
          }
        }
      }

      const newStart = Math.min(anchorIndex, currentIndex);
      const newEnd = Math.max(anchorIndex, currentIndex);
      for (let i = newStart; i <= newEnd; i++) {
        this.setPropertyValue(this.items[i], this.selectedField, true);
        changedItems.push(this.items[i]);
      }
      this.lastShiftSelectedRange = [newStart, newEnd];
    }
    // Cmd/Ctrl多选逻辑
    else if (event?.ctrlKey || event?.metaKey) {
      console.log(event);

      const item = this.items[currentIndex];
      const currentState = !this.getPropertyValue(item, this.selectedField);
      this.setPropertyValue(item, this.selectedField, currentState);
      changedItems.push(item);

      if (currentState) {
        this.lastSelectedItemId = clickedItemId;
        this.lastShiftSelectedRange = null;
      }
    }
    // 普通单选逻辑
    else {
      // 取消所有已选项
      this.items.forEach((item) => {
        if (this.getPropertyValue(item, this.selectedField)) {
          this.setPropertyValue(item, this.selectedField, false);
          changedItems.push(item);
        }
      });

      // 选中当前项
      const item = this.items[currentIndex];
      this.setPropertyValue(item, this.selectedField, true);
      changedItems.push(item);

      this.lastSelectedItemId = clickedItemId;
      this.lastShiftSelectedRange = null;
    }

    // 触发选择变更事件
    this.selectionChange.emit(changedItems);
  }

  /**
   * 获取所有选中的项目
   */
  getSelectedItems(): T[] {
    return this.items.filter((item) =>
      this.getPropertyValue(item, this.selectedField)
    );
  }

  /**
   * 清除所有选择
   */
  clearSelection(): void {
    const changedItems: T[] = [];
    this.items.forEach((item) => {
      if (this.getPropertyValue(item, this.selectedField)) {
        this.setPropertyValue(item, this.selectedField, false);
        changedItems.push(item);
      }
    });

    if (changedItems.length > 0) {
      this.selectionChange.emit(changedItems);
    }

    this.lastSelectedItemId = null;
    this.lastShiftSelectedRange = null;
  }

  /**
   * 根据属性路径获取对象属性值
   * 支持嵌套属性，如 'data.selected'
   */
  private getPropertyValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;

    const pathParts = path.split('.');
    let value = obj;

    for (const part of pathParts) {
      if (value === null || value === undefined) return undefined;
      value = value[part];
    }

    return value;
  }

  /**
   * 根据属性路径设置对象属性值
   * 支持嵌套属性，如 'data.selected'
   */
  private setPropertyValue(obj: any, path: string, value: any): void {
    if (!obj || !path) return;

    const pathParts = path.split('.');
    const lastPart = pathParts.pop();

    if (!lastPart) return;

    let current = obj;

    // 遍历路径直到倒数第二层
    for (const part of pathParts) {
      if (current[part] === undefined) {
        current[part] = {};
      }
      current = current[part];
    }

    // 设置最后一层的属性值
    current[lastPart] = value;
  }
}
