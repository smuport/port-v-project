import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  HostListener,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import {
  Vescell,
  VescellMarkerConfig,
  VesselBay,
  VesselBayComponent,
} from '@smuport/ngx-port-v';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-vessel-bay-demo',
  imports: [CommonModule, VesselBayComponent, FormsModule],
  templateUrl: './vessel-bay-demo.component.html',
  styleUrl: './vessel-bay-demo.component.css',
  standalone: true,
})
export class VesselBayDemoComponent implements OnInit {
  @ViewChildren(VesselBayComponent) vesselBays!: QueryList<VesselBayComponent>;
  bayDatas: VesselBay[][] = [];

  vescellMarkerConfig: Partial<VescellMarkerConfig> = {
    cross: (vescell: Vescell<any>, vesselBay: VesselBay<any>) => {
      if (vescell.data.equipType[0] === '4' && vesselBay.bayType == 'back') {
        return true;
      } else {
        return false;
      }
    },
    dj: (vescell: Vescell<any>, vesselBay: VesselBay<any>) => {
      return vescell.data.ifOnly;
    },
  };

  containerIdStyles: Record<string, { name: string; color: string }> = {
    C: { name: '20英尺干货箱', color: 'green' },
    Z: { name: '20英尺干活高箱', color: 'red' },
    G: { name: '20英尺挂衣箱', color: 'blue' },
  };

  textMode = 'type';

  containerTypeStyles: Record<string, { name: string; color: string }> = {
    '22G': { name: '20英尺干货箱', color: 'green' },
    '25G': { name: '20英尺干活高箱', color: 'red' },
    '22V': { name: '20英尺挂衣箱', color: 'blue' },
    '22U': { name: '20英尺开顶箱', color: 'orange' },
    '22R': { name: '20英尺冷冻箱', color: 'yellow' },
    '25R': { name: '20英尺冷高箱', color: 'cyan' },
    '22T': { name: '20英尺油罐箱', color: 'purple' },
    '22P': { name: '20英尺框架箱', color: 'magenta' },
    '42G': { name: '40英尺干货箱', color: 'pink' },
    '45G': { name: '40英尺干活高箱', color: 'limegreen' },
    '42V': { name: '40英尺挂衣箱', color: 'teal' },
    '42U': { name: '40英尺开顶箱', color: 'lavender' },
    '42R': { name: '40英尺冷冻箱', color: 'lightyellow' },
    '45R': { name: '40英尺冷高箱', color: 'lightgreen' },
    '42T': { name: '40英尺油罐箱', color: 'brown' },
    '42P': { name: '40英尺框架箱', color: 'olive' },
    L2G: { name: '45英尺干货箱', color: 'plum' },
    L5G: { name: '45英尺干活高箱', color: 'coral' },
    L2V: { name: '45英尺挂衣箱', color: 'sienna' },
    L2U: { name: '45英尺开顶箱', color: 'thistle' },
    L2R: { name: '45英尺冷冻箱', color: 'tomato' },
    L5R: { name: '45英尺冷高箱', color: 'turquoise' },
    L2T: { name: '45英尺油罐箱', color: 'tan' },
    L2P: { name: '45英尺框架箱', color: 'navy' },
  };
  colorMode = 'containerType';
  fillVesselBayContainer = (item: Vescell<any>) => {
    let color = 'white';
    if (this.colorMode == 'unloadPort') {
      const key = item.data.containerID.slice(0, 1);
      color = this.containerIdStyles[key]?.color;
    } else if (this.colorMode == 'containerType') {
      const key = item.data.equipType.slice(0, 3);
      color = this.containerTypeStyles[key]?.color;
    }
    if (item.data['ifSelected']) {
      color = '#00FFFF';
    }
    return color;
  };

  textVesselBayContainer = (item: Vescell<any>) => {
    let text = '';
    if (this.textMode == 'type') {
      text = item.data.equipType;
    } else if (this.textMode == 'containerId') {
      text = item.data.containerID;
    }
    return text;
  };

  allVescellMap = new Map<string, Vescell<any>>();
  allVescellList: Vescell<any>[] = [];

  //shif及commandt多选
  lastCmdSelectedVescell: string | null = null;
  lastShiftSelectedRange: { start: number; end: number } | null = null;
  shiftKeyPressed = false;
  searchVescell: string = '';
  endIndex!: number;
  constructor(private http: HttpClient) {}
  ngOnInit(): void {
    // 加载船贝图数据
    this.http
      .get<VesselBay[][]>('mock-data/vessel-bay.json')
      .subscribe((data) => {
        data.forEach((bayDataArray: VesselBay[]) => {
          bayDataArray.forEach((bayData: VesselBay) => {
            bayData.vescells.forEach((vescell: Vescell<any>) => {
              this.allVescellMap.set(vescell.vescell, vescell);
            });
          });
        });
        this.allVescellList = Array.from(this.allVescellMap.values());
        this.bayDatas = data;
      });
  }

  switchMode() {
    const newBayDatas = this.bayDatas.map((bayData) =>
      bayData.map((bay) => {
        return { ...bay };
      })
    );
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
    alert(JSON.stringify($event.data));
  }

  //shift及command多选
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    this.shiftKeyPressed = event.shiftKey;
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    this.shiftKeyPressed = event.shiftKey;
  }
  selectVescell(selectedVescell: string, event?: MouseEvent) {
    const bay = +selectedVescell.slice(0, 2);
    const colTier = selectedVescell.slice(2, 6);
    let patchVescells: Vescell<any>[] = [];
    const currentIndex = this.allVescellList.findIndex(
      (v) => v.vescell === selectedVescell
    );
    // Shift多选逻辑
    if (event?.shiftKey && this.lastCmdSelectedVescell) {
      const anchorIndex = this.allVescellList.findIndex(
        (v) => v.vescell === this.lastCmdSelectedVescell
      );
      if (anchorIndex !== -1 && currentIndex !== -1) {
        if (this.lastShiftSelectedRange) {
          const { start, end } = this.lastShiftSelectedRange;
          for (let i = start; i <= end; i++) {
            if (!this.isPersistentSelected(this.allVescellList[i])) {
              this.allVescellList[i].data['ifSelected'] = false;
              patchVescells.push(this.allVescellList[i]);
            }
          }
        }

        const newStart = Math.min(anchorIndex, currentIndex);
        const newEnd = Math.max(anchorIndex, currentIndex);
        this.lastShiftSelectedRange = { start: newStart, end: newEnd };

        for (let i = newStart; i <= newEnd; i++) {
          this.allVescellList[i].data['ifSelected'] = true;
          patchVescells.push(this.allVescellList[i]);
        }
      }
    }
    // Cmd/Ctrl多选逻辑
    else if (event?.ctrlKey || event?.metaKey) {
      const currentState =
        !this.allVescellMap.get(selectedVescell)?.data['ifSelected'];
      this.allVescellMap.get(selectedVescell)!.data['ifSelected'] =
        currentState;
      patchVescells.push(this.allVescellMap.get(selectedVescell)!);

      if (currentState) {
        this.lastCmdSelectedVescell = selectedVescell;
        this.lastShiftSelectedRange = null;
      }
    }
    // 普通单选逻辑
    else {
      this.allVescellList.forEach((v) => {
        if (v.data['ifSelected']) {
          v.data['ifSelected'] = false;
          patchVescells.push(v);
        }
      });
      if (bay % 2 === 0) {
        const frontVescell = `${(bay + 1)
          .toString()
          .padStart(2, '0')}${colTier}`;
        const backVescell = `${(bay - 1)
          .toString()
          .padStart(2, '0')}${colTier}`;
        [frontVescell, backVescell].forEach((vescellKey) => {
          const vescell = this.allVescellMap.get(vescellKey);
          if (vescell) {
            vescell.data['ifSelected'] = true;
            patchVescells.push(vescell);
          }
        });
      } else {
        this.allVescellMap.get(selectedVescell)!.data['ifSelected'] = true;
        patchVescells.push(this.allVescellMap.get(selectedVescell)!);
      }
      this.lastCmdSelectedVescell = selectedVescell;
      this.lastShiftSelectedRange = null;
    }
    this.applyPatch(patchVescells);
  }

  // 判断是否是被Cmd持久选中的项目
  isPersistentSelected(vescell: Vescell<any>): boolean {
    return (
      vescell.data['ifSelected'] &&
      vescell.vescell !== this.lastCmdSelectedVescell &&
      (!this.lastShiftSelectedRange ||
        !this.isInRange(vescell, this.lastShiftSelectedRange))
    );
  }

  // 判断是否在指定范围内
  isInRange(
    vescell: Vescell<any>,
    range: { start: number; end: number }
  ): boolean {
    const index = this.allVescellList.findIndex(
      (v) => v.vescell === vescell.vescell
    );
    return index >= range.start && index <= range.end;
  }

  applyPatch(patchVescells: Vescell<any>[]) {
    if (patchVescells.length > 0) {
      const uniquePatches = [
        ...new Map(patchVescells.map((v) => [v.vescell, v])).values(),
      ];
      this.vesselBays.forEach((vesselBay) => {
        vesselBay.patchVescells(uniquePatches);
      });
    }
  }

  scrollToVescell() {
    if (!this.searchVescell) return;
    const foundItem = this.allVescellList.find(
      (item) => item.vescell === this.searchVescell
    );
    if (foundItem) {
      const element = document.getElementById(`vescell-${foundItem.vescell}`);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        this.selectVescell(this.searchVescell);
      }
    }
  }
}
