'use client';
import { LangProvider } from './lang-context';
import { OrderProvider } from './order';
import { ConsentProvider } from './cookie-consent';
import { MetaPixel } from './pixel';

export default function Providers({ children, initialLang }) {
  return (
    <LangProvider initialLang={initialLang}>
      <ConsentProvider>
        <OrderProvider>{children}</OrderProvider>
        <MetaPixel />
      </ConsentProvider>
    </LangProvider>
  );
}
