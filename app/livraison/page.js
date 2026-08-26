import { LegalView } from '../components/content-pages';
export const metadata = {
  title: 'Livraison & Retours',
  description: "Livraison gratuite partout au Maroc, paiement à la livraison et retour garanti sous 14 jours. Découvrez les conditions de livraison de JOUDART.",
  alternates: { canonical: '/livraison' },
};
export default function Page() { return <LegalView which="livraison" page="livraison" />; }
