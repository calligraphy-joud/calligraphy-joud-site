import { notFound } from 'next/navigation';
import { getProduct, getProducts } from '@/lib/woo';
import { STR } from '@/app/data/content';
import ProductClient from './product-client';

export const revalidate = 60;

const SITE = 'https://www.calligraphyjoud.com';
const COL_SLUG = ['islamique', 'moderne', 'abstrait'] as const;

export async function generateMetadata({ params }: { params: Promise<{ sku: string }> }) {
  const { sku: rawSku } = await params;
  const sku = decodeURIComponent(rawSku || '');
  const { item } = await getProduct(sku);
  if (!item) {
    return { title: 'Œuvre introuvable · Calligraphy JOUD' };
  }
  const colName = (STR as any).fr.bq.collections[item.col] || '';
  const desc = (STR as any).fr.pd.descByCol[item.col] || '';
  // The layout's title template appends " · Calligraphy JOUD", so keep this short.
  const title = `${item.name} · ${colName}`;
  const canonical = `/produit/${encodeURIComponent(item.id)}`;
  return {
    title,
    description: desc,
    alternates: { canonical },
    openGraph: {
      title,
      description: desc,
      url: `${SITE}${canonical}`,
      images: item.img ? [item.img] : undefined,
      type: 'website',
    },
  };
}

export default async function Page({ params }: { params: Promise<{ sku: string }> }) {
  const { sku: rawSku } = await params;
  const sku = decodeURIComponent(rawSku || '');
  const { item, woo, variations, source } = await getProduct(sku);
  if (!item) notFound();

  // Pull a slim list of other items for the "related" grid (server-fetched).
  const { items: all } = await getProducts();
  const related = (all || [])
    .filter((p) => p.id !== item.id)
    .slice(0, 4);

  return (
    <ProductClient
      item={item}
      woo={woo}
      variations={variations}
      source={source}
      related={related}
      colSlug={COL_SLUG[item.col]}
    />
  );
}
