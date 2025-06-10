export interface VesselBay<T = unknown> {
    bayName: string,
    bayWidth: number,
    bayHeight: number,
    bayType: string,
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

