import { Renderer } from "../view/renderer";
import { Scene } from "../model/scene";
import {CanvasManager} from "./canvas-manager";

export class App {
    canvas: HTMLCanvasElement;
    renderer: Renderer;
    scene: Scene;

    forwards_amount: number;
    right_amount: number;
    
    constructor(canvasManager: CanvasManager) {
        this.canvas = canvasManager.canvas;

        this.renderer = new Renderer(canvasManager);
        this.renderer.Initialize();

        this.scene = new Scene();

        this.forwards_amount = 0;
        this.right_amount = 0;

        document.addEventListener(
            "keydown",
            (event) => this.handleKeypress(event.key),
            false,
        );

        document.addEventListener(
            "keyup",
            (event) => this.handleKeyrelease(event.key),
            false,
        );

        this.canvas.onclick = () => {
            this.canvas.requestPointerLock();
        }
        this.canvas.addEventListener(
            "mousemove", 
            (event: MouseEvent) => this.handle_mouse_move(event)
        );
        
    }

    run = () => {
        let running: boolean = true;

        this.scene.update();
        this.scene.move_player(this.forwards_amount, this.right_amount);

        this.renderer.render(
            this.scene.get_renderables(),
            this.scene.player
        );

        if (running) {
            requestAnimationFrame(this.run);
        }
    }

    handleKeypress(key: string) {
        switch (key) {
            case 'w':
                this.forwards_amount = 0.02;
                break;
            case 's':
                this.forwards_amount = -0.02;
                break;
            case 'a':
                this.right_amount = -0.02;
                break;
            case 'd':
                this.right_amount = 0.02;
                break;
        }
    }

    handleKeyrelease(key: string) {
        switch (key) {
            case 'w':
            case 's':
                this.forwards_amount = 0;
                break;
            case 'a':
            case 'd':
                this.right_amount = 0;
                break;
        }
    }

    handle_mouse_move(event: MouseEvent) {
        this.scene.spin_player(
            event.movementX / 5, event.movementY / 5
        );
    }
}
