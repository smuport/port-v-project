import { Route } from '@angular/router';
import { ParticleDemoComponent } from './demo/particle-demo.component';
import { ShipSideDemoComponent } from './ship-side-demo/ship-side-demo.component';
import { GanttDemoComponent } from './gantt-demo/gantt-demo.component';
import { QcwpDemoComponent } from './qcwp-demo/qcwp-demo.component';
import { VesselBayDemoComponent } from './vessel-bay-demo/vessel-bay-demo.component';
import { YardBayDemoComponent } from './yard-bay-demo/yard-bay-demo.component';
import { MapDemoComponent } from './map-demo/map-demo.component';
import { LargeCanvasDemoComponent } from './large-canvas-demo/large-canvas-demo.component';
import { NxWelcomeComponent } from './nx-welcome.component';

export const appRoutes: Route[] = [
  {
    path: '',
    component: NxWelcomeComponent,
  },
  {
    path: 'particle',
    component: ParticleDemoComponent,
  },
  {
    path: 'ship-side',
    component: ShipSideDemoComponent,
  },
  {
    path: 'gantt',
    component: GanttDemoComponent,
  },
  {
    path: 'qcwp',
    component: QcwpDemoComponent,
  },
  {
    path: 'vessel-bay',
    component: VesselBayDemoComponent,
  },
  {
    path: 'yard-bay',
    component: YardBayDemoComponent,
  },
  {
    path: 'map-demo',
    component: MapDemoComponent,
  },
  {
    path: 'large-canvas',
    component: LargeCanvasDemoComponent,
  },
];
