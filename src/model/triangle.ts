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
        this.eulers = vec3.create();
        this.eulers[2] = 0;
        this.player = player;
    }

    update() {
        this.eulers[2] += 1;
        this.eulers[2] %= 360;

        this.model = mat4.create();

        this.position = [
          this.position[0] * 0.995 + this.player.position[0] * 0.005,
          this.position[1] * 0.995 + this.player.position[1] * 0.005,
          0.5
        ];

        mat4.translate(this.model, this.model, this.position);
        mat4.rotateZ(this.model, this.model, Deg2Rad(this.eulers[2]));
    }

    get_model(): mat4 {
        return this.model;
    }
}