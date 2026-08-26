import { LegalView } from '../components/content-pages';
export const metadata = {
  title: 'Politique de confidentialité',
  description: 'Comment JOUDART collecte, utilise et protège vos données personnelles.',
  alternates: { canonical: '/confidentialite' },
};
export default function Page() { return <LegalView which="confidentialite" page="confidentialite" />; }
