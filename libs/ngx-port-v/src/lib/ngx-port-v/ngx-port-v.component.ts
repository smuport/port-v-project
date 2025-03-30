import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasProComponent } from '@smuport/ngx-canvas-pro';


@Component({
  selector: 'lib-ngx-port-v',
  imports: [CommonModule, CanvasProComponent],
  templateUrl: './ngx-port-v.component.html',
  styleUrl: './ngx-port-v.component.css',
  standalone: true,
})
export class NgxPortVComponent {}
