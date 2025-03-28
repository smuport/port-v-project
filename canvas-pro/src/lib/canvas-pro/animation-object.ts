import { Subject } from 'rxjs';

export class AnimationObject<T = any> {
  //   compareDataMap: { [key: string]: { current: T; target: T } };
  onAnimated = new Subject<T>();

  protected targetData: T | null = null;
  protected currentData: T;

  // 处理数据更新
  protected updateCallback: (currentData: T, targetData: T | null) => T = (curr, target) => {
    return curr;
  };
  // 处理动画数据变更计算
  protected animateCallback: (currentData: T, targetData: T | null) => [data: T, changed: boolean];
  constructor(
    initData: T,
    animateCallback: (currentData: T, targetData: T | null) => [data: T, changed: boolean],
    updateCallback?: (currentData: T, targetData: T | null) => T
  ) {
    this.currentData = initData;
    this.animateCallback = animateCallback;
    if (updateCallback) {
      this.updateCallback = updateCallback;
    }
  }

  update(targetData: T) {
    this.targetData = targetData;
    this.currentData = this.updateCallback(this.currentData, targetData);
    // console.log(`update: ${this.targetData}`);
  }

  animate() {
    const [data, changed] = this.animateCallback(this.currentData, this.targetData);
    if (changed) {
      this.currentData = data;
      this.onAnimated.next(this.currentData);
    } else {
      this.targetData = null;
    }
  }
}

export class NoopAnimation extends AnimationObject {
  constructor() {
    super(null, (curr, target) => {
      let changed = false;
      if (target) {
        changed = true;
        curr = target;
        this.targetData = null;
      }
      return [curr, changed];
    });
  }
}
