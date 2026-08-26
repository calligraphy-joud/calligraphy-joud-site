import { HistoireView } from '../components/content-pages';
export const metadata = {
  title: 'Notre histoire',
  description: "Depuis 1977, JOUDART perpétue l'art de la calligraphie arabe — une main de famille transmise de génération en génération, entre tradition et création contemporaine.",
  alternates: { canonical: '/histoire', languages: { 'fr-MA': '/histoire?lang=fr', 'ar-MA': '/histoire?lang=ar', 'en': '/histoire?lang=en' } },
  openGraph: { title: 'Notre histoire · JOUDART', description: "Une maison d'art marocaine depuis 1977.", images: ['/assets/imagery/gallery-stair.png'] },
};
export default function Page() { return <HistoireView />; }
