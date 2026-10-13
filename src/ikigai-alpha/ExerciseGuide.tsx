import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { fieldConfigs } from "./fieldConfig";
import type { FieldId, FieldReflections } from "./types";

const steps = [
  ["Choose a field", "Start with what you love, or whichever feels easiest."],
  ["Add a real example", "A few words are enough. Save one thought at a time."],
  ["Try the other fields", "After saving, you return to the map. Follow the next highlighted field."],
  ["Take something with you", "Review your map for themes and a next step, then download your reflection."],
];

export function ExerciseGuide({ reflections, onChooseField }: { reflections: FieldReflections; onChooseField: (field: FieldId) => void }) {
  const isEmpty = fieldConfigs.every((field) => reflections[field.id].length === 0);
  const [expanded, setExpanded] = useState(isEmpty);
  return <section className="exercise-guide" aria-label="Reflection guide">
    {isEmpty ? <>
      <p className="exercise-purpose"><strong>The purpose</strong>Notice what matters to you, the strengths you bring, and a direction worth exploring. No perfect answer needed.</p>
      <button type="button" className="exercise-start" onClick={() => onChooseField("love")}>Start with what you love <ArrowRight size={17} aria-hidden="true" /></button>
    </> : null}
    <button type="button" className="exercise-guide-toggle" aria-expanded={expanded} aria-controls="exercise-steps" onClick={() => setExpanded(!expanded)}>
      {isEmpty ? "Four small steps" : "How this exercise works"}<ChevronDown size={15} aria-hidden="true" />
    </button>
    {expanded ? <ol id="exercise-steps" className="exercise-steps">{steps.map(([title, detail]) => <li key={title}><strong>{title}</strong><span>{detail}</span></li>)}</ol> : null}
    {isEmpty || expanded ? <nav className="exercise-fields" aria-label="Choose a reflection field">
      <p>{isEmpty ? "Or begin somewhere else" : "Return to a field to add or edit"}</p>
      {fieldConfigs.map((field) => <button type="button" key={field.id} onClick={() => onChooseField(field.id)} style={{ "--guide-field": field.color } as CSSProperties}>
        <span>{field.panelTitle}</span>
        <small>{reflections[field.id].length ? `${reflections[field.id].length} saved` : "Not yet explored"}</small>
        {reflections[field.id].length ? <Check size={14} aria-hidden="true" /> : <ArrowRight size={14} aria-hidden="true" />}
      </button>)}
    </nav> : null}
  </section>;
}
