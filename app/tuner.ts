export type Options = {
  fftSize: number;
  fftSmoothing: number;
  worklet: WorkletOptions;
  display: DisplayOptions;
}

export type WorkletOptions = {
  updatePeriod: number;
  bufferLength: number;
  filterNorm: number;
  filterRms: number;
  filterAngle: number;
}

export type DisplayOptions = {
  minFreq: number;
  maxFreq: number;
  canvasWidth: number;
}

export function makeOptions(
  fftSize: number = 4096,
  fftSmoothing: number = 0.8,
  worklet: WorkletOptions = makeWorkletOptions(),
  display: DisplayOptions = makeDisplayOptions(),
): Options {
  return { fftSize, fftSmoothing, worklet, display };
}

export function makeWorkletOptions(
  updatePeriod: number = 6, // 44100/(128*6) ~60Hz
  bufferLength: number = 5, // store 2 full periods of lowest frequency
  // bufferLength: number = 17, // ~20Hz, ~50ms window
  filterNorm: number = 0.8,
  filterRms: number = 0.8,
  filterAngle: number = 0.8,
): WorkletOptions {
  return { updatePeriod, bufferLength, filterNorm, filterRms, filterAngle };
}

export function makeDisplayOptions(
  minFreq: number = 0,
  maxFreq: number = 10000,
  canvasWidth: number = 1024,
): DisplayOptions {
  return { minFreq, maxFreq, canvasWidth };
}

export type Strobe = {
  freq: number;
  angle: number;
  angle_diff: number;
  norm: number;
  angle_diff_variance: number;
  angle_diff_filtered: number;
}

export type WorkletResults = {
  strobes: Array<Strobe>;
  rms: number;
}

export type WorkletSetFreqs = {
  freqs: Array<number>;
  tapGenFreq?: number;
  bufferLength?: number;
}


export type T = {
  audio: AudioContext;
  analyser: AnalyserNode;
  media: MediaStream;
  bytes: Uint8Array;
  strober: AudioWorkletNode;
  stroberMessage: WorkletResults;
  options: Options;
};

export async function init(options: Options): Promise<T> {
  const audio = new AudioContext();
  await audio.audioWorklet.addModule("worklet/strobe.js");
  const media = await navigator.mediaDevices.getUserMedia({audio: true});
  const source = audio.createMediaStreamSource(media);
  const analyser = audio.createAnalyser();

  analyser.fftSize = options.fftSize ?? 4096;
  analyser.smoothingTimeConstant = options.fftSmoothing ?? 0.8;
  source.connect(analyser);

  const bytes = new Uint8Array(analyser.frequencyBinCount);

  const strober = new AudioWorkletNode(audio, "strobe-processor", { processorOptions: { sampleRate: audio.sampleRate, ...options.worklet } });
  source.connect(strober);

  const stroberMessage = { strobes: [], rms: 0 };
  const result = { audio, analyser, media, bytes, strober, stroberMessage, options };
  strober.port.onmessage = (e) => {
    result.stroberMessage = e.data;
  };

  return result;
}

export function setStrobeFreqs(t: T, freq: number, harmonics: Array<number>, tapGenFreq: number | null) {
  let updatePeriod = Math.ceil(44100 / freq / 128);
  let bufferLength = t.options.worklet.bufferLength;
  let filterAngle = t.options.worklet.filterAngle; // Math.max(0.5, Math.min(0.95, 1 - (1 / (44100 / freq / 128))))
  // let filterAngle = Math.max(1 - (1 / (44100 / freq / 128)));
  t.strober.port.postMessage({ freqs: harmonics.map(h => h * freq), tapGenFreq: tapGenFreq, bufferLength: bufferLength, filterAngle: filterAngle, updatePeriod: updatePeriod });
  t.stroberMessage = { strobes: [], rms: 0 };
}

export function getXOfFreq(t: T, freq: number): number {
  const opt = t.options.display;
  const f = (freq - opt.minFreq) / (opt.maxFreq - opt.minFreq);
  return f * opt.canvasWidth;
}

export function getXOfBucket(t: T, bucket: number): number {
  const count = t.options.fftSize;
  const freq  = bucket * (t.audio.sampleRate / count);
  return getXOfFreq(t, freq);
}

export function getWOfBucket(t: T): number {
  return getXOfBucket(t, 1) - getXOfBucket(t, 0);
}

export function loadFrequencyData(t: T): void {
  t.analyser.getByteFrequencyData(t.bytes);
}
export function getAmplitudeOfBucket(t: T, bucket: number): number {
  const v = Math.pow(t.bytes[bucket] / 255, 2) * 255;
  return v;
}

export function centsOfStrobe(s: Strobe, filt: boolean) {
  let a = filt ? s.angle_diff_filtered : s.angle_diff;
  let v = a / s.freq;
  // TODO fix this
  let A = 1.03e5;
  let B = -2478385.6177376145;
  return A * v + B * v * v;
}

/**

285 0    0.0002       7.0e-7
285 1    0.0025       8.77e-6
285 10   0.0275       9.65e-5
285 100  0.2840       9.96e-4
285 200  0.5850       2.05e-3
285 500  1.5993       5.61e-3
285 800  2.8058       9.84e-3
285 880 overflow norm 0.45
285 1000 -2.7     (overflow?)

285 -1   -0.0028      -9.82e-6
285 -10  -0.0275      -9.64e-5
285 -100 -0.2680
285 -200 -0.5210
285 -500 -1.1980
285 -800 -1.7670

350  0    0.0001      2.8e-7
350  1    0.0033
350  10   0.0340
350  100  0.3490      1e-3
350  200  0.7183
350  500  1.9640
350  700  2.9230
350  710  2.4???
350  800 -2.8350 (overflow)

350 -1   -0.0030
350 -10  -0.0340
350 -100 -0.3291
350 -200 -0.6400
350 -500 -1.4700
350 -800 -2.1700

440  0    0.0001
440  1    0.0043
440  10   0.0426
440  100  0.4386    9.96e-4
440  200  0.9032
440  500  2.4700
440  700 -2 (overflow)

440 -1   -0.0043
440 -10  -0.0424
440 -100 -0.4140
440 -200 -0.8045
440 -500 -1.8499
440 -800 -2.7287

1000  0    0.0001
1000  1    0.0097
1000  10   0.0973
1000  100  0.9986     9.98e-4
1000  200  2.0569
1000  300 -1 (overflow, norm 0.45)
1000  350 -2.51 (overflow, norm 0.35)

1000 -1   -0.0097
1000 -10  -0.0967
1000 -100 -0.9423
1000 -200 -1.8314
1000 -300 -2.6705


 */