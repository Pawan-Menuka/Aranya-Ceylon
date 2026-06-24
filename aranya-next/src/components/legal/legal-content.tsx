import * as React from "react";
import Link from "next/link";
import { LP, LH, LUL, LCallout, type LegalSection } from "./LegalCommon";

// Legal page content (ported from legal-privacy.jsx / legal-terms.jsx /
// legal-cookies.jsx). Template copy for the design mock — review with counsel
// before publishing. Internal cross-links point at the Next routes.

const ink = { color: "var(--ink)" } as const;
const linkStyle = { color: "var(--brand)", fontWeight: 600 } as const;

// ============================ PRIVACY ============================
export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: "overview", title: "Overview",
    body: (
      <>
        <LP lead>Aranya Ceylon (&ldquo;Aranya&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) sources single-origin spices from the hill country of Sri Lanka and ships them worldwide. This policy explains what personal information we collect, why we collect it, and the choices you have.</LP>
        <LP>It applies to aranyaceylon.com, our checkout, and any email or messaging you exchange with our team. We are the data controller for the information described here. By using our store you agree to the practices set out below.</LP>
      </>
    ),
  },
  {
    id: "collect", title: "Information we collect",
    body: (
      <>
        <LP>We only collect what we need to mill, pack, ship and support your order:</LP>
        <LH>You give us</LH>
        <LUL items={[
          <span key="contact"><b style={ink}>Contact &amp; delivery details</b> — name, email, phone, billing and shipping address.</span>,
          <span key="order"><b style={ink}>Order details</b> — the spices you buy, gift messages, and your chosen market (USD international or LKR local).</span>,
          <span key="account"><b style={ink}>Account details</b> — if you create one: a password (stored encrypted) and saved preferences such as your wishlist and Harvest Club points.</span>,
          <span key="messages"><b style={ink}>Messages</b> — anything you send us by email, contact form or WhatsApp.</span>,
        ]} />
        <LH>We collect automatically</LH>
        <LUL items={[
          <span key="device"><b style={ink}>Device &amp; usage data</b> — IP address, browser, pages viewed and referring links, to keep the store secure and improve it.</span>,
          <span key="cookies"><b style={ink}>Cookies</b> — small files that remember your cart, market and preferences. See our <Link href="/cookies" style={linkStyle}>Cookie Policy</Link>.</span>,
        ]} />
        <LCallout icon="shield">We never collect your full card number. Payments are handled directly by our PCI-compliant payment processor — we only see the result and the last four digits.</LCallout>
      </>
    ),
  },
  {
    id: "use", title: "How we use your information",
    body: (
      <>
        <LP>We use your information to:</LP>
        <LUL items={[
          "Process, mill, pack and deliver your orders, and send confirmations and tracking.",
          "Provide support and respond to your questions across email, the contact form and WhatsApp.",
          "Run your account, wishlist and Harvest Club rewards if you choose to have one.",
          "Detect and prevent fraud, abuse and security incidents.",
          "Improve our spices, recipes and the store, based on aggregate usage.",
          "Send you marketing — like the harvest newsletter — only where you have opted in. You can unsubscribe anytime.",
        ]} />
        <LP>We rely on the lawful bases of performing our contract with you, your consent (for marketing and non-essential cookies), our legitimate interest in running a secure and useful store, and compliance with legal obligations such as tax record-keeping.</LP>
      </>
    ),
  },
  {
    id: "sharing", title: "Sharing & disclosure",
    body: (
      <>
        <LP>We do not sell your personal information. We share it only with the partners who help us run the store, and only the data they need:</LP>
        <LUL items={[
          <span key="payment"><b style={ink}>Payment processors</b> — to take payment securely.</span>,
          <span key="couriers"><b style={ink}>Couriers &amp; logistics</b> — to deliver your parcel and, for international orders, to clear customs.</span>,
          <span key="tech"><b style={ink}>Technology providers</b> — hosting, email and analytics that operate the site on our behalf under contract.</span>,
          <span key="authorities"><b style={ink}>Authorities</b> — where the law requires it, or to protect our rights and the safety of others.</span>,
        ]} />
        <LP>If Aranya is ever involved in a merger or acquisition, your information may transfer to the successor under the same protections set out here.</LP>
      </>
    ),
  },
  {
    id: "security", title: "Security & retention",
    body: (
      <>
        <LP>We protect your information with encryption in transit, access controls, and regular reviews of our providers. No system is perfectly secure, but we work hard to keep yours safe.</LP>
        <LP>We keep personal information only as long as needed for the purpose it was collected — to fulfil your order, support you, and meet legal and accounting obligations (typically up to the period required by Sri Lankan tax law). When it is no longer needed, we delete or anonymise it.</LP>
      </>
    ),
  },
  {
    id: "rights", title: "Your rights & choices",
    body: (
      <>
        <LP>Depending on where you live, you may have the right to:</LP>
        <LUL items={[
          "Access the personal information we hold about you, and receive a copy.",
          "Correct information that is inaccurate or incomplete.",
          "Delete your information, where we are not required to keep it.",
          "Object to or restrict certain processing, including direct marketing.",
          "Withdraw consent at any time, without affecting earlier processing.",
        ]} />
        <LP>To exercise any of these, email <a href="mailto:privacy@aranyaceylon.com" style={linkStyle}>privacy@aranyaceylon.com</a>. We will respond within a reasonable period and may need to verify your identity first.</LP>
      </>
    ),
  },
  {
    id: "transfers", title: "International transfers & children",
    body: (
      <>
        <LP>We ship to more than forty countries, so your information may be processed outside your home country, including in Sri Lanka where we are based. Where required, we put appropriate safeguards in place for these transfers.</LP>
        <LP>Our store is intended for adults. We do not knowingly collect information from children under 16. If you believe a child has provided us information, contact us and we will delete it.</LP>
      </>
    ),
  },
  {
    id: "changes", title: "Changes to this policy",
    body: (
      <>
        <LP>We may update this policy as our store and the law evolve. When we make material changes we will update the date above and, where appropriate, notify you by email or a notice on the site. Please review it from time to time.</LP>
      </>
    ),
  },
];

// ============================ TERMS ============================
export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: "agreement", title: "Agreement to terms",
    body: (
      <>
        <LP lead>These Terms of Service govern your use of aranyaceylon.com and your purchase of spices and gift sets from Aranya Ceylon. By browsing or ordering, you agree to them.</LP>
        <LP>Please read them alongside our <Link href="/privacy" style={linkStyle}>Privacy Policy</Link> and <Link href="/shipping" style={linkStyle}>Shipping &amp; Returns</Link> policy, which are part of this agreement. If you do not agree, please do not use the store.</LP>
      </>
    ),
  },
  {
    id: "accounts", title: "Eligibility & accounts",
    body: (
      <>
        <LP>You must be at least 18, or the age of majority where you live, to place an order. You may shop as a guest or create an account.</LP>
        <LP>If you create an account, you are responsible for keeping your password confidential and for all activity under it. Tell us promptly at <a href="mailto:support@aranyaceylon.com" style={linkStyle}>support@aranyaceylon.com</a> if you suspect unauthorised use. We may suspend or close accounts that breach these terms.</LP>
      </>
    ),
  },
  {
    id: "orders", title: "Orders & pricing",
    body: (
      <>
        <LP>Each order is an offer to buy. A contract forms only when we send your order confirmation email. We may decline or cancel an order — for example if an item is out of stock, a price is clearly wrong, or we suspect fraud — and will refund any payment taken.</LP>
        <LH>Currency &amp; markets</LH>
        <LP>Prices show in <b style={ink}>USD for our international market</b> and <b style={ink}>LKR for our local Sri Lanka market</b>. The market you select at checkout determines the currency, applicable taxes and delivery options. Prices include or exclude tax as indicated at checkout.</LP>
        <LCallout icon="receipt">Because spices are milled and weighed to order, slight natural variation in weight, colour and aroma is normal between harvests and is not a defect.</LCallout>
      </>
    ),
  },
  {
    id: "shipping", title: "Shipping, risk & title",
    body: (
      <>
        <LP>We dispatch from Kandy, usually within one to two working days. Delivery times and rates are set out in our <Link href="/shipping" style={linkStyle}>Shipping &amp; Returns</Link> policy and begin at dispatch.</LP>
        <LP>Risk in the goods passes to you on delivery; title passes once we have received payment in full. For international orders, any customs duties or import taxes are set by the destination country and are the recipient&rsquo;s responsibility.</LP>
      </>
    ),
  },
  {
    id: "returns", title: "Returns & refunds",
    body: (
      <>
        <LP>Spice is a fresh, consumable product, so opened items cannot be resold or returned. Unopened, sealed items may be returned within 30 days of delivery for a refund — contact us first to start it.</LP>
        <LP>If something arrives damaged, leaking, or not as ordered, send a photo within 7 days and we will replace or refund it free of charge. Full details and timings are in our <Link href="/shipping" style={linkStyle}>Shipping &amp; Returns</Link> policy. Nothing here affects your statutory rights.</LP>
      </>
    ),
  },
  {
    id: "use", title: "Acceptable use",
    body: (
      <>
        <LP>When using our store, you agree not to:</LP>
        <LUL items={[
          "Break any law, or infringe the rights of Aranya or anyone else.",
          "Resell our products commercially without a wholesale agreement — see our wholesale page to apply.",
          "Interfere with the store's security, scrape it at scale, or attempt to disrupt its operation.",
          "Submit false information, or use another person's payment or account details without permission.",
        ]} />
      </>
    ),
  },
  {
    id: "ip", title: "Intellectual property",
    body: (
      <>
        <LP>The Aranya Ceylon name, logo, the Liyawel motif, our photography, recipes, written content and store design are owned by us or our licensors and are protected by intellectual-property laws.</LP>
        <LP>You may view and share our content for personal, non-commercial use. You may not copy, reproduce or use it commercially — including our product names and branding — without our written permission.</LP>
      </>
    ),
  },
  {
    id: "liability", title: "Disclaimers & liability",
    body: (
      <>
        <LP>Our spices are food products sold for culinary use. Information on the site — including recipes, origin notes and any wellness references — is provided for general interest and is not medical advice. If you have allergies or a medical condition, check the ingredients and consult a professional. Products are prepared in a facility that also handles tree nuts and other spices.</LP>
        <LP>To the fullest extent permitted by law, the store and its content are provided &ldquo;as is&rdquo;, and our total liability for any order is limited to the amount you paid for it. We are not liable for indirect or consequential loss. Nothing in these terms limits liability that cannot be excluded by law, such as for death or personal injury caused by our negligence.</LP>
      </>
    ),
  },
  {
    id: "law", title: "Governing law & changes",
    body: (
      <>
        <LP>These terms are governed by the laws of Sri Lanka, and disputes are subject to the exclusive jurisdiction of its courts, unless mandatory consumer law in your country provides otherwise.</LP>
        <LP>We may update these terms from time to time. The version in force is the one published here when you place your order. We will update the date above when we make changes. Questions? Email <a href="mailto:support@aranyaceylon.com" style={linkStyle}>support@aranyaceylon.com</a>.</LP>
      </>
    ),
  },
];

// ============================ COOKIES ============================
function CookieTable() {
  const rows: [string, string, string, string][] = [
    ["Essential", "Always on", "Remember your cart, selected market (USD/LKR), checkout session and security. The store can't work without these.", "var(--brand)"],
    ["Preferences", "Optional", "Keep your choices between visits — language, recent views, and whether you've dismissed banners.", "var(--brand-2)"],
    ["Analytics", "Optional", "Help us understand which spices and pages are popular, in aggregate, so we can improve the store.", "var(--accent)"],
    ["Marketing", "Optional", "Measure our campaigns and show relevant Aranya content. Set only with your consent.", "var(--gold-line)"],
  ];
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden", maxWidth: 700, margin: "4px 0 22px", boxShadow: "var(--shadow-sm)" }}>
      {rows.map(([name, status, desc, dot], i) => (
        <div key={name} style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 16, alignItems: "start", padding: "18px 22px", background: i % 2 ? "var(--surface)" : "#fff", borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: dot, flex: "0 0 auto" }} />
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{name}</span>
            </div>
            <span style={{ display: "inline-block", marginTop: 7, marginLeft: 16, fontFamily: "var(--font-ui)", fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: status === "Always on" ? "var(--brand)" : "var(--muted)", background: status === "Always on" ? "rgba(15,110,86,.1)" : "rgba(92,82,72,.1)", borderRadius: 999, padding: "3px 9px" }}>{status}</span>
          </div>
          <p className="prose" style={{ fontSize: 15, color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>{desc}</p>
        </div>
      ))}
    </div>
  );
}

export const COOKIES_SECTIONS: LegalSection[] = [
  {
    id: "what", title: "What cookies are",
    body: (
      <>
        <LP lead>Cookies are small text files a website stores on your device. They let the store remember things between pages and visits — like what&rsquo;s in your cart and whether you&rsquo;re shopping in USD or LKR.</LP>
        <LP>This policy explains the cookies and similar technologies (such as local storage and pixels) we use on aranyaceylon.com, and how you can control them. It works together with our <Link href="/privacy" style={linkStyle}>Privacy Policy</Link>.</LP>
      </>
    ),
  },
  {
    id: "why", title: "Why we use them",
    body: (
      <>
        <LP>We use cookies to keep the store working, remember your preferences, understand what&rsquo;s useful, and — only with your consent — to measure our marketing. Some are set by us; some by trusted partners on our behalf.</LP>
      </>
    ),
  },
  {
    id: "types", title: "Types of cookies we use",
    body: (
      <>
        <LP>We group cookies into four categories. Essential cookies are always on; the rest are optional and set only where you allow them.</LP>
        <CookieTable />
      </>
    ),
  },
  {
    id: "third-party", title: "Third-party cookies",
    body: (
      <>
        <LP>A few partners may set cookies when you use the store, governed by their own privacy notices:</LP>
        <LUL items={[
          <span key="payment"><b style={ink}>Payment providers</b> — to process payments securely and help prevent fraud.</span>,
          <span key="analytics"><b style={ink}>Analytics providers</b> — to give us aggregate, privacy-respecting usage statistics.</span>,
          <span key="embeds"><b style={ink}>Social &amp; media embeds</b> — if a page includes content such as a video or social post.</span>,
        ]} />
        <LP>We don&rsquo;t control these cookies. Please review each provider&rsquo;s policy for details of how they use data.</LP>
      </>
    ),
  },
  {
    id: "manage", title: "Managing your cookies",
    body: (
      <>
        <LP>You&rsquo;re in control. You can:</LP>
        <LUL items={[
          "Set your preferences in our cookie banner when you first visit, and change them anytime from the link in the footer.",
          "Adjust or block cookies in your browser settings — most browsers let you delete existing cookies and refuse new ones.",
          "Use private/incognito browsing to limit what's stored.",
        ]} />
        <LCallout icon="shield">Blocking essential cookies may stop parts of the store from working — for example keeping items in your cart or completing checkout.</LCallout>
      </>
    ),
  },
  {
    id: "changes", title: "Changes to this policy",
    body: (
      <>
        <LP>We may update this Cookie Policy as the store and the cookies we use change. We&rsquo;ll update the date above when we do. For anything else about your data, see our <Link href="/privacy" style={linkStyle}>Privacy Policy</Link> or email <a href="mailto:privacy@aranyaceylon.com" style={linkStyle}>privacy@aranyaceylon.com</a>.</LP>
      </>
    ),
  },
];
