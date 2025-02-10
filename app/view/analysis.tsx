import React from "react";

// class StrobeX {
//   constructor(public freq: number, public angle: number) {}
// }
// let x = new StrobeX();

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

  analyser.fftSize = 4096;
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

function setPeaks(t: T, freq: number, harmonics: Array<number>, tapGenFreq: number | null) {
  t.strober.port.postMessage({ freqs: harmonics.map(h => h * freq), tapGenFreq: tapGenFreq });
  t.stroberMessage = { strobes: [], rms: 0 };
}

export function Analysis() {
  const [trigger, setTrigger] = React.useState(false);
  const [textStatus, setTextStatus] = React.useState("");

  const [t, setT] = React.useState<T | null>(null);
  const canvas = React.createRef<HTMLCanvasElement>();
  const txtGenFreq = React.createRef<HTMLInputElement>();
  const txtReceptFreq = React.createRef<HTMLInputElement>();

  const last_strobes = React.useRef<Array<Strobe>>([]);

  const [harmonics, setHarmonics] = React.useState<boolean[]>([false,true, false, false, true, false, false, false, false, false, true])
  const [harmonicsx, setHarmonicsx] = React.useState<Map<number,boolean>>(new Map([[1, true], [3, true]]))

  // const harmonics = [1,4,10];

  let minmaxs = React.useRef<({min:number,max:number,count:number,sum:number}|null)[]>([]);

  const onRefresh = () => {
    if (t) {
      t.analyser.getByteFrequencyData(t.bytes);

      const freq_mul = 10;

      const canv = canvas.current;
      const ctx = canv?.getContext('2d');
      if (canv && ctx) {
        ctx.lineWidth = 0.1;
        ctx.strokeStyle = '#f000f0';
        ctx.clearRect(0, 0, canv.width, canv.height);

        const count = t.bytes.length;
        const w_per_bucket = (canv.width * freq_mul) / count;
        const freq_to_x = (count / t.audio.sampleRate) * w_per_bucket * 2;
        const h = canv.height;

        for (let i = 0; i != count; ++i) {
          const x = w_per_bucket * i;
          const freq = (t.audio.sampleRate / (count / i));
          // if (freq < 500)
          //   console.log(x, freq);
          const v = t.bytes[i];
          ctx.fillStyle = `rgb(${v / 8}, ${v / 2}, ${v / 8})`;
          ctx.fillRect(x, 0, w_per_bucket, h);
        }

        const msg = t.stroberMessage;
        // setTextStatus(`rms ${msg.rms.toFixed(3)} ${msg.strobes.length > 0 && msg.strobes[0].norm}`);

        for (let i = 0; i != msg.strobes.length; ++i) {
          let strobe = msg.strobes[i];
          const x = strobe.freq * freq_to_x;

          ctx.strokeStyle = 'rgb(255,255,255)';
          ctx.lineWidth = 1.0;
          ctx.font = '15px monospace';
          ctx.strokeText(`${strobe.freq}`, x, 50);

          if (strobe.norm >= 0.30 && msg.rms > 0.001) {
            last_strobes.current[i] = strobe;
          } else {
            strobe = last_strobes.current[i];
            if (!strobe) {
              continue;
            }
            strobe.norm *= 0.95;
            if (strobe.norm < 0.01) {
              continue;
            }
          }
          let n = strobe.norm;


          const g = 255 - Math.abs(strobe.angle_diff) * 50000; // Math.min(255, strobe.norm*1000);
          const r = -Math.min(strobe.angle_diff, 0) * 50000;
          const b = Math.max(strobe.angle_diff, 0) * 50000;
          const y = Math.min(h, Math.max(0, (h / 2) + (strobe.angle_diff * h)));
          const w = n * 10;
          const hh = n * h;

          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x - w/2, y - hh/2, w, hh);

          ctx.strokeStyle = `rgb(${g},${g},${g})`;
          ctx.lineWidth = 1.0;
          ctx.font = '15px monospace';

          let mm = minmaxs.current[i];
          if (!mm) {
            mm = minmaxs.current[i] = { min: strobe.angle_diff, max: strobe.angle_diff, count: 0, sum: 0.0 };
          }
          mm.count++;
          mm.sum += strobe.angle_diff;
          if (strobe.angle_diff < mm.min)
            mm.min = strobe.angle_diff;
          if (strobe.angle_diff > mm.max)
            mm.max = strobe.angle_diff;


          // [-0.2915,-0.2442] 285 -100
          // [-0.0513,-0.0065] 285 -10
          // [-0.0259,0.0188] 285 -1
          // [-0.0228,0.0213] 285 0
          // [-0.0203,0.0244] 285 1
          // [0.0051,0.0495] 285 10
          // [0.2619,0.3059] 285 100

          // [-0.0126,0.0128] 440 0
          // [-0.0086,0.0175] 440 1
          // [0.0293,0.0567] 440 10
          // [0.4243,0.4538] 440 100

          // [-0.0013,0.0013] 570 0
          // [0.0041,0.0071] 570 1
          // [0.0524,0.0584] 570 10
          // [0.5621,0.5746] 570 100

          // [-0.0058,0.0058] 880 0
          // [0.0026,0.0147] 880 1
          // [0.0776,0.0937] 880 10
          // [0.8724,0.8839] 880 100

          if (i == 0)
            setTextStatus(`[${mm.min.toFixed(4)},${mm.max.toFixed(4)}] (${mm.sum / mm.count}) ${txtReceptFreq.current?.value} ${txtGenFreq.current?.value}`);


          // const nrm = Math.round(n * 100) / 100;
          // const ang = Math.round(strobe.angle * 100) / 100;
          // const ang_d = Math.round(strobe.angle_diff * 100) / 100;
          ctx.strokeText(`${n.toFixed(2)}:${strobe.angle_diff.toFixed(4)}`, x + 1, h/2);
          ctx.strokeText(`${mm.min.toFixed(4)}:${mm.max.toFixed(4)}`, x + 1, h/2 + 25);
        }

      }


      setTrigger(!trigger);
    }

  };

  const [connecting, setConnecting] = React.useState(false);

  const onUpdate = async (harmonics: boolean[]) => {
    console.log(t, txtReceptFreq.current?.value, txtGenFreq.current?.value, harmonics, connecting)
    let tt = t;
    if (!tt) {
      if (connecting)
        return;
      setConnecting(true);
      tt = await init();
      console.log('done', t, tt, txtReceptFreq.current?.value, txtGenFreq.current?.value, harmonics, connecting)
      setT(tt);
      return;
    }
    console.log(tt)

    let receptFreq = null;
    let receptFreqTxt = txtReceptFreq.current?.value;
    if (receptFreqTxt) {
      receptFreq = parseFloat(receptFreqTxt);
    }

    let genFreq = null;
    let genFreqTxt = txtGenFreq.current?.value;
    if (receptFreq && genFreqTxt) {
      const cents = parseFloat(genFreqTxt);
      genFreq = receptFreq * Math.pow(Math.pow(2, 1/1200), cents);
      console.log(receptFreq, cents, genFreq)
    }

    if (receptFreq) {
      const harm_en: number[] = [];
      harmonics.forEach((en,ix) => {
        if (en) harm_en.push(ix);
      });
      console.log('setPeaks', tt, receptFreq, harmonics, harm_en, genFreq);
      setPeaks(tt, receptFreq, harm_en, genFreq);
    }
    minmaxs.current = [];

    // onUpdateRecept();
    setTrigger(!trigger);
  };

  React.useEffect(() => {
    if (t) {
      onUpdate(harmonics);
      setConnecting(false);
    }
    // if (connecting && t) {
    //   onUpdate(harmonics);
    //   setConnecting(false);
    // }
  }, [t]);

  const onConnect = async () => {
    if (t) {
      t.audio.close();
      t.media.getTracks().forEach(x => x.stop());
      setT(null);
    } else {
      onUpdate(harmonics);
    }
  };

  React.useEffect(() => {
    requestAnimationFrame(onRefresh);
  }, [trigger]);

  return (<>
  <p><a className="button is-primary" onClick={onConnect}>{ connecting ? "starting..." : t ? "stop processing" : "start processing" }</a></p>
  {/* <p><a className="button is-primary" onClick={() => {minmaxs.current = [];}}>reset minmax</a></p> */}
  <p><label className="text"><input type="number" className="text" placeholder="receptive frequency (hz)" ref={txtReceptFreq} onChange={() => onUpdate(harmonics)} /> (the frequency you are interested in)</label></p>
  <p>harmonics
    {harmonics.map((en,ix) =>
      <label className="checkbox" key={ix}>
            <input type="checkbox" value={ix} checked={en} onChange={e => {
              let hh = harmonics.map(x => x);
              hh[ix] = e.target.checked;
              setHarmonics(hh);
              onUpdate(hh);
            }} /> {ix}
        </label>
    )}
  </p>

  <p><label className="text"><input type="number" className="text" placeholder="test tone (cent offset)" ref={txtGenFreq} onChange={() => onUpdate(harmonics)} /> (for testing accuracy, set to 1 to generate tone 1 cent sharp of receptive frequency)</label></p>
  <p style={{fontFamily: "monospace"}}>{textStatus}</p>
  <canvas ref={canvas} width={document.body.clientWidth} height={1024} />
  </>);
}
