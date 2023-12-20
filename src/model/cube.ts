import { vec3, mat4 } from "gl-matrix";
import { Deg2Rad } from "./math_stuff";

export class Cube {

    position: vec3;
    eulers: vec3;
    baseForwards: vec3;
    model: mat4;
    onDestroy?: CallableFunction;

    constructor(position: vec3, eulers: vec3, onDestroy?: CallableFunction) {
        this.position = position;
        this.eulers = eulers;
        this.onDestroy = onDestroy;
    }

    update() {
        this.model = mat4.create();
        this.baseForwards = [
            Math.cos(Deg2Rad(this.eulers[2])),
            Math.sin(Deg2Rad(this.eulers[2])),
            0
        ];
        vec3.scaleAndAdd(
          this.position, this.position,
          this.baseForwards, 0.1
        );
        mat4.translate(this.model, this.model, this.position);


        if (Math.abs(this.position[0]) > 10 || Math.abs(this.position[1]) > 10) {
            this.onDestroy?.();
        }
    }

    get_model(): mat4 {
        return this.model;
    }
}