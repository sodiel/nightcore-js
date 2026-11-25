import { useState } from "react";
import { Icon } from "../config/icons.tsx";
import { modes, type Preset } from "../config/modes.ts";

interface Props {
  preset: Preset;
  onPreset: (preset: Preset) => void;
}

export default function ModePicker({ preset, onPreset }: Props) {
  const [hideTip, setHideTip] = useState(false);

  return (
    <div className="mode-picker">
      <div className="mode-group" role="group" aria-label="Playback mode">
        {modes.map((mode) => (
          <div className="mode-option" key={mode.value}
            onMouseLeave={() => setHideTip(false)} onBlur={() => setHideTip(false)}
            onKeyDown={(event) => { if (event.key === "Escape") setHideTip(true); }}>
            <button className="button mode-button" type="button"
              aria-pressed={preset === mode.value} aria-describedby={`tip-${mode.value}`}
              onClick={() => onPreset(mode.value)}>
              <Icon name={mode.icon} />
              <span>{mode.label}</span>
            </button>
            <span id={`tip-${mode.value}`} className="mode-tooltip" role="tooltip" data-dismissed={hideTip}>
              {mode.description}
            </span>
          </div>
        ))}
      </div>
      <details className="mode-help" onKeyDown={(event) => {
        if (event.key === "Escape") event.currentTarget.open = false;
      }}>
        <summary className="icon-button" aria-label="About playback modes"><Icon name="info" /></summary>
        <div className="help-panel">
          {modes.map((mode) => <p key={mode.value}><strong>{mode.label}</strong><br />{mode.description}</p>)}
        </div>
      </details>
    </div>
  );
}
