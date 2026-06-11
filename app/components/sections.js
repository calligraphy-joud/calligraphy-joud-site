'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useLang } from './lang-context';
import { Button, Badge, ImgSlot } from './ui';
import { Icons } from './icons';
import { ARTWORKS, CATEGORIES, REVIEWS, PARTNERS, PRODUCTS } from '../data/content';
import { useOrder } from './order';
import { getSizes, getStartingPrice, formeFromIndex } from '@/lib/pricing';

const _sLabel = (s) => (!s ? '' : s.startsWith('Ø') ? 'Ø ' + s.slice(1) + ' cm' : s.replace('x', ' × ') + ' cm');

/* ---------------- Hero + Trust ---------------- */
export function Hero() {
  const { t, go } = useLang();
  const { openOrder } = useOrder();
  return (
    <section className="hero" id="top">
      <div className="wrap hero__grid">
        <div className="hero__copy">
          <span className="eyebrow" data-reveal>{t.heroEyebrow}</span>
          <h1 data-reveal data-delay="1">
            {t.heroTitle1}<br /><span className="ital accent">{t.heroTitle2}</span>
          </h1>
          <p className="hero__lead" data-reveal data-delay="2">{t.heroLead}</p>
          <div className="hero__cta" data-reveal data-delay="3">
            <Button variant="primary" size="lg" rightIcon={<Icons.arrow />} onClick={() => go('collection')}>{t.heroCta1}</Button>
            <Button variant="secondary" size="lg" onClick={() => openOrder()}>{t.heroCta2}</Button>
          </div>
        </div>
        <div className="hero__art" data-reveal data-delay="2">
          <figure className="joud-frame" style={{ margin: 0 }}>
            <div className="joud-frame__img" style={{ aspectRatio: '3 / 4' }}>
              <img loading="eager" fetchPriority="high" src="/assets/imagery/gold-relief.webp" alt={t.heroCapTitle} />
            </div>
            <span className="joud-frame__bevel" />
            <figcaption className="hero__caption">
              <span className="t serif">{t.heroCapTitle}</span>
              <span className="m">{t.heroCapMeta}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

export function TrustStrip() {
  const { t } = useLang();
  const icons = [Icons.truck, Icons.wallet, Icons.shield];
  return (
    <section className="trust">
      <div className="wrap">
        <div className="trust__row">
          {t.trust.map(([title, sub], i) => {
            const Ic = icons[i];
            return (
              <div className="trust__item" key={i} data-reveal data-delay={String(i)}>
                <Ic />
                <div className="trust__txt">
                  <span className="trust__t">{title}</span>
                  <span className="trust__s">{sub}</span>
                </div>
              </div>
            );
          })}
          <div className="trust__item" data-reveal data-delay="3">
            <div className="trust__google">
              <Icons.google style={{ width: 30, height: 30 }} />
              <div className="trust__txt">
                <span className="trust__rating serif">5.0</span>
                <span className="stars" aria-label="5 sur 5">{[0,1,2,3,4].map((x) => <Icons.star key={x} />)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Collection + Categories ---------------- */
function Work({ w }) {
  const { t, lang } = useLang();
  const { openOrder } = useOrder();
  const title = lang === 'ar' ? w.title_ar : w.title;
  const cat = lang === 'ar' ? w.cat_ar : w.cat;
  const medium = lang === 'ar' ? w.medium_ar : w.medium;
  const price = lang === 'ar' ? (w.price_ar || w.price) : w.price;
  const cls = ['work', w.span === 'lg' ? 'work--lg' : '', w.offset ? 'work--' + w.offset : '', w.push ? 'work--push' : ''].filter(Boolean).join(' ');
  const pid = w.pid || w.id;
  const prod = PRODUCTS.find((p) => p.id === pid);
  const href = prod ? '/produit/' + encodeURIComponent(pid) : '#';
  const openIt = (e) => { e.preventDefault(); openOrder(prod || { name: w.title, name_ar: w.title_ar, id: pid, price: w.price }); };
  return (
    <Link className={cls} data-reveal onClick={openIt} href={href} aria-label={title}>
      <div className="work__media" style={{ aspectRatio: w.ratio }}>
        <span className="work__cat"><Badge variant="navy">{cat}</Badge></span>
        {w.img ? <img loading="lazy" src={w.img} alt={title} /> : <ImgSlot label={'« ' + w.title + ' »'} />}
      </div>
      <div className="work__body">
        <h3 className="work__title serif">{title}</h3>
        <span className="work__meta">{medium} · {w.year}</span>
        <span className="work__price">{price}</span>
      </div>
    </Link>
  );
}

/* Card built from a live CatalogueItem (Woo/fallback) — mirrors Work layout */
function FeaturedWork({ item }) {
  const { t, lang } = useLang();
  const { openOrder } = useOrder();
  const bq = t.bq;
  const title = lang === 'ar' ? (item.name_ar || item.name) : item.name;
  const cat = bq.collections[item.col];
  const medium = bq.compositions[item.comp - 1];
  const ratio = item.forme === 1 ? '4 / 5' : '1 / 1';
  // Starting price + default selection from the official matrix (never item.price).
  const fk = formeFromIndex(item.forme);
  const compNum = fk === 'rond' ? 1 : item.comp;
  const startFrom = getStartingPrice(fk, compNum);
  const defSize = getSizes(fk, String(compNum))[0] || null;
  const cadreSimple = lang === 'ar' ? 'إطار بسيط' : lang === 'en' ? 'Single frame' : 'Cadre simple';
  const openIt = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openOrder({
      id: item.id, name: item.name, name_ar: item.name_ar, col: item.col, img: item.img,
      price: defSize ? defSize.price : null,
      options: { composition: bq.compositions[compNum - 1], forme: bq.formes[item.forme], dimensions: defSize ? _sLabel(defSize.size) : '', cadre: cadreSimple },
      cadre: 'simple', sizeRaw: defSize ? defSize.size : undefined,
    });
  };
  return (
    <Link className="work" data-reveal href={'/produit/' + encodeURIComponent(item.id)} aria-label={title}>
      <div className="work__media" style={{ aspectRatio: ratio }}>
        <span className="work__cat"><Badge variant="navy">{cat}</Badge></span>
        {item.img ? <img loading="lazy" src={item.img} alt={title} /> : <ImgSlot label={'« ' + item.name + ' »'} />}
      </div>
      <div className="work__body">
        <h3 className="work__title serif">{title}</h3>
        <span className="work__meta">{medium}</span>
        <span className="work__price">{startFrom != null ? (t.bq.from + ' ' + Number(startFrom).toLocaleString('fr-FR') + ' MAD') : (t.pd ? t.pd.priceNote : '')}</span>
        <button type="button" className="pcard__order" onClick={openIt}>{(t.pd && t.pd.commander) || 'Commander'} <Icons.arrow /></button>
      </div>
    </Link>
  );
}

export function Collection({ featured = null }) {
  const { t, go } = useLang();
  const useFeatured = Array.isArray(featured) && featured.length > 0;
  return (
    <section className="section" id="collection">
      <div className="wrap">
        <div className="coll__head">
          <div className="section-head">
            <span className="eyebrow" data-reveal>{t.collEyebrow}</span>
            <h2 className="section-head__title" data-reveal data-delay="1">{t.collTitle}</h2>
          </div>
          <div data-reveal data-delay="1">
            <Button variant="link" rightIcon={<Icons.arrow />} onClick={() => go('categories')}>{t.collAll}</Button>
          </div>
        </div>
        <div className="coll__grid coll__grid--three">
          {useFeatured
            ? featured.slice(0, 3).map((item) => <FeaturedWork key={item.id} item={item} />)
            : ARTWORKS.slice(0, 3).map((w) => <Work key={w.id} w={w} />)}
        </div>
      </div>
    </section>
  );
}

export function Categories() {
  const { t, lang, go } = useLang();
  const open = (id) => go('col:' + id);
  return (
    <section className="section section--tight" id="categories">
      <div className="wrap">
        <div className="section-head section-head--center" style={{ marginBottom: 'var(--space-9)' }}>
          <span className="eyebrow eyebrow--center" data-reveal>{t.catsEyebrow}</span>
          <h2 className="section-head__title" data-reveal data-delay="1">{t.catsTitle}</h2>
        </div>
        <div className="cats">
          {CATEGORIES.map((c, i) => {
            const name = lang === 'ar' ? c.name_ar : lang === 'en' ? c.name_en : c.name;
            const desc = lang === 'ar' ? c.desc_ar : lang === 'en' ? c.desc_en : c.desc;
            return (
              <article className="cat" key={c.id} data-reveal data-delay={String(i)} role="button" tabIndex={0}
                onClick={() => open(c.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(c.id); } }}>
                <img loading="lazy" src={c.img} alt={name} />
                <div className="cat__body">
                  <h3 className="cat__name serif">{name}</h3>
                  <p className="cat__desc">{desc}</p>
                  <span className="cat__link">{t.catLink} <Icons.arrow /></span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Before/After + Mission + Reviews + Partners + Instagram ---------------- */
export function BeforeAfter() {
  const { t } = useLang();
  const ref = useRef(null);
  const [pos, setPos] = useState(52);
  const dragging = useRef(false);

  const move = useCallback((clientX) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    setPos(f * 100);
  }, []);

  useEffect(() => {
    const onMove = (e) => { if (dragging.current) move(e.touches ? e.touches[0].clientX : e.clientX); };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [move]);

  return (
    <section className="section" id="transformation">
      <div className="wrap wrap--lg">
        <div className="section-head section-head--center transform__head">
          <span className="eyebrow eyebrow--center" data-reveal>{t.transformEyebrow}</span>
          <h2 className="section-head__title" data-reveal data-delay="1">{t.transformTitle}</h2>
          <p className="section-head__lead" data-reveal data-delay="2">{t.transformLead}</p>
        </div>
        <div className="ba" ref={ref} style={{ '--pos': pos + '%' }} data-reveal
          onPointerDown={(e) => { dragging.current = true; move(e.clientX); }}>
          <div className="ba__layer ba__after">
            <img loading="lazy" src="/assets/imagery/gold-relief.webp" alt={t.after} />
          </div>
          <div className="ba__layer ba__before">
            <img loading="lazy" src="/assets/imagery/gallery-stair.webp" alt={t.before} />
          </div>
          <span className="ba__tag ba__tag--before">{t.before}</span>
          <span className="ba__tag ba__tag--after">{t.after}</span>
          <div className="ba__handle" style={{ left: pos + '%' }}>
            <span className="ba__grip"><Icons.drag /></span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Mission() {
  const { t } = useLang();
  return (
    <section className="mission section" id="maison">
      <img loading="lazy" className="mission__mark" src="/assets/logo-mark-white.webp" alt="" />
      <div className="wrap mission__grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', alignItems: 'flex-start' }}>
          <span className="eyebrow" data-reveal>{t.missionEyebrow}</span>
          <h2 data-reveal data-delay="1">{t.missionTitle1}<br /><span className="ital">{t.missionTitle2}</span></h2>
          <p className="mission__lead" data-reveal data-delay="2">{t.missionLead}</p>
          <div className="mission__stats" data-reveal data-delay="3">
            {t.stats.map(([n, l], i) => (
              <div className="stat" key={i}>
                <span className="stat__n serif">{n}</span>
                <span className="stat__l">{l}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mission__media" data-reveal data-delay="2">
          <figure className="joud-frame" style={{ margin: 0 }}>
            <div className="joud-frame__img" style={{ aspectRatio: '3 / 4' }}><img loading="lazy" src="/assets/imagery/gallery-stair.webp" alt="" /></div>
            <span className="joud-frame__bevel" />
          </figure>
          <figure className="joud-frame" style={{ margin: 0 }}>
            <div className="joud-frame__img" style={{ aspectRatio: '3 / 4' }}><img loading="lazy" src="/assets/imagery/paintings-diptych.webp" alt="" /></div>
            <span className="joud-frame__bevel" />
          </figure>
        </div>
      </div>
    </section>
  );
}

export function Reviews() {
  const { t, lang } = useLang();
  return (
    <section className="section" id="avis">
      <div className="wrap">
        <div className="section-head section-head--center reviews__head">
          <span className="eyebrow eyebrow--center" data-reveal>{t.reviewsEyebrow}</span>
          <h2 className="section-head__title" data-reveal data-delay="1">{t.reviewsTitle}</h2>
          <div className="reviews__score" data-reveal data-delay="2">
            <Icons.google style={{ width: 26, height: 26 }} />
            <span className="trust__rating serif">5.0</span>
            <span className="stars">{[0,1,2,3,4].map((x) => <Icons.star key={x} />)}</span>
            <span className="g">{t.reviewsScore}</span>
          </div>
        </div>
        <div className="reviews__grid">
          {REVIEWS.map((r, i) => (
            <article className="review" key={i} data-reveal data-delay={String(i)}>
              <div className="review__top">
                <span className="review__av serif">{r.initial}</span>
                <div className="review__who">
                  <span className="review__name">{r.name}</span>
                  <span className="review__when">{lang === 'ar' ? r.when_ar : r.when}</span>
                </div>
              </div>
              <span className="stars">{[0,1,2,3,4].map((x) => <Icons.star key={x} />)}</span>
              <p className="review__text">{lang === 'ar' ? r.text_ar : r.text}</p>
              <span className="review__g"><Icons.google style={{ width: 14, height: 14 }} /> {t.verified}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Partners() {
  const { t } = useLang();
  return (
    <section className="partners section--tight">
      <div className="wrap">
        <p className="partners__head" data-reveal>{t.partnersTitle}</p>
        <div className="partners__row">
          {PARTNERS.map((p, i) => (
            <span className="partner serif" key={i} data-reveal data-delay={String(i % 4)}>
              {p.name}{p.sub && <span className="sub">{p.sub}</span>}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Instagram() {
  const { t } = useLang();
  const cells = [
    { img: '/assets/imagery/gold-relief.webp' },
    { img: '/assets/imagery/gallery-stair.webp' },
    { img: '/assets/products/ISL-009.webp' },
    { img: '/assets/imagery/paintings-diptych.webp' },
  ];
  return (
    <section className="section" id="insta">
      <div className="wrap">
        <div className="section-head section-head--center insta__head">
          <span className="eyebrow eyebrow--center" data-reveal>{t.instaTitle}</span>
          <span className="insta__tag serif" data-reveal data-delay="1">{t.instaTag}</span>
        </div>
        <div className="insta__grid">
          {cells.map((c, i) => (
            <div className="insta__cell" key={i} data-reveal data-delay={String(i % 4)}>
              {c.img ? <img loading="lazy" src={c.img} alt="" /> : <ImgSlot label="Instagram" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
