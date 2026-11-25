import type { ReactNode, RefObject } from "react";
import { Icon } from "../config/icons.tsx";

interface Props {
  dialogRef: RefObject<HTMLDialogElement | null>;
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}

export default function Overlay({ dialogRef, id, title, children, className = "" }: Props) {
  return (
    <dialog ref={dialogRef} id={id} className={`overlay ${className}`} aria-labelledby={`${id}-title`}
      onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      <div className="overlay-content">
        <div className="overlay-heading">
          <h2 id={`${id}-title`}>{title}</h2>
          <button className="icon-button" type="button" aria-label={`Close ${title.toLowerCase()}`}
            onClick={() => dialogRef.current?.close()}><Icon name="close" /></button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
