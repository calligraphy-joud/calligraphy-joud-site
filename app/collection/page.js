import { CollectionView } from '../components/shop-view';
import { getProducts } from '@/lib/woo';

export const revalidate = 300;

export const metadata = {
  title: 'Collection',
  description: "Toute la collection Calligraphy JOUD — 72 œuvres originales, 100% faites main et signées. Art islamique, moderne et abstrait. Filtrez par style, forme et composition.",
  alternates: { canonical: '/collection', languages: { 'fr-MA': '/collection?lang=fr', 'ar-MA': '/collection?lang=ar', 'en': '/collection?lang=en' } },
  openGraph: { title: 'Collection · Calligraphy JOUD', description: '72 œuvres originales, faites main et signées.', images: ['/assets/imagery/gallery-stair.png'] },
};

export default async function Page() {
  const { items } = await getProducts();
  return <CollectionView items={items} />;
}
