export interface Crane {
  id: string;
  name: string;
  count?: number;
}

// export interface Task {
//   id: string;
//   bayNumber: number;
//   location: string;
//   operation: string;
//   containerCount: number;
// }

export interface QcwpConfig {
  unitTime: number;
  bayWidth: number;
  timeHeight: number;
  taskWidth: number;
  leftPadding: number;
  craneColors: string[];
}