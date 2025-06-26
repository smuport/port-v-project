import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Vescell, VesselBay, VesselBayComponent } from '@smuport/ngx-port-v';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-vessel-bay-demo',
  imports: [CommonModule, VesselBayComponent, FormsModule],
  templateUrl: './vessel-bay-demo.component.html',
  styleUrl: './vessel-bay-demo.component.css',
  standalone: true,
})
export class VesselBayDemoComponent implements OnInit {
  @ViewChild('vesselBay') vesselBay!: ElementRef;
  bayDatas: VesselBay[][] = [];



  containerIdStyles: Record<string, { name: string; color: string }> = {
    "C": { name: '20英尺干货箱', color: 'green' },
    "Z": { name: '20英尺干活高箱', color: 'red' },
    "G": { name: '20英尺挂衣箱', color: 'blue' },
  };


  textMode = 'type';


  containerTypeStyles: Record<string, { name: string; color: string }> = {
    "22G": { name: '20英尺干货箱', color: 'green' },
    "25G": { name: '20英尺干活高箱', color: 'red' },
    "22V": { name: '20英尺挂衣箱', color: 'blue' },
    "22U": { name: '20英尺开顶箱', color: 'orange' },
    "22R": { name: '20英尺冷冻箱', color: 'yellow' },
    "25R": { name: '20英尺冷高箱', color: 'cyan' },
    "22T": { name: '20英尺油罐箱', color: 'purple' },
    "22P": { name: '20英尺框架箱', color: 'magenta' },
    "42G": { name: '40英尺干货箱', color: 'pink' },
    "45G": { name: '40英尺干活高箱', color: 'limegreen' },
    "42V": { name: '40英尺挂衣箱', color: 'teal' },
    "42U": { name: '40英尺开顶箱', color: 'lavender' },
    "42R": { name: '40英尺冷冻箱', color: 'lightyellow' },
    "45R": { name: '40英尺冷高箱', color: 'lightgreen' },
    "42T": { name: '40英尺油罐箱', color: 'brown' },
    "42P": { name: '40英尺框架箱', color: 'olive' },
    "L2G": { name: '45英尺干货箱', color: 'plum' },
    "L5G": { name: '45英尺干活高箱', color: 'coral' },
    "L2V": { name: '45英尺挂衣箱', color: 'sienna' },
    "L2U": { name: '45英尺开顶箱', color: 'thistle' },
    "L2R": { name: '45英尺冷冻箱', color: 'tomato' },
    "L5R": { name: '45英尺冷高箱', color: 'turquoise' },
    "L2T": { name: '45英尺油罐箱', color: 'tan' },
    "L2P": { name: '45英尺框架箱', color: 'navy' }
  };
  colorMode = 'containerType';
  fillVesselBayContainer = (item: Vescell<any>) => {
    let color = 'white'
    if (this.colorMode == "unloadPort") {
      const key = item.data.containerID.slice(0, 1);
      color = this.containerIdStyles[key]?.color
    } else if (this.colorMode == "containerType") {
      const key = item.data.equipType.slice(0, 3);
      color = this.containerTypeStyles[key]?.color
    }
    return color
  };


  textVesselBayContainer = (item: Vescell<any>) => {
    let text = ''
    if (this.textMode == "type") {
      text = item.data.equipType
    } else if (this.textMode == "containerId") {
      text = item.data.containerID
    }
    return text
  };

  constructor(private http: HttpClient) { }
  ngOnInit(): void {
    // 加载船贝图数据
    this.http.get<VesselBay[][]>('mock-data/vessel-bay.json').subscribe(data => {
      console.log(data);

      this.bayDatas = data;


    });
  }

  switchMode() {
    const newBayDatas = this.bayDatas.map(bayData => bayData.map(bay => {
      return { ...bay }
    }))
    this.bayDatas = newBayDatas;
  }

  onColorModeChange($event: string) {
    this.colorMode = $event;
    this.switchMode();
  }

  onTextModeChange($event: string) {
    this.textMode = $event;
    this.switchMode();
  }

  onVesselBayDbClick($event: Vescell<any>) {
    alert(JSON.stringify($event.data))
  }


}
