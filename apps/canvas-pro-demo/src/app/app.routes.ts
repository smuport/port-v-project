import { Route } from '@angular/router';
import { ParticleDemoComponent } from './demo/particle-demo.component';
import { GanttDemoComponent } from './gantt-demo/gantt-demo.component';

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
    path: '',
    redirectTo: 'gantt',
    pathMatch: 'full'
  }
];
