'use client';
import { useLang, useReveal } from './lang-context';
import { Header, Footer } from './chrome';
import { Button } from './ui';
import { Icons } from './icons';
import { useOrder } from './order';
import { WA_NUMBER } from './order';

const IMG = '/assets/imagery/';

/* ---------------- Notre histoire ---------------- */
export function HistoireView() {
  const { t, lang, go } = useLang();
  const { openOrder } = useOrder();
  useReveal([lang]);
  const h = t.hist;
  const steps = t.pd.steps;
  return (
    <>
      <Header page="histoire" />
      <main>
        <section className="wrap hs-hero">
          <span className="eyebrow" data-reveal>{h.eyebrow}</span>
          {lang === 'ar'
            ? <h1 data-reveal data-delay="1">{h.title}</h1>
            : <h1 data-reveal data-delay="1">Notre <span className="ital">histoire.</span></h1>}
          <p className="hs-hero__lead" data-reveal data-delay="2">{h.lead}</p>
          <figure className="hs-herofig" data-reveal data-delay="2" style={{ margin: 'clamp(2.5rem,5vw,8rem) auto 0' }}>
            <div className="joud-frame" style={{ padding: 18 }}>
              <div className="joud-frame__img" style={{ aspectRatio: '16 / 9' }}><img loading="lazy" src={IMG + 'maison-2.webp'} alt="" /></div>
              <span className="joud-frame__bevel" style={{ inset: 18 }} />
            </div>
            <figcaption>{h.heroCap}</figcaption>
          </figure>
        </section>

        <section className="section hs-origin">
          <span className="hs-origin__year-bg serif" aria-hidden="true">{h.year}</span>
          <div className="wrap hs-origin__grid">
            <div className="hs-origin__copy">
              <span className="eyebrow" data-reveal>{h.originEyebrow}</span>
              <h2 data-reveal data-delay="1">{h.originTitle}</h2>
              {h.originBody.map((p, i) => <p key={i} data-reveal data-delay={String(i + 1)}>{p}</p>)}
            </div>
            <figure className="hs-origin__fig" data-reveal data-delay="2" style={{ margin: 0 }}>
              <div className="joud-frame">
                <div className="joud-frame__img" style={{ aspectRatio: '4 / 5' }}><img loading="lazy" src={IMG + 'maison-1.webp'} alt="" /></div>
                <span className="joud-frame__bevel" />
              </div>
            </figure>
          </div>
        </section>

        <section className="maison-quote">
          <div className="wrap maison-quote__inner">
            <div data-reveal>
              <blockquote>
                {lang === 'ar' ? 'ألوانٌ، وذهبٌ، وقلب.' : lang === 'en' ? 'Colour, gold, and heart.' : 'Des couleurs, de l’or et du cœur.'}
              </blockquote>
              <cite>{lang === 'ar' ? 'JOUDART — منذ 1977' : 'JOUDART — depuis 1977'}</cite>
            </div>
            <div className="maison-quote__pair" data-reveal data-delay="1">
              <figure><img loading="lazy" src={IMG + 'lifestyle-1.webp'} alt="" /></figure>
              <figure><img loading="lazy" src={IMG + 'lifestyle-3.webp'} alt="" /></figure>
            </div>
          </div>
        </section>

        <section className="section section--tight">
          <div className="wrap">
            <div className="section-head section-head--center">
              <span className="eyebrow eyebrow--center" data-reveal>{h.atelierEyebrow}</span>
              <h2 className="section-head__title" data-reveal data-delay="1">{h.atelierTitle}</h2>
              <p className="section-head__lead" data-reveal data-delay="2">{h.atelierText}</p>
            </div>
            <div className="hs-atelier__montage">
              <div className="cell cell--a" data-reveal><img loading="lazy" src={IMG + 'matiere-1.webp'} alt="Détail matière — feuille d’or appliquée à la main, JOUDART" /></div>
              <div className="cell cell--b" data-reveal data-delay="1"><img loading="lazy" src={IMG + 'matiere-2.webp'} alt="Détail matière — texture et relief, atelier JOUDART" /></div>
              <div className="cell cell--c" data-reveal data-delay="1"><img loading="lazy" src={IMG + 'matiere-3.webp'} alt="Détail matière — pigments et patine, atelier JOUDART" /></div>
              <div className="cell cell--d" data-reveal><img loading="lazy" src={IMG + 'lifestyle-2.webp'} alt="Œuvre JOUDART mise en scène dans un intérieur" /></div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <div className="section-head section-head--center">
              <span className="eyebrow eyebrow--center" data-reveal>{h.processEyebrow}</span>
              <h2 className="section-head__title" data-reveal data-delay="1">{h.processTitle}</h2>
            </div>
            <div className="hs-proc">
              {steps.map((s, i) => (
                <div className="hs-step" key={i} data-reveal data-delay={String(i % 4)}>
                  <span className="hs-step__n serif">{s[0]}</span>
                  <span className="hs-step__t">{s[1]}</span>
                  <span className="hs-step__d">{s[2]}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section hs-quote">
          <div className="wrap wrap--md">
            <hr data-reveal />
            <blockquote data-reveal data-delay="1">{h.quote}</blockquote>
            <div className="sig" data-reveal data-delay="2">JOUDART · {h.eyebrow}</div>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <div className="section-head section-head--center"><span className="eyebrow eyebrow--center" data-reveal>{h.valuesEyebrow}</span></div>
            <div className="hs-values">
              {h.values.map((v, i) => (
                <div className="hs-value" key={i} data-reveal data-delay={String(i)}>
                  <span className="hs-value__n serif">0{i + 1}</span>
                  <h3>{v[0]}</h3>
                  <p>{v[1]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--tight">
          <div className="wrap wrap--md hs-cta">
            <span className="eyebrow eyebrow--center" data-reveal>{lang === 'ar' ? 'مخصّص' : 'Personnalisé'}</span>
            <h2 className="serif" data-reveal data-delay="1">{h.ctaTitle}</h2>
            <p data-reveal data-delay="2">{h.ctaText}</p>
            <div className="hs-cta__row" data-reveal data-delay="2">
              <Button variant="primary" size="lg" rightIcon={<Icons.arrow />} onClick={() => go('collection')}>{h.cta1}</Button>
              <Button variant="secondary" size="lg" onClick={() => openOrder()}>{h.cta2}</Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

/* ---------------- Contact ---------------- */
const CT_WA = WA_NUMBER;
export function ContactView() {
  const { t, lang } = useLang();
  useReveal([lang]);
  const c = t.contact;
  const waText = lang === 'ar' ? 'مرحباً JOUDART، أودّ الاستفسار عن أعمالكم.' : 'Bonjour JOUDART, je souhaite me renseigner sur vos œuvres.';
  const waHref = 'https://wa.me/' + CT_WA + '?text=' + encodeURIComponent(waText);
  const mapsHref = 'https://www.google.com/maps/search/?api=1&query=Agadir%2C%20Maroc';
  return (
    <>
      <Header page="contact" />
      <main>
        <section className="wrap ct-hero">
          <span className="eyebrow" data-reveal>{c.eyebrow}</span>
          <h1 data-reveal data-delay="1">{c.title}</h1>
          <p className="ct-hero__lead" data-reveal data-delay="2">{c.lead}</p>
        </section>
        <div className="wrap ct-grid">
          <div className="ct-left">
            <div className="ct-wa" data-reveal>
              <span className="ct-wa__badge"><Icons.whatsapp /></span>
              <h2 className="serif">{c.waTitle}</h2>
              <p>{c.waText}</p>
              <a className="ct-wa__btn" href={waHref} target="_blank" rel="noopener noreferrer"><Icons.whatsapp /> {c.waBtn}</a>
              <span className="ct-wa__num">{c.waNumber}</span>
            </div>
            <div className="ct-chan" data-reveal data-delay="1">
              <span className="ct-chan__h">{c.channelsTitle}</span>
              <div className="ct-row"><span className="ct-row__ic"><Icons.phone /></span><span className="ct-row__tx"><span className="ct-row__k">{c.phoneLabel}</span><a className="ct-row__v" href={'tel:' + c.phoneVal.replace(/\s/g, '')}>{c.phoneVal}</a></span></div>
              <div className="ct-row"><span className="ct-row__ic"><Icons.mail /></span><span className="ct-row__tx"><span className="ct-row__k">{c.mailLabel}</span><a className="ct-row__v" href={'mailto:' + c.mailVal}>{c.mailVal}</a></span></div>
              <div className="ct-row"><span className="ct-row__ic"><Icons.pin /></span><span className="ct-row__tx"><span className="ct-row__k">{c.addrLabel}</span><span className="ct-row__v">{c.addrVal}</span></span></div>
              <div className="ct-row"><span className="ct-row__ic"><Icons.clock /></span><span className="ct-row__tx"><span className="ct-row__k">{c.hoursLabel}</span><span className="ct-row__v">{c.hoursVal}</span></span></div>
            </div>
            <div className="ct-social" data-reveal data-delay="1">
              <span className="ct-chan__h">{c.socialTitle}</span>
              <div className="ct-social__row">
                <a href="https://instagram.com/calligraphyjoud" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Icons.insta /></a>
                <a href="https://facebook.com/calligraphyjoud" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Icons.facebook /></a>
                <a href={waHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><Icons.whatsapp /></a>
              </div>
            </div>
          </div>
          <div className="ct-map" data-reveal data-delay="1">
            <span className="ct-chan__h" style={{ display: 'block', marginBlockEnd: 'var(--space-4)' }}>{c.mapTitle}</span>
            <div className="ct-map__frame">
              <iframe title="Agadir" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=Agadir%2C%20Maroc&z=12&output=embed" />
              <div className="ct-map__card">
                <span className="ct-map__city"><Icons.pin /> <b className="serif">{c.mapCity}</b></span>
                <a className="ct-map__link" href={mapsHref} target="_blank" rel="noopener noreferrer">{c.mapBtn} <Icons.arrow /></a>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

/* ---------------- Legal (Livraison / Mentions) ---------------- */
const LEGAL = {
  livraison: {
    fr: { eyebrow: 'Informations', title: 'Livraison & Retours', intro: 'Texte indicatif — à remplacer par vos conditions définitives.', sections: [['Livraison gratuite au Maroc', 'Chaque œuvre est livrée gratuitement partout au Maroc, emballée avec soin pour le transport. Les délais indicatifs sont de 3 à 7 jours ouvrés selon la ville et la disponibilité de la pièce.'], ['Paiement à la livraison', 'Vous réglez à la réception de l’œuvre, en toute confiance. Aucun paiement en ligne n’est requis pour passer commande.'], ['Retour garanti — 14 jours', 'Si l’œuvre ne vous convient pas, vous disposez de 14 jours pour nous contacter et organiser un retour. La pièce doit être restituée dans son état et son emballage d’origine.'], ['Livraison à l’international', 'Pour toute commande hors du Maroc, contactez-nous sur WhatsApp : nous établissons un devis de transport assuré, au cas par cas.']] },
    ar: { eyebrow: 'معلومات', title: 'الشحن والإرجاع', intro: 'نص إرشادي — يُستبدل بشروطك النهائية.', sections: [['توصيل مجاني داخل المغرب', 'كل عمل يُسلَّم مجاناً في كل المغرب، مُغلَّفاً بعناية للنقل. المدة التقريبية من 3 إلى 7 أيام عمل حسب المدينة وتوفّر القطعة.'], ['الدفع عند الاستلام', 'تدفع عند استلام العمل، بكل ثقة. لا حاجة لأي دفع عبر الإنترنت لتقديم الطلب.'], ['إرجاع مضمون — 14 يوماً', 'إذا لم يناسبك العمل، لديك 14 يوماً للتواصل معنا وتنظيم الإرجاع. يجب إعادة القطعة بحالتها وتغليفها الأصلي.'], ['الشحن الدولي', 'لأي طلب خارج المغرب، تواصل معنا عبر واتساب: نعدّ عرض شحن مؤمَّن، حسب كل حالة.']] },
    en: { eyebrow: 'Information', title: 'Delivery & Returns', intro: 'Placeholder text — to be replaced with your final terms.', sections: [['Free delivery in Morocco', 'Every work is delivered free anywhere in Morocco, carefully packed for transport. Indicative times are 3 to 7 business days depending on the city and the piece’s availability.'], ['Cash on delivery', 'You pay when the work arrives, with full confidence. No online payment is required to place an order.'], ['Guaranteed returns — 14 days', 'If the work isn’t right for you, you have 14 days to contact us and arrange a return. The piece must be returned in its original condition and packaging.'], ['International delivery', 'For any order outside Morocco, reach us on WhatsApp: we’ll prepare an insured shipping quote, case by case.']] },
  },
  mentions: {
    fr: { eyebrow: 'Informations', title: 'Mentions légales', intro: 'Texte indicatif — à remplacer par vos informations légales définitives.', sections: [['Éditeur', 'JOUDART — maison d’art marocaine. Adresse de l’atelier : Agadir, Maroc. Contact : contact@joudart.com.'], ['Propriété intellectuelle', 'L’ensemble des œuvres, visuels et textes présentés sur ce site est la propriété de JOUDART. Toute reproduction, même partielle, est interdite sans autorisation écrite.'], ['Données personnelles', 'Les informations communiquées lors d’une commande (nom, téléphone, ville) servent uniquement au traitement de votre demande et ne sont jamais cédées à des tiers.'], ['Œuvres faites main', 'Chaque pièce étant réalisée à la main, de légères variations de matière, de teinte et de relief sont inhérentes au caractère unique de l’œuvre.']] },
    ar: { eyebrow: 'معلومات', title: 'إشعار قانوني', intro: 'نص إرشادي — يُستبدل بمعلوماتك القانونية النهائية.', sections: [['الناشر', 'JOUDART — دار فنّ مغربية. عنوان المرسم: أكادير، المغرب. للتواصل: contact@joudart.com.'], ['الملكية الفكرية', 'جميع الأعمال والصور والنصوص المعروضة على هذا الموقع ملك لـ JOUDART. يُمنع أي استنساخ، ولو جزئي، دون إذن كتابي.'], ['البيانات الشخصية', 'المعلومات المقدَّمة عند الطلب (الاسم، الهاتف، المدينة) تُستخدم فقط لمعالجة طلبك ولا تُمنح أبداً لأطراف ثالثة.'], ['أعمال يدوية', 'بما أن كل قطعة تُصنع يدوياً، فإن اختلافات طفيفة في المادة واللون والنتوء هي من طبيعة العمل الفريد.']] },
    en: { eyebrow: 'Information', title: 'Legal notice', intro: 'Placeholder text — to be replaced with your final legal information.', sections: [['Publisher', 'JOUDART — Moroccan art house. Atelier address: Agadir, Morocco. Contact: contact@joudart.com.'], ['Intellectual property', 'All works, images and texts on this site are the property of JOUDART. Any reproduction, even partial, is forbidden without written permission.'], ['Personal data', 'The information you provide when ordering (name, phone, city) is used solely to process your request and is never shared with third parties.'], ['Handmade works', 'As each piece is made by hand, slight variations in material, tone and relief are inherent to the unique nature of the work.']] },
  },
  confidentialite: {
    fr: { eyebrow: 'Confidentialité', title: 'Politique de confidentialité', intro: 'Modèle indicatif — à faire valider. Dernière mise à jour : 2026.', sections: [
      ['Données que nous collectons', 'Lorsque vous passez commande ou nous contactez, nous recueillons votre nom, votre ville, votre numéro de téléphone (WhatsApp) et, le cas échéant, votre e-mail, votre message et la photo de votre espace que vous choisissez de partager. Lors de votre navigation, des données techniques (pages vues, appareil) peuvent être collectées via des cookies de mesure, uniquement avec votre consentement.'],
      ['Utilisation des données', 'Vos informations servent à traiter et livrer votre commande, vous recontacter pour confirmer les détails, et — avec votre consentement — à mesurer l’audience du site et améliorer nos campagnes. Le paiement se fait à la livraison ; aucune donnée bancaire n’est demandée ni stockée.'],
      ['Partage', 'Nous ne vendons jamais vos données. Elles peuvent être traitées par nos prestataires techniques (hébergement, WooCommerce) et, avec votre consentement, par Meta (Facebook) à des fins de mesure publicitaire. Vos coordonnées peuvent être partagées avec le transporteur pour la livraison.'],
      ['Conservation', 'Vos données de commande sont conservées le temps nécessaire au traitement et aux obligations légales, puis supprimées ou anonymisées.'],
      ['Vos droits', 'Vous pouvez demander l’accès, la rectification ou la suppression de vos données, ou retirer votre consentement à tout moment, en écrivant à contact@joudart.com.'],
      ['Cookies', 'Ce site utilise des cookies. Pour en savoir plus et gérer vos choix, consultez notre page Cookies.'],
    ] },
    ar: { eyebrow: 'الخصوصية', title: 'سياسة الخصوصية', intro: 'نموذج إرشادي — يُراجَع قانونياً. آخر تحديث: 2026.', sections: [
      ['البيانات التي نجمعها', 'عند تقديم طلب أو التواصل معنا، نجمع اسمك ومدينتك ورقم هاتفك (واتساب)، وعند الاقتضاء بريدك الإلكتروني ورسالتك وصورة مساحتك التي تختار مشاركتها. أثناء التصفّح، قد تُجمع بيانات تقنية عبر ملفات القياس، بموافقتك فقط.'],
      ['استخدام البيانات', 'تُستخدم معلوماتك لمعالجة طلبك وتوصيله، والتواصل معك للتأكيد، و—بموافقتك—لقياس جمهور الموقع وتحسين حملاتنا. الدفع عند الاستلام؛ لا نطلب أي بيانات بنكية ولا نخزّنها.'],
      ['المشاركة', 'لا نبيع بياناتك أبداً. قد تُعالَج من قِبل مزوّدينا التقنيين (الاستضافة، WooCommerce)، وبموافقتك من قِبل Meta لأغراض قياس الإعلانات. قد تُشارَك بياناتك مع شركة التوصيل.'],
      ['الاحتفاظ', 'نحتفظ ببيانات طلبك للمدة اللازمة للمعالجة والالتزامات القانونية، ثم تُحذف أو يُزال تعريفها.'],
      ['حقوقك', 'يمكنك طلب الوصول إلى بياناتك أو تصحيحها أو حذفها، أو سحب موافقتك في أي وقت، عبر contact@joudart.com.'],
      ['ملفات الارتباط', 'يستخدم هذا الموقع ملفات تعريف الارتباط. لمعرفة المزيد وإدارة خياراتك، راجع صفحة ملفات الارتباط.'],
    ] },
    en: { eyebrow: 'Privacy', title: 'Privacy Policy', intro: 'Indicative template — to be legally reviewed. Last updated: 2026.', sections: [
      ['Data we collect', 'When you order or contact us, we collect your name, city, phone (WhatsApp) and, where applicable, your email, message and the photo of your space you choose to share. While browsing, technical data (pages viewed, device) may be collected via measurement cookies, only with your consent.'],
      ['How we use data', 'Your information is used to process and deliver your order, contact you to confirm details, and — with your consent — to measure site audience and improve our campaigns. Payment is on delivery; no banking data is requested or stored.'],
      ['Sharing', 'We never sell your data. It may be processed by our technical providers (hosting, WooCommerce) and, with your consent, by Meta (Facebook) for ad measurement. Your details may be shared with the carrier for delivery.'],
      ['Retention', 'Order data is kept as long as needed for processing and legal obligations, then deleted or anonymised.'],
      ['Your rights', 'You may request access, correction or deletion of your data, or withdraw consent at any time, by writing to contact@joudart.com.'],
      ['Cookies', 'This site uses cookies. To learn more and manage your choices, see our Cookies page.'],
    ] },
  },
  cookies: {
    fr: { eyebrow: 'Cookies', title: 'Politique relative aux cookies', intro: 'Comment nous utilisons les cookies et comment gérer vos choix.', sections: [
      ['Qu’est-ce qu’un cookie ?', 'Un cookie est un petit fichier déposé sur votre appareil lors de la visite d’un site. Il permet de mémoriser vos préférences et de mesurer l’audience.'],
      ['Cookies essentiels', 'Indispensables au fonctionnement du site, ils mémorisent par exemple votre langue et votre choix de consentement. Ils ne nécessitent pas votre accord.'],
      ['Cookies de mesure (Meta Pixel)', 'Avec votre consentement, nous utilisons le pixel Meta (Facebook) pour mesurer la performance de nos publicités et l’audience du site. Ces cookies ne sont déposés que si vous cliquez sur « Accepter ».'],
      ['Gérer vos choix', 'Vous pouvez refuser les cookies de mesure dès la bannière, ou les effacer à tout moment depuis les réglages de votre navigateur. Le refus n’empêche pas de commander.'],
      ['Contact', 'Pour toute question : contact@joudart.com.'],
    ] },
    ar: { eyebrow: 'ملفات الارتباط', title: 'سياسة ملفات الارتباط', intro: 'كيف نستخدم ملفات الارتباط وكيف تدير خياراتك.', sections: [
      ['ما هو ملف الارتباط؟', 'ملف صغير يُحفظ على جهازك عند زيارة موقع. يتيح تذكّر تفضيلاتك وقياس الجمهور.'],
      ['ملفات أساسية', 'ضرورية لعمل الموقع، تتذكّر مثلاً لغتك واختيار موافقتك. لا تتطلّب موافقتك.'],
      ['ملفات القياس (Meta Pixel)', 'بموافقتك، نستخدم بكسل Meta لقياس أداء إعلاناتنا وجمهور الموقع. تُحفظ هذه الملفات فقط إذا نقرت «قبول».'],
      ['إدارة خياراتك', 'يمكنك رفض ملفات القياس من الشريط، أو مسحها في أي وقت من إعدادات متصفّحك. الرفض لا يمنعك من الطلب.'],
      ['التواصل', 'لأي استفسار: contact@joudart.com.'],
    ] },
    en: { eyebrow: 'Cookies', title: 'Cookie Policy', intro: 'How we use cookies and how to manage your choices.', sections: [
      ['What is a cookie?', 'A cookie is a small file placed on your device when you visit a site. It remembers your preferences and helps measure audience.'],
      ['Essential cookies', 'Required for the site to work — they remember things like your language and your consent choice. They don’t need your agreement.'],
      ['Measurement cookies (Meta Pixel)', 'With your consent, we use the Meta (Facebook) pixel to measure our ad performance and site audience. These cookies are only set if you click “Accept”.'],
      ['Managing your choices', 'You can decline measurement cookies from the banner, or clear them anytime from your browser settings. Declining does not prevent you from ordering.'],
      ['Contact', 'Any questions: contact@joudart.com.'],
    ] },
  },
};

export function LegalView({ which, page }) {
  const { lang } = useLang();
  useReveal([lang]);
  const s = (LEGAL[which] && (LEGAL[which][lang] || LEGAL[which].fr)) || LEGAL.livraison.fr;
  return (
    <>
      <Header page={page} />
      <main className="sp">
        <section className="wrap wrap--md legal">
          <span className="eyebrow" data-reveal>{s.eyebrow}</span>
          <h1 className="legal__title serif" data-reveal data-delay="1">{s.title}</h1>
          <p className="legal__intro" data-reveal data-delay="2">{s.intro}</p>
          <div className="legal__body">
            {s.sections.map((sec, i) => (
              <section className="legal__sec" key={i} data-reveal data-delay={String(i % 3)}>
                <h2 className="legal__h serif">{sec[0]}</h2>
                <p>{sec[1]}</p>
              </section>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

/* ---------------- 404 ---------------- */
const E404 = {
  fr: { code: '404', eyebrow: 'Page introuvable', title: 'Cette page s’est égarée.', body: 'La page que vous cherchez n’existe pas ou a été déplacée. Revenons vers les œuvres.', boutique: 'Voir la collection', home: 'Retour à l’accueil' },
  ar: { code: '404', eyebrow: 'الصفحة غير موجودة', title: 'هذه الصفحة ضلّت الطريق.', body: 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها. لنعد إلى الأعمال.', boutique: 'تصفّح المجموعة', home: 'العودة إلى الرئيسية' },
  en: { code: '404', eyebrow: 'Page not found', title: 'This page has wandered off.', body: 'The page you’re looking for doesn’t exist or has moved. Let’s return to the works.', boutique: 'Browse the collection', home: 'Back to home' },
};
export function NotFoundView() {
  const { lang, go } = useLang();
  useReveal([lang]);
  const s = E404[lang] || E404.fr;
  return (
    <>
      <Header page="home" />
      <main className="sp">
        <section className="wrap wrap--md sp-wrap">
          <span className="sp-404 serif" data-reveal>{s.code}</span>
          <span className="eyebrow eyebrow--center" data-reveal data-delay="1">{s.eyebrow}</span>
          <h1 className="sp-title serif" data-reveal data-delay="1">{s.title}</h1>
          <p className="sp-body" data-reveal data-delay="2">{s.body}</p>
          <div className="sp-actions" data-reveal data-delay="3">
            <Button variant="primary" size="lg" rightIcon={<Icons.arrow />} onClick={() => go('collection')}>{s.boutique}</Button>
            <Button variant="secondary" size="lg" onClick={() => go('home')}>{s.home}</Button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
