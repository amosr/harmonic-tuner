import React from "react";

type Props = {
  min?: number,
  max?: number,
  step?: number,
  value?: number | null,
  onChangeOptional?: React.Dispatch<number | null>
  onChangeRequired?: React.Dispatch<number>
  id?: string,
  placeholder?: string
  className?: string
  ref?: React.RefObject<HTMLInputElement | null>
}

function tryParseFloat(v: string): number | null {
  const vf = parseFloat(v);
  if (isNaN(vf)) {
    return null;
  } else {
    return vf;
  }
}

export function Number(props: Props) {
  const [v, setV] = React.useState(props.value?.toString() ?? "");

  const onChange = (vv: string) => {
    setV(vv);
    const vf = tryParseFloat(vv);
    if (props.onChangeOptional)
      props.onChangeOptional(vf);
    if (props.onChangeRequired && vf !== null)
      props.onChangeRequired(vf);
  }

  return <>
      <input id={props.id} type="number" className={props.className ?? "input"} value={v} onChange={e => onChange(e.target.value)} min={props.min} max={props.max} step={props.step} placeholder={props.placeholder} ref={props.ref} />
    </>;
}