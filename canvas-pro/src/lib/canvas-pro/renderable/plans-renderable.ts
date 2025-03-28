import { VisualPlan } from "src/app/model/visualisation/visual-plan";
import { Renderable, RenderStyle } from "./renderable";
import { RenderConfigurator } from "../render-configurator";
import { RectBrick, RectStyle } from "./bricks/rect-brick";

export class PlansRenderable extends Renderable<VisualPlan[], RectStyle> {
    private planConfigurator: RenderConfigurator<VisualPlan, RectStyle>;
    private planUpdater: (data: VisualPlan) => void;
    constructor(data: VisualPlan[]) {
        super(data);
        this.planConfigurator = new RenderConfigurator<VisualPlan, RectStyle>()
            .addRule({
                dataPath: 'axisX',
                renderPath: 'x',
                defaultValue: 0
            })
            .addRule({
                dataPath: 'axisY',
                renderPath: 'y',
                defaultValue: 0
            })
            .addRule({
                dataPath: 'block',
                renderPath: 'fillStyle',
                transform: (block, data: VisualPlan) => {
                    if (block === 'A') {
                        return 'red';
                    } else if (block === 'B') {
                        return 'blue';
                    } else {
                        return 'white';
                    }
                },
                defaultValue: 'white'
            })
            .addRule({
                renderPath: 'strokeStyle',
                defaultValue: 'black'
            })
            .addRule({
                renderPath: 'lineWidth',
                defaultValue: 1
            });

        this.planUpdater = this.planConfigurator.createUpdater();
        
        for (let i = 0; i < data.length; i++) {
            const plan = data[i];
            this.addBrick(`${plan.id}`, new RectBrick());
        }
    }

    override render(ctx: OffscreenCanvasRenderingContext2D): void {
        for (let i = 0; i < this.getData().length; i++) {
            const plan = this.getData()[i];
            this.planUpdater(plan);
            const planRenderable = this.getBrick(`${plan.id}`) as RectBrick;
            planRenderable.render(ctx);
        }


        // const style = this.configuator.getStyle();
        // const { x, y, fillStyle, strokeStyle, lineWidth } = style;
        // ctx.fillStyle = fillStyle;
        // ctx.strokeStyle = strokeStyle;
        // ctx.lineWidth = lineWidth;
        // ctx.fillRect(x, y, 100, 100);
    }

    override extractData(data: any): VisualPlan[] {
        return data;
    }
}
