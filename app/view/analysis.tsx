import React from "react";

type Strobe = {
  freq: number;
  angle: number;
  angle_diff: number;
  norm: number;
}

type StrobeMessage = {
  strobes: Array<Strobe>;
  rms: number;
}

type T = {
  audio: AudioContext;
  analyser: AnalyserNode;
  media: MediaStream;
  bytes: Uint8Array;
  floats: Float32Array;
  strober: AudioWorkletNode;
  stroberMessage: StrobeMessage;
};

async function init(): Promise<T> {
  const audio = new AudioContext();
  await audio.audioWorklet.addModule("worklet/strobe.js");
  const media = await navigator.mediaDevices.getUserMedia({audio: true});
  const source = audio.createMediaStreamSource(media);
  const analyser = audio.createAnalyser();

  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;
  source.connect(analyser);

  const bytes = new Uint8Array(analyser.frequencyBinCount);
  const floats = new Float32Array(analyser.frequencyBinCount);

  const strober = new AudioWorkletNode(audio, "strobe-processor", { processorOptions: { sampleRate: audio.sampleRate } });
  source.connect(strober);

  const stroberMessage = { strobes: [], rms: 0 };
  const result = { audio, analyser, media, bytes, floats, strober, stroberMessage };
  strober.port.onmessage = (e) => {
    result.stroberMessage = e.data;
  };

  return result;
}

function setPeaks(t: T, freq: number, harmonics: Array<number>) {
  t.strober.port.postMessage(harmonics.map(h => h * freq));
}

export function Analysis() {
  const [trigger, setTrigger] = React.useState(false);

  const [t, setT] = React.useState<T | null>(null);
  const canvas = React.createRef<HTMLCanvasElement>();

  const onRefresh = () => {
    if (t) {
      t.analyser.getByteFrequencyData(t.bytes);

      const samp = t.audio.sampleRate / t.bytes.length / 2;

      const canv = canvas.current;
      const ctx = canv?.getContext('2d');
      if (canv && ctx) {
        ctx.lineWidth = 0.1;
        ctx.strokeStyle = '#f000f0';
        ctx.clearRect(0, 0, canv.width, canv.height);

        const count = t.bytes.length;
        const w_per_bucket = canv.width / count;
        const h = canv.height;

        for (let i = 0; i != count; ++i) {
          const x = w_per_bucket * i;
          const v = t.bytes[i];
          ctx.fillStyle = `rgb(${v}, ${v}, ${v})`;
          ctx.fillRect(x, 0, w_per_bucket, h);
        }

      }


      setTrigger(!trigger);
    } else {

    }

  };

  const onConnect = async () => {
    if (t) {
      t.audio.close();
      t.media.getTracks().forEach(x => x.stop());
      setT(null);
    } else {
      const t = await init();
      setT(t);
      setTrigger(!trigger);
    }
  };

  React.useEffect(() => {
    requestAnimationFrame(onRefresh);
  }, [trigger]);

  return (<>
  <p><a className="button is-primary" onClick={onConnect}>{ t ? "disconnect" : "connect" }</a></p>
  <canvas ref={canvas} width="1024" height="300" />
  </>);
}
