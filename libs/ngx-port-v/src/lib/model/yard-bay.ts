export interface YardBay<T = unknown> {
    yardBay: string;
    maxCol: number;
    maxTier: number;
    yardPoses: YardPos<T>[];
}

export interface YardPos<T> {
    yardPos: string;
    col: number;
    tier: number;
    data: T | null;
}

export interface Rect {
    x: number;
    y: number;
    height: number;
    width: number;
}

export interface VisualYardBay<T> extends Rect, YardBay {
    yardPoses: VisualYardPos<T>[];
}

export type VisualYardPos<T = unknown> = YardPos<T> & Rect;