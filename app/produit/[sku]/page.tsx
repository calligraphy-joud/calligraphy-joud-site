import { notFound } from 'next/navigation';
import { getProduct, getProducts } from '@/lib/woo';
import { STR, REVIEWS } from '@/app/data/content';
import { getStartingPrice, formeFromIndex } from '@/lib/pricing';
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
  const absImg = item.img ? (item.img.startsWith('http') ? item.img : `${SITE}${item.img}`) : undefined;
  const imgs = absImg ? [absImg] : undefined;
  return {
    title,
    description: desc,
    alternates: { canonical },
    openGraph: {
      title,
      description: desc,
      url: `${SITE}${canonical}`,
      images: imgs,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: imgs,
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

  const colName = (STR as any).fr.bq.collections[item.col] || '';
  const desc = (STR as any).fr.pd.descByCol[item.col] || '';
  const absImg = item.img ? (item.img.startsWith('http') ? item.img : `${SITE}${item.img}`) : undefined;
  const startFrom = getStartingPrice(formeFromIndex(item.forme), item.comp);
  const reviewCount = Array.isArray(REVIEWS) ? REVIEWS.length : 0;
  const productLd: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: item.name,
    image: absImg ? [absImg] : undefined,
    description: desc,
    sku: item.id,
    brand: { '@type': 'Brand', name: 'Calligraphy JOUD' },
    category: colName,
  };
  if (startFrom != null) {
    productLd.offers = {
      '@type': 'Offer',
      price: String(startFrom),
      priceCurrency: 'MAD',
      availability: 'https://schema.org/InStock',
      priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
      url: `${SITE}/produit/${encodeURIComponent(item.id)}`,
    };
  }
  if (reviewCount > 0) {
    productLd.aggregateRating = { '@type': 'AggregateRating', ratingValue: '5.0', reviewCount };
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />
      <ProductClient
        item={item}
        woo={woo}
        variations={variations}
        source={source}
        related={related}
        colSlug={COL_SLUG[item.col]}
      />
    </>
  );
}
