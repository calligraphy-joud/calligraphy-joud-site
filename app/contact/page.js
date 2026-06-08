import { ContactView } from '../components/content-pages';
export const metadata = {
  title: 'Contact',
  description: "Contactez Calligraphy JOUD à Agadir — WhatsApp, téléphone, e-mail. Commande personnalisée, questions, projet sur mesure : nous répondons vite.",
  alternates: { canonical: '/contact' },
  openGraph: { title: 'Contact · Calligraphy JOUD', description: 'Parlons de votre mur — réponse rapide sur WhatsApp.' },
};
export default function Page() { return <ContactView />; }
