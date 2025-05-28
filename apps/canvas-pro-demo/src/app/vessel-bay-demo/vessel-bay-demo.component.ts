import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { VesselBay, VesselBayComponent } from '@smuport/ngx-port-v';


@Component({
  selector: 'app-vessel-bay-demo',
  imports: [CommonModule, VesselBayComponent],
  templateUrl: './vessel-bay-demo.component.html',
  styleUrl: './vessel-bay-demo.component.css',
  standalone: true,
})
export class VesselBayDemoComponent implements OnInit {

  bayDatas: VesselBay[][] = [];

  constructor(private http: HttpClient) { }
  ngOnInit(): void {
    // 加载船贝图数据
    this.http.get<VesselBay[][]>('mock-data/vessel-bay.json').subscribe(data => {
      console.log(data);

      this.bayDatas = data;
    });
  }


}
