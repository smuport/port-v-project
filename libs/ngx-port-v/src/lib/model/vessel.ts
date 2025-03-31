export interface Vessel<T = any> {
    vesselCode: string,
    vesselNameZh: string,
    vesselNameEn: string,
    allHeight: number,
    allWidth: number,
    deckHeight: number,
    hullWidth: number,
    vesBaySideViews: VesBaySideView<T>[],
    loadInstruct: LoadInstruct[],
    unloadInstruct: UnloadInstruct[],
}

export interface VesBaySideView<T = any> {
    bayName: string,
    bayType: 'single' | 'front' | 'back',
    dh: string,
    cells: Cell<T>[]
}

export interface Cell<T = any> {
    tier: string,
    x: number,
    y: number,
    data: T
}

export interface LoadInstruct {
    bay: string,
    dh: string,
    loadAmount: number,
    x: number
}

export interface UnloadInstruct {
    bay: string,
    dh: string,
    unloadAmount: number,
    x: number
}

export interface HandlingTask {
    vesselCode: string,
    bay: string,
    dh: string,
    amount: number
}

