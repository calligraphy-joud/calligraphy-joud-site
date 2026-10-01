// Internal route for /collection?cat=<id>. middleware.ts rewrites the public
// query-string URL here so each category is pre-rendered (ISR) with its grid in
// the HTML, instead of reading ?cat on the client. Direct /collection/<id>
// requests are 404'd by the middleware, so the public URL stays the only one.
import { notFound } from 'next/navigation';
import { CollectionView } from '@/app/components/shop-view';
import { getProducts } from '@/lib/woo';
import { metadata as collectionMetadata } from '../page';

export const revalidate = 300;

const CATS = ['islamique', 'moderne', 'abstrait'];

export function generateStaticParams() {
  return CATS.map((cat) => ({ cat }));
}

export const metadata = collectionMetadata;

export default async function Page({ params }) {
  const { cat } = await params;
  if (!CATS.includes(cat)) notFound();
  const { items } = await getProducts();
  return <CollectionView items={items} cat={cat} />;
}
