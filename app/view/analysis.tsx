import React from "react";

import * as Tuner from "../tuner";
import { Harmonics } from "./harmonics";
import * as Options from "./options";
import * as Display from "./display";
import * as Note from "./note";

export function Analysis() {
  const pStatus = React.createRef<HTMLParagraphElement>();

  const [t, setT] = React.useState<Tuner.T | null>(null);
  const [trigger, setTrigger] = React.useState(false);
  const [note, setNote] = React.useState<number | null>(null);

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

    let testTone = null;
    if (note && options.debugTestToneCents !== null) {
      testTone = note * Math.pow(Math.pow(2, 1/1200), options.debugTestToneCents);
    }

    if (note) {
      Tuner.setStrobeFreqs(tt, note, harmonics, testTone);
    }

    setTrigger(!trigger);
  };

  React.useEffect(() => {
    if (t) {
      onUpdate();
      setConnecting(false);
    }
  }, [t, harmonics, options, note]);

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
        <Note.Note options={options} setNote={setNote} />
        <Harmonics harmonics={harmonics} setHarmonics={h => {
          setHarmonics(h);
        }} />
        <Options.Options options={options} setOptions={setOptions} />
      </div>

      <div className="status-row">
        <div className="columns">
          <div className="status-text">
            <p ref={pStatus} className={t ? "" : "status-disabled"}>-</p>
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
      setStatusText={t => {if (pStatus.current && pStatus.current.firstChild) pStatus.current.firstChild.nodeValue = t}}
      />
  </>);
}
