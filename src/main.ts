import { Renderer } from "./renderer";
import {canvasHeight, canvasWidth} from "./window_size";

const canvas : HTMLCanvasElement =
    <HTMLCanvasElement> document.getElementById("gfx-main");



canvas.setAttribute('width', canvasWidth.toString());
canvas.setAttribute('height', canvasHeight.toString());

const renderer = new Renderer(canvas);

renderer.Initialize();
