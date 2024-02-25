export class Kick {
  context: AudioContext;
  osc?: OscillatorNode;
  gain?: GainNode;
  circle: HTMLDivElement;

  constructor(context: AudioContext) {
    this.context = context;
    this.circle = document.getElementById('circle') as HTMLDivElement;
  }


  setup(): void {
    this.osc = this.context.createOscillator();
    this.gain = this.context.createGain();
    this.osc.connect(this.gain);
    this.gain.connect(this.context.destination)
  }

  trigger(time: number): void {
    this.circle.style.borderColor = 'orange';
    this.setup();

    this.osc!.frequency.setValueAtTime(200, time);
    this.gain!.gain.setValueAtTime(0.5, time);

    this.osc!.frequency.exponentialRampToValueAtTime(1, time + 0.5);
    this.gain!.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

    this.osc!.start(time);

    this.osc!.stop(time + 0.5);
    setTimeout(() => this.circle.style.borderColor = 'transparent', 50);
  }
}
