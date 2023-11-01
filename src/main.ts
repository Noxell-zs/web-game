import { App } from "./control/app";
import {canvasHeight, canvasWidth} from "./window_size";

const canvas : HTMLCanvasElement =
    <HTMLCanvasElement> document.getElementById("gfx-main");

canvas.setAttribute('width', canvasWidth.toString());
canvas.setAttribute('height', canvasHeight.toString());

document.addEventListener(
    "keydown",
     async (e) => {
        if (e.keyCode === 13) {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else if (document.exitFullscreen) {
                await document.exitFullscreen();
            }
        }
    },
    false,
);

const app = new App(canvas);
app.run();
