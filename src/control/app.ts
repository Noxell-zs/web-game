import { Renderer } from "../view/renderer";
import { Scene } from "../model/scene";
import {CanvasManager} from "./canvas-manager";
import { Kick } from "./audio";

export class App {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  scene: Scene;

  forwards_amount: number;
  right_amount: number;

  context = new AudioContext;
  targetTime = 0;

  constructor(canvasManager: CanvasManager) {
    this.canvas = canvasManager.canvas;

    this.renderer = new Renderer(canvasManager);
    this.renderer.Initialize();

    this.scene = new Scene();

    this.forwards_amount = 0;
    this.right_amount = 0;
  }

  activateControls(): void {
    document.addEventListener(
      'keydown',
      async (event) => {
        if (event.key === 'Enter') {
          this.canvas.requestPointerLock();

          if (document.fullscreenElement) {
            await document.exitFullscreen?.();
          } else {
            await document.documentElement.requestFullscreen();
          }
        }
      },
    );


    document.addEventListener(
      "click",
      (event) => {
        this.canvas.requestPointerLock();

        const diff = this.context.currentTime - this.targetTime;
        if (diff < 0.1 || diff > 0.52) {
          this.scene.click();
        }
      },
    );

    document.addEventListener(
      "keydown",
      (event) => this.handleKeypress(event.key),
    );

    document.addEventListener(
      "keyup",
      (event) => this.handleKeyrelease(event.key),
    );

    this.canvas.addEventListener(
      "mousemove",
      (event: MouseEvent) => this.handle_mouse_move(event)
    );

    const kick = new Kick(this.context);
    const interval = setInterval(
      () => kick.trigger(this.targetTime = this.context.currentTime),
      550
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
        this.forwards_amount = 0.06;
        break;
      case 's':
        this.forwards_amount = -0.06;
        break;
      case 'a':
        this.right_amount = -0.04;
        break;
      case 'd':
        this.right_amount = 0.04;
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
