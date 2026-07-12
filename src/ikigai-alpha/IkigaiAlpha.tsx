import { ArrowLeft, RotateCcw, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { IkigaiAlphaScene } from "./IkigaiAlphaScene";
import type { LoveReflection } from "./types";
import "./ikigai-alpha.css";

const STORAGE_KEY = "locus-love-reflections-v1";

function loadReflections(): LoveReflection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-24) : [];
  } catch {
    return [];
  }
}

export function IkigaiAlpha() {
  const [reflections, setReflections] = useState<LoveReflection[]>(loadReflections);
  const [thought, setThought] = useState("");
  const [label, setLabel] = useState("");
  const [flyingLabel, setFlyingLabel] = useState<string | null>(null);
  const [pulseVersion, setPulseVersion] = useState(0);
  const [resetVersion, setResetVersion] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [loveFocused, setLoveFocused] = useState(false);
  const [loveLabelsVisible, setLoveLabelsVisible] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editThought, setEditThought] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const timeoutRef = useRef<number | null>(null);

  const selected = reflections.find((reflection) => reflection.id === selectedId) ?? null;
  const preview = selected ?? reflections.find((reflection) => reflection.id === hoveredId) ?? null;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reflections));
  }, [reflections]);

  useEffect(() => {
    if (!selected) return;
    setEditThought(selected.thought);
    setEditLabel(selected.label);
  }, [selected]);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !loveFocused) return;
      setLoveFocused(false);
      setHoveredId(null);
      setSelectedId(null);
      setResetVersion((value) => value + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loveFocused]);

  useEffect(() => {
    if (!loveFocused) {
      setLoveLabelsVisible(false);
      return;
    }
    const timeout = window.setTimeout(() => setLoveLabelsVisible(true), 850);
    return () => window.clearTimeout(timeout);
  }, [loveFocused]);

  const returnToOverview = () => {
    setLoveFocused(false);
    setLoveLabelsVisible(false);
    setHoveredId(null);
    setSelectedId(null);
    setResetVersion((value) => value + 1);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const cleanThought = thought.trim();
    const cleanLabel = label.trim();
    if (!cleanThought || !cleanLabel || flyingLabel) return;
    setFlyingLabel(cleanLabel);
    setThought("");
    setLabel("");
    timeoutRef.current = window.setTimeout(() => {
      const reflection: LoveReflection = {
        id: crypto.randomUUID(),
        label: cleanLabel,
        thought: cleanThought,
        createdAt: Date.now(),
      };
      setReflections((current) => [...current, reflection]);
      setFlyingLabel(null);
      setPulseVersion((value) => value + 1);
    }, 820);
  };

  const saveSelected = (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !editThought.trim() || !editLabel.trim()) return;
    setReflections((current) =>
      current.map((reflection) =>
        reflection.id === selected.id
          ? { ...reflection, label: editLabel.trim(), thought: editThought.trim() }
          : reflection,
      ),
    );
  };

  const deleteSelected = () => {
    if (!selected) return;
    setReflections((current) => current.filter((reflection) => reflection.id !== selected.id));
    setSelectedId(null);
    setHoveredId(null);
  };

  return (
    <main className={`ikigai-alpha${dragging ? " is-dragging" : ""}`}>
      <IkigaiAlphaScene
        reflections={reflections}
        pulseVersion={pulseVersion}
        resetVersion={resetVersion}
        loveFocused={loveFocused}
        loveLabelsVisible={loveLabelsVisible}
        selectedId={selectedId}
        onHover={setHoveredId}
        onSelect={setSelectedId}
        onFocusLove={() => setLoveFocused(true)}
        onDraggingChange={setDragging}
      />
      <div className="alpha-brand">Locus / Ikigai Alpha</div>
      <button
        className="alpha-reset"
        type="button"
        aria-label="Reset camera"
        title="Reset camera"
        onClick={() => setResetVersion((value) => value + 1)}
      >
        <RotateCcw size={17} strokeWidth={1.5} />
      </button>
      {loveFocused ? (
        <button className="alpha-overview" type="button" onClick={returnToOverview}>
          <ArrowLeft size={15} strokeWidth={1.5} />
          Overview
        </button>
      ) : null}
      <aside className="love-panel">
        <p className="panel-index">Locus / Love</p>
        <h1>What you love</h1>
        <p className="love-prompt">What experiences make you lose track of time?</p>
        {selected ? (
          <form className="reflection-editor" onSubmit={saveSelected}>
            <div className="reflection-heading">
              <span>Selected reflection</span>
              <button type="button" aria-label="Close reflection" onClick={() => setSelectedId(null)}>
                <X size={15} />
              </button>
            </div>
            <label>
              <span>Your thought</span>
              <textarea value={editThought} maxLength={180} onChange={(event) => setEditThought(event.target.value)} />
              <small>{editThought.length}/180</small>
            </label>
            <label>
              <span>Floating label</span>
              <input value={editLabel} maxLength={28} onChange={(event) => setEditLabel(event.target.value)} />
              <small>{editLabel.length}/28</small>
            </label>
            <div className="reflection-actions">
              <button type="submit" disabled={!editThought.trim() || !editLabel.trim()}>Save</button>
              <button className="delete-reflection" type="button" aria-label="Delete reflection" onClick={deleteSelected}>
                <Trash2 size={15} />
              </button>
            </div>
          </form>
        ) : (
          <>
            {preview ? (
              <div className="reflection-preview" aria-live="polite">
                <span>{preview.label}</span>
                <p>{preview.thought}</p>
              </div>
            ) : null}
            <form onSubmit={submit}>
              <label>
                <span>Your thought</span>
                <textarea value={thought} maxLength={180} onChange={(event) => setThought(event.target.value)} placeholder="Describe the moment, activity, or experience." />
                <small>{thought.length}/180</small>
              </label>
              <label>
                <span>Floating label</span>
                <input value={label} maxLength={28} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Making things" />
                <small>{label.length}/28</small>
              </label>
              <button type="submit" disabled={!thought.trim() || !label.trim() || Boolean(flyingLabel)}>Add</button>
            </form>
          </>
        )}
        <p className="love-count">{reflections.length} {reflections.length === 1 ? "reflection" : "reflections"}</p>
      </aside>
      {flyingLabel ? <div className="flying-seed">{flyingLabel}</div> : null}
    </main>
  );
}
