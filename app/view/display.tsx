import React from "react";

import * as Tuner from "../tuner";
import * as Options from "./options";

export type Props = {
  t: Tuner.T | null,
  options: Options.T,
  triggerExt: boolean,
  setStatusText?: React.Dispatch<string>
};

function renderCanvas(t: Tuner.T, canv: HTMLCanvasElement, ctx: CanvasRenderingContext2D, strobes: Array<Tuner.Strobe>, debug: boolean) {
  ctx.reset();

  ctx.lineWidth = 1.0;
  const fontSize = 18; // 24;
  const fontXOffset = fontSize / 3.5;
  const fontYOffset = fontSize / 3;
  ctx.font = `${fontSize}px monospace`;
  ctx.strokeStyle = 'rgb(255,255,255)';

  const count = t.bytes.length;
  const w_per_bucket = Tuner.getWOfBucket(t);
  const h = canv.height;
  const maxCentDisplay = 400;

  // show fft behind gauges
  for (let i = 0; i != count; ++i) {
    const x = Tuner.getXOfBucket(t, i);
    const v = Tuner.getAmplitudeOfBucket(t, i);
    ctx.fillStyle = `rgb(${v / 8}, ${v / 2}, ${v / 8})`;
    ctx.fillRect(x, 0, w_per_bucket, h);
  }

  const yOfCents = (cents: number) =>
      (h / 2) +
      Math.sqrt(Math.abs(cents) / maxCentDisplay) * (h / 2)
    * (cents >= 0 ? 1 : -1)

  const centsGauge = [[0, 30], [1, 20], [5, 10], [10, 5], [50, 4], [100, 2]];

  const padLeft = (s: string, len: number) =>
    (" ".repeat(len - s.length)) + s;

  const drawText = (s: string, x: number, y: number) => {
    ctx.fillStyle = 'rgb(192,192,192)';
    ctx.fillText(s, x, y);
  };

  centsGauge.forEach(([c,w]) => {
    if (c > 0) {
      drawText(padLeft(`+${c}`, 4), 0, yOfCents(c) + fontYOffset);
      drawText(padLeft(`-${c}`, 4), 0, yOfCents(-c) + fontYOffset);
    } else {
      drawText(padLeft(`${c}`, 4), 0, yOfCents(c) + fontYOffset);
    }
  })

  for (let i = 0; i != strobes.length; ++i) {
    const strobe = strobes[i];
    const x = Tuner.getXOfFreq(t, strobe.freq);

    ctx.beginPath();
    centsGauge.forEach(([c,w]) => {
      ctx.moveTo(x - w, yOfCents(c));
      ctx.lineTo(x + w, yOfCents(c));
      ctx.moveTo(x - w, yOfCents(-c));
      ctx.lineTo(x + w, yOfCents(-c));
    })
    ctx.stroke();

    const n = strobe.norm;
    const cents = Tuner.centsOfStrobe(strobe, true);
    const vv = strobe.angle_diff_variance;

    const display = n > 0;

    let [r,g,b] =
      (Math.abs(cents) <= 0.5) ? [255, 0, 255] :
      (cents == 0) ? [255, 0, 255] :
      (cents >  0) ? [0, 0, 255] :
                     [255, 0, 0];

    const y = yOfCents(cents);
    const w = n * 10;
    const hh = Math.min(100, Math.max(3, strobe.angle_diff_variance * 2000));

    if (display) {
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x - w/2, y - hh/2, w, hh);

      drawText(`${cents > 0 ? '+' : ''}${cents.toFixed(0)} cents`, x + 1, h/2);
    }

    if (debug) {
      drawText(`var  ${strobe.angle_diff_variance.toFixed(4)}`, x + 1, h/2 + 25);
      drawText(`norm ${strobe.norm.toFixed(4)}`, x + 1, h/2 + 50);
    }

    {
      const txt = `${strobe.freq}Hz`;
      drawText(txt, x - (fontXOffset * (txt.length)), h - fontSize - 80);
    }
  }

}


export function Display({t, options, setStatusText, triggerExt}: Props) {

  const canvas = React.createRef<HTMLCanvasElement>();
  const last_strobes = React.useRef<Array<Tuner.Strobe>>([]);

  const [trigger, setTrigger] = React.useState(false);

  const onRefresh = () => {
    if (t) {
      setTrigger(!trigger);

      Tuner.loadFrequencyData(t);

      const canv = canvas.current;
      const ctx = canv?.getContext('2d');
      if (canv && ctx) {
        t.options.display.canvasWidth = canv.width;

        const msg = t.stroberMessage;
        if (setStatusText)
          setStatusText(`rms ${msg.rms.toFixed(3)}`);

        let strobes: Tuner.Strobe[] = [];
        for (let i = 0; i != msg.strobes.length; ++i) {
          let strobe = msg.strobes[i];
          if (msg.rms > options.strobeMinimumRms && strobe.norm >= options.strobeMinimumNorm && strobe.angle_diff_variance < options.strobeMaximumVariance || options.debugEnableDisplay) {
            last_strobes.current[i] = strobe;
          } else if (last_strobes.current[i]) {
            last_strobes.current[i].norm *= options.strobeDecay;
            last_strobes.current[i].freq = strobe.freq;

            strobe = last_strobes.current[i];

            if (strobe.norm < 0.1) {
              strobe.norm = 0.0;
            }
          } else {
            strobe.norm = 0.0;
          }
          strobes[i] = strobe;
        }

        renderCanvas(t, canv, ctx, strobes, options.debugEnableDisplay);
      }
    }
  };

  React.useEffect(() => {
    requestAnimationFrame(onRefresh);
  }, [trigger]);

  React.useEffect(() => {
    last_strobes.current = [];
    requestAnimationFrame(onRefresh);
  }, [options, triggerExt]);

  return <>
    <canvas className="main-display" ref={canvas} width={window.innerWidth} height={window.innerHeight} />
  </>
}