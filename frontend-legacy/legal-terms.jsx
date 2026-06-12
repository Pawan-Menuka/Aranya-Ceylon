/* Aranya Ceylon — Terms of Service content. Exports TERMS_SECTIONS.
   Template copy for a design mock — review with counsel before publishing. */
const TERMS_SECTIONS = [
  {
    id: "agreement", title: "Agreement to terms",
    body: (
      <React.Fragment>
        <LP lead>These Terms of Service govern your use of aranyaceylon.com and your purchase of spices and gift sets from Aranya Ceylon. By browsing or ordering, you agree to them.</LP>
        <LP>Please read them alongside our <a href="Privacy.html" style={{ color: "var(--brand)", fontWeight: 600 }}>Privacy Policy</a> and <a href="Shipping.html" style={{ color: "var(--brand)", fontWeight: 600 }}>Shipping &amp; Returns</a> policy, which are part of this agreement. If you do not agree, please do not use the store.</LP>
      </React.Fragment>
    ),
  },
  {
    id: "accounts", title: "Eligibility & accounts",
    body: (
      <React.Fragment>
        <LP>You must be at least 18, or the age of majority where you live, to place an order. You may shop as a guest or create an account.</LP>
        <LP>If you create an account, you are responsible for keeping your password confidential and for all activity under it. Tell us promptly at <a href="mailto:support@aranyaceylon.com" style={{ color: "var(--brand)", fontWeight: 600 }}>support@aranyaceylon.com</a> if you suspect unauthorised use. We may suspend or close accounts that breach these terms.</LP>
      </React.Fragment>
    ),
  },
  {
    id: "orders", title: "Orders & pricing",
    body: (
      <React.Fragment>
        <LP>Each order is an offer to buy. A contract forms only when we send your order confirmation email. We may decline or cancel an order — for example if an item is out of stock, a price is clearly wrong, or we suspect fraud — and will refund any payment taken.</LP>
        <LH>Currency &amp; markets</LH>
        <LP>Prices show in <b style={{ color: "var(--ink)" }}>USD for our international market</b> and <b style={{ color: "var(--ink)" }}>LKR for our local Sri Lanka market</b>. The market you select at checkout determines the currency, applicable taxes and delivery options. Prices include or exclude tax as indicated at checkout.</LP>
        <LCallout icon="receipt">Because spices are milled and weighed to order, slight natural variation in weight, colour and aroma is normal between harvests and is not a defect.</LCallout>
      </React.Fragment>
    ),
  },
  {
    id: "shipping", title: "Shipping, risk & title",
    body: (
      <React.Fragment>
        <LP>We dispatch from Kandy, usually within one to two working days. Delivery times and rates are set out in our <a href="Shipping.html" style={{ color: "var(--brand)", fontWeight: 600 }}>Shipping &amp; Returns</a> policy and begin at dispatch.</LP>
        <LP>Risk in the goods passes to you on delivery; title passes once we have received payment in full. For international orders, any customs duties or import taxes are set by the destination country and are the recipient's responsibility.</LP>
      </React.Fragment>
    ),
  },
  {
    id: "returns", title: "Returns & refunds",
    body: (
      <React.Fragment>
        <LP>Spice is a fresh, consumable product, so opened items cannot be resold or returned. Unopened, sealed items may be returned within 30 days of delivery for a refund — contact us first to start it.</LP>
        <LP>If something arrives damaged, leaking, or not as ordered, send a photo within 7 days and we will replace or refund it free of charge. Full details and timings are in our <a href="Shipping.html" style={{ color: "var(--brand)", fontWeight: 600 }}>Shipping &amp; Returns</a> policy. Nothing here affects your statutory rights.</LP>
      </React.Fragment>
    ),
  },
  {
    id: "use", title: "Acceptable use",
    body: (
      <React.Fragment>
        <LP>When using our store, you agree not to:</LP>
        <LUL items={[
          "Break any law, or infringe the rights of Aranya or anyone else.",
          "Resell our products commercially without a wholesale agreement — see our wholesale page to apply.",
          "Interfere with the store's security, scrape it at scale, or attempt to disrupt its operation.",
          "Submit false information, or use another person's payment or account details without permission.",
        ]} />
      </React.Fragment>
    ),
  },
  {
    id: "ip", title: "Intellectual property",
    body: (
      <React.Fragment>
        <LP>The Aranya Ceylon name, logo, the Liyawel motif, our photography, recipes, written content and store design are owned by us or our licensors and are protected by intellectual-property laws.</LP>
        <LP>You may view and share our content for personal, non-commercial use. You may not copy, reproduce or use it commercially — including our product names and branding — without our written permission.</LP>
      </React.Fragment>
    ),
  },
  {
    id: "liability", title: "Disclaimers & liability",
    body: (
      <React.Fragment>
        <LP>Our spices are food products sold for culinary use. Information on the site — including recipes, origin notes and any wellness references — is provided for general interest and is not medical advice. If you have allergies or a medical condition, check the ingredients and consult a professional. Products are prepared in a facility that also handles tree nuts and other spices.</LP>
        <LP>To the fullest extent permitted by law, the store and its content are provided "as is", and our total liability for any order is limited to the amount you paid for it. We are not liable for indirect or consequential loss. Nothing in these terms limits liability that cannot be excluded by law, such as for death or personal injury caused by our negligence.</LP>
      </React.Fragment>
    ),
  },
  {
    id: "law", title: "Governing law & changes",
    body: (
      <React.Fragment>
        <LP>These terms are governed by the laws of Sri Lanka, and disputes are subject to the exclusive jurisdiction of its courts, unless mandatory consumer law in your country provides otherwise.</LP>
        <LP>We may update these terms from time to time. The version in force is the one published here when you place your order. We will update the date above when we make changes. Questions? Email <a href="mailto:support@aranyaceylon.com" style={{ color: "var(--brand)", fontWeight: 600 }}>support@aranyaceylon.com</a>.</LP>
      </React.Fragment>
    ),
  },
];
window.TERMS_SECTIONS = TERMS_SECTIONS;
