/* Aranya Ceylon — Cookie Policy content. Exports COOKIES_SECTIONS.
   Template copy for a design mock — review with counsel before publishing. */

/* small cookie-category table */
function CookieTable() {
  const rows = [
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

const COOKIES_SECTIONS = [
  {
    id: "what", title: "What cookies are",
    body: (
      <React.Fragment>
        <LP lead>Cookies are small text files a website stores on your device. They let the store remember things between pages and visits — like what's in your cart and whether you're shopping in USD or LKR.</LP>
        <LP>This policy explains the cookies and similar technologies (such as local storage and pixels) we use on aranyaceylon.com, and how you can control them. It works together with our <a href="Privacy.html" style={{ color: "var(--brand)", fontWeight: 600 }}>Privacy Policy</a>.</LP>
      </React.Fragment>
    ),
  },
  {
    id: "why", title: "Why we use them",
    body: (
      <React.Fragment>
        <LP>We use cookies to keep the store working, remember your preferences, understand what's useful, and — only with your consent — to measure our marketing. Some are set by us; some by trusted partners on our behalf.</LP>
      </React.Fragment>
    ),
  },
  {
    id: "types", title: "Types of cookies we use",
    body: (
      <React.Fragment>
        <LP>We group cookies into four categories. Essential cookies are always on; the rest are optional and set only where you allow them.</LP>
        <CookieTable />
      </React.Fragment>
    ),
  },
  {
    id: "third-party", title: "Third-party cookies",
    body: (
      <React.Fragment>
        <LP>A few partners may set cookies when you use the store, governed by their own privacy notices:</LP>
        <LUL items={[
          <span><b style={{ color: "var(--ink)" }}>Payment providers</b> — to process payments securely and help prevent fraud.</span>,
          <span><b style={{ color: "var(--ink)" }}>Analytics providers</b> — to give us aggregate, privacy-respecting usage statistics.</span>,
          <span><b style={{ color: "var(--ink)" }}>Social &amp; media embeds</b> — if a page includes content such as a video or social post.</span>,
        ]} />
        <LP>We don't control these cookies. Please review each provider's policy for details of how they use data.</LP>
      </React.Fragment>
    ),
  },
  {
    id: "manage", title: "Managing your cookies",
    body: (
      <React.Fragment>
        <LP>You're in control. You can:</LP>
        <LUL items={[
          "Set your preferences in our cookie banner when you first visit, and change them anytime from the link in the footer.",
          "Adjust or block cookies in your browser settings — most browsers let you delete existing cookies and refuse new ones.",
          "Use private/incognito browsing to limit what's stored.",
        ]} />
        <LCallout icon="shield">Blocking essential cookies may stop parts of the store from working — for example keeping items in your cart or completing checkout.</LCallout>
      </React.Fragment>
    ),
  },
  {
    id: "changes", title: "Changes to this policy",
    body: (
      <React.Fragment>
        <LP>We may update this Cookie Policy as the store and the cookies we use change. We'll update the date above when we do. For anything else about your data, see our <a href="Privacy.html" style={{ color: "var(--brand)", fontWeight: 600 }}>Privacy Policy</a> or email <a href="mailto:privacy@aranyaceylon.com" style={{ color: "var(--brand)", fontWeight: 600 }}>privacy@aranyaceylon.com</a>.</LP>
      </React.Fragment>
    ),
  },
];
window.COOKIES_SECTIONS = COOKIES_SECTIONS;
