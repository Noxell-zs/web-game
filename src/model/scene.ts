import { Triangle } from "./triangle";
import { Quad } from "./quad";
import { Camera } from "./camera";
import { vec3,mat4 } from "gl-matrix";
import { object_types, RenderData } from "./definitions";
import { Cube } from "./cube";

const minCoord = -10,  maxCoord = 10;

export class Scene {

  triangles: Set<Triangle>;
  quads: Quad[];
  cubes: Set<Cube>;
  player: Camera;
  object_data: Float32Array;
  triangle_count: number;
  quad_count: number;
  statue_count: number;

  score: number;
  health: number;
  scoreEl: HTMLSpanElement;
  healthEl: HTMLSpanElement;

  constructor() {
    this.triangles = new Set();
    this.quads = [];
    this.cubes = new Set();
    this.object_data = new Float32Array(16 * 1024);
    this.triangle_count = 0;
    this.quad_count = 0;
    this.statue_count = 0;

    this.player = new Camera(
      [-2, 0, 0.5], 0, 0
    );

    this.make_triangles();
    this.make_quads();

    this.score = 0;
    this.health = 100;
    this.scoreEl = document.getElementById('score') as HTMLSpanElement;
    this.healthEl = document.getElementById('health') as HTMLSpanElement;
  }

  click(): void {
    const statue = new Cube(
      [...this.player.position] as vec3,
      [...this.player.eulers] as vec3,
      () => this.delCube(statue),
    );

    this.cubes.add(statue);
    ++this.statue_count;
  }


  collision(): void {
    for (const triangle of this.triangles) {
      for (const statue of this.cubes) {
        if (vec3.distance(triangle.position, statue.position) <= 0.25) {
          this.cubes.delete(statue);
          --this.statue_count;
          this.triangles.delete(triangle);
          --this.triangle_count;

          ++this.score;
          this.scoreEl.innerText = this.score.toString();

          if (this.triangle_count <= 0) {
            this.make_triangles();
          }
        }
      }

      if (vec3.distance(triangle.position, this.player.position) <= 0.25) {
        this.triangles.delete(triangle);
        --this.triangle_count;

        this.health -= 5;
        this.healthEl.innerText = this.health.toString();

        if (this.triangle_count <= 0) {
          this.make_triangles();
        }

        if (this.health <= 0) {
          location.reload();
        }
      }
    }
  }

  delCube(item: Cube): void {
    --this.statue_count;
    this.cubes.delete(item);
  }

  make_triangles(): void {
    let i: number = 0;

    let x, y;
    for (let k: number = 0; k < 5; k++) {
      x = Math.floor(Math.random()*(maxCoord-minCoord) + minCoord);
      y = Math.floor(Math.random()*(maxCoord-minCoord) + minCoord);

      this.triangles.add(
        new Triangle(
          [x, y, 0.5],
          this.player,
        )
      );

      let blank_matrix = mat4.create();
      for (let j: number = 0; j < 16; j++) {
        this.object_data[16 * i + j] = <number>blank_matrix.at(j);
      }
      i++;
      this.triangle_count++;
    }
  }

  make_quads() {
    let i: number = this.triangle_count;
    for (let x: number = minCoord; x <= maxCoord; x++) {
      for (let y: number = minCoord; y <= maxCoord; y++) {
        this.quads.push(
          new Quad(
            [x, y, 0]
          )
        );

        let blank_matrix = mat4.create();
        for (let j: number = 0; j < 16; j++) {
          this.object_data[16 * i + j] = <number>blank_matrix.at(j);
        }
        i++;
        this.quad_count++;
      }
    }
  }

  update() {
    let i: number = 0;
    this.collision();

    this.triangles.forEach(
      (triangle) => {
        triangle.update();
        let model = triangle.get_model();
        for (let j: number = 0; j < 16; j++) {
          this.object_data[16 * i + j] = <number>model.at(j);
        }
        i++;
      }
    );

    this.quads.forEach(
      (quad) => {
        quad.update();
        let model = quad.get_model();
        for (let j: number = 0; j < 16; j++) {
          this.object_data[16 * i + j] = <number>model.at(j);
        }
        i++;
      }
    );

    this.cubes.forEach(
      (statue) => {
        statue.update();
        let model = statue.get_model();
        for (let j: number = 0; j < 16; j++) {
          this.object_data[16 * i + j] = <number>model.at(j);
        }
        i++;
      }
    );

    this.player.update();
  }

  get_renderables(): RenderData {
    return {
      view_transform: this.player.get_view(),
      model_transforms: this.object_data,
      object_counts: {
        [object_types.TRIANGLE]: this.triangle_count,
        [object_types.QUAD]: this.quad_count,
        [object_types.STATUE]: this.statue_count,
      }
    }
  }

  spin_player(dX: number, dY: number) {
    this.player.eulers[2] -= dX;
    this.player.eulers[2] %= 360;

    this.player.eulers[1] = Math.min(
      89, Math.max(
        -89,
        this.player.eulers[1] - dY
      )
    );
  }

  move_player(forwards_amount: number, right_amount: number) {
    vec3.scaleAndAdd(
      this.player.position, this.player.position,
      this.player.baseForwards, forwards_amount
    );

    vec3.scaleAndAdd(
      this.player.position, this.player.position,
      this.player.right, right_amount
    );

    this.player.position[0] = Math.min(maxCoord, Math.max(minCoord, this.player.position[0]));
    this.player.position[1] = Math.min(maxCoord, Math.max(minCoord, this.player.position[1]));

  }
}
