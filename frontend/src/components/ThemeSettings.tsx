import { useRef } from "react";
import { Icon } from "../config/icons.tsx";
import { themeChoices, type ThemeChoice } from "../hooks/useTheme.ts";
import Overlay from "./Overlay.tsx";

const labels = { system: "System", light: "Light", dark: "Dark" };

export default function ThemeSettings({ choice, onChange }: { choice: ThemeChoice; onChange: (choice: ThemeChoice) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button className="icon-button settings-button" type="button" aria-label="Settings"
        aria-haspopup="dialog" aria-controls="settings" onClick={() => dialog.current?.showModal()}>
        <Icon name="settings" />
      </button>
      <Overlay dialogRef={dialog} id="settings" title="Settings">
        <fieldset className="theme-fieldset">
          <legend>Theme</legend>
          {themeChoices.map((value) => (
            <label key={value} className="theme-choice">
              <input type="radio" name="theme" checked={choice === value} onChange={() => onChange(value)} />
              {labels[value]}
            </label>
          ))}
        </fieldset>
      </Overlay>
    </>
  );
}
