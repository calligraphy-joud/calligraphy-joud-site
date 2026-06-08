'use client';
import { LangProvider } from './lang-context';
import { OrderProvider } from './order';
import { ConsentProvider } from './cookie-consent';
import { MetaPixel } from './pixel';

export default function Providers({ children }) {
  return (
    <LangProvider>
      <ConsentProvider>
        <OrderProvider>{children}</OrderProvider>
        <MetaPixel />
      </ConsentProvider>
    </LangProvider>
  );
}
