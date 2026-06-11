'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { STR } from '../data/content';

const LangCtx = createContext(null);

const ROUTES = {
  home: '/', boutique: '/collection', catalogue: '/catalogue', collection: '/collection',
  maison: '/histoire', contact: '/contact', commande: '/contact', livraison: '/livraison', mentions: '/mentions',
  confidentialite: '/confidentialite', cookies: '/cookies',
};

export function LangProvider({ children, initialLang }) {
  // initialLang comes from the server (the `lang` cookie) so SSR matches the
  // chosen locale — important for RTL + the Arabic crawl/curl.
  const [lang, setLangState] = useState(initialLang && STR[initialLang] ? initialLang : 'fr');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try { localStorage.setItem('joud-lang', lang); } catch (e) {}
    // Persist to a cookie so the server renders the same locale on the next load.
    try { document.cookie = 'lang=' + lang + '; path=/; max-age=31536000; samesite=lax'; } catch (e) {}
  }, [lang]);

  const setLang = useCallback((l) => { if (STR[l]) setLangState(l); }, []);

  const go = useCallback((id) => {
    if (!id) return;
    const onHome = pathname === '/';
    if (id === 'top') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (id.indexOf('col:') === 0) { router.push('/collection?cat=' + id.slice(4)); return; }
    if (id === 'categories' || id === 'transformation' || id === 'collectionSection') {
      const anchor = id === 'collectionSection' ? 'collection' : id;
      if (onHome) {
        const el = document.getElementById(anchor);
        if (el) { window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 88, behavior: 'smooth' }); return; }
      }
      router.push('/#' + anchor); return;
    }
    const target = ROUTES[id];
    if (target) {
      if (target === pathname) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      router.push(target); return;
    }
    router.push('/#' + id);
  }, [router, pathname]);

  const value = { lang, t: STR[lang], dir: lang === 'ar' ? 'rtl' : 'ltr', setLang, go };
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLang() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}

// Reveal-on-scroll: adds .is-in to [data-reveal] elements as they enter view.
// Elements already in the viewport on mount are revealed immediately so
// above-the-fold content (e.g. the hero) is never blank on first paint.
export function useReveal(deps = []) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('[data-reveal]'));
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach((e) => {
      if (e.classList.contains('is-in')) return;
      const r = e.getBoundingClientRect();
      // Already on screen → reveal now; otherwise observe for scroll.
      if (r.top < vh && r.bottom > 0) e.classList.add('is-in');
      else io.observe(e);
    });
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
