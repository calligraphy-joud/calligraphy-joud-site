// SINGLE SOURCE OF TRUTH for JOUDART prices.
// Reads the official tariff matrix from app/data/joud-pricing.json.
// Never hardcode a price anywhere else — always go through this engine.

import pricing from '@/app/data/joud-pricing.json';

export type Forme = 'rond' | 'carre' | 'rectangulaire';
export type Composition = '1' | '2' | '3';
export type Cadre = 'simple' | 'double';

type Matrix = Record<string, Record<string, Record<string, number>>>;
const MATRIX = (pricing as any).matrix as Matrix;
const CADRE = (pricing as any).options?.cadre ?? {};

/** Legacy numeric forme index used in content.js (0 = Carré, 1 = Rectangulaire, 2 = Rond). */
export const FORME_BY_INDEX: Forme[] = ['carre', 'rectangulaire', 'rond'];
export function formeFromIndex(i: number): Forme {
  return FORME_BY_INDEX[i] ?? 'carre';
}
export function formeLabel(forme: Forme): string {
  return forme === 'rond' ? 'Rond' : forme === 'carre' ? 'Carré' : 'Rectangulaire';
}

/** Sizes available for a forme + composition, in matrix order, each with its base price. */
export function getSizes(
  forme: Forme,
  composition: Composition | number,
): { size: string; price: number }[] {
  const block = MATRIX[forme]?.[String(composition)];
  if (!block) return [];
  return Object.entries(block).map(([size, price]) => ({ size, price: Number(price) }));
}

/** Compositions (1/2/3) that exist for a forme. */
export function getCompositions(forme: Forme): Composition[] {
  return Object.keys(MATRIX[forme] || {}) as Composition[];
}

/** Base (matrix) price for an exact combo, or null if the combo doesn't exist. */
export function getPrice(
  forme: Forme,
  composition: Composition | number,
  size: string,
): number | null {
  const p = MATRIX[forme]?.[String(composition)]?.[size];
  return typeof p === 'number' ? p : null;
}

/** Minimum price of a forme + composition combo — the "À partir de" value. */
export function getStartingPrice(
  forme: Forme,
  composition: Composition | number,
): number | null {
  const sizes = getSizes(forme, composition);
  if (!sizes.length) return null;
  return Math.min(...sizes.map((s) => s.price));
}

// ---- Cadre (frame) option: +X MAD per tableau when "double"; excluded for round ----
export const CADRE_SURCHARGE: number = Number(CADRE?.choices?.double?.surcharge_per_piece ?? 190);

export function cadreApplies(forme: Forme): boolean {
  const list: string[] = CADRE?.applies_to_formes ?? ['carre', 'rectangulaire'];
  return list.includes(forme);
}

/** Surcharge for the chosen cadre = 190 × number of pieces, only for double + eligible forme. */
export function cadreSurcharge(
  forme: Forme,
  composition: Composition | number,
  cadre: Cadre,
): number {
  if (cadre !== 'double' || !cadreApplies(forme)) return 0;
  return CADRE_SURCHARGE * Number(composition);
}

/** Final price = matrix price + cadre surcharge. Null if the base combo is invalid. */
export function getFinalPrice(
  forme: Forme,
  composition: Composition | number,
  size: string,
  cadre: Cadre = 'simple',
): number | null {
  const base = getPrice(forme, composition, size);
  if (base == null) return null;
  return base + cadreSurcharge(forme, composition, cadre);
}

/** Format a price as "3 990 MAD" (fr-MA grouping, plain spaces). */
export function formatMAD(value: number | null | undefined): string {
  if (value == null || !isFinite(Number(value))) return 'Sur demande';
  const n = new Intl.NumberFormat('fr-MA', { useGrouping: true })
    .format(Number(value))
    .replace(/ | /g, ' ');
  return `${n} MAD`;
}
