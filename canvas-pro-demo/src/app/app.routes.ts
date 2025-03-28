import { Route } from '@angular/router';
import { ParticleDemoComponent } from './demo/particle-demo.component';

export const appRoutes: Route[] = [
  { path: '', component: ParticleDemoComponent },
  { path: 'particle-demo', component: ParticleDemoComponent }
];
