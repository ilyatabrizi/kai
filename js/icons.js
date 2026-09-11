// Line icons in the SF Symbols idiom: 24-unit grid, 1.8 stroke, round joins.
// Drawn here rather than loaded, so they colour with the text and ship in one request.

const S = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
const wrap = (body, extra = "") =>
  `<svg viewBox="0 0 24 24" ${S} aria-hidden="true" focusable="false"${extra}>${body}</svg>`;

const ICONS = {
  home: `<path d="M4 10.8 12 4l8 6.8V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-5v6h-4A1.5 1.5 0 0 1 4 19z"/>`,
  menu: `<path d="M5 9h11a3 3 0 0 1 0 6h-.4"/><path d="M5 9v5a5 5 0 0 0 5 5h1a5 5 0 0 0 5-5V9"/><path d="M8 4.5c0 1-1 1.2-1 2.2M11 4.5c0 1-1 1.2-1 2.2"/>`,
  checkin: `<path d="M12 21s-6.5-5.4-6.5-11a6.5 6.5 0 0 1 13 0c0 5.6-6.5 11-6.5 11z"/><path d="m9.4 10 1.9 1.9 3.5-3.8"/>`,
  branches: `<path d="M3.5 20.5h17"/><path d="M5 20.5V9.5h14v11"/><path d="M4 9.5 6 4.5h12l2 5"/><path d="M9.5 20.5v-6h5v6"/><path d="M4 9.5c0 1.4 1.1 2 2.2 2s2.3-.6 2.3-2c0 1.4 1.1 2 2.2 2s2.3-.6 2.3-2c0 1.4 1.1 2 2.2 2s2.3-.6 2.3-2c0 1.4 1.1 2 2.2 2s2.3-.6 2.3-2"/>`,
  profile: `<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c.6-3.8 3.6-6 7.5-6s6.9 2.2 7.5 6"/>`,
  bag: `<path d="M5.5 8.5h13l-.9 11a1.5 1.5 0 0 1-1.5 1.4H7.9a1.5 1.5 0 0 1-1.5-1.4z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
  minus: `<path d="M5 12h14"/>`,
  check: `<path d="m5 12.5 4.5 4.5L19 7.5"/>`,
  close: `<path d="M6 6l12 12M18 6 6 18"/>`,
  chevron: `<path d="m9 5 7 7-7 7"/>`,
  chevronL: `<path d="m15 5-7 7 7 7"/>`,
  arrowUpRight: `<path d="M7 17 17 7M8 7h9v9"/>`,
  search: `<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>`,
  phone: `<path d="M6.5 3.5h3l1.8 4.5-2.2 1.6a11 11 0 0 0 5.3 5.3l1.6-2.2 4.5 1.8v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z"/>`,
  pin: `<path d="M12 21s-6.5-5.4-6.5-11a6.5 6.5 0 0 1 13 0c0 5.6-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>`,
  directions: `<path d="m3.5 11.5 17-8-8 17-1.8-7.2z"/>`,
  instagram: `<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17.2" cy="6.8" r=".9" fill="currentColor" stroke="none"/>`,
  globe: `<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.7 2.6 14.3 0 17M12 3.5c-2.6 2.7-2.6 14.3 0 17"/>`,
  star: `<path d="m12 3.8 2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.4l-5.1 2.8 1.1-5.6-4.2-3.9 5.7-.7z"/>`,
  clock: `<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>`,
  sparkle: `<path d="M12 3.5c.6 4.4 2.1 7.9 8.5 8.5-6.4.6-7.9 4.1-8.5 8.5-.6-4.4-2.1-7.9-8.5-8.5 6.4-.6 7.9-4.1 8.5-8.5z"/>`,
  info: `<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.2"/>`,
  trash: `<path d="M5 7h14M9.5 7V4.5h5V7M7 7l.8 12.5h8.4L17 7"/>`,
  qr: `<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2h-2M16 16v2"/>`,
  cash: `<rect x="3.5" y="6.5" width="17" height="11" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 9.5h.01M17.5 14.5h.01"/>`,
  gift: `<rect x="4" y="9.5" width="16" height="11" rx="1.5"/><path d="M4 13.5h16M12 9.5v11"/><path d="M12 9.5c-2.4 0-4.7-1.2-4.7-3a1.9 1.9 0 0 1 3.5-1c.9 1.2 1.2 2.7 1.2 4zM12 9.5c2.4 0 4.7-1.2 4.7-3a1.9 1.9 0 0 0-3.5-1c-.9 1.2-1.2 2.7-1.2 4z"/>`,
  download: `<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>`,
  share: `<path d="M12 3.5v11M8 7.5l4-4 4 4M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12"/>`,
  refresh: `<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4.5h-4.5"/>`,
  people: `<circle cx="9" cy="8.5" r="3.3"/><path d="M3 19.5c.5-3.3 2.9-5.2 6-5.2s5.5 1.9 6 5.2"/><path d="M15.5 5.6a3.3 3.3 0 0 1 0 5.8M17.6 14.6c2 .7 3.2 2.3 3.4 4.9"/>`,
  sound: `<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10"/>`,
  mute: `<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="m16 10 4 4M20 10l-4 4"/>`,
  edit: `<path d="m14.5 5.5 4 4L8 20H4v-4z"/><path d="m12.5 7.5 4 4"/>`,
  note: `<path d="M6 4.5h9l3 3v12H6z"/><path d="M15 4.5v3h3M9 12h6M9 15.5h4"/>`,
  language: `<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.7 2.6 14.3 0 17M12 3.5c-2.6 2.7-2.6 14.3 0 17"/>`,
  fire: `<path d="M12 3.5c1 3.2 4.5 4.4 4.5 8.7a4.5 4.5 0 0 1-9 0c0-1.6.6-2.6 1.3-3.4.2 1.1.8 1.9 1.7 2.2C10 8.4 10.2 5.6 12 3.5z"/>`,
  leaf: `<path d="M5 19c0-8 5-13 14-13-1 9-5 13-13 13z"/><path d="M5 19c3-4 6-7 10-9"/>`,
};

export const icon = (name, extra = "") => wrap(ICONS[name] || ICONS.info, extra);
export const has = (name) => name in ICONS;
