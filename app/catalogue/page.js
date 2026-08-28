import { CatalogueView } from '../components/shop-view';
import { getProducts } from '@/lib/woo';

export const revalidate = 300;

export const metadata = {
  title: 'Catalogue 2026',
  description: "Le catalogue complet 2026 de JOUDART — des œuvres calligraphiques originales, faites main.",
  alternates: { canonical: '/catalogue', languages: { 'fr-MA': '/catalogue?lang=fr', 'ar-MA': '/catalogue?lang=ar', 'en': '/catalogue?lang=en' } },
  openGraph: { title: 'Catalogue 2026 · JOUDART', description: 'Le catalogue complet — des œuvres originales faites main.', images: ['/assets/imagery/hero.webp'] },
};

export default async function Page() {
  const { items } = await getProducts();
  return <CatalogueView items={items} />;
}
