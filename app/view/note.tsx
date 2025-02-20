import React from "react";
import * as Options from "./options";
import { Number } from "./number";

export type Props = {
  options: Options.T,
  setNote?: React.Dispatch<number | null>
}

type NoteFreq = { type: 'freq', freq: number }
type NoteChromatic = { type: 'chromatic', note: number, octave: number }
type NoteJust = { type: 'just', num: number, den: number, octave: number }
type N = NoteFreq | NoteChromatic | NoteJust

function fixed3(n: number): number {
  return Math.round(n * 100) / 100;
}

function freqOfN(n: N, options: Options.T): number {
  if (n.type == 'freq') {
    return n.freq;
  } else if (n.type == 'chromatic') {
    let nn = n.octave * 12 + n.note;
    nn = nn - (5*12);
    return fixed3(Math.pow(2, 1/12 * nn) * options.tuningReference);
  } else if (n.type == 'just') {
    return fixed3((n.num / n.den) * options.tuningReference * Math.pow(2, n.octave));
  }
  return n; //?
}

export function Note({options, setNote}: Props) {
  const [n, setNX] = React.useState<N|null>(null);
  // hmm, hack, refresh freq
  const [freqKey, setFreqKey] = React.useState<number>(0);
  const [justKey, setJustKey] = React.useState<number>(0);

  const setN = (n: N | null) => {
    setNX(n);
    if (n && n.type != 'freq')
      setFreqKey(freqKey + 1);
    if (n && n.type != 'just')
      setJustKey(justKey + 1);
    if (setNote)
      setNote(n ? freqOfN(n, options) : null);
  }

  React.useEffect(() => {
    setN(n);
  }, [options])

  const setFreq = (freq: number | null) => {
    if (freq)
      setN({type: 'freq', freq: freq });
    else
      setN(null);
  }

  const octaveRef = React.createRef<HTMLSelectElement>();

  const chrNoteRef = React.createRef<HTMLSelectElement>();

  const setChromatic = () => {
    if (!chrNoteRef.current || !octaveRef.current)
      return;

    let octave = 4;
    if (octaveRef.current.value !== "")
      octave = parseInt(octaveRef.current.value);
    let note = null;

    if (chrNoteRef.current.value !== "")
      note = {type: 'chromatic' as const, note: parseInt(chrNoteRef.current.value), octave: octave };

    setN(note);
  }

  const justNumRef = React.createRef<HTMLInputElement>();
  const justDenRef = React.createRef<HTMLInputElement>();

  const setJust = () => {
    if (!justNumRef.current || !justDenRef.current || !octaveRef.current)
      return;

    let num = 1;
    let den = 1;
    let octave = 4;

    if (justNumRef.current.value !== "")
      num = parseInt(justNumRef.current.value);

    if (justDenRef.current.value !== "")
      den = parseInt(justDenRef.current.value);

    if (octaveRef.current.value !== "")
      octave = parseInt(octaveRef.current.value);

    let note = {type: 'just' as const, num: num, den: den, octave: octave};
    setN(note);
  }

  const setOctave = () => {
    if (options.tuningMode == 'just')
      setJust();
    else if (options.tuningMode == 'chromatic')
      setChromatic();
  }

  return <>
    <div className="field has-addons is-expanded control note-select">
      <div className="control has-icons-left is-expanded">
        <Number min={10} max={5000} placeholder="receptive frequency (hz)" className="input is-large" onChangeOptional={setFreq} value={n ? freqOfN(n, options) : null } key={freqKey} />
        <span className="icon is-left">
          <i className="fas fa-solid fa-music"></i>
        </span>
      </div>
      <div className={options.tuningMode == 'just' ? 'control' : 'is-hidden'}>
        <Number min={1} placeholder="num" className="input is-large just" value={n && n.type == 'just' ? n.num : null } key={justKey} onChangeOptional={setJust} ref={justNumRef} />
      </div>
      <div className={options.tuningMode == 'just' ? 'control' : 'is-hidden'}>
        <div className="button is-large is-static">
          <span className="icon is-left">
            <i className="fas fa-solid fa-divide"></i>
          </span>
        </div>
      </div>
      <div className={options.tuningMode == 'just' ? 'control' : 'is-hidden'}>
        <Number min={1} placeholder="den" className="input is-large just" value={n && n.type == 'just' ? n.den : null } key={justKey} onChangeOptional={setJust} ref={justDenRef} />
      </div>
      <div className={options.tuningMode == 'chromatic' ? 'control' : 'is-hidden'}>
        <div className="select is-large">
        <select ref={chrNoteRef} value={n && n.type == 'chromatic' ? n.note.toString() : ""} onChange={setChromatic}>
          <option value="">-</option>
          <option value="3">c</option>
          <option value="4">c#</option>
          <option value="5">d</option>
          <option value="6">d#</option>
          <option value="7">e</option>
          <option value="8">f</option>
          <option value="9">f#</option>
          <option value="10">g</option>
          <option value="11">g#</option>
          <option value="12">a</option>
          <option value="13">a#</option>
          <option value="14">b</option>
        </select>
        </div>
      </div>
      <div className="control">
        <div className="button is-large is-static">
          {/* <span className="icon is-left">
            <i className="fas fa-solid fa-8"></i>
          </span> */}
          8<sup>ve</sup>
        </div>
      </div>
      <div className="control">
        <div className="select is-large">
          <select ref={octaveRef} value={n && (n.type == 'chromatic' || n.type == 'just') ? n.octave.toString() : "0"} onChange={setOctave}>
            {options.tuningMode == 'just' ?
              <>
                <option value="-3">-3</option>
                <option value="-2">-2</option>
                <option value="-1">-1</option>
                <option value="0">0</option>
              </>
              : null
            }
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            {options.tuningMode == 'chromatic' ?
              <>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
              </>
              : null
            }
        </select>
        </div>
      </div>
    </div>
  </>
}