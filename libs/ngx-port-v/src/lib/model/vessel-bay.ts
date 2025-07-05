export type BayType =  'front' | 'back' | 'single';

export interface VesselBay<T = unknown> {
    bayName: string,
    bayWidth: number,
    bayHeight: number,
    bayType: BayType,
    vescells: Vescell<T>[]
}

export interface Vescell<T = unknown> {
    vescell: string,
    dh: 'D' | 'H',
    col: string,
    tier: string,
    x: number
    y: number
    data: T
}


export interface VescellMarkerConfig {
    cross: boolean | ((vescell: Vescell<unknown>, vesselBay: VesselBay<unknown>) => boolean);
    dj: boolean | ((vescell: Vescell<unknown>, vesselBay: VesselBay<unknown>) => boolean);
    ref: boolean | ((vescell: Vescell<unknown>, vesselBay: VesselBay<unknown>) => boolean);
    danger: string | ((vescell: Vescell<unknown>, vesselBay: VesselBay<unknown>) => string);
    jobModel: ('single' | 'double') | ((vescell: Vescell<unknown>, vesselBay: VesselBay<unknown>) => 'single' | 'double');
    height: boolean | ((vescell: Vescell<unknown>, vesselBay: VesselBay<unknown>) => boolean);
    // ...其他标记器定义
    // [key: string]: any;
  }

