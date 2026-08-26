'use client';

// Admin live-orders board (client). Talks ONLY to /api/admin/orders — never
// imports @/lib/woo. Renders a kanban grouped by the JOUD pipeline stages,
// with optimistic stage moves, per-order WhatsApp, manual refresh and a full
// set of loading / error / empty states.

import { useCallback, useEffect, useMemo, useState } from 'react';

// ---------------------------------------------------------------------------
// Stage model (mirrors lib/order-status.ts — duplicated here so the client
// never imports the server-only woo layer).
// ---------------------------------------------------------------------------

type Stage = 'Nouveau' | 'Confirmé' | 'En production' | 'Livré' | 'Annulé';

const STAGES: Stage[] = ['Nouveau', 'Confirmé', 'En production', 'Livré', 'Annulé'];

const STAGE_COLORS: Record<Stage, string> = {
  Nouveau: 'var(--denim-500)',
  Confirmé: 'var(--info)',
  'En production': 'var(--warning)',
  Livré: 'var(--success)',
  Annulé: 'var(--danger)',
};

// ---------------------------------------------------------------------------
// API shapes
// ---------------------------------------------------------------------------

interface OrderItem {
  name: string;
  sku: string;
  qty: number;
  options: Array<{ label: string; value: string }>;
}

interface Order {
  id: number;
  number: string;
  date: string;
  stage: Stage;
  wooStatus: string;
  total: string;
  currency: string;
  customer: { name: string; phone: string; city: string };
  items: OrderItem[];
  note: string;
  photoUrl: string;
  waNumber: string;
}

interface OrdersResponse {
  ok: boolean;
  source: 'woo' | 'unconfigured';
  orders: Order[];
  totalPages?: number;
  total?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtTotal(total: string, currency: string): string {
  const n = Number(total);
  const cur = currency || 'MAD';
  if (!total || !isFinite(n)) return total ? `${total} ${cur}` : '—';
  return `${n.toLocaleString('fr-FR')} ${cur}`;
}

function waHref(o: Order): string {
  const msg = `Bonjour ${o.customer.name || ''}, ici JOUDART au sujet de votre commande n°${o.number}.`;
  return `https://wa.me/${o.waNumber}?text=${encodeURIComponent(msg)}`;
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

interface Toast {
  id: number;
  text: string;
  kind: 'error' | 'ok';
}

// ---------------------------------------------------------------------------
// Order card
// ---------------------------------------------------------------------------

function OrderCard({
  order,
  busy,
  onStage,
}: {
  order: Order;
  busy: boolean;
  onStage: (id: number, stage: Stage) => void;
}) {
  const hasPhone = Boolean(order.waNumber);
  return (
    <article className="adm-card">
      <header className="adm-card__head">
        <div className="adm-card__id">
          <span className="adm-card__num">n°{order.number}</span>
          <span className="adm-card__date">{fmtDate(order.date)}</span>
        </div>
        <span
          className="adm-badge"
          style={{ ['--_sc' as any]: STAGE_COLORS[order.stage] }}
        >
          <span className="adm-badge__dot" />
          {order.stage}
        </span>
      </header>

      <div className="adm-card__client">
        <span className="adm-card__name">{order.customer.name || 'Client'}</span>
        {order.customer.city && (
          <span className="adm-card__city">{order.customer.city}</span>
        )}
      </div>

      <div className="adm-card__body">
        {order.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="adm-card__thumb" src={order.photoUrl} alt="" />
        )}
        <ul className="adm-items">
          {order.items.length === 0 && (
            <li className="adm-item adm-item--empty">Aucun article</li>
          )}
          {order.items.map((it, i) => (
            <li className="adm-item" key={i}>
              <span className="adm-item__top">
                <span className="adm-item__name">
                  {it.qty > 1 ? `${it.qty}× ` : ''}
                  {it.name || 'Article'}
                </span>
                {it.sku && <span className="adm-item__sku">{it.sku}</span>}
              </span>
              {it.options.length > 0 && (
                <span className="adm-item__opts">
                  {it.options.map((op, j) => (
                    <span className="adm-opt" key={j}>
                      <b>{op.label}:</b> {op.value}
                    </span>
                  ))}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {order.note && <p className="adm-card__note">“{order.note}”</p>}

      <footer className="adm-card__foot">
        <span className="adm-card__total">{fmtTotal(order.total, order.currency)}</span>
        <div className="adm-card__actions">
          <a
            className={'adm-wa' + (hasPhone ? '' : ' is-disabled')}
            href={hasPhone ? waHref(order) : undefined}
            target={hasPhone ? '_blank' : undefined}
            rel="noopener noreferrer"
            aria-disabled={!hasPhone}
            title={hasPhone ? 'Contacter sur WhatsApp' : 'Aucun téléphone'}
            onClick={(e) => {
              if (!hasPhone) e.preventDefault();
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.5 14.4c-.3-.15-1.7-.84-2-.94-.26-.1-.45-.15-.64.15-.19.28-.74.93-.9 1.12-.17.2-.33.22-.62.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.04-.17-.3-.02-.46.13-.6.13-.13.3-.34.44-.5.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.64-1.55-.88-2.12-.23-.55-.47-.48-.64-.49h-.55c-.19 0-.5.07-.76.36-.26.28-1 .98-1 2.4 0 1.4 1.03 2.76 1.17 2.96.14.2 2.02 3.08 4.9 4.32.68.3 1.22.47 1.64.6.69.22 1.32.19 1.81.12.55-.08 1.7-.7 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.34zM12 2a10 10 0 0 0-8.6 15.07L2 22l5.05-1.32A10 10 0 1 0 12 2z" />
            </svg>
            WhatsApp
          </a>
        </div>
      </footer>

      <div className="adm-stage-ctl">
        <label className="adm-stage-ctl__lbl">
          Étape
          <select
            value={order.stage}
            disabled={busy}
            onChange={(e) => onStage(order.id, e.target.value as Stage)}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        {busy && <span className="adm-stage-ctl__spin" aria-hidden="true" />}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

export default function AdminClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [source, setSource] = useState<'woo' | 'unconfigured' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((text: string, kind: 'error' | 'ok' = 'error') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/orders', { cache: 'no-store' });
      const data: OrdersResponse = await res.json();
      if (!res.ok && data.source !== 'unconfigured') {
        throw new Error(data.error || 'Erreur de chargement.');
      }
      setSource(data.source);
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Impossible de charger les commandes.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setBusy = useCallback((id: number, on: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const changeStage = useCallback(
    async (id: number, stage: Stage) => {
      // Snapshot previous stage for rollback.
      let prevStage: Stage | undefined;
      setOrders((list) =>
        list.map((o) => {
          if (o.id === id) {
            prevStage = o.stage;
            return { ...o, stage };
          }
          return o;
        }),
      );
      if (prevStage === stage) return;

      setBusy(id, true);
      try {
        const res = await fetch('/api/admin/orders', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, stage }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Échec de la mise à jour.');
        }
        // Trust the server-confirmed stage (handles custom-status edge cases).
        const confirmed: Stage = data.stage || stage;
        setOrders((list) =>
          list.map((o) =>
            o.id === id ? { ...o, stage: confirmed, wooStatus: data.wooStatus || o.wooStatus } : o,
          ),
        );
      } catch (e) {
        // Revert.
        setOrders((list) =>
          list.map((o) =>
            o.id === id && prevStage ? { ...o, stage: prevStage } : o,
          ),
        );
        pushToast(
          e instanceof Error ? e.message : 'Échec de la mise à jour.',
          'error',
        );
      } finally {
        setBusy(id, false);
      }
    },
    [pushToast, setBusy],
  );

  const grouped = useMemo(() => {
    const map: Record<Stage, Order[]> = {
      Nouveau: [],
      Confirmé: [],
      'En production': [],
      Livré: [],
      Annulé: [],
    };
    for (const o of orders) {
      (map[o.stage] || map.Nouveau).push(o);
    }
    return map;
  }, [orders]);

  const isEmpty = !loading && !error && source === 'woo' && orders.length === 0;

  return (
    <div className="adm">
      <header className="adm-top">
        <div>
          <p className="eyebrow no-rule">Atelier</p>
          <h1 className="adm-top__title">Commandes en direct</h1>
        </div>
        <div className="adm-top__right">
          {source === 'woo' && (
            <span className="adm-src">
              <span className="adm-src__dot" /> source : WooCommerce
            </span>
          )}
          <button
            className="adm-refresh"
            onClick={load}
            disabled={loading}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
            {loading ? 'Chargement…' : 'Rafraîchir'}
          </button>
        </div>
      </header>

      {/* States */}
      {loading && (
        <div className="adm-state">
          <span className="adm-spinner" aria-hidden="true" />
          <p>Chargement des commandes…</p>
        </div>
      )}

      {!loading && error && (
        <div className="adm-state adm-state--error">
          <p className="adm-state__title">Une erreur est survenue</p>
          <p className="adm-state__sub">{error}</p>
          <button className="adm-refresh" onClick={load} type="button">
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && source === 'unconfigured' && (
        <div className="adm-state">
          <p className="adm-state__title">WooCommerce non connecté</p>
          <p className="adm-state__sub">
            Connectez WooCommerce dans .env.local pour voir les commandes en
            direct.
          </p>
        </div>
      )}

      {isEmpty && (
        <div className="adm-state">
          <p className="adm-state__title">Aucune commande</p>
          <p className="adm-state__sub">
            Les nouvelles commandes apparaîtront ici automatiquement.
          </p>
        </div>
      )}

      {/* Board */}
      {!loading && !error && source === 'woo' && orders.length > 0 && (
        <div className="adm-board">
          {STAGES.map((stage) => (
            <section className="adm-col" key={stage}>
              <header className="adm-col__head">
                <span
                  className="adm-col__dot"
                  style={{ background: STAGE_COLORS[stage] }}
                />
                <h2 className="adm-col__title">{stage}</h2>
                <span className="adm-col__count">{grouped[stage].length}</span>
              </header>
              <div className="adm-col__body">
                {grouped[stage].length === 0 ? (
                  <p className="adm-col__empty">—</p>
                ) : (
                  grouped[stage].map((o) => (
                    <OrderCard
                      key={o.id}
                      order={o}
                      busy={busyIds.has(o.id)}
                      onStage={changeStage}
                    />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="adm-toasts" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={'adm-toast adm-toast--' + t.kind}>
              {t.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
