import { ArrowLeft, ArrowRight, MousePointer2, RotateCcw, Trash2, X } from "lucide-react";
import { type CSSProperties, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@fontsource-variable/manrope";
import "@fontsource-variable/newsreader";
import { analyzeCenter } from "./centerAnalysis";
import { fieldConfigs, fieldsById } from "./fieldConfig";
import { IkigaiAlphaScene } from "./IkigaiAlphaScene";
import type { FieldId, Reflection } from "./types";
import { useLocalReflections } from "../backend/useLocalReflections";
import { StorageNotice } from "../backend/StorageNotice";
import { trackAction } from "../backend/activity";
import { DownloadReflection } from "../reflection-pdf/DownloadReflection";
import { ExerciseGuide } from "./ExerciseGuide";
import { nextUnexploredField } from "./nextField";
import { measureMobileViewport } from "./mobileViewport";
import { seedFromId, storageKey, legacyLoveKey } from "../backend/reflectionStorage";
import "./ikigai-alpha.css";

type FlightPoint = { x: number; y: number };
type SubmissionFlight = { id: string; label: string; fieldId: FieldId; start: FlightPoint; seedScaleY: number };

function submissionPath(start: FlightPoint, landing: FlightPoint) {
  const { x: landingX, y: landingY } = landing;
  const controlX = start.x + (landingX - start.x) * 0.48;
  const arcHeight = Math.min(185, Math.max(80, Math.abs(landingX - start.x) * 0.16 + 70));
  const controlY = Math.min(start.y, landingY) - arcHeight;
  return `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${landingX} ${landingY}`;
}

export function IkigaiAlpha() {
  const { reflections, setReflections, storageFailed, retrySave } = useLocalReflections();
  const [panelFieldId, setPanelFieldId] = useState<FieldId>("love");
  const [focusedFieldId, setFocusedFieldId] = useState<FieldId | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [labelsVisible, setLabelsVisible] = useState(false);
  const [label, setLabel] = useState("");
  const [labelError, setLabelError] = useState<string | null>(null);
  const [submissionFlight, setSubmissionFlight] = useState<SubmissionFlight | null>(null);
  const [flightLandingPoint, setFlightLandingPoint] = useState<FlightPoint | null>(null);
  const [pendingReflectionId, setPendingReflectionId] = useState<string | null>(null);
  const [pulseVersion, setPulseVersion] = useState(0);
  const [resetVersion, setResetVersion] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [escapeHintVisible, setEscapeHintVisible] = useState(false);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [clearConfirmation, setClearConfirmation] = useState<"field" | "map" | null>(null);
  const [justSavedFieldId, setJustSavedFieldId] = useState<FieldId | null>(null);
  const autoReturnFieldRef = useRef<FieldId | null>(null);
  const activeSubmissionRef = useRef<string | null>(null);
  const flightTimersRef = useRef<number[]>([]);
  const submissionStartTimerRef = useRef<number | null>(null);
  const flightStartTimeRef = useRef(0);
  const appRef = useRef<HTMLElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const stableViewportRef = useRef({ width: document.documentElement.clientWidth, height: window.innerHeight, keyboardInset: 0 });

  const config = fieldsById[panelFieldId];
  const fieldReflections = reflections[panelFieldId];
  const nextField = nextUnexploredField(reflections, panelFieldId);
  const overviewNextField = nextUnexploredField(reflections, justSavedFieldId);
  const selected = fieldReflections.find((reflection) => reflection.id === selectedId) ?? null;
  const preview = selected ?? fieldReflections.find((reflection) => reflection.id === hoveredId) ?? null;
  const analysis = useMemo(() => analyzeCenter(reflections), [reflections]);
  const comprehensive = analysis.insight.comprehensive;
  const earlyThemes = comprehensive.topThemes.filter((theme) => theme.evidence.some((item) => !item.inference)).slice(0, 3);
  const reflectionById = useMemo(() => new Map(Object.values(reflections).flat().map((reflection) => [reflection.id, reflection])), [reflections]);
  const evidenceReflections = selectedEvidenceIds.map((id) => reflectionById.get(id)).filter((reflection): reflection is Reflection => Boolean(reflection));
  const showCenterSummary = summaryOpen || focusedFieldId === null;
  // Keep each destination at its beginning, including after scrolling a mobile panel.
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [panelFieldId, showCenterSummary]);
  const viewedResults = useRef(false);
  const finishSubmission = useCallback(() => {
    if (!activeSubmissionRef.current) return;
    activeSubmissionRef.current = null;
    setPendingReflectionId(null);
    setSubmissionFlight(null);
    setFlightLandingPoint(null);
    const completedField = autoReturnFieldRef.current;
    autoReturnFieldRef.current = null;
    if (!completedField) return;
    setJustSavedFieldId(completedField);
    setFocusedFieldId(null);
    setSummaryOpen(true);
    setLabelsVisible(false);
    setHoveredId(null);
    setSelectedId(null);
    setClearConfirmation(null);
    setResetVersion((value) => value + 1);
  }, []);
  useEffect(() => {
    if (showCenterSummary && analysis.totalReflections > 0 && !viewedResults.current) {
      trackAction("results_viewed");
      viewedResults.current = true;
    }
    if (!showCenterSummary) viewedResults.current = false;
  }, [showCenterSummary, analysis.totalReflections]);

  useEffect(() => {
    if (!selected) return;
    setEditLabel(selected.label);
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
      const activeElement = document.activeElement;
      stableViewportRef.current = measureMobileViewport(stableViewportRef.current, {
        layoutWidth: document.documentElement.clientWidth,
        visibleWidth: viewport?.width ?? document.documentElement.clientWidth,
        layoutHeight: window.innerHeight,
        visibleHeight: viewport?.height ?? window.innerHeight,
        offsetTop: viewport?.offsetTop ?? 0,
        scale: viewport?.scale ?? 1,
        editing: activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement || (activeElement instanceof HTMLElement && activeElement.isContentEditable),
      });
      app.style.setProperty("--locus-stable-height", `${Math.round(stableViewportRef.current.height)}px`);
      app.style.setProperty("--locus-layout-width", `${Math.round(stableViewportRef.current.width)}px`);
      app.style.setProperty("--locus-keyboard-inset", `${Math.round(stableViewportRef.current.keyboardInset)}px`);
      if (!viewport || Math.abs(viewport.scale - 1) <= 0.02) {
        app.style.setProperty("--locus-viewport-top", `${Math.round(viewport?.offsetTop ?? 0)}px`);
      }
    };
    updateViewport();
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    window.addEventListener("pageshow", updateViewport);
    document.addEventListener("focusin", updateViewport);
    document.addEventListener("focusout", updateViewport);
    return () => {
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("pageshow", updateViewport);
      document.removeEventListener("focusin", updateViewport);
      document.removeEventListener("focusout", updateViewport);
    };
  }, []);

  useEffect(() => {
    if (!submissionFlight || !flightLandingPoint) return;
    flightTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    flightTimersRef.current = [
      window.setTimeout(() => setPulseVersion((value) => value + 1), 2840),
      window.setTimeout(() => {
        finishSubmission();
        flightTimersRef.current = [];
      }, 3400),
    ];
    return () => flightTimersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, [flightLandingPoint, submissionFlight, finishSubmission]);

  useEffect(() => {
    if (!submissionFlight) return;
    const timeout = window.setTimeout(() => {
      finishSubmission();
      setPulseVersion((value) => value + 1);
    }, 4200);
    return () => window.clearTimeout(timeout);
  }, [submissionFlight, finishSubmission]);

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
      autoReturnFieldRef.current = null;
      setJustSavedFieldId(null);
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
    autoReturnFieldRef.current = null;
    setJustSavedFieldId(null);
    trackAction("field_opened", fieldId);
    setPanelFieldId(fieldId);
    setFocusedFieldId(fieldId);
    setSummaryOpen(false);
    setLabel("");
    setLabelError(null);
    setHoveredId(null);
    setSelectedId(null);
    setClearConfirmation(null);
  };

  const returnToOverview = () => {
    autoReturnFieldRef.current = null;
    setJustSavedFieldId(null);
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
    if (!cleanLabel) {
      setLabelError("Add a few words before saving.");
      labelInputRef.current?.focus();
      return;
    }
    if (submissionFlight || pendingReflectionId) return;
    const destination = panelFieldId;
    const id = crypto.randomUUID();
    activeSubmissionRef.current = id;
    autoReturnFieldRef.current = destination;
    const reflection: Reflection = { id, fieldId: destination, label: cleanLabel, createdAt: Date.now(), positionSeed: seedFromId(id) };
    setReflections((current) => ({ ...current, [destination]: [...current[destination], reflection] }));
    trackAction("reflection_added", destination);
    setPendingReflectionId(id);
    setFlightLandingPoint(null);
    setLabel("");
    setLabelError(null);
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
      const sourceY = panel ? panel.top - appTop + (mobile ? 4 : panel.height * 0.57) : height * 0.48;
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
    trackAction("reflection_edited", panelFieldId);
    setReflections((current) => ({
      ...current,
      [panelFieldId]: current[panelFieldId].map((reflection) => reflection.id === selected.id ? { ...reflection, label: editLabel.trim() } : reflection),
    }));
  };

  const deleteSelected = () => {
    if (!selected) return;
    trackAction("reflection_deleted", panelFieldId);
    setReflections((current) => ({ ...current, [panelFieldId]: current[panelFieldId].filter((reflection) => reflection.id !== selected.id) }));
    setSelectedId(null);
    setHoveredId(null);
  };

  const clearField = () => {
    if (clearConfirmation !== "field") {
      setClearConfirmation("field");
      return;
    }
    try {
      localStorage.removeItem(storageKey(panelFieldId));
      if (panelFieldId === "love") localStorage.removeItem(legacyLoveKey);
    } catch { /* The current in-memory map can still be cleared. */ }
    setReflections((current) => ({ ...current, [panelFieldId]: [] }));
    trackAction("field_cleared", panelFieldId);
    setSelectedId(null);
    setHoveredId(null);
    setClearConfirmation(null);
  };

  const clearMap = () => {
    if (clearConfirmation !== "map") {
      setClearConfirmation("map");
      return;
    }
    try {
      fieldConfigs.forEach((field) => localStorage.removeItem(storageKey(field.id)));
      localStorage.removeItem(legacyLoveKey);
    } catch { /* The current in-memory map can still be cleared. */ }
    setReflections({ love: [], ability: [], meaning: [], paid: [] });
    setJustSavedFieldId(null);
    trackAction("map_cleared");
    setSelectedEvidenceIds([]);
    setClearConfirmation(null);
  };

  return (
    <main ref={appRef} className={`ikigai-alpha${dragging ? " is-dragging" : ""}${focusedFieldId ? " is-focused" : ""}`} style={{ "--active-field": config.color, "--active-halo": config.haloColor } as CSSProperties}>
      <div className="alpha-scene-region">
      <IkigaiAlphaScene
        reflections={reflections}
        analysis={analysis}
        pulseVersion={pulseVersion}
        resetVersion={resetVersion}
        focusedFieldId={focusedFieldId}
        guideActive={focusedFieldId === null}
        guidedFieldId={overviewNextField?.id ?? null}
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
      <div className="zoom-hint" aria-hidden="true">
        <span className="zoom-hint-desktop">Scroll to zoom</span>
        <span className="zoom-hint-mobile">Pinch to zoom</span>
      </div>
      <button className="alpha-reset" type="button" aria-label="Reset camera" title="Reset camera" onClick={() => setResetVersion((value) => value + 1)}><RotateCcw size={17} strokeWidth={1.5} /></button>
      {focusedFieldId ? <div className="overview-navigation"><button className="alpha-overview" type="button" onClick={returnToOverview}><ArrowLeft size={18} strokeWidth={1.7} />Back to overview</button><span>Press Esc to return</span></div> : null}
      {escapeHintVisible ? <div className="escape-hint">Press Esc anytime to return to your map.</div> : null}
      </div>
      {focusedFieldId === null ? (
        <section className="orbit-guide" aria-live="polite">
          <MousePointer2 className="orbit-guide-icon" size={19} strokeWidth={1.45} aria-hidden="true" />
          <div>
            <strong>{overviewNextField ? `Next: ${overviewNextField.emphasis.toLowerCase()}` : "Your first round is complete"}</strong>
            <p>{overviewNextField ? "Tap this orbit to continue." : "Tap any orbit to add or edit."}</p>
          </div>
        </section>
      ) : null}
      <aside ref={panelRef} className="love-panel">
        <StorageNotice storageFailed={storageFailed} retrySave={retrySave} />
        {showCenterSummary ? (
          <section className={`center-summary${analysis.totalReflections === 0 ? " is-starting" : ""}`}>
            <div className="reflection-heading"><span>Your evolving map</span>{focusedFieldId ? <button type="button" aria-label="Close summary" onClick={() => setSummaryOpen(false)}><X size={15} /></button> : null}</div>
            <h1>{analysis.totalReflections === 0 ? "Start your map" : "Your Ikigai"}</h1>
            {analysis.totalReflections === 0 ? <ExerciseGuide key="first-reflection" reflections={reflections} onChooseField={focusField} /> : <>
            <section className="next-field-guide" aria-label="Your next step">
              <p role="status">{justSavedFieldId ? `Reflection added to ${fieldsById[justSavedFieldId].emphasis.toLowerCase()}.` : `${comprehensive.progress.exploredFields} of 4 fields explored.`}</p>
              <h2>{overviewNextField ? `Next, ${overviewNextField.panelTitle.toLowerCase()}` : "Your first round is complete"}</h2>
              <p>{overviewNextField ? "Tap the highlighted orbit or open it below. You can return to any field to add or edit." : "Read your takeaways below and download your reflection. You can keep adding to any field."}</p>
              {overviewNextField ? <button type="button" onClick={() => focusField(overviewNextField.id)}>Open {overviewNextField.emphasis.toLowerCase()}<ArrowRight size={17} aria-hidden="true" /></button> : null}
            </section>
            <ExerciseGuide key="returning-reflections" reflections={reflections} onChooseField={focusField} />
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
            {analysis.totalReflections > 0 ? <DownloadReflection reflections={reflections} insight={analysis.insight} /> : null}
            </>}
            {Object.values(reflections).some((items) => items.length > 0) ? <div className="data-controls"><button type="button" className={clearConfirmation === "map" ? "is-confirming" : ""} onClick={clearMap}>{clearConfirmation === "map" ? "Confirm clear my map" : "Clear my map"}</button>{clearConfirmation === "map" ? <button type="button" onClick={() => setClearConfirmation(null)}>Cancel</button> : null}<small>Clears this browser's reflections and results.</small></div> : null}
          </section>
        ) : (
          <>
            <p className="panel-index">Reflection field / {config.emphasis}</p>
            <h1>{config.panelTitle}</h1>
            <p className="love-prompt">{config.prompt}</p>
            {!selected ? <p className="field-first-step">Add one example in a few words. After saving, you return to the map for the next field.</p> : null}
            {selected ? (
              <form className="reflection-editor" onSubmit={saveSelected}>
                <div className="reflection-heading"><span>Selected reflection</span><button type="button" aria-label="Close reflection" onClick={() => setSelectedId(null)}><X size={15} /></button></div>
                <label><span>A few words</span><input value={editLabel} maxLength={40} required onChange={(event) => setEditLabel(event.target.value)} /><small>{editLabel.length}/40</small></label>
                {selected.notes ? <div className="reflection-preview"><p>{selected.notes}</p></div> : null}
                <div className="reflection-actions"><button type="submit" disabled={!editLabel.trim()}><span>Save changes</span><ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" /></button><button className="delete-reflection" type="button" aria-label="Delete reflection" onClick={deleteSelected}><Trash2 size={15} /></button></div>
              </form>
            ) : (
              <>
                {preview ? <div className="reflection-preview" aria-live="polite"><span>{preview.label}</span>{preview.notes ? <p>{preview.notes}</p> : null}</div> : null}
                <form className="reflection-create" onSubmit={submit}>
                  <label><span>A few words</span><input ref={labelInputRef} value={label} maxLength={40} required aria-invalid={Boolean(labelError)} aria-describedby={labelError ? "reflection-label-error" : undefined} onChange={(event) => { setLabel(event.target.value); if (labelError) setLabelError(null); }} placeholder={config.inputPlaceholder} /><small>{label.length}/40</small>{labelError ? <em id="reflection-label-error" className="reflection-input-error">{labelError}</em> : null}</label>
                  <button type="submit" disabled={Boolean(submissionFlight || pendingReflectionId)}><span>{submissionFlight || pendingReflectionId ? "Placing reflection…" : "Save reflection"}</span><ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" /></button>
                </form>
              </>
            )}
            <p className="love-count" role="status">{fieldReflections.length} {fieldReflections.length === 1 ? "reflection" : "reflections"} {storageFailed ? "in this field" : "saved in this field"}</p>
            {!selected ? <nav className="field-next-actions" aria-label="Continue your reflection">
              <p>{fieldReflections.length ? "Tap a saved word to edit it. Add another, or keep exploring." : "Nothing comes to mind? Try another field."}</p>
              {nextField ? <button type="button" disabled={Boolean(pendingReflectionId)} onClick={() => focusField(nextField.id)}>Next: {nextField.panelTitle.toLowerCase()}<ArrowRight size={15} aria-hidden="true" /></button> : null}
              <button type="button" disabled={Boolean(pendingReflectionId)} onClick={returnToOverview}>View my map<ArrowRight size={15} aria-hidden="true" /></button>
            </nav> : null}
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
