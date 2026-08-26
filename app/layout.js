import './globals.css';
import { cookies } from 'next/headers';
import Providers from './components/providers';

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

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const raw = cookieStore.get('lang')?.value;
  const lang = raw === 'ar' || raw === 'en' ? raw : 'fr';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  return (
    <html lang={lang} dir={dir}>
      <body>
        <Providers initialLang={lang}>{children}</Providers>
      </body>
    </html>
  );
}
