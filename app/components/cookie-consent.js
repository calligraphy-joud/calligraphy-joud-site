'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLang } from './lang-context';

const ConsentCtx = createContext(null);
export function useConsent() {
  return useContext(ConsentCtx) || { consent: 'unknown', setConsent: () => {} };
}

const TXT = {
  fr: {
    msg: 'Nous utilisons des cookies pour améliorer votre expérience et mesurer notre audience. Vous pouvez accepter ou refuser les cookies de mesure.',
    accept: 'Accepter',
    refuse: 'Refuser',
    more: 'En savoir plus',
  },
  en: {
    msg: 'We use cookies to improve your experience and measure our audience. You can accept or decline measurement cookies.',
    accept: 'Accept',
    refuse: 'Decline',
    more: 'Learn more',
  },
  ar: {
    msg: 'نستخدم ملفات تعريف الارتباط لتحسين تجربتك وقياس جمهورنا. يمكنك قبول أو رفض ملفات القياس.',
    accept: 'قبول',
    refuse: 'رفض',
    more: 'معرفة المزيد',
  },
};

export function ConsentProvider({ children }) {
  const [consent, setConsentState] = useState('unknown'); // unknown | granted | denied
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem('joud-consent');
      if (s === 'granted' || s === 'denied') setConsentState(s);
      else setShow(true);
    } catch (e) {
      setShow(true);
    }
  }, []);

  const setConsent = useCallback((v) => {
    setConsentState(v);
    setShow(false);
    try { localStorage.setItem('joud-consent', v); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('joud-consent', { detail: v })); } catch (e) {}
  }, []);

  return (
    <ConsentCtx.Provider value={{ consent, setConsent }}>
      {children}
      {show && <Banner onChoose={setConsent} />}
    </ConsentCtx.Provider>
  );
}

function Banner({ onChoose }) {
  const { lang, go } = useLang();
  const t = TXT[lang] || TXT.fr;
  return (
    <div className="cc" role="dialog" aria-label="Cookies">
      <p className="cc__msg">
        {t.msg}{' '}
        <a href="#" className="cc__more" onClick={(e) => { e.preventDefault(); go('cookies'); }}>{t.more}</a>
      </p>
      <div className="cc__actions">
        <button className="cc__btn cc__btn--ghost" onClick={() => onChoose('denied')}>{t.refuse}</button>
        <button className="cc__btn cc__btn--solid" onClick={() => onChoose('granted')}>{t.accept}</button>
      </div>
    </div>
  );
}
