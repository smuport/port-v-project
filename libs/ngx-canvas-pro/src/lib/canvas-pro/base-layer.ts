import { Observable, Subject } from 'rxjs';
import { AnimationObject } from './animation-object';
import { CpBaseEvent } from './event';
import { Renderable } from './renderable/renderable';

export type LayerType = 'canvas' | 'svg';

export interface BaseLayer<T = any, U = any> {
  name: string;
  w: number;
  h: number;
  type: LayerType;
  dataSource: Observable<T>;
  trigger: Observable<U>;
  animation: AnimationObject<T>;
  event$: Subject<CpBaseEvent>;
  eventMap: Map<string, (evt: CpBaseEvent, data: T) => void>;
  get dataMode(): 'push' | 'pull';
  
  setPushMode(): this;
  setPullMode(): this;
  addEventListener(evtName: string, callback: (evt: CpBaseEvent, data: T) => void): void;
  triggerEvent<A extends CpBaseEvent>(evt: A): void;
  setDataSource(dataSource: Observable<T>): void;
  setTrigger(trigger: Observable<U>): void;
  addRenderable(renderable: Renderable): void;
  setAnimation(ao: AnimationObject<T>): void;
  updateSize(w: number, h: number): void;
  isValid(): boolean;
  render(data: T): void;
  checkSelection(selection: { x: number; y: number; w: number; h: number }): any[];
}