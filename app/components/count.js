'use client';
import { useEffect, useRef, useState } from 'react';

// Animated number that counts up once, the first time it scrolls into view.
// Parses a leading number out of strings like "1977", "100%", "5.0", "+50"
// and preserves any prefix/suffix. Respects prefers-reduced-motion.
export function CountNumber({ value, duration = 1400, className }) {
  const ref = useRef(null);
  const raw = String(value ?? '');
  const m = raw.match(/^(\D*)([\d\s.,]+)(\D*)$/);
  const prefix = m ? m[1] : '';
  const numStr = m ? m[2].replace(/\s/g, '') : '';
  const suffix = m ? m[3] : '';
  const target = m ? parseFloat(numStr.replace(',', '.')) : NaN;
  const decimals = numStr.includes('.') ? (numStr.split('.')[1] || '').length : 0;
  const hasGrouping = /\s/.test(raw); // e.g. "1 977"

  const fmt = (n) => {
    let s = decimals ? n.toFixed(decimals) : String(Math.round(n));
    if (hasGrouping || target >= 1000) s = Number(s).toLocaleString('fr-FR');
    return prefix + s + suffix;
  };

  const [display, setDisplay] = useState(() => (isNaN(target) ? raw : fmt(0)));

  useEffect(() => {
    if (isNaN(target)) { setDisplay(raw); return; }
    const el = ref.current;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) { setDisplay(fmt(target)); return; }

    let started = false;
    const run = () => {
      if (started) return; started = true;
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        setDisplay(fmt(target * eased));
        if (p < 1) requestAnimationFrame(tick);
        else setDisplay(fmt(target));
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { run(); io.disconnect(); } });
    }, { threshold: 0.4 });
    if (el) io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  return <span ref={ref} className={className}>{display}</span>;
}
