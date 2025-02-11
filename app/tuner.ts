
export type Options = {
  fftSize?: number;
  fftSmoothing?: number;
  worklet?: WorkletOptions;
}
export type WorkletOptions = {
  updatePeriod?: number;
  filterNorm?: number;
  filterRms?: number;
  filterAngle?: number;
}

export type Strobe = {
  freq: number;
  angle: number;
  angle_diff: number;
  norm: number;
}

export type WorkletResults = {
  strobes: Array<Strobe>;
  rms: number;
}

export type WorkletSetFreqs = {
  freqs: Array<number>;
  tapGenFreq?: number;
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

export function setPeaks(t: T, freq: number, harmonics: Array<number>, tapGenFreq: number | null) {
  t.strober.port.postMessage({ freqs: harmonics.map(h => h * freq), tapGenFreq: tapGenFreq });
  t.stroberMessage = { strobes: [], rms: 0 };
}
