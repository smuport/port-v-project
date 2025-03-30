export interface GanttTask {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number; // 0-100
  color?: string;
  dependencies?: string[]; // 依赖任务的ID
}

export interface GanttConfig {
  startDate: Date;
  endDate: Date;
  rowHeight: number;
  columnWidth: number; // 每天的宽度
  headerHeight: number;
  colors: {
    grid: string;
    taskDefault: string;
    taskBorder: string;
    weekend: string;
    today: string;
    text: string;
  };
}