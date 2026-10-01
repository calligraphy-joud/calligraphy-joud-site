'use client';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { WHATSAPP_NUMBER } from '@/lib/whatsapp';

/* ---- WhatsApp config: change this one number to go live ---- */
export const WA_NUMBER = WHATSAPP_NUMBER; // single source of truth: lib/whatsapp.ts

// Loaded on first open (see order-modal.js). Rendered client-side only: it is
// never part of the server HTML because it only appears after a click.
const OrderModal = dynamic(() => import('./order-modal'), { ssr: false });

const OrderCtx = createContext(null);
export function useOrder() {
  const ctx = useContext(OrderCtx);
  return ctx || { openOrder: () => {} };
}

export function OrderProvider({ children }) {
  const [product, setProduct] = useState(undefined); // undefined = closed; null = commission; obj = product
  const openOrder = useCallback((p = null) => setProduct(p), []);
  const closeOrder = useCallback(() => setProduct(undefined), []);
  // Warm the modal chunk once the page is idle so the first click opens instantly.
  useEffect(() => {
    const warm = () => { import('./order-modal'); };
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(warm, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(warm, 3000);
    return () => clearTimeout(id);
  }, []);
  return (
    <OrderCtx.Provider value={{ openOrder }}>
      {children}
      {product !== undefined && <OrderModal product={product} onClose={closeOrder} />}
    </OrderCtx.Provider>
  );
}
