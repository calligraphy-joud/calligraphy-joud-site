import HomeClient from './home-client';
import { getProducts } from '@/lib/woo';

export const revalidate = 60;

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

export default async function Page() {
  const { items } = await getProducts();
  const featured = Array.isArray(items) ? items.slice(0, 3) : [];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomeClient featured={featured} />
    </>
  );
}
