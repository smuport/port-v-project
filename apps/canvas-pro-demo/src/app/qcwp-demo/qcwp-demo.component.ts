import { Component } from '@angular/core';
import { QcwpComponent } from '@smuport/ngx-port-v';

@Component({
  selector: 'app-qcwp-demo',
  template: `
    <div class="qcwp-demo-container">
      <h1>岸桥分路计划演示</h1>
      <app-qcwp></app-qcwp>
    </div>
  `,
  styles: [`
    .qcwp-demo-container {
      width: 100%;
      height: 100vh;
      background-color: #f5f5f5;
      padding: 20px;
      box-sizing: border-box;
    }
    
    h1 {
      margin-bottom: 20px;
      color: #333;
      text-align: center;
    }
  `],
  standalone: true,
  imports: [QcwpComponent]
})
export class QcwpDemoComponent {
  constructor() {}
}