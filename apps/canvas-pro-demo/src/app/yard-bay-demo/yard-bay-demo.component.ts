import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import {
  VisualYardPos,
  YardBay,
  YardBayComponent,
  YardPos,
} from '@smuport/ngx-port-v';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-yard-bay-demo',
  imports: [CommonModule, FormsModule, YardBayComponent],
  templateUrl: './yard-bay-demo.component.html',
  styleUrl: './yard-bay-demo.component.css',
  standalone: true,
})
export class YardBayDemoComponent implements OnInit {
  fillYardPoses = (yardPos: VisualYardPos<any>): string | CanvasGradient => {
    if (yardPos.data) {
      if (yardPos.data.isSelected) return '#00FFFF';
      if (!yardPos.data.idx) return '#FFFFFF';
      const ctx = new OffscreenCanvas(1, 1).getContext(
        '2d'
      ) as OffscreenCanvasRenderingContext2D;
      if (this.isResultMode && yardPos.data.vesselBay) {
        let fillStyle = this.bayColorDict[yardPos.data.vesselBay] || '#FFFFFF';
        if (yardPos.data.ifIncorrect) {
          const gradient = ctx.createLinearGradient(
            yardPos.x,
            yardPos.y,
            yardPos.x + yardPos.width,
            yardPos.y + yardPos.height
          );
          gradient.addColorStop(0, '#FF0000');
          gradient.addColorStop(1, '#FF6B6B');
          return gradient;
        }
        return fillStyle;
      } else {
        const gradient = ctx.createLinearGradient(
          yardPos.x,
          yardPos.y,
          yardPos.x + yardPos.width,
          yardPos.y + yardPos.height
        );
        gradient.addColorStop(0, '#3A86FF');
        gradient.addColorStop(1, '#9CE3E1');
        return gradient;
      }
    } else {
      return '#FFFFFF';
    }
  };

  // 文本绘制
  textYardPoses = (yardPos: YardPos<any>) => {
    let text: string[] = [];
    if (yardPos.data) {
      if (Object.keys(yardPos.data).length !== 1) {
        const data = yardPos.data;
        if (data.prestowWeightRangeIdx !== 0) {
          text = [
            yardPos.data.idx,
            yardPos.data.ctnWeight,
            yardPos.data.prestowWeightRangeIdx,
          ];
        } else {
          text = [yardPos.data.idx, yardPos.data.ctnWeight];
        }
      }
    }
    return text;
  };
  selectYardPoses() {
    const completeSelectedData: Partial<YardPos<unknown>>[] = [];
    this.selectedYardPoses.forEach((selectedYardPos) => {
      selectedYardPos.isSelected = selectedYardPos.isSelected === 1 ? 0 : 1;
      let found = false;
      this.filteredData.forEach((yardBay: YardBay) => {
        yardBay.yardPoses.forEach((yardPos: YardPos<any>) => {
          if (selectedYardPos.yardPos == yardPos.yardPos) {
            if (yardPos.data) {
              yardPos.data.isSelected = selectedYardPos.isSelected;
            } else {
              yardPos.data = { isSelected: selectedYardPos.isSelected };
            }
            completeSelectedData.push(yardPos);
            found = true;
            return;
          }
        });
        if (found) {
          return;
        }
      });
      if (!found) {
        const partialYardPos: Partial<YardPos<unknown>> = {
          yardPos: selectedYardPos.yardPos,
          data: { isSelected: selectedYardPos.isSelected },
        };
        completeSelectedData.push(partialYardPos);
      }
      this.yardBayComponent.patchYardPoses(completeSelectedData);
    });
  }

  groupBy: (bay: YardBay) => string | null = () => null;
  orderBy: (a: YardBay, b: YardBay) => number = (a, b) =>
    a.yardBay.localeCompare(b.yardBay);

  onHeightCalculated(height: number) {
    setTimeout(() => {
      if (height > 0 && height !== this.containerHeight) {
        this.containerHeight = height;
      }
    });
  }
  bayColorDict: { [key: string]: string } = {};
  isResultMode: boolean = false;
  containerHeight: number = 0;
  rawData: YardBay[] = [];
  filteredData: YardBay[] = [];
  searchText: string = '';
  sortDirection: string = 'asc';

  groupMode: string | null = null;
  @ViewChild(YardBayComponent) yardBayComponent!: YardBayComponent;

  selectedYardPoses = [
    { yardPos: 'Q1411031', isSelected: 0 },
    { yardPos: 'Q1809011', isSelected: 0 },
    { yardPos: 'Q1A09035', isSelected: 0 },
  ];
  constructor(private http: HttpClient) {}
  ngOnInit(): void {
    // 加载船贝图数据
    this.http.get<YardBay[]>('mock-data/yard-bay.json').subscribe((data) => {
      console.log(data);
      this.rawData = data;
      this.filteredData = this.rawData;
    });
  }

  searchYardBay() {
    if (!this.searchText) {
      this.filteredData = [...this.rawData];
      return;
    }
    const searchTerm = this.searchText.toLowerCase();
    this.filteredData = this.rawData.filter((bay: any) =>
      bay.yardBay.toLowerCase().includes(searchTerm)
    );
  }

  // 排序方向变化处理
  onSortDirectionChange(direction: string) {
    this.sortDirection = direction;

    // 更新排序函数
    this.orderBy =
      direction === 'asc'
        ? (a, b) => a.yardBay.localeCompare(b.yardBay)
        : (a, b) => b.yardBay.localeCompare(a.yardBay);
  }

  // 分组规则变化处理
  onGroupByChange(type: string) {
    if (type === 'yardBay') {
      this.groupBy = (bay: YardBay) => bay.yardBay.substring(0, 3);
    } else {
      this.groupBy = () => null;
    }
  }

  resetControls() {
    this.searchText = '';
    this.groupBy = () => null;
    this.sortDirection = 'asc';
    this.onSortDirectionChange(this.sortDirection);
    this.filteredData = [...this.rawData];
  }

  onYardPosDbClick($event: VisualYardPos<any>) {
    alert(JSON.stringify($event.data));
  }
}
