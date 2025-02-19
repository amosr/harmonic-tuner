import React from "react";

import * as Tuner from "../tuner";
import { Harmonics } from "./harmonics";
import * as Options from "./options";
import * as Display from "./display";

export function Analysis() {
  // const [textStatus, setTextStatus] = React.useState("");

  const pStatus = React.createRef<HTMLParagraphElement>();

  const [t, setT] = React.useState<Tuner.T | null>(null);
  const [trigger, setTrigger] = React.useState(false);
  const txtReceptFreq = React.createRef<HTMLInputElement>();

  const [options, setOptions] = React.useState(Options.defaultOptions);

  const [harmonics, setHarmonics] = React.useState<number[]>([1, 4, 10]);
  const [connecting, setConnecting] = React.useState(false);

  const onUpdate = async () => {
    let tt = t;
    const opt = Options.makeOptions(options);
    if (!tt) {
      if (connecting)
        return;
      setConnecting(true);
      tt = await Tuner.init(opt);
      setT(tt);
      return;
    }

    tt.options = opt;

    let receptFreq = null;
    let receptFreqTxt = txtReceptFreq.current?.value;
    if (receptFreqTxt) {
      receptFreq = parseFloat(receptFreqTxt);
    }

    let testTone = null;
    if (receptFreq && options.debugTestToneCents !== null) {
      testTone = receptFreq * Math.pow(Math.pow(2, 1/1200), options.debugTestToneCents);
    }

    if (receptFreq) {
      Tuner.setStrobeFreqs(tt, receptFreq, harmonics, testTone);
    }

    setTrigger(!trigger);
  };

  React.useEffect(() => {
    if (t) {
      onUpdate();
      setConnecting(false);
    }
  }, [t, harmonics, options]);

  const onConnect = async () => {
    if (t) {
      Tuner.close(t);
      setT(null);
    } else {
      onUpdate();
    }
  };

  return (<>
    <div className="overlay">
      <div className="field is-grouped">
        <div className="control has-icons-left is-expanded">
          <input type="number" min="10" max="5000" className="input is-large" placeholder="receptive frequency (hz)" ref={txtReceptFreq} onChange={() => onUpdate()} />
          <span className="icon is-left">
            <i className="fas fa-solid fa-music"></i>
          </span>
        </div>
        <Harmonics harmonics={harmonics} setHarmonics={h => {
          setHarmonics(h);
        }} />
        <Options.Options options={options} setOptions={setOptions} />
      </div>

      <div className="status-row">
        <div className="columns">
          <div className="status-text">
            {t ? <p ref={pStatus} /> : <p>-</p>}
          </div>
        <div className="status-connect">
          <a className={"button" + (connecting ? " is-loading": "") + (t ? " is-connected" : "")} onClick={onConnect}>
            <span className="icon">
              <i className={"fas fa-solid" + (t ? " fa-microphone" : " fa-microphone-slash")}></i>
            </span>
            <span>
              { t ? "connected" : "disconnected" }
            </span>
          </a>
        </div>
        </div>
      </div>
    </div>

    <Display.Display t={t} options={options} triggerExt={trigger}
    // try to avoid re-rendering all inputs every frame, so don't trigger a local state change
      setStatusText={t => {if (pStatus.current) pStatus.current.nodeValue = t}}
      />
  </>);
}
