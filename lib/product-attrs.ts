// Per-product FIXED attributes (forme, composition, orientation) — authoritative.
// Each artwork is a specific physical piece: forme + composition are NOT user choices.
// Source: app/data/joud-products-attributes.json. Client-safe (JSON only).

import attrs from '@/app/data/joud-products-attributes.json';
import type { Forme } from './pricing';

const FORME_TO_INDEX: Record<string, 0 | 1 | 2> = { carre: 0, rectangulaire: 1, rond: 2 };
const PRODUCTS = (attrs as any).products as Record<
  string,
  { forme: string; composition: number; orientation?: string; verifier?: boolean }
>;

export type Orientation = 'portrait' | 'paysage';
export interface ProductAttr {
  forme: Forme;
  formeIndex: 0 | 1 | 2;
  composition: 1 | 2 | 3;
  orientation?: Orientation;
  verifier?: boolean;
}

export function attrFor(sku: string): ProductAttr | null {
  const a = PRODUCTS[String(sku || '').toUpperCase()];
  if (!a) return null;
  return {
    forme: a.forme as Forme,
    formeIndex: FORME_TO_INDEX[a.forme] ?? 0,
    composition: (a.composition as 1 | 2 | 3) || 1,
    orientation: a.orientation as Orientation | undefined,
    verifier: !!a.verifier,
  };
}

/**
 * Display label for a matrix size key. For a rectangulaire piece in "portrait"
 * orientation, the matrix key (e.g. "100x50") is shown swapped ("50 × 100 cm");
 * the price lookup always uses the original matrix key.
 */
export function displaySize(size: string, orientation?: string): string {
  if (!size) return '';
  if (size.startsWith('Ø')) return 'Ø ' + size.slice(1) + ' cm';
  const parts = size.split(/x/i);
  if (orientation === 'portrait' && parts.length === 2) {
    return `${parts[1]} × ${parts[0]} cm`;
  }
  return size.replace(/x/i, ' × ') + ' cm';
}
