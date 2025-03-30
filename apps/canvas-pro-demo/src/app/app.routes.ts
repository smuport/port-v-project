import { Route } from '@angular/router';
import { ParticleDemoComponent } from './demo/particle-demo.component';
import { GanttDemoComponent } from './gantt-demo/gantt-demo.component';
import { ShipSideDemoComponent } from './ship-side-demo/ship-side-demo.component';

export const appRoutes: Route[] = [
  {
    path: 'particle',
    component: ParticleDemoComponent
  },
  {
    path: 'gantt',
    component: GanttDemoComponent
  },
  {
    path: 'ship-side',
    component: ShipSideDemoComponent
  },
  {
    path: '',
    redirectTo: 'ship-side',
    pathMatch: 'full'
  }
];
