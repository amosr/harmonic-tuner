import React from "react";

import * as Tuner from "../tuner";

function renderCanvas(t: Tuner.T, canv: HTMLCanvasElement, ctx: CanvasRenderingContext2D, strobes: Array<Tuner.Strobe>) {
  // ctx.clearRect(0, 0, canv.width, canv.height);

  const count = t.bytes.length;
  const w_per_bucket = Tuner.getWOfBucket(t);
  const h = canv.height;

  for (let i = 0; i != count; ++i) {
    const x = Tuner.getXOfBucket(t, i);
    const v = Tuner.getAmplitudeOfBucket(t, i);
    ctx.fillStyle = `rgb(${v / 8}, ${v / 2}, ${v / 8})`;
    ctx.fillRect(x, 0, w_per_bucket, h);
  }

  ctx.lineWidth = 1.0;
  ctx.strokeStyle='rgb(255,255,255)';
  ctx.beginPath();
  ctx.moveTo(0, h/2);
  ctx.lineTo(canv.width, h/2);
  ctx.stroke();
  ctx.closePath();

  for (let i = 0; i != strobes.length; ++i) {
    const strobe = strobes[i];
    const x = Tuner.getXOfFreq(t, strobe.freq);

    ctx.beginPath();
    ctx.moveTo(x, h/2 - 10);
    ctx.lineTo(x, h/2 + 10);
    ctx.stroke();

    const n = strobe.norm;
    // noisy, for position?
    // const cents = Tuner.centsOfStrobe(strobe, false);
    const cents = Tuner.centsOfStrobe(strobe, true);
    // less noisy for text
    const centsNum = Tuner.centsOfStrobe(strobe, true);
    const vv = strobe.angle_diff_variance;

    const display = n > 0;

    let [r,g,b] =
      (Math.abs(cents) <= 0.5) ? [255, 0, 255] :
      (cents == 0) ? [255, 0, 255] :
      (cents >  0) ? [0, 0, 255] :
                     [255, 0, 0];

    const y = (h / 2) + (
      (cents >= 0) ?
        Math.sqrt(cents / 500) * (h / 2) :
        -Math.sqrt(-cents / 500) * (h / 2)
    );

    // const y = Math.min(h, Math.max(0, (h / 2) + (strobe.angle_diff * h)));
    const w = n * 10;
    const hh = h / 8;

    if (display) {
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x - w/2, y - hh/2, w, hh);
    }

    // let mm = minmaxs.current[i];
    // if (!mm) {
    //   mm = minmaxs.current[i] = { min: strobe.angle_diff, max: strobe.angle_diff, count: 0, sum: 0.0 };
    // }
    // mm.count++;
    // mm.sum += strobe.angle_diff;
    // if (strobe.angle_diff < mm.min)
    //   mm.min = strobe.angle_diff;
    // if (strobe.angle_diff > mm.max)
    //   mm.max = strobe.angle_diff;





    // if (i == 0)
    //   setTextStatus(`[${mm.min.toFixed(4)},${mm.max.toFixed(4)}] (${mm.sum / mm.count}) ${txtReceptFreq.current?.value} ${txtGenFreq.current?.value}`);


    ctx.lineWidth = 1.0;
    const fontSize = 15;
    ctx.font = `${fontSize}px monospace`;
    ctx.strokeStyle = 'rgb(255,255,255)';

    if (display) {
      ctx.strokeText(`${centsNum > 0 ? '+' : ''}${centsNum.toFixed(0)} cents`, x + 1, h/2);
      // ctx.strokeText(`${strobe.angle_diff_variance.toFixed(4)}`, x + 1, h/2 + 25);
      // ctx.strokeText(`${strobe.norm.toFixed(4)}`, x + 1, h/2 + 50);
      // ctx.strokeText(`${mm.min.toFixed(4)}:${mm.max.toFixed(4)}`, x + 1, h/2 + 25);
    }

    ctx.strokeText(`${strobe.freq}`, x - (fontSize * 0.25 * (strobe.freq.toString().length)), h - fontSize);
  }

}

export function Analysis() {
  const [trigger, setTrigger] = React.useState(false);
  const [textStatus, setTextStatus] = React.useState("");

  const [t, setT] = React.useState<Tuner.T | null>(null);
  const canvas = React.createRef<HTMLCanvasElement>();
  const txtGenFreq = React.createRef<HTMLInputElement>();
  const txtReceptFreq = React.createRef<HTMLInputElement>();

  const last_strobes = React.useRef<Array<Tuner.Strobe>>([]);

  const [harmonics, setHarmonics] = React.useState<boolean[]>([false,true, false, false, true, false, false, false, false, false, true])

  // let minmaxs = React.useRef<({min:number,max:number,count:number,sum:number}|null)[]>([]);

  const updateEvery = React.useRef(0);
  const onRefresh = () => {
    if (t) {
      setTrigger(!trigger);
      // updateEvery.current--;
      // if (updateEvery.current > 0)
      //   return;
      // updateEvery.current = 3;

      Tuner.loadFrequencyData(t);

      const canv = canvas.current;
      const ctx = canv?.getContext('2d');
      if (canv && ctx) {
        ctx.reset();

        const msg = t.stroberMessage;
        setTextStatus(`rms ${msg.rms.toFixed(3)}`);

        const strobes: Tuner.Strobe[] = [];
        for (let i = 0; i != msg.strobes.length; ++i) {
          let strobe = msg.strobes[i];
          if (strobe.norm >= 0.50 && msg.rms > 0.001 && strobe.angle_diff_variance < 0.50) {
            last_strobes.current[i] = strobe;
          } else if (last_strobes.current[i]) {
            last_strobes.current[i].norm *= 0.95;

            strobe = last_strobes.current[i];

            if (strobe.norm < 0.1) {
              strobe.norm = 0.0;
            }
          } else {
            strobe.norm = 0.0;
          }
          strobes.push(strobe);
        }

        renderCanvas(t, canv, ctx, strobes);
      }



    }

  };

  const [connecting, setConnecting] = React.useState(false);

  const onUpdate = async (harmonics: boolean[]) => {
    // console.log(t, txtReceptFreq.current?.value, txtGenFreq.current?.value, harmonics, connecting)
    let tt = t;
    if (!tt) {
      if (connecting)
        return;
      setConnecting(true);
      const opt = Tuner.makeOptions();
      if (canvas.current?.width)
        opt.display.canvasWidth = canvas.current?.width;
      tt = await Tuner.init(opt);
      // console.log(opt);
      // console.log('done', t, tt, txtReceptFreq.current?.value, txtGenFreq.current?.value, harmonics, connecting)
      setT(tt);
      return;
    }
    // console.log(tt)

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
      // console.log(receptFreq, cents, genFreq)
    }

    if (receptFreq) {
      const harm_en: number[] = [];
      harmonics.forEach((en,ix) => {
        if (en) harm_en.push(ix);
      });
      Tuner.setStrobeFreqs(tt, receptFreq, harm_en, genFreq);
    }
    last_strobes.current = [];
    // minmaxs.current = [];

    setTrigger(!trigger);
  };

  React.useEffect(() => {
    if (t) {
      onUpdate(harmonics);
      setConnecting(false);
    }
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
              let hh = harmonics.map((x,i) => (i == ix) ? e.target.checked : x);
              setHarmonics(hh);
              onUpdate(hh);
            }} /> {ix}
        </label>
    )}
  </p>

  <p><label className="text"><input type="number" className="text" placeholder="test tone (cent offset)" ref={txtGenFreq} onChange={() => onUpdate(harmonics)} /> (for testing accuracy, set to 1 to generate tone 1 cent sharp of receptive frequency)</label></p>
  <p style={{fontFamily: "monospace"}}>{textStatus}</p>
  <canvas ref={canvas} width={document.body.clientWidth} height={600} />
  </>);
}
