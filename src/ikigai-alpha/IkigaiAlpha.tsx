import { ArrowLeft, ArrowRight, MousePointer2, RotateCcw, Trash2, X } from "lucide-react";
import { type CSSProperties, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@fontsource-variable/manrope";
import "@fontsource-variable/newsreader";
import { analyzeCenter } from "./centerAnalysis";
import { fieldConfigs, fieldsById } from "./fieldConfig";
import { IkigaiAlphaScene } from "./IkigaiAlphaScene";
import type { FieldId, FieldReflections, Reflection } from "./types";
import "./ikigai-alpha.css";

const storageKey = (fieldId: FieldId) => `locus-reflections-${fieldId}-v1`;
const legacyLoveKey = "locus-love-reflections-v1";
type FlightPoint = { x: number; y: number };
type SubmissionFlight = { id: string; label: string; fieldId: FieldId; start: FlightPoint; seedScaleY: number };

function seedFromId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function submissionPath(start: FlightPoint, landing: FlightPoint) {
  const { x: landingX, y: landingY } = landing;
  const controlX = start.x + (landingX - start.x) * 0.48;
  const arcHeight = Math.min(185, Math.max(80, Math.abs(landingX - start.x) * 0.16 + 70));
  const controlY = Math.min(start.y, landingY) - arcHeight;
  return `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${landingX} ${landingY}`;
}

function migrateReflection(value: unknown, fieldId: FieldId): Reflection | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const id = typeof source.id === "string" ? source.id : crypto.randomUUID();
  const labelSource = source.label ?? source.displayLabel;
  const notesSource = source.notes ?? source.fullText ?? source.thought;
  if (typeof labelSource !== "string" || !labelSource.trim()) return null;
  return {
    id,
    fieldId,
    label: labelSource.trim().slice(0, 40),
    notes: typeof notesSource === "string" && notesSource.trim() ? notesSource.trim().slice(0, 600) : undefined,
    createdAt: typeof source.createdAt === "number" ? source.createdAt : Date.now(),
    positionSeed: typeof source.positionSeed === "number" ? Math.abs(source.positionSeed % 1) : seedFromId(id),
  };
}

function loadField(fieldId: FieldId): Reflection[] {
  try {
    const raw = localStorage.getItem(storageKey(fieldId)) ?? (fieldId === "love" ? localStorage.getItem(legacyLoveKey) : null);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((value) => migrateReflection(value, fieldId)).filter((value): value is Reflection => value !== null).slice(-24) : [];
  } catch {
    return [];
  }
}

function loadReflections(): FieldReflections {
  return {
    love: loadField("love"),
    ability: loadField("ability"),
    meaning: loadField("meaning"),
    paid: loadField("paid"),
  };
}

export function IkigaiAlpha() {
  const [reflections, setReflections] = useState<FieldReflections>(loadReflections);
  const [panelFieldId, setPanelFieldId] = useState<FieldId>("love");
  const [focusedFieldId, setFocusedFieldId] = useState<FieldId | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [labelsVisible, setLabelsVisible] = useState(false);
  const [label, setLabel] = useState("");
  const [labelError, setLabelError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submissionFlight, setSubmissionFlight] = useState<SubmissionFlight | null>(null);
  const [flightLandingPoint, setFlightLandingPoint] = useState<FlightPoint | null>(null);
  const [pendingReflectionId, setPendingReflectionId] = useState<string | null>(null);
  const [pulseVersion, setPulseVersion] = useState(0);
  const [resetVersion, setResetVersion] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [escapeHintVisible, setEscapeHintVisible] = useState(false);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [clearConfirmation, setClearConfirmation] = useState<"field" | "map" | null>(null);
  const flightTimersRef = useRef<number[]>([]);
  const submissionStartTimerRef = useRef<number | null>(null);
  const flightStartTimeRef = useRef(0);
  const appRef = useRef<HTMLElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const stableViewportRef = useRef({ width: window.innerWidth, height: window.innerHeight });

  const config = fieldsById[panelFieldId];
  const fieldReflections = reflections[panelFieldId];
  const selected = fieldReflections.find((reflection) => reflection.id === selectedId) ?? null;
  const preview = selected ?? fieldReflections.find((reflection) => reflection.id === hoveredId) ?? null;
  const analysis = useMemo(() => analyzeCenter(reflections), [reflections]);
  const comprehensive = analysis.insight.comprehensive;
  const earlyThemes = comprehensive.topThemes.filter((theme) => theme.evidence.some((item) => !item.inference)).slice(0, 3);
  const reflectionById = useMemo(() => new Map(Object.values(reflections).flat().map((reflection) => [reflection.id, reflection])), [reflections]);
  const evidenceReflections = selectedEvidenceIds.map((id) => reflectionById.get(id)).filter((reflection): reflection is Reflection => Boolean(reflection));
  const showCenterSummary = summaryOpen || focusedFieldId === null;

  useEffect(() => {
    fieldConfigs.forEach((field) => {
      if (reflections[field.id].length) localStorage.setItem(storageKey(field.id), JSON.stringify(reflections[field.id]));
      else localStorage.removeItem(storageKey(field.id));
    });
  }, [reflections]);

  useEffect(() => {
    if (!selected) return;
    setEditLabel(selected.label);
    setEditNotes(selected.notes ?? "");
  }, [selected]);

  useEffect(() => () => {
    flightTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    if (submissionStartTimerRef.current !== null) window.clearTimeout(submissionStartTimerRef.current);
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    const updateViewport = () => {
      const app = appRef.current;
      if (!app) return;
      const visibleHeight = viewport?.height ?? window.innerHeight;
      const visibleWidth = viewport?.width ?? window.innerWidth;
      const orientationChanged = Math.abs(visibleWidth - stableViewportRef.current.width) > 80;
      const heightLoss = stableViewportRef.current.height - visibleHeight - (viewport?.offsetTop ?? 0);
      if (orientationChanged || heightLoss < 100) {
        stableViewportRef.current = { width: visibleWidth, height: Math.max(window.innerHeight, visibleHeight) };
      }
      const keyboardInset = Math.max(0, stableViewportRef.current.height - visibleHeight - (viewport?.offsetTop ?? 0));
      app.style.setProperty("--locus-stable-height", `${Math.round(stableViewportRef.current.height)}px`);
      app.style.setProperty("--locus-keyboard-inset", `${Math.round(keyboardInset > 100 ? keyboardInset : 0)}px`);
    };
    updateViewport();
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    return () => {
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  useEffect(() => {
    if (!submissionFlight || !flightLandingPoint) return;
    flightTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    flightTimersRef.current = [
      window.setTimeout(() => setPulseVersion((value) => value + 1), 2840),
      window.setTimeout(() => {
        setPendingReflectionId(null);
        setSubmissionFlight(null);
        setFlightLandingPoint(null);
        flightTimersRef.current = [];
      }, 3060),
    ];
    return () => flightTimersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, [flightLandingPoint, submissionFlight]);

  useEffect(() => {
    if (!submissionFlight) return;
    const timeout = window.setTimeout(() => {
      setPendingReflectionId(null);
      setSubmissionFlight(null);
      setFlightLandingPoint(null);
      setPulseVersion((value) => value + 1);
    }, 4200);
    return () => window.clearTimeout(timeout);
  }, [submissionFlight]);

  const trackPendingScreenPosition = useCallback((x: number, y: number) => {
    if (!submissionFlight) return;
    const app = appRef.current?.getBoundingClientRect();
    if (!app) return;
    const next = {
      x: (x - app.left) / Math.max(app.width, 1) * 1000,
      y: (y - app.top) / Math.max(app.height, 1) * 720,
    };
    setFlightLandingPoint((current) => {
      if (current && performance.now() - flightStartTimeRef.current > 520) return current;
      if (current && Math.abs(current.x - next.x) < 0.6 && Math.abs(current.y - next.y) < 0.6) return current;
      return next;
    });
  }, [submissionFlight]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing || event.keyCode === 229 || focusedFieldId === null) return;
      setFocusedFieldId(null);
      setSummaryOpen(true);
      setHoveredId(null);
      setSelectedId(null);
      setResetVersion((value) => value + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusedFieldId]);

  useEffect(() => {
    if (!focusedFieldId || sessionStorage.getItem("locus-escape-hint-seen") === "true") return;
    sessionStorage.setItem("locus-escape-hint-seen", "true");
    setEscapeHintVisible(true);
    const timeout = window.setTimeout(() => setEscapeHintVisible(false), 3600);
    return () => window.clearTimeout(timeout);
  }, [focusedFieldId]);

  useEffect(() => {
    if (!focusedFieldId) {
      setLabelsVisible(false);
      return;
    }
    const timeout = window.setTimeout(() => setLabelsVisible(true), 850);
    return () => window.clearTimeout(timeout);
  }, [focusedFieldId]);

  const focusField = (fieldId: FieldId) => {
    setPanelFieldId(fieldId);
    setFocusedFieldId(fieldId);
    setSummaryOpen(false);
    setLabel("");
    setLabelError(null);
    setNotes("");
    setHoveredId(null);
    setSelectedId(null);
    setClearConfirmation(null);
  };

  const returnToOverview = () => {
    setFocusedFieldId(null);
    setSummaryOpen(true);
    setLabelsVisible(false);
    setHoveredId(null);
    setSelectedId(null);
    setClearConfirmation(null);
    setResetVersion((value) => value + 1);
  };

  const openSummary = () => {
    setSummaryOpen(true);
    setSelectedEvidenceIds(comprehensive.recurringThemes[0]?.evidenceReflectionIds ?? earlyThemes[0]?.evidence.map((item) => item.reflectionId) ?? []);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const cleanLabel = label.trim();
    const cleanNotes = notes.trim();
    if (!cleanLabel) {
      setLabelError("Add a few words before saving.");
      labelInputRef.current?.focus();
      return;
    }
    if (submissionFlight || pendingReflectionId) return;
    const destination = panelFieldId;
    const id = crypto.randomUUID();
    const reflection: Reflection = { id, fieldId: destination, label: cleanLabel, notes: cleanNotes || undefined, createdAt: Date.now(), positionSeed: seedFromId(id) };
    setReflections((current) => ({ ...current, [destination]: [...current[destination], reflection] }));
    setPendingReflectionId(id);
    setFlightLandingPoint(null);
    setLabel("");
    setLabelError(null);
    setNotes("");
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    submissionStartTimerRef.current = window.setTimeout(() => {
      const app = appRef.current?.getBoundingClientRect();
      const panel = panelRef.current?.getBoundingClientRect();
      const width = Math.max(app?.width ?? window.innerWidth, 1);
      const height = Math.max(app?.height ?? window.innerHeight, 1);
      const appLeft = app?.left ?? 0;
      const appTop = app?.top ?? 0;
      const mobile = width <= 800;
      const sourceX = mobile ? width * 0.5 : panel ? panel.left - appLeft + 4 : width * 0.72;
      const sourceY = mobile ? height * 0.48 + 4 : panel ? panel.top - appTop + panel.height * 0.57 : height * 0.57;
      flightStartTimeRef.current = performance.now();
      setSubmissionFlight({
        id,
        label: cleanLabel,
        fieldId: destination,
        seedScaleY: Math.max(0.3, Math.min(1.6, (width * 720) / (height * 1000))),
        start: {
          x: sourceX / width * 1000,
          y: sourceY / height * 720,
        },
      });
      submissionStartTimerRef.current = null;
    }, 260);
  };

  const saveSelected = (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !editLabel.trim()) return;
    setReflections((current) => ({
      ...current,
      [panelFieldId]: current[panelFieldId].map((reflection) => reflection.id === selected.id ? { ...reflection, label: editLabel.trim(), notes: editNotes.trim() || undefined } : reflection),
    }));
  };

  const deleteSelected = () => {
    if (!selected) return;
    setReflections((current) => ({ ...current, [panelFieldId]: current[panelFieldId].filter((reflection) => reflection.id !== selected.id) }));
    setSelectedId(null);
    setHoveredId(null);
  };

  const clearField = () => {
    if (clearConfirmation !== "field") {
      setClearConfirmation("field");
      return;
    }
    localStorage.removeItem(storageKey(panelFieldId));
    if (panelFieldId === "love") localStorage.removeItem(legacyLoveKey);
    setReflections((current) => ({ ...current, [panelFieldId]: [] }));
    setSelectedId(null);
    setHoveredId(null);
    setClearConfirmation(null);
  };

  const clearMap = () => {
    if (clearConfirmation !== "map") {
      setClearConfirmation("map");
      return;
    }
    fieldConfigs.forEach((field) => localStorage.removeItem(storageKey(field.id)));
    localStorage.removeItem(legacyLoveKey);
    setReflections({ love: [], ability: [], meaning: [], paid: [] });
    setSelectedEvidenceIds([]);
    setClearConfirmation(null);
  };

  return (
    <main ref={appRef} className={`ikigai-alpha${dragging ? " is-dragging" : ""}${focusedFieldId ? " is-focused" : ""}`} style={{ "--active-field": config.color, "--active-halo": config.haloColor } as CSSProperties}>
      <IkigaiAlphaScene
        reflections={reflections}
        analysis={analysis}
        pulseVersion={pulseVersion}
        resetVersion={resetVersion}
        focusedFieldId={focusedFieldId}
        guideActive={focusedFieldId === null}
        labelsVisible={labelsVisible}
        selectedNodeId={selectedId}
        onHover={setHoveredId}
        onSelectNode={setSelectedId}
        onFocusField={focusField}
        onSelectCenter={openSummary}
        onDraggingChange={setDragging}
        pendingReflectionId={pendingReflectionId}
        onPendingScreenPosition={trackPendingScreenPosition}
      />
      <div className="alpha-brand">Locus / Ikigai Alpha</div>
      {focusedFieldId === null ? (
        <section className="orbit-guide" aria-live="polite">
          <MousePointer2 className="orbit-guide-icon" size={19} strokeWidth={1.45} aria-hidden="true" />
          <div>
            <strong>{analysis.totalReflections > 0 ? "Return to any orbit" : "Choose an orbit to begin"}</strong>
            <p>{analysis.totalReflections > 0 ? "Tap a field to add, review, or edit reflections." : "Tap any field to add your first reflection."}</p>
          </div>
        </section>
      ) : null}
      <div className="zoom-hint" aria-hidden="true">
        <span className="zoom-hint-desktop">Scroll to zoom</span>
        <span className="zoom-hint-mobile">Pinch to zoom</span>
      </div>
      <button className="alpha-reset" type="button" aria-label="Reset camera" title="Reset camera" onClick={() => setResetVersion((value) => value + 1)}><RotateCcw size={17} strokeWidth={1.5} /></button>
      {focusedFieldId ? <div className="overview-navigation"><button className="alpha-overview" type="button" onClick={returnToOverview}><ArrowLeft size={18} strokeWidth={1.7} />Back to overview</button><span>Press Esc to return</span></div> : null}
      {escapeHintVisible ? <div className="escape-hint">Press Esc anytime to return to your map.</div> : null}
      <aside ref={panelRef} className="love-panel">
        {showCenterSummary ? (
          <section className="center-summary">
            <div className="reflection-heading"><span>Your evolving map</span>{focusedFieldId ? <button type="button" aria-label="Close summary" onClick={() => setSummaryOpen(false)}><X size={15} /></button> : null}</div>
            <h1>Your Ikigai</h1>
            <div className="insight-status"><span>Map status</span><strong>{analysis.insight.status}</strong></div>
            <p className="insight-reason">{comprehensive.readiness.reason}</p>
            <div className="insight-progress" aria-label={`${comprehensive.progress.exploredFields} of 4 fields explored with ${comprehensive.progress.totalReflections} reflections`}>
              <span>{comprehensive.progress.exploredFields} of {comprehensive.progress.totalFields} fields explored</span>
              <span>{comprehensive.progress.totalReflections} {comprehensive.progress.totalReflections === 1 ? "reflection" : "reflections"}</span>
            </div>
            {comprehensive.recurringThemes.length ? (
              <div className="insight-section"><span>What keeps returning</span><div className="insight-buttons">{comprehensive.recurringThemes.slice(0, 4).map((theme) => <button type="button" key={theme.title} onClick={() => setSelectedEvidenceIds(theme.evidenceReflectionIds)}><strong>{theme.title}</strong><small>{theme.explanation}</small></button>)}</div></div>
            ) : earlyThemes.length ? (
              <div className="insight-section"><span>Signals visible so far</span><div className="insight-buttons">{earlyThemes.map((theme) => <button type="button" key={theme.id} onClick={() => setSelectedEvidenceIds([...new Set(theme.evidence.map((item) => item.reflectionId))])}><strong>{theme.label}</strong><small>{theme.fields.map((fieldId) => fieldsById[fieldId].emphasis).join(" / ")} · not recurring yet</small></button>)}</div></div>
            ) : (
              <div className="summary-themes"><span>Signals visible so far</span><p>Your first concrete reflection will give the map something to work with.</p></div>
            )}
            <div className="insight-takeaway"><span>Takeaway so far</span><strong>{comprehensive.takeaway.title}</strong><p>{comprehensive.takeaway.explanation}</p>{comprehensive.takeaway.evidenceReflectionIds.length ? <button type="button" onClick={() => setSelectedEvidenceIds(comprehensive.takeaway.evidenceReflectionIds)}>See the reflections behind this</button> : null}</div>
            <div className="insight-next-step"><span>Explore next</span><strong>{comprehensive.nextStep.title}</strong><p>{comprehensive.nextStep.prompt}</p>{comprehensive.nextStep.fieldId ? <button type="button" onClick={() => focusField(comprehensive.nextStep.fieldId as FieldId)}>Open this field <ArrowRight size={14} strokeWidth={1.5} /></button> : null}</div>
            {evidenceReflections.length ? <div className="insight-section evidence-section"><span>Evidence behind the insight</span>{evidenceReflections.map((reflection) => <blockquote key={reflection.id}><strong>{reflection.label}</strong>{reflection.notes ? <p>{reflection.notes}</p> : null}</blockquote>)}</div> : null}
            {Object.values(reflections).some((items) => items.length > 0) ? <div className="data-controls"><button type="button" className={clearConfirmation === "map" ? "is-confirming" : ""} onClick={clearMap}>{clearConfirmation === "map" ? "Confirm clear my map" : "Clear my map"}</button>{clearConfirmation === "map" ? <button type="button" onClick={() => setClearConfirmation(null)}>Cancel</button> : null}<small>Stored only in this browser.</small></div> : null}
          </section>
        ) : (
          <>
            <p className="panel-index">Reflection field / {config.emphasis}</p>
            <h1>{config.panelTitle}</h1>
            <p className="love-prompt">{config.prompt}</p>
            {selected ? (
              <form className="reflection-editor" onSubmit={saveSelected}>
                <div className="reflection-heading"><span>Selected reflection</span><button type="button" aria-label="Close reflection" onClick={() => setSelectedId(null)}><X size={15} /></button></div>
                <label><span>A few words</span><input value={editLabel} maxLength={40} required onChange={(event) => setEditLabel(event.target.value)} /><small>{editLabel.length}/40</small></label>
                <label><span>Notes <i>optional</i></span><textarea value={editNotes} maxLength={600} onChange={(event) => setEditNotes(event.target.value)} /><small>{editNotes.length}/600</small></label>
                <div className="reflection-actions"><button type="submit" disabled={!editLabel.trim()}><span>Save changes</span><ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" /></button><button className="delete-reflection" type="button" aria-label="Delete reflection" onClick={deleteSelected}><Trash2 size={15} /></button></div>
              </form>
            ) : (
              <>
                {preview ? <div className="reflection-preview" aria-live="polite"><span>{preview.label}</span>{preview.notes ? <p>{preview.notes}</p> : null}</div> : null}
                <form className="reflection-create" onSubmit={submit}>
                  <label><span>A few words</span><input ref={labelInputRef} value={label} maxLength={40} required aria-invalid={Boolean(labelError)} aria-describedby={labelError ? "reflection-label-error" : undefined} onChange={(event) => { setLabel(event.target.value); if (labelError) setLabelError(null); }} placeholder={config.inputPlaceholder} /><small>{label.length}/40</small>{labelError ? <em id="reflection-label-error" className="reflection-input-error">{labelError}</em> : null}</label>
                  <label><span>Notes <i>optional</i></span><textarea value={notes} maxLength={600} onChange={(event) => setNotes(event.target.value)} placeholder="A memory, detail, or context worth keeping…" /><small>{notes.length}/600</small></label>
                  <button type="submit" disabled={Boolean(submissionFlight || pendingReflectionId)}><span>{submissionFlight || pendingReflectionId ? "Placing reflection…" : "Place in orbit"}</span><ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" /></button>
                </form>
              </>
            )}
            <p className="love-count">{fieldReflections.length} {fieldReflections.length === 1 ? "reflection" : "reflections"}</p>
            {fieldReflections.length ? <div className="data-controls field-data-controls"><button type="button" className={clearConfirmation === "field" ? "is-confirming" : ""} onClick={clearField}>{clearConfirmation === "field" ? `Confirm clear ${config.emphasis.toLowerCase()}` : "Clear this field"}</button>{clearConfirmation === "field" ? <button type="button" onClick={() => setClearConfirmation(null)}>Cancel</button> : null}</div> : null}
          </>
        )}
      </aside>
      {submissionFlight && flightLandingPoint ? <div className="submission-flight" style={{ "--seed-color": fieldsById[submissionFlight.fieldId].color, "--seed-halo": fieldsById[submissionFlight.fieldId].haloColor } as CSSProperties}>
        <div className="submission-echo">{submissionFlight.label}<span className="dissolve-particles">{Array.from({length:9},(_,index)=><i key={index}/>)}</span></div>
        <svg className="seed-trajectory" viewBox="0 0 1000 720" preserveAspectRatio="none" aria-hidden="true">
          <defs><filter id="seed-glow"><feGaussianBlur stdDeviation="3.2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          <path className="seed-guide" d={submissionPath(submissionFlight.start, flightLandingPoint)}/>
          <g className="thought-seed-svg" filter="url(#seed-glow)">
            <g transform={`scale(1 ${submissionFlight.seedScaleY})`}>
              <circle className="thought-seed-halo" r="8"/>
              <circle className="thought-seed-core" r="3.4"/>
            </g>
            <animateMotion dur="2.4s" begin="0.62s" path={submissionPath(submissionFlight.start, flightLandingPoint)} keyTimes="0;1" keySplines="0.22 0.52 0.32 1" calcMode="spline" fill="freeze"/>
          </g>
        </svg>
      </div> : null}
    </main>
  );
}
