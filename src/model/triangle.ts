import { vec3, mat4 } from "gl-matrix";
import { Deg2Rad } from "./math_stuff";
import {Camera} from "./camera";

export class Triangle {

    position: vec3;
    eulers: vec3;
    model: mat4;
    player: Camera;

    constructor(position: vec3, player: Camera) {
        this.position = position;
        this.position[2] = 0.5;
        this.eulers = vec3.create();
        this.eulers[2] = 0;
        this.player = player;
        this.model = mat4.create();
        mat4.translate(this.model, this.model, this.position);
    }

    update() {
        this.eulers[2] += 1;
        this.eulers[2] %= 360;

        this.model = mat4.create();

        this.position = [
          this.position[0] * 0.980 + this.player.position[0] * 0.020,
          this.position[1] * 0.980 + this.player.position[1] * 0.020,
          0.5
        ];

        mat4.translate(this.model, this.model, this.position);
        mat4.rotateZ(this.model, this.model, Deg2Rad(this.eulers[2]));
    }

    get_model(): mat4 {
        return this.model;
    }
}