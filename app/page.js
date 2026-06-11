import HomeClient from './home-client';
import { getProducts } from '@/lib/woo';

export const revalidate = 300;

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Calligraphy JOUD',
  description: "Maison d'art marocaine spécialisée dans les tableaux de calligraphie arabe 100% faits main.",
  foundingDate: '1977',
  url: 'https://www.calligraphyjoud.com',
  logo: 'https://www.calligraphyjoud.com/assets/logo-mark-navy.png',
  address: { '@type': 'PostalAddress', addressLocality: 'Agadir', addressCountry: 'MA' },
  aggregateRating: { '@type': 'AggregateRating', ratingValue: '5.0', reviewCount: '3' },
};

// One featured piece per collection: Islamique (col 0), Moderne (col 1), Abstrait (col 2).
function pickMix(items) {
  if (!Array.isArray(items)) return [];
  const mix = [0, 1, 2].map((c) => items.find((p) => p && p.col === c)).filter(Boolean);
  for (const p of items) {
    if (mix.length >= 3) break;
    if (!mix.includes(p)) mix.push(p);
  }
  return mix.slice(0, 3);
}

export default async function Page() {
  const { items } = await getProducts();
  const featured = pickMix(items);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomeClient featured={featured} />
    </>
  );
}
