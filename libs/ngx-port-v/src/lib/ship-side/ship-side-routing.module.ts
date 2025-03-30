import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ShipSideComponent } from './ship-side.component';

const routes: Routes = [
  { path: "", component: ShipSideComponent, },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class VesselBayRoutingModule { }
