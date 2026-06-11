'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLang } from './lang-context';
import { Icons } from './icons';
import { PRODUCTS, PRICE } from '../data/content';
import { useOrder } from './order';
import { getSizes, getStartingPrice, formeFromIndex } from '@/lib/pricing';

const sLabel = (s) => (!s ? '' : s.startsWith('Ø') ? 'Ø ' + s.slice(1) + ' cm' : s.replace('x', ' × ') + ' cm');
const startOf = (p) => { const fk = formeFromIndex(p.forme); const sp = getStartingPrice(fk, fk === 'rond' ? 1 : p.comp); return sp == null ? 0 : sp; };

const FilterIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </svg>
);

function PCard({ p, lang, t }) {
  const { openOrder } = useOrder();
  const bq = t.bq;
  const name = lang === 'ar' ? p.name_ar : p.name;
  const col = bq.collections[p.col];
  const comp = bq.compositions[p.comp - 1];
  const forme = bq.formes[p.forme];
  const round = p.forme === 2;
  const mediaCls = 'pmedia ' + (round ? 'pmedia--round' : p.forme === 0 ? 'pmedia--square' : '');
  // Prices come from the official matrix (lib/pricing) — never a hardcoded value.
  const fk = formeFromIndex(p.forme);
  const compNum = fk === 'rond' ? 1 : p.comp;
  const startFrom = getStartingPrice(fk, compNum);
  const defSize = getSizes(fk, String(compNum))[0] || null;
  const cadreSimple = lang === 'ar' ? 'إطار بسيط' : lang === 'en' ? 'Single frame' : 'Cadre simple';
  const quickOrder = (e) => {
    e.preventDefault(); e.stopPropagation();
    openOrder({
      id: p.id, name: p.name, name_ar: p.name_ar, col: p.col, img: p.img,
      price: defSize ? defSize.price : null,
      options: { composition: bq.compositions[compNum - 1], forme: bq.formes[p.forme], dimensions: defSize ? sLabel(defSize.size) : '', cadre: cadreSimple },
      cadre: 'simple', sizeRaw: defSize ? defSize.size : undefined,
    });
  };
  return (
    <Link className="pcard" href={'/produit/' + encodeURIComponent(p.id)} aria-label={(bq.view || 'Voir') + ' — ' + name}>
      <div className={mediaCls}>
        {p.img ? <img src={p.img} alt={name} loading="lazy" /> : <div className="img-slot"><span>{p.name}</span></div>}
        <div className="pmedia__scrim">
          <div className="pmedia__tags">
            <span className="ptag">{comp}</span>
            <span className="ptag">{forme}</span>
          </div>
          <span className="pmedia__view">{bq.view} <Icons.arrow /></span>
        </div>
      </div>
      <div className="pbody">
        <span className="pcat">{col}</span>
        <h3 className="pname">{name}</h3>
        <span className="pprice">{startFrom != null ? <>{bq.from} <b>{PRICE(startFrom, lang)}</b></> : <b>{PRICE(null, lang)}</b>}</span>
        <button type="button" className="pcard__order" onClick={quickOrder}>
          {(t.pd && t.pd.commander) || 'Commander'} <Icons.arrow />
        </button>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="pcard pcard--skel" aria-hidden="true">
      <div className="pmedia sk-shimmer" />
      <div className="pbody">
        <span className="sk-line sk-line--xs" />
        <span className="sk-line sk-line--lg" />
        <span className="sk-line sk-line--sm" />
      </div>
    </div>
  );
}

function Facet({ label, options, sel, onToggle, counts }) {
  return (
    <div className="facet">
      <span className="facet__label">{label}</span>
      <div className="facet__opts">
        {options.map((opt, i) => (
          <button key={i} className="fchip" aria-pressed={sel.has(i)} onClick={() => onToggle(i)}>
            <span className="fchip__box"><Icons.check /></span>
            <span>{opt}</span>
            <span className="fchip__count">{counts[i]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Boutique({ variant = 'boutique', lockCol = null, intro = null, items = null }) {
  const { t, lang } = useLang();
  const bq = t.bq;
  const source = Array.isArray(items) ? items : PRODUCTS;
  const base = (lockCol === null || lockCol === undefined) ? source : source.filter((p) => p.col === lockCol);

  const [sel, setSel] = useState({ col: new Set(), comp: new Set(), forme: new Set() });
  const [sort, setSort] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const id = setTimeout(() => setLoading(false), 420);
    return () => clearTimeout(id);
  }, [lockCol]);

  const showColFacet = (lockCol === null || lockCol === undefined);
  const toggle = (facet, i) => setSel((s) => {
    const next = { col: new Set(s.col), comp: new Set(s.comp), forme: new Set(s.forme) };
    const set = next[facet];
    set.has(i) ? set.delete(i) : set.add(i);
    return next;
  });
  const clearAll = () => setSel({ col: new Set(), comp: new Set(), forme: new Set() });

  const valOf = (p, f) => f === 'comp' ? p.comp - 1 : p[f];
  const facets = showColFacet ? ['col', 'comp', 'forme'] : ['comp', 'forme'];
  const matches = (p, ignore) => facets.every((f) => f === ignore || sel[f].size === 0 || sel[f].has(valOf(p, f)));
  const countFor = (facet, i) => base.filter((p) => matches(p, facet) && valOf(p, facet) === i).length;
  const counts = {
    col: bq.collections.map((_, i) => countFor('col', i)),
    comp: bq.compositions.map((_, i) => countFor('comp', i)),
    forme: bq.formes.map((_, i) => countFor('forme', i)),
  };

  let list = base.filter((p) => matches(p, null));
  if (sort === 'price-asc') list = [...list].sort((a, b) => startOf(a) - startOf(b));
  else if (sort === 'price-desc') list = [...list].sort((a, b) => startOf(b) - startOf(a));
  else if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));

  const active = [];
  facets.forEach((f) => {
    const labels = f === 'col' ? bq.collections : f === 'comp' ? bq.compositions : bq.formes;
    sel[f].forEach((i) => active.push({ f, i, label: labels[i] }));
  });

  const eyebrow = (intro && intro.eyebrow) || bq.eyebrow;
  const title = (intro && intro.title) || bq.title;
  const lead = (intro && intro.lead) || bq.lead;

  return (
    <main>
      {intro && intro.img ? (
        <section className="collhero" data-reveal>
          <img src={intro.img} alt={title} />
          <div className="collhero__scrim" />
          <div className="wrap collhero__body">
            <span className="eyebrow collhero__eyebrow">{eyebrow}</span>
            <h1 className="collhero__title serif">{title}</h1>
            <p className="collhero__lead">{lead}</p>
          </div>
        </section>
      ) : (
        <section className="wrap bq-intro">
          <span className="eyebrow" data-reveal>{eyebrow}</span>
          <h1 className="section-head__title" data-reveal data-delay="1" style={{ marginTop: 'var(--space-4)' }}>{title}</h1>
          <p className="bq-intro__lead" data-reveal data-delay="2">{lead}</p>
        </section>
      )}

      <div className="wrap bq-layout">
        <button className="bq-filterbtn" onClick={() => setShowFilters((v) => !v)}><FilterIcon /> {bq.filters}</button>

        <aside className={'bq-rail' + (showFilters ? '' : ' bq-rail--collapsed')}>
          <div className="bq-rail__top">
            <span className="bq-rail__title">{bq.filters}</span>
            <button className="bq-clear" onClick={clearAll} disabled={active.length === 0}>{bq.clear}</button>
          </div>
          {showColFacet && <Facet label={bq.facetCollection} options={bq.collections} sel={sel.col} counts={counts.col} onToggle={(i) => toggle('col', i)} />}
          <Facet label={bq.facetComposition} options={bq.compositions} sel={sel.comp} counts={counts.comp} onToggle={(i) => toggle('comp', i)} />
          <Facet label={bq.facetForme} options={bq.formes} sel={sel.forme} counts={counts.forme} onToggle={(i) => toggle('forme', i)} />
        </aside>

        <div className="bq-content">
          <div className="bq-gridhead">
            <span className="bq-count">{loading ? <span className="sk-line sk-line--count" /> : <><b>{list.length}</b> {bq.results}</>}</span>
            <label className="bq-sort">{bq.sortLabel}
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="featured">{lang === 'ar' ? 'مميّز' : lang === 'en' ? 'Featured' : 'En vedette'}</option>
                <option value="price-asc">{lang === 'ar' ? 'السعر ↑' : lang === 'en' ? 'Price ↑' : 'Prix croissant'}</option>
                <option value="price-desc">{lang === 'ar' ? 'السعر ↓' : lang === 'en' ? 'Price ↓' : 'Prix décroissant'}</option>
                <option value="name">{lang === 'ar' ? 'الاسم' : lang === 'en' ? 'Name (A–Z)' : 'Nom (A–Z)'}</option>
              </select>
            </label>
          </div>

          {!loading && active.length > 0 && (
            <div className="bq-active">
              {active.map((a, k) => (
                <span className="bq-active__pill" key={k}>{a.label}
                  <button className="bq-active__x" aria-label="Retirer" onClick={() => toggle(a.f, a.i)}>×</button>
                </span>
              ))}
            </div>
          )}

          <div className={'bq-grid' + (variant === 'catalogue' ? ' bq-grid--dense' : '')}>
            {loading
              ? Array.from({ length: variant === 'catalogue' ? 8 : 6 }).map((_, i) => <SkeletonCard key={i} />)
              : list.length === 0
                ? <div className="bq-empty"><p>{bq.empty}</p><button className="bq-clear" onClick={clearAll} style={{ fontSize: 'var(--text-sm)' }}>{bq.clear}</button></div>
                : list.map((p) => <PCard key={p.id} p={p} lang={lang} t={t} />)}
          </div>
        </div>
      </div>
    </main>
  );
}
