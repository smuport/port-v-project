import { Renderable, RenderStyle } from "./renderable";
import { RenderConfigurator } from "../render-configurator";

/**
 * 组渲染项配置
 */
interface GroupRenderableConfig<T, S extends RenderStyle> {
    // 用于创建子项的工厂函数
    renderableFactory: (data: T, configurator?: RenderConfigurator<T, S>) => Renderable;
    // 配置器，用于从数据到样式的映射
    configurator: RenderConfigurator<T, S>;
    // // 定位策略（可选），用于确定子项在组中的位置
    // layoutStrategy?: (items: Renderable[], parent: GroupRenderable<T, S>) => void;
  }

/**
 * 组渲染对象，可以将多个相同数据类型的渲染对象放在一起
 * @template T 数据类型
 * @template S 样式类型
 */
export class GroupRenderable<T = any, S extends RenderStyle = any> extends Renderable {
    // 子渲染对象
    private children: Renderable[] = [];
    // 配置
    private config: GroupRenderableConfig<T, S>;
    // 数据列表
    private dataList: T[] = [];
    
    /**
     * 构造函数
     * @param dataList 数据列表
     * @param config 配置
     */
    constructor(dataList: T[], config: GroupRenderableConfig<T, S>) {
      super(dataList);
      this.config = config;
      this.dataList = dataList;
      this.initialize();
    }
    
    /**
     * 初始化组内所有子渲染对象
     */
    private initialize(): void {
      // 清空现有子项
      this.children = [];
      
      // 为每个数据项创建一个渲染对象
      for (const data of this.dataList) {
        // 使用配置器更新样式
        // const updater = this.config.configurator.createUpdater();
        // updater(data);
        
        // 获取该数据项的样式
        const style = this.config.configurator.getStyle(data);
        
        // 使用工厂创建渲染对象
        const renderable = this.config.renderableFactory(data);
        this.children.push(renderable);
      }
      
    //   // 如果有布局策略，应用布局策略
    //   if (this.config.layoutStrategy) {
    //     this.config.layoutStrategy(this.children, this);
    //   }
    }
    
    /**
     * 更新数据
     * @param dataList 新的数据列表
     */
    override setData(dataList: T[]): void {
      this.dataList = dataList;
      this.initialize();
    }
    
    /**
     * 添加数据项
     * @param data 数据项
     */
    addItem(data: T): void {
      this.dataList.push(data);
      
      // // 使用配置器更新样式
      // const updater = this.config.configurator.createUpdater();
      // updater(data);
      
      // 获取该数据项的样式
      const style = this.config.configurator.getStyle(data);
      
      // 使用工厂创建渲染对象
      const renderable = this.config.renderableFactory(data);
      this.children.push(renderable);
      
    //   // 如果有布局策略，重新应用布局策略
    //   if (this.config.layoutStrategy) {
    //     this.config.layoutStrategy(this.children, this);
    //   }
    }
    
    /**
     * 获取子渲染对象
     */
    getChildren(): Renderable[] {
      return this.children;
    }
    
    /**
     * 渲染所有子项
     * @param ctx Canvas上下文
     */
    override render(ctx: OffscreenCanvasRenderingContext2D): void {
      // 渲染所有子项
      console.log(`GroupRenderable render: ${this.dataList}`);
      for (const child of this.children) {
        child.render(ctx);
      }
    }

    override extractData(data: any): T {
      return data;
        // throw new Error("Method not implemented.");
    }
  }