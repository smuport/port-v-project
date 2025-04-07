import { Component } from '@angular/core';
import { Crane, HandlingTask, QcwpComponent, Vessel } from '@smuport/ngx-port-v';
@Component({
  selector: 'app-qcwp-demo',
  template: `
    <div class="qcwp-demo-container">
      <app-qcwp 
      [vessel]="vessel" 
      [cranes]="cranes" 
      (cranesChange)="onCranesUpdated($event)"
      (qcwpChange)="onQcwpUpdated($event)"
      [qcwp]="initialAssignedTasks"
      ></app-qcwp>
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
  cranes: Crane[] = [
    
  ]
  candidateCranes: Crane[] = [
    {id: "QC23", name: "QC23"},
    {id: "QC24", name: "QC24"},
    {id: "QC25", name: "QC25"},
    // {id: "QC26", name: "QC26"},
    // {id: "QC27", name: "QC27"},
  ]
  
  initialAssignedTasks: {[key:string]: HandlingTask[]} = {
    'QC23': [
      {
        vesselCode: "1234567890",
        bay: "02",
        dh: "D",
        amount: 100,
        type: "load",
        sequence: 1,
        assignedQcCode: "QC23",
      }
    ]
  }
  constructor() {
    this.getVessel();
  }

  onQcwpUpdated(assignedTasks: {[key:string]: HandlingTask[]}) {
    console.log(assignedTasks);
  }

  onCranesUpdated(cranes: Crane[]) {
    // 随机选择3个
    const selectedCranes = [];
    while (selectedCranes.length < 3 && this.candidateCranes.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.candidateCranes.length);
      selectedCranes.push(this.candidateCranes[randomIndex]);
    }
    this.cranes = [...selectedCranes];
  }
    getVessel() {
        // 加载船舶数据
        // fetch('mock-data/vessel.json')
        fetch('mock-data/vessel-nansha2.json')
          .then(response => response.json())
          .then((data: Vessel) => {
            // // 处理船舶数据
            // if (data.loadInstruct) {
            //   data.loadInstruct.forEach((item: LoadInstruct) => {
            //     if (!data.handlingTasks) {
            //       data.handlingTasks = [];
            //     }
            //     data.handlingTasks.push({
            //       vesselCode: data.vesselCode,
            //       bay: item.bay,
            //       dh: item.dh,
            //       amount: item.loadAmount,
            //       type: 'load'
            //     })
            //   })
            // }
            // if (data.unloadInstruct) {
            //   data.unloadInstruct.forEach((item: UnloadInstruct) => {
            //     if (!data.handlingTasks) {
            //       data.handlingTasks = [];
            //     }
            //     data.handlingTasks.push({
            //       vesselCode: data.vesselCode,
            //       bay: item.bay,
            //       dh: item.dh,
            //       amount: item.unloadAmount,
            //       type: 'unload'
            //     })
            //   })
            // }
            this.vessel = data;
            console.log(this.vessel)
          })
          .catch(error => {
            console.error('Error loading vessel data:', error);
          });
  }



}