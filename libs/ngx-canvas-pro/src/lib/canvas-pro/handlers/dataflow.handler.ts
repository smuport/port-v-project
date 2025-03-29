import { Injectable } from '@angular/core';
import {
  Observable,
  Subject,
  Subscription,
  merge,
  of,
  catchError,
  takeUntil,
  tap,
  shareReplay,
  exhaustMap,
  withLatestFrom,
  map,
  filter,
} from 'rxjs';
import { Layer } from '../layer';

@Injectable()
export class DataflowHandler {
  allDataTriggers: Observable<any>[] = [];
  allAnimationTriggers: Observable<any>[] = [];
  allEventTriggers: Observable<any>[] = [];

  private dataflowSubscription: Subscription | null = null;
  private animationSubscription: Subscription | null = null;
  private eventSubscription: Subscription | null = null;
  private frameId: number | null = null;
  private destroy$ = new Subject<void>();

  private component: any;

  constructor() {}

  initialize(component: any) {
    this.component = component;
  }

  // 添加图层
  addLayer(layer: Layer) {
    if (!layer.isValid) {
      console.error(`${layer.name} is not valid`);
      return;
    }

    // 初始化数据流
    let trigger$: Observable<any>;
    if (layer.dataMode === 'push') {
      trigger$ = this.setupPushDataMode(layer);
    } else if (layer.dataMode === 'pull') {
      trigger$ = this.setupPullDataMode(layer);
    } else {
      trigger$ = this.setupDefaultDataMode(layer);
    }

    this.allDataTriggers.push(trigger$);

    // 初始化动画流
    const animation$ = this.setupAnimationStream(layer);
    this.allAnimationTriggers.push(animation$);

    // 初始化事件流
    const eventObservable = this.setupEventStream(layer, trigger$);
    this.allEventTriggers.push(eventObservable);
  }

  private setupPushDataMode(layer: Layer): Observable<any> {
    return layer.trigger.pipe(
      tap((data) => {
        layer.animation.update(data);
      }),
      shareReplay({ refCount: true })
    );
  }

  private setupPullDataMode(layer: Layer): Observable<any> {
    return layer.trigger.pipe(
      exhaustMap(() => layer.dataSource),
      tap((data) => {
        layer.animation.update(data);
      }),
      shareReplay({ refCount: true })
    );
  }

  private setupDefaultDataMode(layer: Layer): Observable<any> {
    return layer.trigger?.pipe(
      exhaustMap(() => layer?.dataSource),
      tap((data) => {
        layer.animation.update(data);
      }),
      shareReplay({ refCount: true })
    );
  }

  private setupAnimationStream(layer: Layer): Observable<any> {
    return layer.animation.onAnimated.asObservable().pipe(
      tap((data) => {
        layer.render(data);
        this.component.drawVierport();
      })
    );
  }

  private setupEventStream(
    layer: Layer,
    trigger$: Observable<any>
  ): Observable<any> {
    return layer.event$.pipe(
      withLatestFrom(trigger$),
      map(([evt, data]) => {
        const cb = layer.eventMap.get(evt.name);
        return [cb, evt, data];
      })
    );
  }

  // 启动动画
  startAnimation(layers: Layer[]) {
    if (this.frameId) {
      console.log('animation already started.');
      return;
    }

    this.animationSubscription = merge(...this.allAnimationTriggers)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (e) => {
          console.log(`animation error: ${e}`);
        },
        complete: () => {
          console.log(`animation completed`);
        },
      });

    console.log('animation start.');
    const animate = () => {
      layers.forEach((layer) => layer.animation.animate());
      this.frameId = requestAnimationFrame(animate);
    };
    this.frameId = requestAnimationFrame(animate);
  }

  // 停止动画
  stopAnimation() {
    if (this.frameId) {
      console.log('animation stop.');
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }

    if (this.animationSubscription) {
      this.animationSubscription.unsubscribe();
      this.animationSubscription = null;
    }
  }

  // 启动数据流
  startDataflow(
    controlDataflow?: (dataflowTriggers$: Observable<any>[]) => Observable<any>
  ) {
    if (this.dataflowSubscription) {
      console.log('dataflow already started');
      return;
    }

    const dataflowControl$ = controlDataflow
      ? controlDataflow(this.allDataTriggers)
      : merge(...this.allDataTriggers).pipe(
          catchError((err: unknown) => {
            return of(null);
          })
        );

    this.dataflowSubscription = dataflowControl$
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  // 停止数据流
  stopDataflow() {
    if (this.dataflowSubscription) {
      this.dataflowSubscription.unsubscribe();
      this.dataflowSubscription = null;
    }
  }

  // 开始监听事件
  startListenEvent() {
    this.eventSubscription = merge(...this.allEventTriggers)
      .pipe(
        filter(([cb, evt, data]) => {
          return !evt.isStopped();
        }),
        tap(([cb, evt, data]) => {
          if (cb) {
            cb(evt, data);
          }
        })
      )
      .subscribe();
  }

  // 停止监听事件
  stopListenEvent() {
    if (this.eventSubscription) {
      this.eventSubscription.unsubscribe();
      this.eventSubscription = null;
    }
  }

  // 清理资源
  destroy() {
    this.destroy$.next();
    this.stopDataflow();
    this.stopAnimation();
    this.stopListenEvent();
    this.destroy$.complete();
  }
}
