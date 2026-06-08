'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLang, useReveal } from './lang-context';
import { Header, Footer } from './chrome';
import Boutique from './boutique';
import { CATEGORIES, SHOP_STR } from '../data/content';

function CollectionInner({ items }) {
  const { lang } = useLang();
  const params = useSearchParams();
  const catId = params.get('cat');
  const order = ['islamique', 'moderne', 'abstrait'];
  const cat = CATEGORIES.find((c) => c.id === catId);
  if (!cat) {
    const s = SHOP_STR.all[lang] || SHOP_STR.all.fr;
    return <Boutique variant="collection" intro={s} items={items} />;
  }
  const col = order.indexOf(cat.id);
  const name = lang === 'ar' ? cat.name_ar : lang === 'en' ? cat.name_en : cat.name;
  const desc = lang === 'ar' ? cat.desc_ar : lang === 'en' ? cat.desc_en : cat.desc;
  const intro = { eyebrow: SHOP_STR.colEyebrow[lang] || SHOP_STR.colEyebrow.fr, title: name, lead: desc, img: cat.img };
  return <Boutique variant="collection" lockCol={col} intro={intro} items={items} />;
}

export function CollectionView({ items = null }) {
  const { lang } = useLang();
  useReveal([lang]);
  return (<><Header page="catalogue" /><Suspense fallback={null}><CollectionInner items={items} /></Suspense><Footer /></>);
}

export function CatalogueView({ items = null }) {
  const { lang } = useLang();
  useReveal([lang]);
  const s = SHOP_STR.catalogue[lang] || SHOP_STR.catalogue.fr;
  return (<><Header page="catalogue" /><Boutique variant="catalogue" intro={s} items={items} /><Footer /></>);
}
