import type { ReactNode } from "react";

// Material Symbols Outlined by Google, Apache-2.0.
function materialSymbol(path: string) {
  return <path d={path} transform="translate(0 24) scale(0.025)" fill="currentColor" stroke="none" />;
}

const drawings = {
  brand: <><path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4" /></>,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  settings: <><path d="M4 7h6m4 0h6M4 17h10m4 0h2" /><circle cx="12" cy="7" r="2" /><circle cx="16" cy="17" r="2" /></>,
  fast: <path d="m5 6 7 6-7 6Zm8 0 7 6-7 6Z" />,
  spatial_audio: materialSymbol("M920-559q-72 0-138-27.5T665-665q-51-51-78.5-117T559-920h80q0 57 21 108t61 91q40 40 91 61.5T920-638v79Zm0-159q-41 0-77.5-15T777-777q-29-29-44-65.5T718-920h79q0 25 9.5 47.5T833-833q17 17 39.5 26t47.5 9v80ZM400-440q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM80-120v-112q0-33 17-62t47-44q51-26 115-44t141-18q77 0 141 18t115 44q30 15 47 44t17 62v112H80Zm80-80h480v-32q0-11-5.5-20T620-266q-36-18-92.5-36T400-320q-71 0-127.5 18T180-266q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T480-600q0-33-23.5-56.5T400-680q-33 0-56.5 23.5T320-600q0 33 23.5 56.5T400-520Zm0-80Zm0 400Z"),
  subwoofer: materialSymbol("M200-80v-80h200v80H200Zm360 0v-80h200v80H560ZM216-200q-38 0-62-28.5T137-294l91-520q5-29 27.5-47.5T307-880h346q29 0 51.5 18.5T732-814l92 520q7 37-17 65.5T745-200H216Zm-1-80h529l-92-520H307l-92 520Zm265-40q66 0 113-47t47-113q0-66-47-113t-113-47q-66 0-113 47t-47 113q0 66 47 113t113 47Zm0-80q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-280q17 0 28.5-11.5T520-720q0-17-11.5-28.5T480-760q-17 0-28.5 11.5T440-720q0 17 11.5 28.5T480-680Zm0 200Z"),
  snail: materialSymbol("M120-160q0-56 24.5-106t69.5-84q-44-28-69-73t-25-97q0-116 81.5-198T400-800q66 0 125.5 30.5T625-685q22-35 57.5-55t76.5-20q63 0 112 33t49 90q0 47-33 80t-80 33h-7v164q0 84-58.5 142T600-160H120Zm200-240q50 0 85-38.5t35-81.5q0-24-11-32t-25-8q-20 0-32 11.5T360-520h-80q0-50 35-85t86-35q49 0 84 33t35 87q0 29-11 61.5T478-400h62q25 0 42.5-17t17.5-43v-60q0-83-58.5-141.5T400-720q-84 0-142 58.5T200-520q0 51 34.5 85.5T320-400Zm-99 160h379q50 0 85-34.5t35-85.5v-164q0-35 21-57.5t56-22.5h13q14 0 22-9.5t8-23.5q0-11-7-19t-18-12q-14-5-28-8.5t-28-3.5q-33 0-56 23.5T680-600v140q0 59-41 99.5T540-320H360q-44 0-80.5 21.5T221-240Zm494-6Z"),
  file: <path d="M13 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9m-6-6v6h6m-6-6 6 6M9 15h6m-3-3v6" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
  moon: <path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5a8.7 8.7 0 1 0 10.8 10.8Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></>,
  play: <path d="m9 5 11 7-11 7Z" fill="currentColor" />,
  pause: <><path d="M9 6v12m6-12v12" strokeWidth="2.5" /></>,
  download: <path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4" />,
  share: <><path d="m8 10 8-4m-8 8 8 4" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="5" r="2.5" /><circle cx="18" cy="19" r="2.5" /></>,
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
