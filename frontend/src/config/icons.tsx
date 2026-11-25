import type { ReactNode } from "react";

const drawings = {
  brand: <><path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4" /></>,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  settings: <><path d="M4 7h6m4 0h6M4 17h10m4 0h2" /><circle cx="12" cy="7" r="2" /><circle cx="16" cy="17" r="2" /></>,
  effects: <path d="M3 12h3l3-6 4 12 3-6h5" />,
  fast: <path d="m5 6 7 6-7 6Zm8 0 7 6-7 6Z" />,
  reverb: <><path d="M4 9h3l3-3v12l-3-3H4Z" /><path d="M14 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12" /></>,
  bass: <path d="M4 19h16M5 15l4-4 4 4 6-8M16 7h3v3" />,
  headphones: <><path d="M3 15v-3a9 9 0 0 1 18 0v3" /><rect x="3" y="13" width="4" height="7" rx="2" /><rect x="17" y="13" width="4" height="7" rx="2" /></>,
  file: <path d="M13 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9m-6-6v6h6m-6-6 6 6M9 15h6m-3-3v6" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
  moon: <path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5a8.7 8.7 0 1 0 10.8 10.8Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></>,
  play: <path d="m9 5 11 7-11 7Z" fill="currentColor" />,
  pause: <><path d="M9 6v12m6-12v12" strokeWidth="2.5" /></>,
  lyrics: <><path d="M4 5h16M4 10h12M4 15h9m-9 5h8m5-4 3-1v5" /><ellipse cx="18" cy="20" rx="2" ry="1.5" /></>,
  music: <><path d="M9 18V6l11-2v12M9 9l11-2" /><ellipse cx="6" cy="18" rx="3" ry="2" /><ellipse cx="17" cy="16" rx="3" ry="2" /></>,
} satisfies Record<string, ReactNode>;

export function Icon({ name }: { name: keyof typeof drawings }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {drawings[name]}
    </svg>
  );
}
