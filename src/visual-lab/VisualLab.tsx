import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { LabScene } from "./LabScene";
import { defaultLabParameters, type LabParameters } from "./types";
import "./visual-lab.css";

type NumericKey = keyof LabParameters;

const controls: Array<{ key: NumericKey; label: string; min: number; max: number; step: number }> = [
  { key: "planetPrimaryFrequency", label: "Planet primary freq", min: 0.45, max: 1.8, step: 0.01 },
  { key: "planetPrimaryAmplitude", label: "Planet primary amp", min: 0.02, max: 0.3, step: 0.01 },
  { key: "planetSecondaryFrequency", label: "Planet secondary freq", min: 0.8, max: 3, step: 0.01 },
  { key: "planetSecondaryAmplitude", label: "Planet secondary amp", min: 0, max: 0.12, step: 0.005 },
  { key: "planetSpeed", label: "Planet speed", min: 0.02, max: 0.4, step: 0.01 },
  { key: "planetShellOpacity", label: "Planet shell", min: 0.1, max: 0.9, step: 0.01 },
  { key: "planetShellTint", label: "Planet shell tint", min: 0, max: 1.2, step: 0.01 },
  { key: "planetTransmission", label: "Planet transmission", min: 0, max: 1, step: 0.01 },
  { key: "planetCoreScale", label: "Planet core scale", min: 0.4, max: 0.9, step: 0.01 },
  { key: "planetCoreDarkness", label: "Planet core dark", min: 0.4, max: 1, step: 0.01 },
  { key: "planetCoreOpacity", label: "Planet core opacity", min: 0.2, max: 1, step: 0.01 },
  { key: "planetCoreDeformation", label: "Planet core form", min: 0, max: 0.2, step: 0.005 },
  { key: "planetEnergyStrength", label: "Planet energy", min: 0, max: 1.5, step: 0.01 },
  { key: "planetEnergyRegionCount", label: "Planet energy regions", min: 2, max: 4, step: 1 },
  { key: "planetEnergyScale", label: "Planet energy scale", min: 0.08, max: 0.28, step: 0.01 },
  { key: "planetEnergySpeed", label: "Planet energy speed", min: 0.02, max: 0.5, step: 0.01 },
  { key: "planetEnergyColorBalance", label: "Planet cyan balance", min: 0, max: 1, step: 0.01 },
  { key: "planetFresnelStrength", label: "Planet fresnel", min: 0, max: 1.5, step: 0.01 },
  { key: "planetRimColorBalance", label: "Planet rim balance", min: 0, max: 1, step: 0.01 },
  { key: "planetHaloIntensity", label: "Planet halo", min: 0, max: 1, step: 0.01 },
  { key: "orbitRadius", label: "Orbit radius", min: 0.8, max: 2.1, step: 0.01 },
  { key: "orbitDepth", label: "Orbit depth", min: 0.15, max: 1.1, step: 0.01 },
  { key: "orbitTiltX", label: "Orbit tilt X", min: -0.8, max: 0.8, step: 0.01 },
  { key: "orbitTiltY", label: "Orbit tilt Y", min: -0.8, max: 0.8, step: 0.01 },
  { key: "orbitCoreOpacity", label: "Orbit core", min: 0.05, max: 1, step: 0.01 },
  { key: "orbitGlowOpacity", label: "Orbit glow", min: 0, max: 0.25, step: 0.005 },
  { key: "nearBrightness", label: "Orbit near", min: 0.2, max: 1.5, step: 0.01 },
  { key: "farBrightness", label: "Orbit rear", min: 0.02, max: 0.8, step: 0.01 },
  { key: "orbitFadeVariation", label: "Orbit variation", min: 0, max: 0.8, step: 0.01 },
  { key: "orbitEnergyPointIntensity", label: "Orbit points", min: 0, max: 1.5, step: 0.01 },
  { key: "orbitCoreWidth", label: "Orbit core width", min: 0.001, max: 0.009, step: 0.0005 },
  { key: "orbitGlowWidth", label: "Orbit glow width", min: 0.004, max: 0.03, step: 0.001 },
  { key: "orbitFadeSmoothness", label: "Orbit fade smooth", min: 0.1, max: 1, step: 0.01 },
  { key: "centerScale", label: "Center scale", min: 0.6, max: 1.3, step: 0.01 },
  { key: "centerLobeFrequency", label: "Center lobe freq", min: 0.35, max: 1.5, step: 0.01 },
  { key: "centerLobeAmplitude", label: "Center lobe amp", min: 0.03, max: 0.35, step: 0.01 },
  { key: "centerSecondaryAmplitude", label: "Center secondary", min: 0, max: 0.14, step: 0.005 },
  { key: "centerShellOpacity", label: "Center shell", min: 0.1, max: 0.9, step: 0.01 },
  { key: "centerCoreDarkness", label: "Center core dark", min: 0.4, max: 1, step: 0.01 },
  { key: "centerEnergyStrength", label: "Center energy", min: 0, max: 1.5, step: 0.01 },
  { key: "centerRegionSeparation", label: "Center region spacing", min: 0.05, max: 0.42, step: 0.01 },
  { key: "centerCyanIntensity", label: "Center cyan", min: 0, max: 1.5, step: 0.01 },
  { key: "centerVioletIntensity", label: "Center violet", min: 0, max: 1.5, step: 0.01 },
  { key: "centerShellThickness", label: "Center shell thickness", min: 0.04, max: 0.4, step: 0.01 },
  { key: "centerHaloSize", label: "Center halo size", min: 1, max: 1.35, step: 0.01 },
  { key: "centerHaloIntensity", label: "Center halo light", min: 0, max: 1, step: 0.01 },
  { key: "fov", label: "FOV", min: 28, max: 44, step: 1 },
  { key: "cameraDistance", label: "Camera distance", min: 5, max: 8, step: 0.1 },
  { key: "exposure", label: "Exposure", min: 0.6, max: 1.4, step: 0.01 },
  { key: "bloom", label: "Bloom", min: 0, max: 0.8, step: 0.01 },
  { key: "backgroundHaze", label: "Haze", min: 0, max: 1, step: 0.01 },
];

export function VisualLab() {
  const [parameters, setParameters] = useState(() => {
    const query = new URLSearchParams(window.location.search);
    return {
      ...defaultLabParameters,
      bloom: query.get("bloom") === "0" ? 0 : defaultLabParameters.bloom,
      backgroundHaze: query.has("haze") ? Number(query.get("haze")) : defaultLabParameters.backgroundHaze,
    };
  });
  const [resetVersion, setResetVersion] = useState(0);
  const [controlsOpen, setControlsOpen] = useState(false);

  const setParameter = (key: NumericKey, value: number) => {
    setParameters((current) => ({ ...current, [key]: value }));
  };

  return (
    <main className="visual-lab">
      <LabScene parameters={parameters} resetVersion={resetVersion} />
      <div className="lab-mark">Locus / Visual Lab</div>
      <div className="lab-actions">
        <button type="button" title="Reset camera" aria-label="Reset camera" onClick={() => setResetVersion((value) => value + 1)}>
          <RotateCcw size={17} strokeWidth={1.5} />
        </button>
        <button type="button" title="Toggle parameters" aria-label="Toggle parameters" onClick={() => setControlsOpen((value) => !value)}>
          <SlidersHorizontal size={17} strokeWidth={1.5} />
        </button>
      </div>
      <div className="lab-hint">Drag to rotate · Scroll to zoom</div>
      {controlsOpen ? (
        <aside className="lab-controls" aria-label="Visual Lab parameters">
          <header><span>Parameters</span><button type="button" onClick={() => setParameters(defaultLabParameters)}>Reset</button></header>
          {controls.map((control) => (
            <label key={control.key}>
              <span>{control.label}</span><output>{parameters[control.key].toFixed(2)}</output>
              <input type="range" min={control.min} max={control.max} step={control.step} value={parameters[control.key]} onChange={(event) => setParameter(control.key, Number(event.target.value))} />
            </label>
          ))}
        </aside>
      ) : null}
    </main>
  );
}
