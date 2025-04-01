import { CommonModule } from '@angular/common';
import { Component, ViewChild, AfterViewInit, ElementRef, Input, Output, EventEmitter, input, effect, InputOptionsWithTransform } from '@angular/core';
import { BaseLayer, CanvasProComponent, CpClickEvent, CustomRenderable, Layer, SvgLayer, SvgRenderable, ViewportInteractionConfig } from '@smuport/ngx-canvas-pro';
import { BehaviorSubject, interval, startWith, Subject } from 'rxjs';
import { Cell, HandlingTask, VesBaySideView, Vessel } from '../model/vessel';
import { v } from '@angular/core/weak_ref.d-Bp6cSy-X';

@Component({
  selector: 'app-ship-side',
  templateUrl: './ship-side.component.html',
  styleUrls: ['./ship-side.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    CanvasProComponent,
  ]
})
export class ShipSideComponent implements AfterViewInit {

  vessel = input.required<Vessel>();
  vesselDataUpdateSubject = new BehaviorSubject<Vessel>(undefined!);
  @Input() config: { width: number; height: number; } = {
    width: 24,
    height: 12,
  };
  @Output() onVesselBaySelected = new EventEmitter<string[]>();
  @Output() onHandlingTaskSelected = new EventEmitter<HandlingTask[]>();
  @Input() fillCell: (data: any) => string = (data: any) => 'lightgray';
  // @ViewChild('canvasContainer') canvasContainer!: ElementRef;
  @ViewChild('canvasPro', { static: true })
  canvasPro!: CanvasProComponent;

  // 添加交互配置
  interactionConfig: ViewportInteractionConfig = {
    drag: {
      default: 'rotate',     // 默认禁用平移
      shift: 'frame-select',        // 按住 shift 键可以平移
      ctrl: 'pan',
      alt: 'none'
    },
    wheel: {
      default: 'zoom',     // 默认禁用缩放
      shift: 'pan-horizontal',        // 按住 shift 键可以水平缩放
      ctrl: 'none',
      alt: 'none'
    }
  };

  useSvgHandlingTask = true;

  constructor() { 
    effect(() => {
      const data = this.vessel();
      if (!data) return;
      const measuredData = this.measureVessel(data, this.config.width, this.config.height);
      this.vesselDataUpdateSubject.next(measuredData);
      return measuredData;
    });
  }

  ngAfterViewInit(): void {
    // 设置交互配置
    this.canvasPro.interactionConfig = this.interactionConfig;
    const vessel = this.getVesselLayer('vessel');
    this.canvasPro.addLayer(vessel);
    const vesselBay = this.getVesselBayLayer('vesselBay');
    this.canvasPro.addLayer(vesselBay);
    // 根据标志决定使用哪种实现
    if (this.useSvgHandlingTask) {
      this.canvasPro.addLayer(this.getSvgHandlingTaskLayer('svgHandlingTask'));
    } else {
      this.canvasPro.addLayer(this.getHandlingTaskLayer('handlingTask'));
    }
    
    this.drawLayers();

  }

  measureVessel(vessel: Vessel, cellWidth: number, cellHeight: number) {
    let minDTier = 999;
    let maxDTier = 0;
    let maxHTier = 0;
    let groupAmount = 0;
    let singleAmount = 0;
    let hullWidth = 0;
    let allWidth = 0;
    let hullHeight = 0;
    let deckHeight = 0;
    let allHeight = 0;
    let maxBay = 0
    const baynoRange: number[] = []
    const bayXRange: number[] = []
    vessel.vesBaySideViews.sort((a, b) => {
      return +a.bayName - (+b.bayName)
    })
    vessel.vesBaySideViews.forEach((v) => {
      // if (+v.bayName < minBay) {
      //   minBay = +v.bayName
      // }
      if (+v.bayName > maxBay) {
        maxBay = +v.bayName
      }
      if (baynoRange.indexOf(+v.bayName) < 0) {
        baynoRange.push(+v.bayName)
        bayXRange.push(0)
        
      }
    })

    // for (let bayno = 1; bayno <= maxBay; bayno+=2) {
    //   baynoRange.push(bayno)
    // }
    const visitedBays: string[] = [];
    let bayName = '';
    vessel.vesBaySideViews.forEach((vesBaySideView: VesBaySideView) => {
      if (vesBaySideView.bayName != bayName) {
        if (vesBaySideView.bayType === 'front') {
          groupAmount = groupAmount + 1
        } else if (vesBaySideView.bayType === 'single') {
          singleAmount = singleAmount + 1
        }
      }
      bayName = vesBaySideView.bayName;
      vesBaySideView.cells.forEach((cell: Cell) => {
        if (vesBaySideView.dh === 'D') {
          if (+cell.tier < minDTier) {
            minDTier = +cell.tier
          }
          if (+cell.tier > maxDTier) {
            maxDTier = + cell.tier
          }
        } else if (vesBaySideView.dh === 'H') {
          if (+cell.tier > maxHTier) {
            maxHTier = + cell.tier
          }
        }
      })
    })

    hullWidth = (groupAmount * 2 + singleAmount) * cellWidth + (groupAmount + singleAmount - 1) * cellWidth / 4;
    allWidth = hullWidth + cellWidth * 5;
    hullHeight = maxHTier * cellHeight / 2 + cellHeight / 2;
    deckHeight = (maxDTier - minDTier) / 2 * cellHeight + 120;
    allHeight = hullHeight + deckHeight;

    vessel.hullWidth = hullWidth;
    vessel.allWidth = allWidth;
    vessel.deckHeight = deckHeight;
    vessel.allHeight = allHeight;

    let y: number;
    let x: number = cellWidth;
    let interval: number = cellWidth / 4

    vessel.vesBaySideViews.forEach((vesBaySideView: VesBaySideView) => {

      if (vesBaySideView.bayName != bayName) {
        vesBaySideView.bayType === 'back' ? x = x + cellWidth : x = x + cellWidth + interval;
      }
      bayName = vesBaySideView.bayName;
      let idx = baynoRange.indexOf(+bayName);
      bayXRange[idx] = x;
      if (vesBaySideView.dh === 'D') {
        vesBaySideView.cells.forEach((cell: Cell, index: number) => {
          const firstTier = +vesBaySideView.cells[0].tier;
          y = deckHeight - ((firstTier - minDTier) / 2 + index + 1) * cellHeight;
          cell.x = x;
          cell.y = y;
        })
      } else if (vesBaySideView.dh === 'H') {
        vesBaySideView.cells.forEach((cell: Cell) => {
          y = allHeight - (+cell.tier / 2) * cellHeight;
          cell.x = x;
          cell.y = y;
        })
      }
    })
    vessel.loadInstruct.forEach((t, i) => {
      let index = 0;
      if (+t.bay % 2 == 0) {
        index = baynoRange.indexOf(+t.bay - 1);
      } else {
        index = baynoRange.indexOf(+t.bay);
      }
      console.log(baynoRange, +t.bay)
      t.x = bayXRange[index] + cellWidth / 2
    })

    vessel.unloadInstruct.forEach((t, i) => {
      let index = 0;
      if (+t.bay % 2 == 0) {
        index = baynoRange.indexOf(+t.bay - 1);
      } else {
        index = baynoRange.indexOf(+t.bay);
      }
      console.log(baynoRange, +t.bay)
      t.x = bayXRange[index] + cellWidth / 2
    })
    return vessel
  }

  getVesselLayer(layerName: string) {
    const insLayer = new Layer<Vessel>(layerName);
    insLayer.setPushMode()
    .setTrigger(this.vesselDataUpdateSubject)
    .setRenderer(this.renderVessel.bind(this));
    return insLayer
  }

  getHandlingTaskLayer(layerName: string) {
    const layer = new Layer<Vessel>(layerName);
    layer.setPushMode()
   .setTrigger(this.vesselDataUpdateSubject)
   .setRenderer(this.renderHandlingTask.bind(this));
   return layer;
  }

  getSvgHandlingTaskLayer(layerName: string) {
    const svgRenderable = new SvgRenderable(
      (svgHost: SVGElement, data: Vessel) => {
        this.rennderSvgHandlingTask(svgHost, data);
      }
    );
    svgRenderable.setSelectionChecker((selection) => {
      const bays: any[] = []
      svgRenderable.svgs.forEach((child) => {
        const x = (child as SVGElement).getAttribute('x');
        const y = (child as SVGElement).getAttribute('y');
        if (x && y && selection.x <= +x && selection.y <= +y && selection.x + selection.w >= +x && selection.y+selection.h >= +y) {
          bays.push(child)
        }
      })
      
      return bays;
      // return svgElement instanceof SVGGElement;
    });
    const svgLayer = new SvgLayer<Vessel>(layerName);
    svgLayer.setPushMode()
      .setTrigger(this.vesselDataUpdateSubject)
      .addRenderable(svgRenderable)

    
    return svgLayer;
  }

  getVesselBayLayer(layerName: string) {
    const renderable = new CustomRenderable(
      (ctx: OffscreenCanvasRenderingContext2D, data: Vessel) => {
        this.renderVesselBay(ctx, data);
      }
    );
    renderable.setSelectionChecker((selection) => {
      const rect = selection;
      const vessel = renderable.getData();
      const selectedBays: string[] = [];
      vessel.vesBaySideViews.forEach((item: VesBaySideView) => {
        item.cells.forEach((cell: Cell) => {
          const bayX = cell.x;
          if (
            (bayX >= rect.x &&
              bayX + this.config.width <= rect.x + rect.w) || (bayX + this.config.width <= rect.x && bayX >= rect.x + rect.w)
          ) {
            if (item.bayName && !selectedBays.includes(item.bayName)) {
              selectedBays.push(item.bayName);
  
            }
          }
        })
      });
      this.onVesselBaySelected.emit(selectedBays);
      return selectedBays
    })

    const layer = new Layer<any>(layerName);
    layer.setPushMode()
    .setTrigger(this.vesselDataUpdateSubject)
    .addRenderable(renderable);
    // .setRenderer(this.renderVesselBay.bind(this));
    
    

    return layer;
  }

  rennderSvgHandlingTask(svgHost: SVGElement, data: Vessel) {
    // 清空现有SVG元素
    while (svgHost.firstChild) {
      svgHost.removeChild(svgHost.firstChild);
    }
  
    const width = this.config.width;
    const height = this.config.height;
    
    // 创建装船指令三角形
    data.loadInstruct.forEach((item: any) => {
      const startY = item.dh == 'D' ? 6 * height : data.allHeight + 9 * height;
      
      // 创建SVG三角形
      const triangle = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      triangle.setAttribute('points', 
        `${item.x},${startY} ${item.x + width/2},${startY + height} ${item.x + width},${startY}`
      );
      triangle.setAttribute('fill', '#007BFF');
      triangle.setAttribute('stroke', 'black');
      triangle.setAttribute('stroke-width', '1');
      // 创建文本元素显示装载数量
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', (item.x + width/2).toString());
      text.setAttribute('y', (startY - height).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('font-family', 'Arial');
      text.setAttribute('font-size', '18px');
      text.setAttribute('font-weight', 'lighter');
      text.setAttribute('fill', 'black');
      text.textContent = item.loadAmount;
      
      // 添加交互效果
      triangle.addEventListener('mouseover', () => {
        triangle.setAttribute('fill', '#0056b3');
        triangle.setAttribute('stroke-width', '2');
      });
      triangle.style.cursor = 'pointer';
      
      triangle.addEventListener('mouseout', () => {
        triangle.setAttribute('fill', '#007BFF');
        triangle.setAttribute('stroke-width', '1');
      });
      
      triangle.addEventListener('click', () => {
        item.type = 'load';
        item.amount = item.loadAmount;
        this.onHandlingTaskSelected.emit([item]);
        console.log(`装船指令: ${item.loadAmount} 箱, 贝位: ${item.bay}`);
      });

      
      // 将元素添加到SVG图层
      svgHost.appendChild(triangle);
      svgHost.appendChild(text);
    });
    
    // 创建卸船指令三角形
    data.unloadInstruct.forEach((item: any) => {
      const startY = item.dh == 'D' ? 2 * height : data.allHeight + 5 * height;
      
      // 创建SVG三角形
      const triangle = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      triangle.setAttribute('points', 
        `${item.x},${startY} ${item.x + width/2},${startY - height} ${item.x + width},${startY}`
      );
      triangle.setAttribute('fill', 'rgb(255, 100, 100)');
      triangle.setAttribute('stroke', 'black');
      triangle.setAttribute('stroke-width', '1');
      triangle.setAttribute('data-bay', item.bay);
      console.log(triangle.getAttribute('data-bay'))
      triangle.style.cursor = 'pointer';
      
      // 创建文本元素显示卸载数量
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', (item.x + width/2).toString());
      text.setAttribute('y', (startY + height).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('font-family', 'Arial');
      text.setAttribute('font-size', '18px');
      text.setAttribute('font-weight', 'lighter');
      text.setAttribute('fill', 'black');
      text.textContent = item.unloadAmount;
      
      // 添加交互效果
      triangle.addEventListener('mouseover', () => {
        triangle.setAttribute('fill', 'rgb(220, 53, 69)');
        triangle.setAttribute('stroke-width', '2');
      });
      
      triangle.addEventListener('mouseout', () => {
        triangle.setAttribute('fill', 'rgb(255, 100, 100)');
        triangle.setAttribute('stroke-width', '1');
      });
      
      triangle.addEventListener('click', () => {
        item.type = 'unload';
        item.amount = item.unloadAmount;
        this.onHandlingTaskSelected.emit([item]);
        console.log(`卸船指令: ${item.unloadAmount} 箱, 贝位: ${item.bay}`);
      });
      
      // 将元素添加到SVG图层
      svgHost.appendChild(triangle);
      svgHost.appendChild(text);
    });
  }

  renderHandlingTask(ctx: OffscreenCanvasRenderingContext2D, data: Vessel) {
    const width = this.config.width;
    const height = this.config.height;
    data.loadInstruct.forEach((item: any) => {
      const startY = item.dh == 'D' ? 6 * height : data.allHeight + 9 * height
      ctx.beginPath();
      ctx.moveTo(item.x, startY);
      ctx.lineTo(item.x + width / 2, startY + height);
      ctx.lineTo(item.x + width, startY);
      ctx.lineTo(item.x, startY);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = '#007BFF';
      ctx.fill();
      ctx.font = 'lighter 18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'black';
      ctx.fillText(
        item.loadAmount,
        item.x + width / 2,
        startY - height
      );
    })
    data.unloadInstruct.forEach((item: any) => {
      const startY = item.dh == 'D' ? 2 * height : data.allHeight + 5 * height
      ctx.beginPath();
      ctx.moveTo(item.x, startY);
      ctx.lineTo(item.x + width / 2, startY - height);
      ctx.lineTo(item.x + width, startY);
      ctx.lineTo(item.x, startY);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = 'rgb(255, 100, 100)';
      ctx.fill();
      ctx.font = 'lighter 18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'black';
      ctx.fillText(
        item.unloadAmount,
        item.x + width / 2,
        startY + height
      );
    })
  }

  renderVessel(ctx: OffscreenCanvasRenderingContext2D, data: Vessel) {
    console.log('renderVessel');
    ctx.clearRect(0, 0, this.canvasPro.viewport.nativeElement.width, this.canvasPro.viewport.nativeElement.height);
    const width = this.config.width;
    const height = this.config.height;
    const allHeight = data.allHeight;
    const allWidth = data.allWidth - this.config.width;
    const deckHeight = data.deckHeight;
    const startX = 0;
    const startY = deckHeight - 2 * height;
    ctx.beginPath();
    ctx.moveTo(startX, startY + height * 3 / 2);
    ctx.lineTo(startX + 2 * width, startY + 2 * height);
    ctx.lineTo(startX + allWidth - width * 3 / 2, startY + 2 * height);
    ctx.lineTo(startX + allWidth - width * 3 / 2, startY + height);
    ctx.lineTo(startX + allWidth + width, startY + height);
    ctx.lineTo(startX + allWidth + width / 2, (allHeight + (startY + height)) / 2);
    ctx.lineTo(startX + allWidth, (allHeight + (startY + height)) / 2);
    ctx.lineTo(startX + allWidth - width / 2, allHeight);
    ctx.lineTo(startX + 2 * width, allHeight);
    ctx.lineTo(startX, startY + height * 3 / 2);
    ctx.closePath();

    ctx.stroke();
    const gradient = ctx.createLinearGradient(startX, 0, startX + allWidth, 0);
    gradient.addColorStop(0, 'red');
    gradient.addColorStop(0.7, 'red');
    gradient.addColorStop(1, 'black');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.lineWidth = 2;

    data.vesBaySideViews.forEach((item: VesBaySideView) => {
      item.cells.forEach((cell: Cell) => {
        ctx.beginPath();
        ctx.fillStyle = 'white';
        ctx.fillRect(cell.x, cell.y, width, height);
        ctx.strokeRect(cell.x, cell.y, width, height);
        ctx.closePath();
      })
    });

    ctx.font = 'lighter 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'black';
    data.vesBaySideViews.forEach((item: any) => {
      ctx.fillText(
        item.bayName,
        item.cells[0].x + this.config.width / 2,
        data.allHeight + this.config.height
      );
    });
    this.canvasPro.updateViewportSize(allWidth, allHeight + 150);
  }

  renderVesselBay(ctx: OffscreenCanvasRenderingContext2D, data: Vessel<VesBaySideView<Cell>>) {
    // if (!data) return;
    console.log('renderVesselBay', data);
    ctx.clearRect(0, 0, this.canvasPro.viewport.nativeElement.width, this.canvasPro.viewport.nativeElement.height);
    const width = this.config.width;
    const height = this.config.height;
    console.log(data);
    ctx.lineWidth = 2;
    data.vesBaySideViews.forEach((item: VesBaySideView) => {
      item.cells.forEach((cell: Cell) => {
        ctx.beginPath();
        ctx.fillStyle = this.fillCell(cell.data)
        ctx.fillRect(cell.x, cell.y, width, height);
        ctx.strokeRect(cell.x, cell.y, width, height);
        ctx.closePath();
      })
    });

    // data.loadInstruct.forEach((item: any) => {
    //   const startY = item.dh == 'D' ? 6 * height : data.allHeight + 9 * height
    //   ctx.beginPath();
    //   ctx.moveTo(item.x, startY);
    //   ctx.lineTo(item.x + width / 2, startY + height);
    //   ctx.lineTo(item.x + width, startY);
    //   ctx.lineTo(item.x, startY);
    //   ctx.closePath();
    //   ctx.stroke();
    //   ctx.fillStyle = '#007BFF';
    //   ctx.fill();
    //   ctx.font = 'lighter 18px Arial';
    //   ctx.textAlign = 'center';
    //   ctx.textBaseline = 'middle';
    //   ctx.fillStyle = 'black';
    //   ctx.fillText(
    //     item.loadAmount,
    //     item.x + width / 2,
    //     startY - height
    //   );
    // })
    // data.unloadInstruct.forEach((item: any) => {
    //   const startY = item.dh == 'D' ? 2 * height : data.allHeight + 5 * height
    //   ctx.beginPath();
    //   ctx.moveTo(item.x, startY);
    //   ctx.lineTo(item.x + width / 2, startY - height);
    //   ctx.lineTo(item.x + width, startY);
    //   ctx.lineTo(item.x, startY);
    //   ctx.closePath();
    //   ctx.stroke();
    //   ctx.fillStyle = 'rgb(255, 100, 100)';
    //   ctx.fill();
    //   ctx.font = 'lighter 18px Arial';
    //   ctx.textAlign = 'center';
    //   ctx.textBaseline = 'middle';
    //   ctx.fillStyle = 'black';
    //   ctx.fillText(
    //     item.unloadAmount,
    //     item.x + width / 2,
    //     startY + height
    //   );
    // })
  }

  // 增加组件扩展性
  addLayer(layer: BaseLayer) {
    this.canvasPro.addLayer(layer);
  }

  drawLayers() {
    this.canvasPro.startDataflow();
    this.canvasPro.startAnimation();
    this.canvasPro.startListenEvent();
    // this.canvasPro.updateViewportSize();
  }



}
