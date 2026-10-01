import '@/app/globals.css';
import { notFound } from 'next/navigation';
import Providers from '@/app/components/providers';
import { fontVars } from '@/app/fonts';

const SITE = 'https://www.joudart.com';

export const metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "JOUDART — L'art au service de l'excellence",
    template: '%s · JOUDART',
  },
  description:
    "Maison d'art marocaine depuis 1977. Tableaux de calligraphie arabe 100% faits main — pièces uniques. Livraison gratuite au Maroc, paiement à la livraison.",
  keywords: ['calligraphie arabe', 'tableau', 'art marocain', 'calligraphy', 'Maroc', 'fait main', 'art islamique', 'art moderne', 'art abstrait'],
  authors: [{ name: 'JOUDART' }],
  alternates: {
    canonical: '/',
    languages: {
      'fr-MA': '/?lang=fr',
      'ar-MA': '/?lang=ar',
      'en': '/?lang=en',
    },
  },
  icons: { icon: '/assets/logo-mark-navy.png' },
  openGraph: {
    type: 'website',
    siteName: 'JOUDART',
    title: "JOUDART — L'art au service de l'excellence",
    description: "Tableaux de calligraphie arabe 100% faits main — pièces uniques. Maison d'art marocaine depuis 1977.",
    locale: 'fr_MA',
    alternateLocale: ['ar_MA', 'en_US'],
    images: ['/assets/imagery/hero.webp'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "JOUDART — L'art au service de l'excellence",
    description: 'Tableaux de calligraphie arabe 100% faits main — pièces uniques.',
    images: ['/assets/imagery/hero.webp'],
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: '#28324E',
  width: 'device-width',
  initialScale: 1,
};

// The locale is a route segment, not a cookie read: middleware.ts rewrites every
// public URL (/collection) to /{fr|ar|en}/collection from ?lang= / the `lang`
// cookie, so each locale is pre-rendered once and served statically (ISR)
// instead of server-rendering every request. Public URLs are unchanged.
const LOCALES = ['fr', 'ar', 'en'];

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function RootLayout({ children, params }) {
  const { locale } = await params;
  if (!LOCALES.includes(locale)) notFound();
  const lang = locale;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  return (
    <html lang={lang} dir={dir} className={fontVars}>
      <body>
        <Providers initialLang={lang}>{children}</Providers>
      </body>
    </html>
  );
}
