import './globals.css';
import Providers from './components/providers';

const SITE = 'https://www.calligraphyjoud.com';

export const metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Calligraphy JOUD — L'art au service de l'excellence",
    template: '%s · Calligraphy JOUD',
  },
  description:
    "Maison d'art marocaine depuis 1977. Tableaux de calligraphie arabe 100% faits main — pièces uniques. Livraison gratuite au Maroc, paiement à la livraison.",
  keywords: ['calligraphie arabe', 'tableau', 'art marocain', 'calligraphy', 'Maroc', 'fait main', 'art islamique', 'art moderne', 'art abstrait'],
  authors: [{ name: 'Calligraphy JOUD' }],
  alternates: { canonical: '/' },
  icons: { icon: '/assets/logo-mark-navy.png' },
  openGraph: {
    type: 'website',
    siteName: 'Calligraphy JOUD',
    title: "Calligraphy JOUD — L'art au service de l'excellence",
    description: "Tableaux de calligraphie arabe 100% faits main — pièces uniques. Maison d'art marocaine depuis 1977.",
    locale: 'fr_MA',
    images: ['/assets/imagery/gold-relief.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Calligraphy JOUD — L'art au service de l'excellence",
    description: 'Tableaux de calligraphie arabe 100% faits main — pièces uniques.',
    images: ['/assets/imagery/gold-relief.png'],
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: '#28324E',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" dir="ltr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
