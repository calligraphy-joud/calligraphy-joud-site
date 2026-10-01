'use client';
// app/template.js re-mounts on every navigation, so a CSS mount animation here
// gives a subtle 200ms page fade. Gated by prefers-reduced-motion in globals.css.
export default function Template({ children }) {
  return <div className="page-fade">{children}</div>;
}
