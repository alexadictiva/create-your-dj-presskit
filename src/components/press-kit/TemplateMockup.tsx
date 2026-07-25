import placeholderDj from "@/src/assets/images/placeholder-dj.webp";
import type { TemplateId } from "../../types/press-kit";

type TemplateMockupProps = {
  template: TemplateId;
  compact?: boolean;
};

const placeholderDjSrc =
  typeof placeholderDj === "string" ? placeholderDj : placeholderDj.src;

export function TemplateMockup({ template, compact = false }: TemplateMockupProps) {
  return (
    <div
      className={`kit-mockup kit-${template} ${compact ? "compact" : ""}`}
      aria-hidden="true"
    >
      <div className="kit-noise" />
      <div className="kit-topline">
        <span>DJ / PRESS KIT</span>
        <span>2026</span>
      </div>
      <div className="kit-portrait">
        <img
          src={placeholderDjSrc}
          alt="Placeholder DJ"
          decoding="async"
        />
      </div>
      <div className="kit-title">NOVA</div>
      <div className="kit-subtitle">electronic artist · buenos aires</div>
      <div className="kit-copy">
        <b>PROFILE</b>
        <span>Hypnotic rhythms. Late-night energy. A sound built for the dancefloor.</span>
      </div>
      <div className="kit-stats">
        <span><b>42</b> SHOWS</span>
        <span><b>08</b> CITIES</span>
        <span><b>12K</b> PLAYS</span>
      </div>
      <div className="kit-bars"><i /><i /><i /><i /><i /><i /><i /></div>
    </div>
  );
}
