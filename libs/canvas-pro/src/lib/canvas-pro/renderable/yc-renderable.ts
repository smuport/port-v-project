import { Renderable, RenderStyle } from './renderable';
import { RectBrick, RectStyle } from './bricks/rect-brick';
import { TextBrick, TextStyle } from './bricks/text-brick';
import { VisualEquipment } from 'src/app/model/visualisation/visual-equipment';
import { RenderConfigurator } from '../render-configurator';

export interface YcStyle extends RenderStyle {
  x: number;
  y: number;
  w: number;
  h: number;
  craneNumber: string;
  frameFillStyle?: string;
  frameStrokeStyle?: string;
  frameLineWidth?: number;
  textStyle?: TextStyle;
}

export class YcRenderable extends Renderable<VisualEquipment, YcStyle> {
  constructor(
    data: VisualEquipment,
    configuator: RenderConfigurator<VisualEquipment, YcStyle>
  ) {
    super(data, configuator);
    this.addBrick('topBar', new RectBrick());
    this.addBrick('midBar', new RectBrick());
    this.addBrick('bottomBar', new RectBrick());
    this.addBrick('ycName', new TextBrick());
  }

  override render(ctx: OffscreenCanvasRenderingContext2D): void {
    const style = this.configuator.getStyle(this.getData());
    const {
      x,
      y,
      w,
      h,
      craneNumber,
      frameFillStyle,
      frameStrokeStyle,
      frameLineWidth,
      textStyle,
    } = style;

    // Draw the "工" shaped frame
    const frameStyle: RectStyle = {
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      fillStyle: frameFillStyle,
      strokeStyle: frameStrokeStyle,
      lineWidth: frameLineWidth,
    };

    const frameHeight = h / 10;

    // Horizontal top bar
    const topBar = this.getBrick('topBar') as RectBrick;
    const midBar = this.getBrick('midBar') as RectBrick;
    const bottomBar = this.getBrick('bottomBar') as RectBrick;
    const ycName = this.getBrick('ycName') as TextBrick;

    topBar.updateStyle({ ...frameStyle, x, y, w, h: frameHeight });
    midBar.updateStyle({ ...frameStyle, x: x + w / 2 - 2.5, y, w: 5, h });
    bottomBar.updateStyle({
      ...frameStyle,
      x,
      y: y + h - frameHeight,
      w,
      h: frameHeight,
    });
    ycName.updateStyle({
      ...textStyle,
      x: x + w / 2,
      y: y + h / 2,
      text: craneNumber,
    });

    midBar.render(ctx);
    topBar.render(ctx);
    bottomBar.render(ctx);
    ycName.render(ctx);
    // console.log(`ycRenderable: ${craneNumber}`);

    // Vertical middle bar
    // Horizontal bottom bar
    // Draw the crane number
    // const textX = x + w / 2;
    // const textY = y + h / 2;
    // const textRenderable = new RectBrick({ ...textStyle, x: textX, y: textY, text: craneNumber, textAlign: 'center', textBaseline: 'middle' }, data.name);
    // this.addBrick(textRenderable);
  }

  override extractData(data: VisualEquipment): VisualEquipment {
    return data;
  }
}
