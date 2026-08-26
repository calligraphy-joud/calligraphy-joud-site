import { LegalView } from '../components/content-pages';
export const metadata = {
  title: 'Politique relative aux cookies',
  description: 'Comment JOUDART utilise les cookies et comment gérer vos choix de consentement.',
  alternates: { canonical: '/cookies' },
};
export default function Page() { return <LegalView which="cookies" page="cookies" />; }
