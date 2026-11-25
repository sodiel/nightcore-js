import { useRef } from "react";
import { Icon } from "../config/icons.tsx";
import { extraModes, type Preset } from "../config/modes.ts";
import Overlay from "./Overlay.tsx";

interface Props {
  preset: Preset;
  onPreset: (preset: Preset) => void;
}

export default function ExtraEffects({ preset, onPreset }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const selected = extraModes.find((effect) => effect.value === preset);

  function open(button: HTMLButtonElement) {
    if (window.matchMedia("(max-width: 767px)").matches) {
      dialog.current?.showModal();
      return;
    }
    const panel = popover.current;
    if (!panel) return;
    const rect = button.getBoundingClientRect();
    panel.style.setProperty("--effects-top", `${rect.bottom + 8}px`);
    panel.style.setProperty("--effects-right", `${window.innerWidth - rect.right}px`);
    panel.togglePopover();
  }

  function select(next: Preset) {
    onPreset(next);
    if (dialog.current?.open) dialog.current.close();
    if (popover.current?.matches(":popover-open")) popover.current.hidePopover();
  }

  const choices = () => (
    <div className="effects-group" role="group" aria-label="Audio effects">
      {extraModes.map((effect) => (
        <button type="button" className="effect-choice" key={effect.value}
          aria-pressed={effect.value === preset} onClick={() => select(effect.value)}>
          <Icon name={effect.icon} />
          <span><strong>{effect.label}</strong><small>{effect.description}</small></span>
        </button>
      ))}
    </div>
  );

  return (
    <>
      <button className="button effects-trigger" type="button" data-selected={Boolean(selected)}
        aria-haspopup="dialog" aria-label={selected ? `Effects, ${selected.label} selected` : "Effects"}
        onClick={(event) => open(event.currentTarget)}>
        <Icon name="effects" /><span>{selected?.label ?? "Effects"}</span>
      </button>
      <Overlay dialogRef={dialog} id="extra-effects" title="Effects">{choices()}</Overlay>
      <div className="effects-popover" ref={popover} popover="auto" role="dialog" aria-labelledby="effects-popover-title">
        <h2 id="effects-popover-title">Effects</h2>
        {choices()}
      </div>
    </>
  );
}
