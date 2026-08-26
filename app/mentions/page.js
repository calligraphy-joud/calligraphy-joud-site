import { LegalView } from '../components/content-pages';
export const metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales de JOUDART — éditeur, propriété intellectuelle, données personnelles et nature des œuvres faites main.',
  alternates: { canonical: '/mentions' },
};
export default function Page() { return <LegalView which="mentions" page="mentions" />; }
