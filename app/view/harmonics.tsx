import React from "react";

export type Props = {
  harmonics: number[],
  setHarmonics: React.Dispatch<number[]>
}

const choices = [1,2,3,4,5,6,7,8,9,10];

export function Harmonics({harmonics, setHarmonics}: Props) {
  const txt = harmonics.length > 3 ?
    ([harmonics[0], harmonics[1], harmonics[2]].join(" ") + "…") :
    harmonics.join(" ");

  const [editing, setEditing] = React.useState(false);

  let editor = <>
    {choices.map(h =>
      <label className="dropdown-item" key={h}>
            <input type="checkbox" checked={harmonics.includes(h)} onChange={e => {
              let hh = choices.filter(hx => (h == hx) ? e.target.checked : harmonics.includes(hx));
              setHarmonics(hh);
            }} /> {h}
        </label>
    )}
    </>;

  return (
  <div className="control harmonics">
    <div className={"dropdown" + (editing ? " is-active": "")}>
      <div className="dropdown-trigger">
        <a className="button" onClick={e => setEditing(!editing)}>
          <span className="icon">
            <i className="fas fa-solid fa-wave-square"></i>
          </span>
          <span>
            harmonics
          </span>
          <span className="current">
            {txt}
          </span>
        </a>
      </div>
      <div className="dropdown-menu">
        <div className="dropdown-content">
          {editor}
        </div>
      </div>
    </div>
  </div>
  )
}