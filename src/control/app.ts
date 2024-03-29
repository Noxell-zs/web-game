import { Renderer } from "../view/renderer";
import { Scene } from "../model/scene";
import {CanvasManager} from "./canvas-manager";
import { Kick } from "./audio";


function getPeaks(buffer: AudioBuffer): Promise<number[]> {
  const offlineContext = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
  const source = offlineContext.createBufferSource();
  source.buffer = buffer;
  const filter = offlineContext.createBiquadFilter();
  filter.type = "lowpass";
  source.connect(filter);
  filter.connect(offlineContext.destination);
  source.start(0);
  offlineContext.startRendering();

  return new Promise((resolve, reject) =>
    offlineContext.oncomplete = (e) => {
      const filteredBuffer = e.renderedBuffer;
      const data = filteredBuffer.getChannelData(0);

      const peaksArray: number[] = [];

      const block = filteredBuffer.sampleRate * 3;

      [...(range(0, filteredBuffer.length, block))].map(
        x => data.slice(x, x + block)
      ).forEach((blockElement, blockIndex) => {
        const max = blockElement.reduce((a,b) => a > b ? a : b);
        const min = blockElement.reduce((a, b) => a < b ? a : b);
        const threshold = min + (max - min) * 0.75;

        const {length} = blockElement;
        for (let i = 0; i < length;) {
          if (blockElement[i] > threshold) {
            peaksArray.push(i + blockIndex*length);
            // Skip forward ~ 1/4s to get past this peak.
            i += 10000;
          }
          i++;
        }
      });

      return resolve(peaksArray)
   });
}

function* range(
  start: number,
  stop: number,
  step: number = 1
) {
  for (; start <= stop; start += step) {
    yield start;
  }
}

export class App {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  scene: Scene;

  forwards_amount: number;
  right_amount: number;

  context = new AudioContext;
  buffer?: AudioBuffer;
  peaks?: Promise<number[]>;

  targetTime = [0, 0];
  previousTouch: Touch | null;

  constructor(canvasManager: CanvasManager) {
    this.canvas = canvasManager.canvas;

    this.renderer = new Renderer(canvasManager);
    this.renderer.Initialize();

    this.scene = new Scene();

    this.forwards_amount = 0;
    this.right_amount = 0;

    const appContext = this;
    document.getElementById('audioFile')!.onchange = function() {
      const file = (this as HTMLInputElement).files![0];
      const reader = new FileReader();
      reader.onload = () => {
        appContext.context.decodeAudioData(
          reader.result as ArrayBuffer,
          (buffer) => {
            appContext.buffer = buffer;
            appContext.peaks = getPeaks(buffer);
          }
        );
      };
      reader.readAsArrayBuffer(file);
    };
  }

  activateControls(): void {
    const urlParams = new URLSearchParams(window.location.search);

    const hud = document.getElementById('hud')!;

    addEventListener(
      "keydown",
      async (event) => {
        if (event.key === 'Enter') {
          this.canvas.requestPointerLock();

          if (document.fullscreenElement) {
            await document.exitFullscreen?.();
          } else {
            await document.documentElement.requestFullscreen();
          }
        } else {
          this.handleKeypress(event.key)
        }
      },
    );
    addEventListener(
      "keyup",
      (event) => this.handleKeyrelease(event.key),
    );

    this.canvas.addEventListener(
      "mousemove",
      (event: MouseEvent) => this.handle_mouse_move(event)
    );

    const attack = () => {
      const {currentTime} = this.context;
      const diff = Math.min(
        Math.abs(currentTime - this.targetTime[0]),
        Math.abs(this.targetTime[1] - currentTime)
      );
      if (diff < 0.1) {
        this.scene.click();
      }
    };


    if (urlParams.has('mobile')) {
      document.documentElement.requestFullscreen();

      const attackBtn = document.getElementById('attack-btn')!;
      const moveControl = document.getElementById('move-control')!;

      attackBtn.removeAttribute('hidden');
      moveControl.removeAttribute('hidden');

      hud.addEventListener("touchmove", (event: TouchEvent) => {
        event.stopPropagation();
        const touch = event.touches[0];

        if (this.previousTouch) {
          this.scene.spin_player(
            (touch.pageX - this.previousTouch.pageX) / 5,
            (touch.pageY - this.previousTouch.pageY) / 5
          );
        }

        this.previousTouch = touch;
      });
      hud.addEventListener("touchend", (e) =>
        this.previousTouch = null
      );

      attackBtn.addEventListener(
        "touchstart",
        (event: TouchEvent) => {
          event.stopPropagation();
          attack();
        }
      );

      let rect: DOMRect,
        centerBottom: number,
        centerTop: number,
        centerLeft: number,
        centerRight: number;

      const setCenter = () => {
        rect = moveControl.getBoundingClientRect();
        centerBottom = (rect.top + rect.bottom * 2) / 3;
        centerTop = (rect.top * 2 + rect.bottom) / 3;
        centerLeft = (rect.right + rect.left * 2) / 3;
        centerRight = (rect.right * 2 + rect.left) / 3;
      };

      setCenter();
      addEventListener('resize', setCenter);

      for (const eventType of ["touchmove", "touchstart"] as const) {
        moveControl.addEventListener(eventType, (event: TouchEvent) => {
          event.stopPropagation();
          const touch = event.touches[0];

          if (touch.pageY >= centerBottom) {
            this.forwards_amount = -0.06;
          }
          if (touch.pageY <= centerTop) {
            this.forwards_amount = 0.06;
          }
          if (touch.pageX >= centerRight) {
            this.right_amount = 0.04;
          }
          if (touch.pageX <= centerLeft) {
            this.right_amount = -0.04;
          }
        });
      }
      for (const eventType of ["touchend", "touchcancel"] as const) {
        moveControl.addEventListener(eventType, (event: TouchEvent) => {
          this.forwards_amount = 0;
          this.right_amount = 0;
        });
      }

    } else {
      hud.addEventListener("click", (event: MouseEvent) => {
        this.canvas.requestPointerLock();
        attack();
      });
    }

    const kick = new Kick(this.context);

    if (this.buffer) {
      const {sampleRate} = this.buffer!;
      let i = 0;

      this.peaks?.then(peaks => {
        let cursor = peaks.shift()!;
        const interval = setInterval(() => {
          while (i >= cursor) {
            const {currentTime} = this.context;
            this.targetTime[0] = currentTime;
            this.targetTime[1] = currentTime + ((peaks[0] || 0) - cursor) / sampleRate;

            kick.trigger(currentTime);
            cursor = peaks.shift()!;
          }
          i += sampleRate / 8;

          if (!peaks.length) {
            clearInterval(interval);
          }
        }, 1000 / 8);

        let source = this.context.createBufferSource();
        source.buffer = this.buffer!;
        source.connect(this.context.destination);
        source.start(this.context.currentTime + 1/8);
      });

    } else {
      // const tempo = Math.floor(Math.random()*140) + 80;
      //
      // const action = () => generate().then(seq => {
      //   const coef = 60 / tempo / seq.quantizationInfo.stepsPerQuarter;
      //
      //   const arr = [...new Set(seq.notes.map(
      //     note => note.quantizedStartStep!
      //   ))].sort();
      //
      //   arr.forEach((item, index) => setTimeout(() => {
      //     const {currentTime} = this.context;
      //     this.targetTime[0] = currentTime;
      //     this.targetTime[1] = currentTime + coef * ((arr[index+1] || item) - item);
      //     kick.trigger(currentTime);
      //
      //   }, 1000 * item*coef));
      //
      //   player.start(seq, tempo);
      // });
      //
      // const player = new Player(false, {
      //   run: (note) => null,
      //   stop: action
      // });
      // player.stop();
      //
      // initialize().then(() => action());

      setInterval(() => {
        const {currentTime} = this.context;
        this.targetTime[0] = currentTime;
        this.targetTime[1] = currentTime + 0.55;

        kick.trigger(currentTime)
      }, 550);
    }

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
