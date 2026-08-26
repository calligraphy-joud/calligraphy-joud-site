import attrs from './data/joud-products-attributes.json';

const SITE = 'https://www.joudart.com';

export default function sitemap() {
  const now = new Date();
  const statics = ['', '/collection', '/catalogue', '/histoire', '/contact', '/livraison', '/mentions', '/confidentialite', '/cookies']
    .map((r) => ({
      url: SITE + r,
      lastModified: now,
      changeFrequency: r === '' || r === '/collection' ? 'weekly' : 'monthly',
      priority: r === '' ? 1 : r === '/collection' || r === '/catalogue' ? 0.9 : 0.6,
    }));

  // All 72 product pages, by SKU (single source of truth: the attributes file).
  const products = Object.keys((attrs && attrs.products) || {}).map((sku) => ({
    url: `${SITE}/produit/${sku}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...statics, ...products];
}
