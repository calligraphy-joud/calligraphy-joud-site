// Pipeline status mapping between WooCommerce order statuses and the JOUDART
// admin pipeline. Pure functions — safe to import from server route handlers.
//
// Our pipeline stages (ordered):
//   Nouveau → Confirmé → En production → Livré   (+ Annulé as a terminal off-ramp)
//
// NOTE: "En production" maps to a custom Woo status 'en-production' when the
// store has one registered. Because we cannot rely on that custom status being
// present on every WooCommerce install, the WRITE path also sets order meta
// `_joud_stage = 'production'` so the stage is always recoverable on read even
// if Woo silently rejected the custom status and kept it at 'processing'.

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

export type Stage =
  | 'Nouveau'
  | 'Confirmé'
  | 'En production'
  | 'Livré'
  | 'Annulé';

/** Ordered list of the 4 active pipeline stages, then the terminal "Annulé". */
export const STAGES: Stage[] = [
  'Nouveau',
  'Confirmé',
  'En production',
  'Livré',
  'Annulé',
];

/** A colour token (CSS custom property) per stage — for badges / dots. */
export const STAGE_COLORS: Record<Stage, string> = {
  Nouveau: 'var(--denim-500)',
  Confirmé: 'var(--info)',
  'En production': 'var(--warning)',
  Livré: 'var(--success)',
  Annulé: 'var(--danger)',
};

/** Type guard: is the given value one of our pipeline stages? */
export function isStage(value: unknown): value is Stage {
  return typeof value === 'string' && (STAGES as string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Woo → pipeline (read / display)
// ---------------------------------------------------------------------------

/** Minimal Woo order shape we read from to derive a stage. */
export interface WooOrderLike {
  status?: string;
  meta_data?: Array<{ key?: string; value?: unknown }>;
}

function readMeta(order: WooOrderLike, key: string): string | undefined {
  if (!Array.isArray(order.meta_data)) return undefined;
  const found = order.meta_data.find((m) => m && m.key === key);
  if (!found) return undefined;
  const v = found.value;
  return v === undefined || v === null ? undefined : String(v);
}

/**
 * Map a WooCommerce order to a pipeline Stage for display.
 *
 *   pending, on-hold              → Nouveau
 *   processing                    → Confirmé
 *   en-production (custom status) → En production
 *   processing + meta _joud_stage='production' → En production
 *   completed                     → Livré
 *   cancelled, refunded, failed   → Annulé
 *
 * Unknown statuses fall back to Nouveau so nothing disappears from the board.
 */
export function wooToStage(order: WooOrderLike): Stage {
  const status = (order.status || '').toLowerCase().trim();
  const joudStage = (readMeta(order, '_joud_stage') || '').toLowerCase().trim();

  // Custom status or meta flag both mean "En production".
  if (status === 'en-production' || status === 'enproduction') {
    return 'En production';
  }

  switch (status) {
    case 'pending':
    case 'on-hold':
      return 'Nouveau';
    case 'processing':
      // A processing order tagged with the meta flag is in production.
      return joudStage === 'production' ? 'En production' : 'Confirmé';
    case 'completed':
      return 'Livré';
    case 'cancelled':
    case 'refunded':
    case 'failed':
      return 'Annulé';
    default:
      // Respect the meta flag even on unexpected statuses.
      return joudStage === 'production' ? 'En production' : 'Nouveau';
  }
}

// ---------------------------------------------------------------------------
// pipeline → Woo (write-back)
// ---------------------------------------------------------------------------

/** Partial Woo order body for a PUT update. */
export interface WooUpdateBody {
  status?: string;
  meta_data?: Array<{ key: string; value: string }>;
}

/**
 * Map a pipeline Stage to the Woo order body used for write-back.
 *
 *   Nouveau       → status 'pending'      (+ clear _joud_stage)
 *   Confirmé      → status 'processing'   (+ clear _joud_stage)
 *   En production → status 'en-production' AND meta _joud_stage='production'
 *                   (the custom status is attempted; the meta flag guarantees
 *                    the stage survives even if Woo ignores the custom status)
 *   Livré         → status 'completed'    (+ clear _joud_stage)
 *   Annulé        → status 'cancelled'    (+ clear _joud_stage)
 */
export function stageToWooUpdate(stage: Stage): WooUpdateBody {
  switch (stage) {
    case 'Nouveau':
      return { status: 'pending', meta_data: [{ key: '_joud_stage', value: '' }] };
    case 'Confirmé':
      return {
        status: 'processing',
        meta_data: [{ key: '_joud_stage', value: '' }],
      };
    case 'En production':
      return {
        status: 'en-production',
        meta_data: [{ key: '_joud_stage', value: 'production' }],
      };
    case 'Livré':
      return {
        status: 'completed',
        meta_data: [{ key: '_joud_stage', value: '' }],
      };
    case 'Annulé':
      return {
        status: 'cancelled',
        meta_data: [{ key: '_joud_stage', value: '' }],
      };
    default:
      return {};
  }
}
