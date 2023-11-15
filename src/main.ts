import { App } from "./control/app";
import {CanvasManager} from "./control/canvas-manager";

const canvasManager = new CanvasManager();

document.addEventListener(
    'keydown',
     async (event) => {
        if (event.key === 'Enter') {
            if (document.fullscreenElement) {
                await document.exitFullscreen?.();
            } else {
                await document.documentElement.requestFullscreen();
            }
        }
    },
    false,
);

const app = new App(canvasManager);
app.run();
