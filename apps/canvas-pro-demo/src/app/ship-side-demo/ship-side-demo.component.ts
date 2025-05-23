import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ShipSideComponent, Vessel } from '@smuport/ngx-port-v';

@Component({
  selector: 'app-ship-side-demo',
  templateUrl: './ship-side-demo.component.html',
  styles: [`
    .ship-side-container {
      width: 100%;
      height: 100vh;
      background-color: #f5f5f5;
      position: relative;
      overflow: auto;
    }
    .controls {
      position: fixed;
      top: 10px;
      left: 10px;
      z-index: 100;
      background: rgba(255, 255, 255, 0.8);
      padding: 10px;
      border-radius: 5px;
    }
    .ship-view {
      padding: 20px;
      margin-top: 60px;
    }
  `],
  standalone: true,
  imports: [CommonModule, ShipSideComponent]
})
export class ShipSideDemoComponent implements OnInit {
  vessel!: Vessel;
  selectedBays: string[] = [];
  
  // 配置
  config = {
    width: 30,
    height: 15
  };
  
  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // 加载船舶数据
    this.http.get<Vessel>('mock-data/vessel.json').subscribe(data => {
      this.vessel = data;
    });
  }

  // 单元格填充颜色函数
  fillCellFn = (data: any): string => {
    if (!data) return 'white';
    
    if (data.status === 'empty') {
      return 'white';
    } else if (data.status === 'loaded' && data.color) {
      return data.color;
    }
    
    return '#cccccc';
  }

  // 贝位选择事件处理
  onBaySelected(bays: string[]): void {
    this.selectedBays = bays;
    console.log('选中的贝位:', bays);
  }
}