import type { Route } from "./+types/home";
import { Analysis } from "../view/analysis";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Tuner" },
    { name: "description", content: "Harmonic tuner" },
  ];
}

export default function Home() {
  return <>
    <Analysis />
  </>;
}
