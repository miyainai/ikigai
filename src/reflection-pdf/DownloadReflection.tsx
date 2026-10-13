import { Download } from "lucide-react";
import { useState } from "react";
import { trackAction } from "../backend/activity";
import type { FieldReflections, LocalIkigaiInsight } from "../ikigai-alpha/types";

export function DownloadReflection({ reflections, insight }: { reflections: FieldReflections; insight: LocalIkigaiInsight }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return <div className="reflection-download">
    <button type="button" disabled={busy} onClick={async () => {
      if (busy) return;
      setBusy(true); setError(false);
      try {
        const { downloadReflectionPdf } = await import("./download");
        await downloadReflectionPdf(reflections, insight);
        trackAction("pdf_generated");
      } catch { setError(true); }
      finally { setBusy(false); }
    }}><Download size={18} strokeWidth={1.5} aria-hidden="true" />{busy ? "Preparing your journal..." : "Download my reflection"}</button>
    {error ? <p role="alert">The PDF could not be created. Your map is safe. Please try again.</p> : null}
    <span className="sr-only" role="status">{busy ? "Preparing PDF" : ""}</span>
  </div>;
}
