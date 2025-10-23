import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import {
  CanvasProComponent,
  ViewportInteractionConfig,
  Layer,
  SvgLayer,
} from '@smuport/ngx-canvas-pro';
import { GanttTask, GanttConfig } from './gantt.model';
import { GridRenderable } from './grid-renderable';
import { GanttSvgRenderable } from './gantt-svg-renderable';
import { of } from 'rxjs';

@Component({
  selector: 'app-gantt-demo',
  template: `
    <div class="gantt-container">
      <canvas-pro
        #canvasPro
        [interactionConfig]="interactionConfig"
      ></canvas-pro>
    </div>
  `,
  styles: [
    `
      .gantt-container {
        width: 100%;
        height: 100vh;
        background-color: #fff;
      }
    `,
  ],
  standalone: true,
  imports: [CanvasProComponent],
})
export class GanttDemoComponent implements OnInit, AfterViewInit {
  @ViewChild('canvasPro', { static: true })
  canvasPro!: CanvasProComponent;

  private gridLayer!: Layer<GanttConfig>;
  private ganttLayer!: SvgLayer<GanttTask[]>;

  // 交互配置
  interactionConfig: ViewportInteractionConfig = {
    drag: {
      default: 'pan',
      shift: 'none',
      ctrl: 'none',
      alt: 'zoom',
    },
    wheel: {
      default: 'zoom',
      shift: 'pan-horizontal',
      ctrl: 'none',
      alt: 'none',
    },
  };

  // 示例任务数据
  private tasks: GanttTask[] = [
    {
      id: '1',
      name: '需求分析',
      startDate: new Date(2023, 0, 1),
      endDate: new Date(2023, 0, 7),
      progress: 100,
      color: '#4285F4',
    },
    {
      id: '2',
      name: '设计阶段',
      startDate: new Date(2023, 0, 8),
      endDate: new Date(2023, 0, 15),
      progress: 80,
      color: '#EA4335',
      dependencies: ['1'],
    },
    {
      id: '3',
      name: '开发阶段',
      startDate: new Date(2023, 0, 16),
      endDate: new Date(2023, 1, 15),
      progress: 60,
      color: '#FBBC05',
      dependencies: ['2'],
    },
    {
      id: '4',
      name: '测试阶段',
      startDate: new Date(2023, 1, 16),
      endDate: new Date(2023, 1, 28),
      progress: 30,
      color: '#34A853',
      dependencies: ['3'],
    },
    {
      id: '5',
      name: '部署上线',
      startDate: new Date(2023, 2, 1),
      endDate: new Date(2023, 2, 7),
      progress: 0,
      color: '#4285F4',
      dependencies: ['4'],
    },
  ];

  // 甘特图配置
  private config: GanttConfig = {
    startDate: new Date(2022, 11, 25), // 从2022年12月25日开始
    endDate: new Date(2023, 2, 15), // 到2023年3月15日结束
    rowHeight: 40,
    columnWidth: 30, // 每天30像素宽
    headerHeight: 60,
    colors: {
      grid: '#ddd',
      taskDefault: '#4285F4',
      taskBorder: '#2b6cb0',
      weekend: '#f8f9fa',
      today: '#e8f4f8',
      text: '#333',
    },
  };

  ngOnInit(): void {
    // 组件初始化
  }

  ngAfterViewInit(): void {
    // 创建网格图层（Canvas）
    this.setupGridLayer();

    // 创建甘特图图层（SVG）
    this.setupGanttLayer();

    // 启动动画和数据流
    this.canvasPro.startDataflow();
    this.canvasPro.startAnimation();
    this.canvasPro.startListenEvent();
  }

  private setupGridLayer(): void {
    // 创建网格图层
    this.gridLayer = new Layer('grid-layer');

    // 设置数据源和触发器
    this.gridLayer.setDataSource(of(this.config));
    this.gridLayer.setTrigger(of(null));

    // 添加网格渲染器
    const gridRenderable = new GridRenderable(this.config);
    this.gridLayer.addRenderable(gridRenderable);

    // 添加图层到 Canvas Pro
    this.canvasPro.addLayer(this.gridLayer);
  }

  // 在 setupGanttLayer 方法中添加以下代码
  private setupGanttLayer(): void {
    // 创建甘特图 SVG 图层
    this.ganttLayer = new SvgLayer('gantt-layer');

    // 设置数据源和触发器
    this.ganttLayer.setDataSource(of(this.tasks));
    this.ganttLayer.setTrigger(of(null));

    // 添加甘特图渲染器
    const ganttRenderable = new GanttSvgRenderable(this.tasks, this.config);

    // 设置任务点击处理函数
    ganttRenderable.setTaskClickHandler((task) => {
      console.log('任务被点击:', task);
      // 这里可以添加更多处理逻辑，如显示任务详情对话框等
      alert(
        `任务: ${
          task.name
        }\n开始: ${task.startDate.toLocaleDateString()}\n结束: ${task.endDate.toLocaleDateString()}\n进度: ${
          task.progress
        }%`
      );
    });

    this.ganttLayer.addRenderable(ganttRenderable);

    // 添加图层到 Canvas Pro
    this.canvasPro.addLayer(this.ganttLayer);
  }

  // 更新任务数据
  updateTasks(tasks: GanttTask[]): void {
    this.tasks = tasks;
    this.ganttLayer.setDataSource(of(this.tasks));
  }

  // 更新配置
  updateConfig(config: GanttConfig): void {
    this.config = config;
    this.gridLayer.setDataSource(of(this.config));
    // // 需要通知甘特图渲染器配置已更新
    // const ganttRenderable = this.ganttLayer.renderables[0] as GanttSvgRenderable;
    // if (ganttRenderable) {
    //   ganttRenderable.updateConfig(this.config);
    // }
  }
}
