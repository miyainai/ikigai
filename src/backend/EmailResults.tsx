import { useEffect, useRef, useState } from "react";
import { Mail } from "lucide-react";
import { validEmail } from "./emailValidation";

type Turnstile = {
  render(element: HTMLElement, options: Record<string, unknown>): string;
  remove(id: string): void;
  reset(id: string): void;
};
declare global { interface Window { turnstile?: Turnstile } }

export function EmailResults({ saved }: { saved: boolean }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string>();
  const enabled = import.meta.env.VITE_RESULTS_EMAIL_ENABLED === "true";
  const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (!open || !enabled || !sitekey) return;
    let disposed = false;
    const mount = () => {
      if (disposed || !container.current || !window.turnstile) return;
      widget.current = window.turnstile.render(container.current, {
        sitekey, action: "email-results", theme: "dark",
        callback: (value: string) => setToken(value),
        "expired-callback": () => setToken(""),
        "error-callback": () => { setToken(""); setMessage("Verification unavailable. Please reopen this form and try again."); },
      });
    };
    let script = document.querySelector<HTMLScriptElement>("script[data-locus-turnstile]");
    if (window.turnstile) mount();
    else {
      if (!script) {
        script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.dataset.locusTurnstile = "true";
        document.head.appendChild(script);
      }
      script.addEventListener("load", mount);
    }
    return () => {
      disposed = true;
      script?.removeEventListener("load", mount);
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = undefined;
      setToken("");
    };
  }, [open, enabled, sitekey]);
  if (!enabled || !sitekey) return null;
  return <section className="email-results">
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}><Mail size={16} />Email me my results</button>
    {open ? <form onSubmit={async (event) => {
      event.preventDefault();
      if (!saved || busy || !token || !validEmail(email.trim())) return;
      setBusy(true); setMessage("");
      try {
        const { supabase } = await import("./supabase");
        const { data, error } = await supabase.functions.invoke("email-results", { body: { email: email.trim(), captchaToken: token } });
        if (error || !data?.accepted) throw new Error("send-failed");
        setMessage("Your results are on their way. Check your inbox and spam folder.");
        setEmail("");
      } catch { setMessage("Could not send. Please wait a few minutes and try again. Your map is still saved."); }
      finally {
        setBusy(false); setToken("");
        if (widget.current) window.turnstile?.reset(widget.current);
      }
    }}>
      <label>Your email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} /></label>
      <p>One email with your takeaway and next step. No account or mailing list. Private reflection notes are not included. Delivery uses Resend; bot verification uses Cloudflare.</p>
      <div ref={container} />
      <button type="submit" disabled={busy || !saved || !token || !validEmail(email.trim())}>{busy ? "Sending..." : saved ? "Send my results" : "Waiting for cloud save..."}</button>
      <p role="status">{message}</p>
    </form> : null}
  </section>;
}
