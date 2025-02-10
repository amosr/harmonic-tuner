import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import { Options } from "../view/options";
import { Analysis } from "../view/analysis";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Tuner" },
    { name: "description", content: "Harmonic tuner" },
  ];
}

export default function Home() {
  return <>
    {/* <Welcome /> */}
    {/* <Options /> */}
    <Analysis />
  </>;
}
