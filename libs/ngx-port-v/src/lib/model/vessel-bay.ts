export interface VesselBay<T = any> {
    bayName: string,
    bayWidth: number,
    bayHeight: number,
    bayType: string,
    vescells: Vescell<T>[]
}

export interface Vescell<T> {
    vescell: string,
    dh: 'D' | 'H',
    col: string,
    tier: string,
    x: number
    y: number
    data: T
}

