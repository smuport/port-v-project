export class CpBaseEvent {
  name = 'base';
  private stopped = false;
  protected axis = { x: 0, y: 0 };
  protected startAxis = { x: 0, y: 0 };
  protected endAxis = { x: 0, y: 0 };
  protected moveAxis = { x: 0, y: 0 };
  protected button = 0;

  constructor(button: number = 0) {
    this.button = button;
  }

  stopPropagation() {
    this.stopped = true;
  }

  isStopped() {
    return this.stopped;
  }

  getAxis() {
    return this.axis;
  }

  getStartAxis() {
    return this.startAxis;
  }

  getMoveAxis() {
    return this.moveAxis;
  }

  getEndAxis() {
    return this.endAxis;
  }
}

export class CpDbClickEvent extends CpBaseEvent {
  constructor(axis: { x: number; y: number }) {
    super();
    this.name = 'dbclick';
    this.axis = axis;
  }
}

export class CpClickEvent extends CpBaseEvent {
  constructor(axis: { x: number; y: number }) {
    super();
    this.name = 'click';
    this.axis = axis;
  }
}

export class CpRightClickEvent extends CpBaseEvent {
  constructor(startAxis: { x: number; y: number }) {
    super();
    this.name = 'rightclick';
    this.startAxis = startAxis;
  }
}

export class CpRightMoveEvent extends CpBaseEvent {
  constructor(moveAxis: { x: number; y: number }) {
    super();
    this.name = 'rightclickmove';
    this.moveAxis = moveAxis;
  }
}

export class CpRightClickUpEvent extends CpBaseEvent {
  constructor(endAxis: { x: number; y: number }) {
    super();
    this.name = 'rightclickup';
    this.endAxis = endAxis;
  }
}

export class CpFrameSelectEvent extends CpBaseEvent {
  selection: { x: number; y: number; w: number; h: number } = { x: 0, y: 0, w: 0, h: 0 };
  selectedItems: any[] = [];
  
  constructor() {
    super();
    this.name = 'frameselect';
  }
}
