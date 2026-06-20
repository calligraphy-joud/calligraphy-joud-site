'use client';
import { LangProvider } from './lang-context';
import { OrderProvider } from './order';
import { ConsentProvider } from './cookie-consent';
import { MetaPixel } from './pixel';
import { GoogleTag } from './gtag';

export default function Providers({ children, initialLang }) {
  return (
    <LangProvider initialLang={initialLang}>
      <ConsentProvider>
        <OrderProvider>{children}</OrderProvider>
        <MetaPixel />
        {/* Google twin of MetaPixel — GA4 + Google Ads, also consent-gated. */}
        <GoogleTag />
      </ConsentProvider>
    </LangProvider>
  );
}
