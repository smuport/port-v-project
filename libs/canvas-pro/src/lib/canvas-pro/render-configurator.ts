import { RenderStyle } from './renderable/renderable';

// 类型定义
type ValueTransformer<T = any, D = any, R = any> = (value: T, data: D) => R;
type ConditionPredicate<T = any, D = any> = (value: T, data: D) => boolean;
// 类型安全的路径访问器
// 限制递归深度的类型安全路径访问器
type Path<T, Depth extends number = 5> = [Depth] extends [never]
  ? never
  : T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}` | `${K}.${Path<T[K], Prev[Depth]>}`
          : `${K}`
        : never;
    }[keyof T]
  : never;

type Prev = [never, 0, 1, 2, 3, 4, 5];
// 渲染规则配置接口
interface RenderRuleConfig<D, S extends RenderStyle> {
  /** 数据属性路径 (支持嵌套路径) */
  dataPath?: Path<D>;
  /** 渲染属性路径 (支持嵌套路径) */
  renderPath: Path<S>;
  /** 条件判断函数 */
  when?: ConditionPredicate<any, D>;
  /** 值转换函数 */
  transform?: ValueTransformer<any, D, any>;
  /** 默认值 */
  defaultValue?: any;
}

// 条件判断工厂
class Condition {
  static eq<T>(expected: T): ConditionPredicate<T> {
    return (value) => value === expected;
  }

  static gt(threshold: number): ConditionPredicate<number> {
    return (value) => value > threshold;
  }

  static contains(str: string): ConditionPredicate<string> {
    return (value) => value.includes(str);
  }
}

// 属性访问工具
class PropertyAccessor {
  static get(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }

  static set(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((acc, key) => (acc[key] = acc[key] ?? {}), obj);
    target[lastKey] = value;
  }
}

// 渲染属性配置器
export class RenderConfigurator<D = any, S extends RenderStyle = any> {
  private rules: Array<RenderRuleConfig<D, S>> = [];
  private renderStyle: S;

  constructor() {
    this.renderStyle = {} as S;
  }

  /**
   * 添加渲染规则
   * @param config 规则配置
   */
  addRule(config: RenderRuleConfig<D, S>): this {
    this.rules.push(config);
    return this;
  }

  getStyle(data: D): S {
    //深拷贝
    let style = {};
    for (const rule of this.rules) {
      let rawValue = data;
      if (rule.dataPath) {
        rawValue = PropertyAccessor.get(data, rule.dataPath);
      }

      // 检查条件
      if (rule.when && !rule.when(rawValue, data)) continue;

      // 转换值
      const finalValue = rule.transform
        ? rule.transform(rawValue, data)
        : rawValue ?? rule.defaultValue;

      // 设置属性
      if (finalValue !== undefined && rule.renderPath) {
        PropertyAccessor.set(style, rule.renderPath, finalValue);
      }
    }
    return style as S;
    // return this.renderStyle;
  }

  /**
   * 生成属性更新函数
   */
  createUpdater(): (data: D) => void {
    return (data: D) => {
      for (const rule of this.rules) {
        let rawValue = data;
        if (rule.dataPath) {
          rawValue = PropertyAccessor.get(data, rule.dataPath);
        }

        // 检查条件
        if (rule.when && !rule.when(rawValue, data)) continue;

        // 转换值
        const finalValue = rule.transform
          ? rule.transform(rawValue, data)
          : rawValue ?? rule.defaultValue;

        // 设置属性
        if (finalValue !== undefined && rule.renderPath) {
          PropertyAccessor.set(this.renderStyle, rule.renderPath, finalValue);
        }
      }
    };
  }
}
