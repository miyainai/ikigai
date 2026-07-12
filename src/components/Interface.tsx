import { regions, type RegionId } from "../data/regions";

interface InterfaceProps {
  selectedRegion: RegionId | null;
  onClear: () => void;
  onReset: () => void;
}

export function Interface({ selectedRegion, onClear, onReset }: InterfaceProps) {
  const region = regions.find((item) => item.id === selectedRegion);

  return (
    <div className="interface-layer" aria-label="Locus prototype">
      <a className="wordmark" href="/" aria-label="Locus home">
        Locus
      </a>

      <section className="statement" aria-labelledby="locus-title">
        <h1 id="locus-title">
          Find where your
          <span>energies meet.</span>
        </h1>
        <button type="button" className="begin-button" onClick={onReset}>
          Begin exploring
        </button>
      </section>

      <aside className={`focus-panel${region ? " is-visible" : ""}`} aria-hidden={!region}>
        {region ? (
          <>
            <button className="panel-close" type="button" onClick={onClear} aria-label="Return to Ikigai map">
              <span aria-hidden="true">←</span>
            </button>
            <p className="panel-index">Locus / 0{regions.indexOf(region) + 1}</p>
            <h2>{region.label}</h2>
            <p className="panel-copy">{region.description}</p>
          </>
        ) : null}
      </aside>

      <button className="center-button" type="button" onClick={onReset}>
        <span aria-hidden="true">◎</span> Center
      </button>
    </div>
  );
}
