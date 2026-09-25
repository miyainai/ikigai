import { VisualLab } from "./visual-lab/VisualLab";
import { IkigaiAlpha } from "./ikigai-alpha/IkigaiAlpha";
import { LandingExperience } from "./landing/LandingExperience";

export default function App() {
  if (window.location.pathname === "/ikigai-alpha") return <IkigaiAlpha />;
  if (window.location.pathname === "/visual-lab") return <VisualLab />;
  return <LandingExperience />;
}
