const SITE = 'https://www.calligraphyjoud.com';
export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: SITE + '/sitemap.xml',
  };
}
