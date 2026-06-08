'use client';
import { useLang, useReveal } from './components/lang-context';
import { Header, Footer } from './components/chrome';
import { Hero, TrustStrip, Collection, Categories, BeforeAfter, Mission, Reviews, Partners, Instagram } from './components/sections';

export default function HomeClient({ featured = null }) {
  const { lang } = useLang();
  useReveal([lang]);
  return (
    <>
      <Header page="home" />
      <main>
        <Hero />
        <TrustStrip />
        <Collection featured={featured} />
        <Categories />
        <BeforeAfter />
        <Mission />
        <Reviews />
        <Partners />
        <Instagram />
      </main>
      <Footer />
    </>
  );
}
