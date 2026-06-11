'use client';
import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useLang, useReveal } from '@/app/components/lang-context';
import { Header, Footer } from '@/app/components/chrome';
import { Icons } from '@/app/components/icons';
import { useOrder } from '@/app/components/order';
import { fbTrack } from '@/app/components/pixel';
import { PRICE } from '@/app/data/content';
import {
  formeFromIndex,
  formeLabel,
  getSizes,
  getStartingPrice,
  cadreSurcharge,
  CADRE_SURCHARGE,
  type Cadre,
} from '@/lib/pricing';
import { displaySize } from '@/lib/product-attrs';

/* ---- Types (kept loose; this is a plain client component) ---- */
type CatalogueItem = {
  id: string;
  name: string;
  name_ar: string;
  col: 0 | 1 | 2;
  comp: 1 | 2 | 3;
  forme: 0 | 1 | 2;
  orientation?: 'portrait' | 'paysage';
  price: number | null;
  img: string;
};

const fmt = (n: number) => Number(n).toLocaleString('fr-FR');

/* ---------------- Gallery ---------------- */
function Gallery({ images, name, alt, forme, pd }: { images: string[]; name: string; alt: string; forme: 0 | 1 | 2; pd: any }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [box, setBox] = useState(false);
  const round = forme === 2;
  const ratio = round ? '1 / 1' : forme === 1 ? '4 / 5' : '1 / 1';
  const cur = images[active] || images[0];

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--zx', ((e.clientX - r.left) / r.width) * 100 + '%');
    e.currentTarget.style.setProperty('--zy', ((e.clientY - r.top) / r.height) * 100 + '%');
  };

  return (
    <div className="pd-gallery">
      <div className="pd-stage">
        <div
          className={'pd-main' + (round ? ' pd-main--round' : '') + (zoom ? ' is-zoom' : '')}
          onMouseMove={onMove}
          onMouseEnter={() => setZoom(true)}
          onMouseLeave={() => setZoom(false)}
          onClick={() => setBox(true)}
        >
          <div className="pd-main__inner" style={{ aspectRatio: ratio }}>
            {cur ? <img src={cur} alt={alt} /> : <div className="img-slot"><span>{name}</span></div>}
          </div>
          <span className="pd-main__bevel" />
          <span className="pd-zoomhint"><Icons.search /> {pd.view}</span>
        </div>
      </div>
      {images.length > 1 && (
        <div className="pd-thumbs">
          {images.map((src, i) => (
            <button key={i} className="pd-thumb" aria-pressed={i === active} onClick={() => setActive(i)} type="button">
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      )}
      {box && cur && (
        <div className="pd-lightbox" onClick={() => setBox(false)}>
          <button className="pd-lightbox__close" aria-label="Fermer" type="button"><Icons.x /></button>
          <img src={cur} alt="" />
        </div>
      )}
    </div>
  );
}

/* ---------------- Related card (links to product) ---------------- */
function RelatedCard({ p, lang, t }: { p: CatalogueItem; lang: string; t: any }) {
  const bq = t.bq;
  const name = lang === 'ar' ? p.name_ar : p.name;
  const col = bq.collections[p.col];
  const round = p.forme === 2;
  const mediaCls = 'pmedia ' + (round ? 'pmedia--round' : p.forme === 0 ? 'pmedia--square' : '');
  const startFrom = getStartingPrice(formeFromIndex(p.forme), p.comp);
  return (
    <Link className="pcard" href={'/produit/' + encodeURIComponent(p.id)} aria-label={name}>
      <div className={mediaCls}>
        {p.img ? <img src={p.img} alt={name} loading="lazy" /> : <div className="img-slot"><span>{p.name}</span></div>}
      </div>
      <div className="pbody">
        <span className="pcat">{col}</span>
        <h3 className="pname">{name}</h3>
        <span className="pprice">{startFrom != null ? <>{bq.from} <b>{PRICE(startFrom, lang)}</b></> : <b>{PRICE(null, lang)}</b>}</span>
      </div>
    </Link>
  );
}

export default function ProductClient({
  item,
  related,
  colSlug,
}: {
  item: CatalogueItem;
  woo: any;
  variations: any[];
  source: 'woo' | 'fallback';
  related: CatalogueItem[];
  colSlug: string;
}) {
  const { t, lang } = useLang();
  const { openOrder } = useOrder();
  useReveal([lang, item.id]);
  const pd = t.pd;
  const bq = t.bq;

  const name = lang === 'ar' ? (item.name_ar || item.name) : item.name;

  // ---- FIXED product attributes (forme + composition are not user choices) ----
  const fk = formeFromIndex(item.forme);
  const isRond = fk === 'rond';
  const compNum = item.comp;
  const orientation = item.orientation;

  // Read-only spec labels shown as chips near the title.
  const compName =
    compNum === 3 ? (lang === 'ar' ? 'ثلاثية' : lang === 'en' ? 'Triptych' : 'Triptyque')
    : compNum === 2 ? (lang === 'ar' ? 'ثنائية' : lang === 'en' ? 'Diptych' : 'Diptyque')
    : (lang === 'ar' ? 'قطعة واحدة' : lang === 'en' ? 'Single piece' : 'Pièce unique');
  const panels =
    compNum + ' ' +
    (compNum > 1
      ? (lang === 'ar' ? 'لوحات' : lang === 'en' ? 'panels' : 'tableaux')
      : (lang === 'ar' ? 'لوحة' : lang === 'en' ? 'panel' : 'tableau'));
  const specChips = isRond ? [compName, formeLabel(fk)] : [compName, formeLabel(fk), panels];

  // Descriptive French alt text for the main product image (SEO).
  const mainAlt = `${name} — tableau ${String(bq.collections[item.col]).toLowerCase()} fait main, ${compName.toLowerCase()} ${formeLabel(fk).toLowerCase()}, Calligraphy JOUD`;

  const cadreLabel = (c: Cadre) =>
    c === 'double'
      ? (lang === 'ar' ? 'إطار مزدوج' : lang === 'en' ? 'Double frame' : 'Cadre double')
      : (lang === 'ar' ? 'إطار بسيط' : lang === 'en' ? 'Single frame' : 'Cadre simple');
  const cadreHeading = lang === 'ar' ? 'الإطار' : lang === 'en' ? 'Frame' : 'Cadre';
  const perPiece = lang === 'ar' ? 'لكل لوحة' : lang === 'en' ? '/ piece' : '/ tableau';

  // ---- Only configurable options: size + cadre ----
  const [sel, setSel] = useState({ sizeIdx: 0, cadre: 'simple' as Cadre });
  const sizes = useMemo(() => getSizes(fk, compNum), [fk, compNum]);
  const sizeIdx = Math.min(sel.sizeIdx, Math.max(0, sizes.length - 1));
  const curSize = sizes[sizeIdx] || null;
  const cadre: Cadre = isRond ? 'simple' : sel.cadre;
  const basePrice = curSize ? curSize.price : null;
  const surcharge = curSize ? cadreSurcharge(fk, compNum, cadre) : 0;
  const finalPrice: number | null = basePrice != null ? basePrice + surcharge : null;

  // ---- Image: by SKU ----
  const images = useMemo(() => (item.img ? [item.img] : []), [item.img]);

  // Meta Pixel: product view.
  useEffect(() => {
    fbTrack('ViewContent', {
      content_ids: [item.id],
      content_type: 'product',
      currency: 'MAD',
      value: finalPrice ?? undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const order = () => {
    openOrder({
      id: item.id,
      name: item.name,
      name_ar: item.name_ar,
      col: item.col,
      img: images[0] || item.img,
      price: finalPrice,
      options: {
        composition: `${compName} · ${panels}`,
        forme: formeLabel(fk),
        dimensions: curSize ? displaySize(curSize.size, orientation) : '',
        cadre: cadreLabel(cadre),
      },
      sizeRaw: curSize ? curSize.size : undefined,
      cadre,
    } as any);
  };

  return (
    <>
      <Header page="catalogue" />
      <main>
      <div className="wrap">
        <nav className="pd-crumb">
          <Link href="/">{t.navAccueil}</Link>
          <Icons.arrow />
          <Link href="/collection">{t.nav[0][1]}</Link>
          <Icons.arrow />
          <span>{name}</span>
        </nav>

        <div className="pd">
          <Gallery images={images} name={name} alt={mainAlt} forme={item.forme} pd={pd} />

          <div className="pd-info">
            <Link className="pd-collink" href={'/collection?cat=' + colSlug}>{bq.collections[item.col]}</Link>
            <h1 className="pd-title">{name}</h1>
            {/* Fixed-spec chips (read-only): e.g. "Triptyque · Rectangulaire · 3 tableaux" */}
            <div className="pd-spec" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0 2px' }}>
              {specChips.map((c, i) => (
                <span key={i} style={{ fontSize: 'var(--text-2xs)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '999px', padding: '4px 12px' }}>{c}</span>
              ))}
            </div>
            <span className="pd-orig"><Icons.shield /> {pd.origin}</span>
            <p className="pd-desc">{pd.descByCol[item.col]}</p>
            <div className="pd-price">
              {finalPrice !== null ? (
                <>
                  <span className="pd-price__num serif">{fmt(finalPrice)}</span>
                  <span className="pd-price__cur">MAD</span>
                </>
              ) : (
                <span className="pd-price__num serif">{PRICE(null, lang)}</span>
              )}
            </div>
            {cadre === 'double' && surcharge > 0 && basePrice != null && (
              <span className="pd-price__break" style={{ display: 'block', color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
                {fmt(basePrice)} MAD + {fmt(surcharge)} MAD {cadreLabel('double').toLowerCase()} = {fmt(finalPrice)} MAD
              </span>
            )}
            <span className="pd-price__note">{pd.priceNote}</span>

            <hr className="pd-rule" />

            <div className="pd-opts">
              <div className="pd-opt">
                <div className="pd-opt__head"><span className="pd-opt__label">{pd.optDimensions}</span><span className="pd-opt__val">{curSize ? displaySize(curSize.size, orientation) : '—'}</span></div>
                <div className="pd-seg">
                  {sizes.map((s, i) => (
                    <button key={s.size} type="button" className="pd-chip" aria-pressed={sizeIdx === i} onClick={() => setSel((v) => ({ ...v, sizeIdx: i }))}>{displaySize(s.size, orientation)}</button>
                  ))}
                </div>
              </div>

              {!isRond && (
                <div className="pd-opt">
                  <div className="pd-opt__head"><span className="pd-opt__label">{cadreHeading}</span><span className="pd-opt__val">{cadreLabel(cadre)}</span></div>
                  <div className="pd-seg">
                    <button type="button" className="pd-chip" aria-pressed={cadre === 'simple'} onClick={() => setSel((v) => ({ ...v, cadre: 'simple' }))}>{cadreLabel('simple')}</button>
                    <button type="button" className="pd-chip" aria-pressed={cadre === 'double'} onClick={() => setSel((v) => ({ ...v, cadre: 'double' }))}>{cadreLabel('double')} (+{CADRE_SURCHARGE} MAD {perPiece})</button>
                  </div>
                </div>
              )}
            </div>

            <div className="pd-cta">
              <button className="pd-commander" type="button" onClick={order}>{pd.commander} <Icons.arrow /></button>
              <div className="pd-reassure">
                {pd.reassure.map((r: string, i: number) => <span key={i}><Icons.check /> {r}</span>)}
              </div>
            </div>

            <div className="pd-badges">
              {t.trust.map(([title, sub]: [string, string], i: number) => {
                const Ic = [Icons.truck, Icons.wallet, Icons.shield][i];
                return (<div className="pd-badge" key={i}><Ic /><b>{title}</b><span>{sub}</span></div>);
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Craftsmanship story */}
      <section className="pd-story section">
        <div className="wrap pd-story__grid">
          <div>
            <span className="eyebrow" style={{ color: 'var(--accent)' }} data-reveal>{pd.storyEyebrow}</span>
            <h2 data-reveal data-delay="1" style={{ marginTop: 'var(--space-4)' }}>{pd.storyTitle1}<br /><span className="ital">{pd.storyTitle2}</span></h2>
            <p data-reveal data-delay="2">{pd.storyBody}</p>
            <div className="pd-steps">
              {pd.steps.map((s: string[], i: number) => (
                <div className="pd-step" key={i} data-reveal data-delay={String(i % 3)}>
                  <span className="pd-step__n serif">{s[0]}</span>
                  <span className="pd-step__t">{s[1]}</span>
                  <span className="pd-step__d">{s[2]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="pd-story__img" data-reveal data-delay="1">
            <figure className="joud-frame">
              <div className="joud-frame__img" style={{ aspectRatio: '3 / 4' }}><img src="/assets/imagery/matiere-1.webp" alt="" /></div>
              <span className="joud-frame__bevel" />
            </figure>
            <figure className="joud-frame">
              <div className="joud-frame__img" style={{ aspectRatio: '3 / 4' }}><img src="/assets/imagery/matiere-2.webp" alt="" /></div>
              <span className="joud-frame__bevel" />
            </figure>
          </div>
        </div>
      </section>

      {/* Related */}
      {related && related.length > 0 && (
        <section className="section">
          <div className="wrap">
            <div className="pd-related__head">
              <div className="section-head">
                <span className="eyebrow" data-reveal>{pd.relatedTitle}</span>
              </div>
              <Link className="pd-collink" href="/collection" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{pd.relatedAll} <Icons.arrow style={{ width: 16, height: 16 }} /></Link>
            </div>
            <div className="pd-related__grid">
              {related.map((p) => <RelatedCard key={p.id} p={p} lang={lang} t={t} />)}
            </div>
          </div>
        </section>
      )}
      </main>
      <Footer />
    </>
  );
}
