const SITE = 'https://www.joudart.com';
export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: SITE + '/sitemap.xml',
  };
}
