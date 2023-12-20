import './style.css';
import { App } from "./control/app";
import {CanvasManager} from "./control/canvas-manager";

const canvasManager = new CanvasManager();
const app = new App(canvasManager);

document.getElementById('start')
  ?.addEventListener('click', (event) => {
    app.run();
    app.activateControls();
    document.getElementById('menu')?.classList.remove('blur');
    (event.target as any).remove?.();
  });
