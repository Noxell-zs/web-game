import './style.css';
import { App } from "./control/app";
import {CanvasManager} from "./control/canvas-manager";

const canvasManager = new CanvasManager();
const app = new App(canvasManager);
app.run();
