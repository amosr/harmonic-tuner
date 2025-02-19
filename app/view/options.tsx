import React from "react";
import * as Tuner from "../tuner";

type T = {
  debugTestToneCents: number | null;
  debugEnableDisplay: boolean;

  emaFilterNorm: number;
  emaFilterRms: number;
  emaFilterAngle: number;

  clipLimit: number;

  fftWindowSize: number;
  fftSmoothing: number;
}

export let defaultOptions: T = {
  debugTestToneCents: null,
  debugEnableDisplay: false,

  emaFilterNorm: 0.8,
  emaFilterRms: 0.8,
  emaFilterAngle: 0.8,

  clipLimit: 0.001,

  fftWindowSize: 4096,
  fftSmoothing: 0.8,
};

export function makeOptions(options: T): Tuner.Options {
  const o = Tuner.makeOptions();
  o.fftSize = options.fftWindowSize;
  o.fftSmoothing = options.fftSmoothing;
  o.worklet.clipLimit = options.clipLimit;
  o.worklet.filterAngle = options.emaFilterAngle;
  o.worklet.filterNorm = options.emaFilterNorm;
  o.worklet.filterRms = options.emaFilterRms;
  return o;
}

type Props = {
  options: T,
  setOptions: React.Dispatch<T>,
}

function tryParseFloat(v: string): number | null {
  const vf = parseFloat(v);
  if (isNaN(vf)) {
    return null;
  } else {
    return vf;
  }
}

export function Options({options, setOptions}: Props) {
  const [editing, setEditing] = React.useState(false);

  return (
    <div className="control settings">
      <div className={"dropdown" + (editing ? " is-active": "")}>
        <div className="dropdown-trigger">
          <a className="button" onClick={e => setEditing(!editing)}>
            <span className="icon">
              <i className="fas fa-solid fa-sliders"></i>
            </span>
            <span>
              settings
            </span>
          </a>
        </div>
        <div className="dropdown-menu">
          <div className="dropdown-content">

            <div className="level"><div className="level-item">spectrogram</div></div>

          <div className="field">
            <label className="label" htmlFor="optionsFftWindowSize">
              fourier transform window size
            </label>
              <div className="control">
      <div className="select">
        <select id="optionsFftWindowSize" value={options.fftWindowSize} onChange={e => setOptions({...options, fftWindowSize: parseInt(e.target.value)})}>
          <option>32</option>
          <option>64</option>
          <option>128</option>
          <option>256</option>
          <option>512</option>
          <option>1024</option>
          <option>2048</option>
          <option>4096</option>
          <option>8192</option>
          <option>16384</option>
          <option>32768</option>
        </select>
      </div>
      </div>
      </div>

          <div className="field">
            <label className="label" htmlFor="optionsFftSmoothing">
              smoothing over time [0,1]
            </label>
              <div className="control">
              <input id="optionsFftSmoothing" type="number" className="input" value={options.fftSmoothing.toString()} onChange={e => setOptions({...options, fftSmoothing: parseFloat(e.target.value)})} />
              </div>
          </div>

            <div className="level"><div className="level-item">debug</div></div>

          <div className="field">
            <label className="label" htmlFor="optionsDebugTestTone">
              generate test tone (cent offset)
            </label>
              <div className="control">
              <input id="optionsDebugTestTone" type="number" className="input" placeholder="test tone (cent offset)" value={options.debugTestToneCents?.toString() ?? ""} onChange={e => setOptions({...options, debugTestToneCents: tryParseFloat(e.target.value)})} />
              </div>
          </div>

          <div className="field">
            <div className="control">
            <label className="checkbox"><input type="checkbox" checked={options.debugEnableDisplay} onChange={e => setOptions({...options, debugEnableDisplay: e.target.checked})} /> display debug information</label>
            </div>
          </div>


          </div>
        </div>
      </div>
    </div>
  );
}
