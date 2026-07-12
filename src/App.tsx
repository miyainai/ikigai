import { useEffect, useState } from "react";
import { Interface } from "./components/Interface";
import { LocusScene } from "./components/LocusScene";
import type { RegionId } from "./data/regions";
import { VisualLab } from "./visual-lab/VisualLab";
import { IkigaiAlpha } from "./ikigai-alpha/IkigaiAlpha";

export default function App() {
  if (window.location.pathname === "/ikigai-alpha") return <IkigaiAlpha />;
  return window.location.pathname === "/visual-lab" ? <VisualLab /> : <ProductionApp />;
}

function ProductionApp() {
  const [hoveredRegion, setHoveredRegion] = useState<RegionId | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionId | null>(null);
  const [resetVersion, setResetVersion] = useState(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedRegion(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const clearSelection = () => {
    setSelectedRegion(null);
    setHoveredRegion(null);
  };

  const resetMap = () => {
    clearSelection();
    setResetVersion((version) => version + 1);
  };

  return (
    <main className="app-shell">
      <LocusScene
        hoveredRegion={hoveredRegion}
        selectedRegion={selectedRegion}
        onHover={setHoveredRegion}
        onSelect={(region) => {
          setSelectedRegion(region);
          setHoveredRegion(null);
        }}
        onClear={clearSelection}
        resetVersion={resetVersion}
      />
      <Interface selectedRegion={selectedRegion} onClear={clearSelection} onReset={resetMap} />
    </main>
  );
}
