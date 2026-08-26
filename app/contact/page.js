import { ContactView } from '../components/content-pages';
export const metadata = {
  title: 'Contact',
  description: "Contactez JOUDART à Agadir — WhatsApp, téléphone, e-mail. Commande personnalisée, questions, projet sur mesure : nous répondons vite.",
  alternates: { canonical: '/contact', languages: { 'fr-MA': '/contact?lang=fr', 'ar-MA': '/contact?lang=ar', 'en': '/contact?lang=en' } },
  openGraph: { title: 'Contact · JOUDART', description: 'Parlons de votre mur — réponse rapide sur WhatsApp.' },
};
export default function Page() { return <ContactView />; }
