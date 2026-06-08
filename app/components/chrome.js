'use client';
import { useEffect, useState } from 'react';
import { useLang } from './lang-context';
import { useOrder } from './order';
import { Button } from './ui';
import { Icons } from './icons';

const LANGS = [['fr', 'FR'], ['en', 'EN'], ['ar', 'ع']];

const MenuIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export function Header({ page = 'home' }) {
  const { t, lang, setLang, go } = useLang();
  const { openOrder } = useOrder();
  const [open, setOpen] = useState(false);
  const HIDE_IN_NAV = { categories: true, transformation: true };
  const items = [['home', t.navAccueil], ...t.nav].filter(([id]) => !HIDE_IN_NAV[id]);
  const isActive = (id) =>
    (page === 'home' && id === 'home') ||
    (page === 'catalogue' && (id === 'collection' || id === 'catalogue')) ||
    (page === 'histoire' && id === 'maison') ||
    (page === 'contact' && id === 'contact');

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  const navTo = (id) => { setOpen(false); go(id); };

  return (
    <>
      <header className={'hdr' + (open ? ' hdr--open' : '')}>
        <div className="wrap hdr__bar">
          <button className="brand" onClick={() => go('home')} aria-label="Calligraphy JOUD">
            <img src="/assets/logo-mark-navy.webp" alt="" width={36} height={36} />
            <span className="brand__name">Calligraphy&nbsp;Joud</span>
          </button>

          <nav className="hdr__nav">
            {items.map(([id, label]) => (
              <button key={id} className="hdr__link" data-active={isActive(id)} onClick={() => go(id)}>{label}</button>
            ))}
          </nav>

          <div className="hdr__actions">
            <div className="lang" role="group" aria-label="Language">
              {LANGS.map(([code, label]) => (
                <button key={code} aria-pressed={lang === code} onClick={() => setLang(code)}>{label}</button>
              ))}
            </div>
            <button className="icon-btn hdr__search" aria-label="Recherche" onClick={() => go('catalogue')}><Icons.search /></button>
            <Button variant="primary" size="sm" className="hdr__cta" rightIcon={<Icons.arrow />} onClick={() => openOrder()}>
              {t.commission}
            </Button>
            <button className="hdr__burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              {open ? <Icons.x /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      <div className={'hdr__scrim' + (open ? ' is-open' : '')} onClick={() => setOpen(false)} />
      <nav className={'hdr__drawer' + (open ? ' is-open' : '')} aria-hidden={!open}>
        <div className="hdr__drawer-links">
          {items.map(([id, label]) => (
            <button key={id} className="hdr__drawer-link" data-active={isActive(id)} onClick={() => navTo(id)}>
              <span>{label}</span>
              <Icons.arrow />
            </button>
          ))}
        </div>
        <div className="hdr__drawer-foot">
          <Button variant="primary" size="lg" rightIcon={<Icons.arrow />} onClick={() => { setOpen(false); openOrder(); }}>
            {t.commission}
          </Button>
          <div className="lang lang--drawer" role="group" aria-label="Language">
            {LANGS.map(([code, label]) => (
              <button key={code} aria-pressed={lang === code} onClick={() => setLang(code)}>{label}</button>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}

export function Footer() {
  const { t, go } = useLang();
  const col1Routes = ['maison', 'commande', 'contact'];
  const col2Routes = ['catalogue', 'col:islamique', 'col:moderne', 'col:abstrait'];
  return (
    <footer className="ftr">
      <div className="wrap ftr__grid">
        <div>
          <button className="ftr__brand" onClick={() => go('home')} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
            <img src="/assets/logo-mark-gold.webp" alt="" width={34} height={34} />
            <span>Calligraphy&nbsp;Joud</span>
          </button>
          <p className="ftr__about">{t.ftrAbout}</p>
        </div>

        <nav className="ftr__col">
          <span className="ftr__h">{t.ftrCol1}</span>
          {t.ftrCol1Links.map((l, i) => (
            <a key={i} href="#" onClick={(e) => { e.preventDefault(); go(col1Routes[i]); }}>{l}</a>
          ))}
        </nav>

        <nav className="ftr__col">
          <span className="ftr__h">{t.ftrCol2}</span>
          {t.ftrCol2Links.map((l, i) => (
            <a key={i} href="#" onClick={(e) => { e.preventDefault(); go(col2Routes[i]); }}>{l}</a>
          ))}
        </nav>

        <div className="ftr__news">
          <span className="ftr__h">{t.ftrNewsH}</span>
          <p>{t.ftrNews}</p>
          <form className="ftr__form" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder={t.ftrEmail} aria-label={t.ftrEmail} />
            <Button variant="primary" size="md" type="submit">{t.ftrJoin}</Button>
          </form>
        </div>
      </div>

      <div className="wrap ftr__bottom">
        <span className="c">{t.ftrRights}</span>
        <nav className="ftr__legal">
          {(t.ftrLegal || []).map(([id, label], i) => (
            <a key={i} href="#" onClick={(e) => { e.preventDefault(); go(id); }}>{label}</a>
          ))}
        </nav>
        <span className="t serif">{t.ftrTag}</span>
      </div>
    </footer>
  );
}
