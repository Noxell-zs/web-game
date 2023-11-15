export class CanvasManager {
    canvasHeight: number;
    canvasWidth: number;
    readonly canvas: HTMLCanvasElement;

    constructor() {
        this.canvas =
            <HTMLCanvasElement> document.getElementById("gfx-main");

        this.setSize();
        addEventListener('resize', () => this.setSize());
    }

    get proportion(): number {
        return this.canvasWidth / this.canvasHeight;
    }

    private setSize(): void {
        this.canvasHeight = document.documentElement.clientHeight;
        this.canvasWidth = document.documentElement.clientWidth;
        this.canvas.setAttribute('width', this.canvasWidth.toString());
        this.canvas.setAttribute('height', this.canvasHeight.toString());
    }
}
