import React from "react";
import * as Tuner from "../tuner";
import { Number } from "./number";

export type TuningMode = 'just' | 'chromatic' | 'diamond';

export type T = {
  tuningMode: TuningMode;
  tuningReference: number;

  strobeMinimumRms: number;
  strobeMinimumNorm: number;
  strobeMaximumVariance: number;
  strobeDecay: number;

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
  tuningMode: 'chromatic',
  tuningReference: 440,

  strobeMinimumRms: 0.001,
  strobeMinimumNorm: 0.50,
  strobeMaximumVariance: 0.10,
  strobeDecay: 0.95,

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

export type Props = {
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
            <div className="level"><div className="level-item">tuning</div></div>

          <div className="field">
              <div className="control">
                <div className="radios">
                  <label className="radio">
                    <input type="radio" name="optionsTuningMode" onChange={e => { setOptions({ ...options, tuningMode: 'chromatic', tuningReference: 440 }) }} checked={options.tuningMode == 'chromatic'} />
                    chromatic
                  </label>
                  <label className="radio">
                    <input type="radio" name="optionsTuningMode" onChange={e => { setOptions({ ...options, tuningMode: 'just', tuningReference: 784 }) }} checked={options.tuningMode == 'just'} />
                    just intonation
                  </label>
                  <label className="radio">
                    <input type="radio" name="optionsTuningMode" onChange={e => { setOptions({ ...options, tuningMode: 'diamond', tuningReference: 784 }) }} checked={options.tuningMode == 'diamond'} />
                    diamond
                  </label>
                </div>
              </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="optionsTuningReference">
              {options.tuningMode == 'chromatic' ? 'a4 pitch' : 'unity pitch 1/1'}
            </label>
              <div className="control">
              <Number id="optionsTuningReference" value={options.tuningReference} onChangeRequired={v => setOptions({...options, tuningReference: v})} min={10} max={5000} step={1} key={options.tuningMode} />
              </div>
          </div>

            <div className="level"><div className="level-item">strobe triggering</div></div>

          <div className="field">
            <label className="label" htmlFor="optionsStrobeMinimumRms">
              trigger when rms exceeds
            </label>
              <div className="control">
              <Number id="optionsStrobeMinimumRms" value={options.strobeMinimumRms} onChangeRequired={v => setOptions({...options, strobeMinimumRms: v})} min={0} max={1} step={0.01} />
              </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="optionsStrobeMinimumNorm">
              trigger when norm exceeds
            </label>
              <div className="control">
              <Number id="optionsStrobeMinimumNorm" value={options.strobeMinimumNorm} onChangeRequired={v => setOptions({...options, strobeMinimumNorm: v})} min={0} max={1} step={0.01} />
              </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="optionsStrobeMaximumVariance">
              trigger when variance under
            </label>
              <div className="control">
              <Number id="optionsStrobeMaximumVariance" value={options.strobeMaximumVariance} onChangeRequired={v => setOptions({...options, strobeMaximumVariance: v})} min={0} max={1} step={0.01} />
              </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="optionsStrobeDecay">
              trigger decay rate
            </label>
              <div className="control">
              <Number id="optionsStrobeDecay" value={options.strobeDecay} onChangeRequired={v => setOptions({...options, strobeDecay: v})} min={0} max={1} step={0.01} />
              </div>
          </div>


            <div className="level"><div className="level-item">noise removal</div></div>

          <div className="field">
            <label className="label" htmlFor="optionsClipLimit">
              noise gate threshold
            </label>
              <div className="control">
              <Number id="optionsClipLimit" value={options.clipLimit} onChangeRequired={v => setOptions({...options, clipLimit: v})} min={0} max={1} step={0.01} />
              </div>
          </div>

            <div className="level"><div className="level-item">exponential moving averages</div></div>

          <div className="field">
            <label className="label" htmlFor="optionsEmaFilterRms">
              global rms filter
            </label>
              <div className="control">
              <Number id="optionsEmaFilterRms" value={options.emaFilterRms} onChangeRequired={v => setOptions({...options, emaFilterRms: v})} min={0} max={1} step={0.01} />
              </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="optionsEmaFilterNorm">
              per-harmonic norm filter
            </label>
              <div className="control">
              <Number id="optionsEmaFilterNorm" value={options.emaFilterNorm} onChangeRequired={v => setOptions({...options, emaFilterNorm: v})} min={0} max={1} step={0.01} />
              </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="optionsEmaFilterAngle">
              per-harmonic phase filter
            </label>
              <div className="control">
              <Number id="optionsEmaFilterAngle" value={options.emaFilterAngle} onChangeRequired={v => setOptions({...options, emaFilterAngle: v})} min={0} max={1} step={0.01} />
              </div>
          </div>

            <div className="level"><div className="level-item">spectrogram</div></div>

          <div className="field">
            <label className="label" htmlFor="optionsFftWindowSize">
              fourier transform window size
            </label>
              <div className="control">
      <div className="select">
        <select id="optionsFftWindowSize" value={options.fftWindowSize} onChange={e => setOptions({...options, fftWindowSize: parseInt(e.target.value)})}>
          <option>32</option> <option>64</option> <option>128</option> <option>256</option>
          <option>512</option> <option>1024</option> <option>2048</option> <option>4096</option>
          <option>8192</option> <option>16384</option> <option>32768</option>
        </select>
      </div>
      </div>
      </div>

          <div className="field">
            <label className="label" htmlFor="optionsFftSmoothing">
              smoothing over time
            </label>
              <div className="control">
              <Number id="optionsFftSmoothing" value={options.fftSmoothing} onChangeRequired={v => setOptions({...options, fftSmoothing: v})} min={0} max={1} step={0.01} />
              </div>
          </div>

            <div className="level"><div className="level-item">debug</div></div>

          <div className="field">
            <div className="control">
            <label className="checkbox"><input type="checkbox" checked={options.debugEnableDisplay} onChange={e => setOptions({...options, debugEnableDisplay: e.target.checked})} /> display debug information</label>
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="optionsDebugTestTone">
              generate test tone (cent offset)
            </label>
              <div className="control">
              <Number id="optionsDebugTestTone" placeholder="cents" value={options.debugTestToneCents} onChangeOptional={v => setOptions({...options, debugTestToneCents: v})} />
              </div>
          </div>


          </div>
        </div>
      </div>
    </div>
  );
}
