import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import {
  Vescell,
  VescellMarkerConfig,
  VesselBay,
  VesselBayComponent,
} from '@smuport/ngx-port-v';
import { FormsModule } from '@angular/forms';
import { MultiSelectDirective } from '../directives/multi-select.directive';
import {
  CpFrameSelectEvent,
  ViewportInteractionConfig,
} from '@smuport/ngx-canvas-pro';

@Component({
  selector: 'app-vessel-bay-demo',
  imports: [
    CommonModule,
    VesselBayComponent,
    FormsModule,
    MultiSelectDirective,
  ],
  templateUrl: './vessel-bay-demo.component.html',
  styleUrl: './vessel-bay-demo.component.css',
  standalone: true,
  providers: [MultiSelectDirective],
})
export class VesselBayDemoComponent implements OnInit, AfterViewInit {
  @ViewChildren(VesselBayComponent) vesselBays!: QueryList<VesselBayComponent>;
  @ViewChild(MultiSelectDirective) multiSelect!: MultiSelectDirective<
    Vescell<any>
  >;

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
  searchVescell = '';
  interactionConfig: ViewportInteractionConfig = {
    drag: {
      default: 'none', // 默认禁用平移
      shift: 'frame-select', // 按住 shift 键可以框选
      ctrl: 'frame-select',
      alt: 'pan',
    },
    wheel: {
      default: 'none', // 默认禁用缩放
      shift: 'pan-horizontal', // 按住 shift 键可以水平缩放
      ctrl: 'none',
      alt: 'pan-vertical',
    },
  };
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

  ngAfterViewInit(): void {
    this.multiSelect.customSelectionLogic = this.customSelectionLogic;
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

  // 处理选择变更事件
  onSelectionChange(changedItems: Vescell<any>[]) {
    const visualChangedVescell: Array<[string, boolean]> = [];
    const visualChangedItems: Vescell[] = [];

    changedItems.forEach((item) => {
      const selectedVescell = item.vescell;
      const bay = +selectedVescell.slice(0, 2);
      const colTier = selectedVescell.slice(2, 6);
      // 如果是普通单选且bay是偶数，需要特殊处理前后贝位
      if (bay % 2 === 0) {
        const frontVescell = `${(bay + 1)
          .toString()
          .padStart(2, '0')}${colTier}`;
        const backVescell = `${(bay - 1)
          .toString()
          .padStart(2, '0')}${colTier}`;
        visualChangedVescell.push(
          [frontVescell, item.data['ifSelected']],
          [backVescell, item.data['ifSelected']]
        );
      } else {
        visualChangedVescell.push([selectedVescell, item.data['ifSelected']]);
      }
    });
    visualChangedVescell.forEach(([vescellKey, selected]) => {
      const vescell = this.allVescellMap.get(vescellKey);
      if (vescell) {
        vescell.data['ifSelected'] = selected;
        visualChangedItems.push(vescell);
      }
    });
    if (visualChangedItems.length > 0) {
      this.applyPatch(visualChangedItems);
    }
  }
  // 选择vescell的方法现在调用指令的方法
  selectVescell(selectedVescell: string, event?: KeyboardEvent | MouseEvent) {
    // 使用指令的selectItem方法
    this.multiSelect.selectItem(selectedVescell, event);
  }

  //框选自定义逻辑
  customSelectionLogic = (
    item: Vescell<any>,
    event?: KeyboardEvent | MouseEvent
  ): boolean => {
    const vescell = this.allVescellMap.get(item.vescell);
    if (event?.shiftKey) {
      return true;
    } else if (event?.ctrlKey || event?.metaKey) {
      if (vescell?.data.ifSelected === undefined) {
        return true;
      } else {
        return !vescell?.data.ifSelected;
      }
    } else {
      return false;
    }
  };

  selectVescells(event: CpFrameSelectEvent) {
    const selectedVescells = event.selectedItems;
    const mouseEvent = event.mouseEvent;
    this.multiSelect.customSelectionLogic = this.customSelectionLogic;
    if (!this.multiSelect?.customSelectionLogic) return;
    selectedVescells.forEach((item: Vescell) => {
      this.multiSelect.selectItem(item.vescell, mouseEvent);
    });
    this.multiSelect.customSelectionLogic = null;
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
