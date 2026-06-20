'use client';
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLang } from './lang-context';
import { Icons } from './icons';
import { submitOrder, buildClientWaUrl } from '@/lib/order-client';
import { fbTrack, makeEventId } from './pixel';
import { trackOrderPlaced, getClickId } from './gtag';
import { WHATSAPP_NUMBER } from '@/lib/whatsapp';

/* ---- WhatsApp config: change this one number to go live ---- */
export const WA_NUMBER = WHATSAPP_NUMBER; // single source of truth: lib/whatsapp.ts

const fmt = (n) => Number(n).toLocaleString('fr-FR');
function priceFor(base, compI, dimI) {
  const compMult = [1, 1.7, 2.3][compI] ?? 1;
  const dimMult = [0.7, 0.85, 1, 1.25, 1.5][dimI] ?? 1;
  return Math.round((base * compMult * dimMult) / 100) * 100;
}

const OrderCtx = createContext(null);
export function useOrder() {
  const ctx = useContext(OrderCtx);
  return ctx || { openOrder: () => {} };
}

export function OrderProvider({ children }) {
  const [product, setProduct] = useState(undefined); // undefined = closed; null = commission; obj = product
  const openOrder = useCallback((p = null) => setProduct(p), []);
  const closeOrder = useCallback(() => setProduct(undefined), []);
  return (
    <OrderCtx.Provider value={{ openOrder }}>
      {children}
      {product !== undefined && <OrderModal product={product} onClose={closeOrder} />}
    </OrderCtx.Provider>
  );
}

function OrderModal({ product, onClose }) {
  const { t, lang } = useLang();
  const pd = t.pd; const m = pd.modal; const bq = t.bq;
  const isCommission = !product;
  const hasPriceCalc = !!(product && typeof product.price === 'number' && product.price > 0);
  const name = product ? (lang === 'ar' ? (product.name_ar || product.name) : (product.name || product.name_ar)) : '';
  const closeLabel = lang === 'ar' ? 'إغلاق' : lang === 'en' ? 'Close' : 'Fermer';

  // Selection is made on the product page and passed in via product.options (read-only here).
  const opts = product && product.options ? product.options : null;
  const [data, setData] = useState({ name: '', phone: '', city: '', address: '', message: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [result, setResult] = useState(null);
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  // Meta Pixel: checkout intent when the order sheet opens.
  useEffect(() => {
    fbTrack('InitiateCheckout', {
      currency: 'MAD',
      content_ids: product && product.id ? [product.id] : undefined,
      content_type: 'product',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const price = hasPriceCalc ? product.price : null;
  const sep = lang === 'ar' || lang === 'en' ? ': ' : ' : ';

  const waText = () => {
    const intro = lang === 'ar' ? 'مرحباً Calligraphy JOUD، '
      : lang === 'en' ? 'Hello Calligraphy JOUD, '
      : 'Bonjour Calligraphy JOUD, ';
    const want = isCommission
      ? (lang === 'ar' ? 'أودّ طلب عمل مخصّص.' : lang === 'en' ? 'I would like to request a custom commission.' : 'je souhaite une commande personnalisée.')
      : (lang === 'ar' ? 'أودّ طلب:' : lang === 'en' ? 'I would like to order:' : 'je souhaite commander :');
    const lines = [intro + want];
    if (product) {
      lines.push('');
      lines.push('• ' + m.sumPiece + sep + name + (product.id ? ' (' + product.id + ')' : ''));
      if (opts) {
        if (opts.composition) lines.push('• ' + m.sumCompo + sep + opts.composition);
        if (opts.forme) lines.push('• ' + m.sumForme + sep + opts.forme);
        if (opts.dimensions) lines.push('• ' + m.sumDim + sep + opts.dimensions);
        if (opts.cadre) lines.push('• ' + (lang === 'ar' ? 'الإطار' : lang === 'en' ? 'Frame' : 'Cadre') + sep + opts.cadre);
      }
      if (hasPriceCalc) {
        lines.push('• ' + m.sumTotal + sep + fmt(price) + ' MAD');
      } else if (product.price) {
        lines.push('• ' + m.sumTotal + sep + product.price);
      }
    }
    lines.push('');
    if (data.name.trim()) lines.push(m.name + sep + data.name.trim());
    if (data.city.trim()) lines.push(m.city + sep + data.city.trim());
    if (data.address.trim()) lines.push((m.address || 'Adresse') + sep + data.address.trim());
    if (data.message.trim()) lines.push(m.sumMessage + sep + data.message.trim());
    return lines.join('\n');
  };
  const waLink = () => 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(waText());

  const buildPayload = () => ({
    sku: product?.id,
    variationId: product?.variationId,
    productName: name || undefined,
    options: opts ? {
      composition: opts.composition,
      forme: opts.forme,
      dimensions: opts.dimensions,
      cadre: opts.cadre,
    } : undefined,
    total: hasPriceCalc ? price : (product?.price ?? undefined),
    name: data.name.trim(),
    phone: data.phone.trim() || undefined,
    ville: data.city.trim(),
    adresse: data.address.trim() || undefined,
    message: data.message.trim() || undefined,
    lang,
    // Google Ads click ids (captured on landing) so the COD order is attributable.
    gclid: getClickId('gclid') || undefined,
    gbraid: getClickId('gbraid') || undefined,
    wbraid: getClickId('wbraid') || undefined,
  });

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!data.name.trim()) er.name = m.errName;
    if (!data.city.trim()) er.city = m.errCity;
    if (!data.address.trim()) er.address = m.errAddress;
    setErrors(er);
    if (Object.keys(er).length) return;

    setStatus('sending');
    const eventId = makeEventId('order');
    const payload = { ...buildPayload(), eventId };
    let res;
    try {
      res = await submitOrder(payload);
    } catch (err) {
      res = { ok: false, source: 'network', waUrl: buildClientWaUrl(payload, lang, WA_NUMBER) };
    }
    // A real Woo order ('woo') or a captured fallback ('fallback') both = success for the customer.
    if (res && (res.ok || res.source === 'fallback')) {
      // Meta Pixel: purchase (deduplicated with the server-side CAPI event via eventId).
      fbTrack('Purchase', {
        value: typeof payload.total === 'number' ? payload.total : undefined,
        currency: 'MAD',
        content_ids: payload.sku ? [payload.sku] : undefined,
        content_type: 'product',
        num_items: 1,
      }, eventId);
      // Google Ads "Commande passée" + GA4 purchase (+ Enhanced Conversions: hashed phone).
      // Fire-and-forget; never blocks or breaks the order flow.
      trackOrderPlaced({
        value: typeof payload.total === 'number' ? payload.total : undefined,
        currency: 'MAD',
        orderId: res.orderId,
        phone: data.phone,
      });
      setResult(res);
      setStatus('success');
    } else {
      // network/unknown failure → still capture the lead via WhatsApp
      const url = (res && res.waUrl) || buildClientWaUrl(payload, lang, WA_NUMBER) || waLink();
      window.open(url, '_blank', 'noopener,noreferrer');
      onClose();
    }
  };

  const setField = (k, v) => { setData((d) => ({ ...d, [k]: v })); if (errors[k]) setErrors((e) => ({ ...e, [k]: null })); };

  const title = isCommission
    ? (lang === 'ar' ? 'طلب مخصّص' : lang === 'en' ? 'Custom commission' : 'Commande personnalisée')
    : m.title;

  return (
    <div className="om-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="om-panel" role="dialog" aria-modal="true" ref={panelRef}>
        <div className="om-head">
          <div>
            <h3 className="serif">{title}{product ? <> — <span className="italic">{name}</span></> : null}</h3>
            <p>{m.subtitle}</p>
          </div>
          <button className="om-x" aria-label={closeLabel} onClick={onClose}><Icons.x /></button>
        </div>

        {status === 'success' ? (
          <div className="om-success">
            <span className="om-success__ic"><Icons.check /></span>
            <h3 className="serif">{m.successTitle}</h3>
            <p>{m.successBody}</p>
            <a className="om-wa" href={(result && result.waUrl) || waLink()} target="_blank" rel="noopener noreferrer"><Icons.whatsapp /> {m.whatsapp}</a>
            <button type="button" className="om-successclose" onClick={onClose}>{m.successClose}</button>
          </div>
        ) : (
        <>
        {product && (
          <div className="om-media">
            {product.img ? (
              <span className="om-media__img"><img src={product.img} alt={name} /></span>
            ) : null}
            <span className="om-media__meta">
              {typeof product.col === 'number' && <span className="om-media__cat">{bq.collections[product.col]}</span>}
              <span className="om-media__name">{name}</span>
            </span>
          </div>
        )}

        <form className="om-form" onSubmit={submit} noValidate>
          {opts && (
            <div className="om-opts">
              {[['composition', pd.optComposition], ['forme', pd.optForme], ['dimensions', pd.optDimensions], ['cadre', (lang === 'ar' ? 'الإطار' : lang === 'en' ? 'Frame' : 'Cadre')]].map(([k, label]) => (
                opts[k] ? (
                  <div className="om-opt om-opt--ro" key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-soft)' }}>
                    <span className="om-opt__label">{label}</span><span className="om-opt__val">{opts[k]}</span>
                  </div>
                ) : null
              ))}
              {hasPriceCalc && (
                <div className="om-pricebar">
                  <span className="om-pricebar__label">{m.sumTotal}</span>
                  <span><span className="om-pricebar__num serif">{fmt(price)}</span><span className="om-pricebar__cur">MAD</span></span>
                </div>
              )}
            </div>
          )}

          <div className="om-fields">
            <div className={'om-field' + (errors.name ? ' om-field--err' : '')}>
              <label>{m.name} <span className="req">*</span></label>
              <input type="text" value={data.name} onChange={(e) => setField('name', e.target.value)} />
              {errors.name && <span className="om-err">{errors.name}</span>}
            </div>
            <div className={'om-field' + (errors.city ? ' om-field--err' : '')}>
              <label>{m.city} <span className="req">*</span></label>
              <input type="text" value={data.city} onChange={(e) => setField('city', e.target.value)} />
              {errors.city && <span className="om-err">{errors.city}</span>}
            </div>
            <div className={'om-field om-field--full' + (errors.address ? ' om-field--err' : '')}>
              <label>{m.address} <span className="req">*</span></label>
              <input type="text" placeholder={m.addressPlaceholder} value={data.address} onChange={(e) => setField('address', e.target.value)} />
              {errors.address && <span className="om-err">{errors.address}</span>}
            </div>
            <div className="om-field om-field--full">
              <label>{m.phone}</label>
              <input type="tel" inputMode="tel" placeholder="+212 6 00 00 00 00" value={data.phone} onChange={(e) => setField('phone', e.target.value)} />
            </div>
            <div className="om-field om-field--full">
              <label>{m.messageLabel}</label>
              <textarea className="om-textarea" rows={3} placeholder={m.messagePlaceholder} value={data.message} onChange={(e) => setField('message', e.target.value)} />
            </div>
          </div>

          <div className="om-note"><Icons.shield /> {m.note}</div>
          <button className="om-submit" type="submit" disabled={status === 'sending'}>
            {status === 'sending' ? <span className="om-spin" aria-hidden="true" /> : null}
            {status === 'sending' ? m.sending : m.submit}
          </button>
          <a className="om-wa-alt" href={waLink()} target="_blank" rel="noopener noreferrer"><Icons.whatsapp /> {m.whatsapp}</a>
          <div className="pd-reassure">{pd.reassure.map((r, i) => <span key={i}><Icons.check /> {r}</span>)}</div>
        </form>
        </>
        )}
      </div>
    </div>
  );
}
