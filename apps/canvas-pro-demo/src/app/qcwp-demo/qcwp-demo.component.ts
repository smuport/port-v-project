import { Component } from '@angular/core';
import { QcwpComponent, Vessel } from '@smuport/ngx-port-v';

@Component({
  selector: 'app-qcwp-demo',
  template: `
    <div class="qcwp-demo-container">
      <app-qcwp [vessel]="vessel"></app-qcwp>
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
  vessel!: Vessel;
  constructor() {
    this.getVessel();
  }

    getVessel() {
        // 加载船舶数据
        fetch('mock-data/vessel.json')
        // fetch('mock-data/vessel-nansha.json')
          .then(response => response.json())
          .then(data => {
            // 处理船舶数据
            this.vessel = data;
          })
          .catch(error => {
            console.error('Error loading vessel data:', error);
          });
  }



}