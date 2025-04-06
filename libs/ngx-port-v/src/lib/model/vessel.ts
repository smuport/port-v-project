export interface Vessel<T = unknown> {
    vesselCode: string,
    vesselNameZh: string,
    vesselNameEn: string,
    allHeight: number,
    allWidth: number,
    deckHeight: number,
    hullWidth: number,
    vesBaySideViews: VesBaySideView<T>[],
    loadInstruct?: LoadInstruct[],
    unloadInstruct?: UnloadInstruct[],
    handlingTasks?: HandlingTask[]

}

export interface VesBaySideView<T = unknown> {
    bayName: string,
    bayType: 'single' | 'front' | 'back',
    dh: string,
    cells: Cell<T>[]
}

export interface Cell<T = unknown> {
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
    type: 'load' | 'unload',
    amount: number,
    assignedQcCode?: string,
    sequence?: number
}

