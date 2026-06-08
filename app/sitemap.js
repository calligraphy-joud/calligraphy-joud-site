const SITE = 'https://www.calligraphyjoud.com';
export default function sitemap() {
  const routes = ['', '/collection', '/catalogue', '/histoire', '/contact', '/livraison', '/mentions', '/confidentialite', '/cookies'];
  const now = new Date();
  return routes.map((r) => ({
    url: SITE + r,
    lastModified: now,
    changeFrequency: r === '' || r === '/collection' ? 'weekly' : 'monthly',
    priority: r === '' ? 1 : r === '/collection' || r === '/catalogue' ? 0.9 : 0.6,
  }));
}
