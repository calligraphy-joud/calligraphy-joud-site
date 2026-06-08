'use client';
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLang } from './lang-context';
import { Icons } from './icons';
import { submitOrder, buildClientWaUrl } from '@/lib/order-client';
import { fbTrack, makeEventId } from './pixel';

/* ---- WhatsApp config: change this one number to go live ---- */
export const WA_NUMBER = '212600000000'; // Calligraphy JOUD WhatsApp (placeholder)

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

  const [sel, setSel] = useState({
    comp: product && product.comp ? product.comp - 1 : 0,
    forme: product && (product.forme || product.forme === 0) ? product.forme : 0,
    dim: 2,
  });
  const [data, setData] = useState({ name: '', phone: '', city: '', message: '' });
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

  const price = hasPriceCalc ? priceFor(product.price, sel.comp, sel.dim) : null;
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
      if (hasPriceCalc) {
        lines.push('• ' + m.sumCompo + sep + bq.compositions[sel.comp]);
        lines.push('• ' + m.sumForme + sep + bq.formes[sel.forme]);
        lines.push('• ' + m.sumDim + sep + pd.dims[sel.dim]);
        lines.push('• ' + m.sumTotal + sep + fmt(price) + ' ' + pd.cur);
      } else if (product.price) {
        lines.push('• ' + m.sumTotal + sep + product.price);
      }
    }
    lines.push('');
    if (data.name.trim()) lines.push(m.name + sep + data.name.trim());
    if (data.city.trim()) lines.push(m.city + sep + data.city.trim());
    if (data.message.trim()) lines.push(m.sumMessage + sep + data.message.trim());
    return lines.join('\n');
  };
  const waLink = () => 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(waText());

  const buildPayload = () => ({
    sku: product?.id,
    variationId: product?.variationId,
    productName: name || undefined,
    options: hasPriceCalc ? {
      composition: bq.compositions[sel.comp],
      forme: bq.formes[sel.forme],
      dimensions: pd.dims[sel.dim],
    } : undefined,
    total: hasPriceCalc ? price : (product?.price ?? undefined),
    name: data.name.trim(),
    phone: data.phone.trim() || undefined,
    ville: data.city.trim(),
    message: data.message.trim() || undefined,
    lang,
  });

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!data.name.trim()) er.name = m.errName;
    if (!data.city.trim()) er.city = m.errCity;
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
          {hasPriceCalc && (
            <div className="om-opts">
              <div className="om-opt">
                <div className="om-opt__head"><span className="om-opt__label">{pd.optComposition}</span><span className="om-opt__val">{bq.compositions[sel.comp]}</span></div>
                <div className="om-seg">{bq.compositions.map((c, i) => <button type="button" key={i} className="om-chip" aria-pressed={sel.comp === i} onClick={() => setSel((s) => ({ ...s, comp: i }))}>{c}</button>)}</div>
              </div>
              <div className="om-opt">
                <div className="om-opt__head"><span className="om-opt__label">{pd.optForme}</span><span className="om-opt__val">{bq.formes[sel.forme]}</span></div>
                <div className="om-seg">{bq.formes.map((f, i) => <button type="button" key={i} className="om-chip" aria-pressed={sel.forme === i} onClick={() => setSel((s) => ({ ...s, forme: i }))}>{f}</button>)}</div>
              </div>
              <div className="om-opt">
                <div className="om-opt__head"><span className="om-opt__label">{pd.optDimensions}</span><span className="om-opt__val">{pd.dims[sel.dim]}</span></div>
                <div className="om-seg">{pd.dims.map((d, i) => <button type="button" key={i} className="om-chip" aria-pressed={sel.dim === i} onClick={() => setSel((s) => ({ ...s, dim: i }))}>{d}</button>)}</div>
              </div>
              <div className="om-pricebar">
                <span className="om-pricebar__label">{m.sumTotal}</span>
                <span><span className="om-pricebar__num serif">{fmt(price)}</span><span className="om-pricebar__cur">{pd.cur}</span></span>
              </div>
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
