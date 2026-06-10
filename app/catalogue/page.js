import { CatalogueView } from '../components/shop-view';
import { getProducts } from '@/lib/woo';

export const revalidate = 30;

export const metadata = {
  title: 'Catalogue 2026',
  description: "Le catalogue complet 2026 de Calligraphy JOUD — 72 œuvres calligraphiques originales, faites main. Filtrez par collection, forme et composition.",
  alternates: { canonical: '/catalogue' },
  openGraph: { title: 'Catalogue 2026 · Calligraphy JOUD', description: 'Le catalogue complet — 72 œuvres originales faites main.', images: ['/assets/imagery/gold-relief.png'] },
};

export default async function Page() {
  const { items } = await getProducts();
  return <CatalogueView items={items} />;
}
