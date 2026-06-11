/* Aranya Ceylon — Privacy Policy content. Exports PRIVACY_SECTIONS (array of {id,title,body}).
   Template copy for a design mock — review with counsel before publishing. */
const PRIVACY_SECTIONS = [
  {
    id: "overview", title: "Overview",
    body: (
      <React.Fragment>
        <LP lead>Aranya Ceylon ("Aranya", "we", "us") sources single-origin spices from the hill country of Sri Lanka and ships them worldwide. This policy explains what personal information we collect, why we collect it, and the choices you have.</LP>
        <LP>It applies to aranyaceylon.com, our checkout, and any email or messaging you exchange with our team. We are the data controller for the information described here. By using our store you agree to the practices set out below.</LP>
      </React.Fragment>
    ),
  },
  {
    id: "collect", title: "Information we collect",
    body: (
      <React.Fragment>
        <LP>We only collect what we need to mill, pack, ship and support your order:</LP>
        <LH>You give us</LH>
        <LUL items={[
          <span><b style={{ color: "var(--ink)" }}>Contact &amp; delivery details</b> — name, email, phone, billing and shipping address.</span>,
          <span><b style={{ color: "var(--ink)" }}>Order details</b> — the spices you buy, gift messages, and your chosen market (USD international or LKR local).</span>,
          <span><b style={{ color: "var(--ink)" }}>Account details</b> — if you create one: a password (stored encrypted) and saved preferences such as your wishlist and Harvest Club points.</span>,
          <span><b style={{ color: "var(--ink)" }}>Messages</b> — anything you send us by email, contact form or WhatsApp.</span>,
        ]} />
        <LH>We collect automatically</LH>
        <LUL items={[
          <span><b style={{ color: "var(--ink)" }}>Device &amp; usage data</b> — IP address, browser, pages viewed and referring links, to keep the store secure and improve it.</span>,
          <span><b style={{ color: "var(--ink)" }}>Cookies</b> — small files that remember your cart, market and preferences. See our <a href="Cookies.html" style={{ color: "var(--brand)", fontWeight: 600 }}>Cookie Policy</a>.</span>,
        ]} />
        <LCallout icon="shield">We never collect your full card number. Payments are handled directly by our PCI-compliant payment processor — we only see the result and the last four digits.</LCallout>
      </React.Fragment>
    ),
  },
  {
    id: "use", title: "How we use your information",
    body: (
      <React.Fragment>
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
      </React.Fragment>
    ),
  },
  {
    id: "sharing", title: "Sharing & disclosure",
    body: (
      <React.Fragment>
        <LP>We do not sell your personal information. We share it only with the partners who help us run the store, and only the data they need:</LP>
        <LUL items={[
          <span><b style={{ color: "var(--ink)" }}>Payment processors</b> — to take payment securely.</span>,
          <span><b style={{ color: "var(--ink)" }}>Couriers &amp; logistics</b> — to deliver your parcel and, for international orders, to clear customs.</span>,
          <span><b style={{ color: "var(--ink)" }}>Technology providers</b> — hosting, email and analytics that operate the site on our behalf under contract.</span>,
          <span><b style={{ color: "var(--ink)" }}>Authorities</b> — where the law requires it, or to protect our rights and the safety of others.</span>,
        ]} />
        <LP>If Aranya is ever involved in a merger or acquisition, your information may transfer to the successor under the same protections set out here.</LP>
      </React.Fragment>
    ),
  },
  {
    id: "security", title: "Security & retention",
    body: (
      <React.Fragment>
        <LP>We protect your information with encryption in transit, access controls, and regular reviews of our providers. No system is perfectly secure, but we work hard to keep yours safe.</LP>
        <LP>We keep personal information only as long as needed for the purpose it was collected — to fulfil your order, support you, and meet legal and accounting obligations (typically up to the period required by Sri Lankan tax law). When it is no longer needed, we delete or anonymise it.</LP>
      </React.Fragment>
    ),
  },
  {
    id: "rights", title: "Your rights & choices",
    body: (
      <React.Fragment>
        <LP>Depending on where you live, you may have the right to:</LP>
        <LUL items={[
          "Access the personal information we hold about you, and receive a copy.",
          "Correct information that is inaccurate or incomplete.",
          "Delete your information, where we are not required to keep it.",
          "Object to or restrict certain processing, including direct marketing.",
          "Withdraw consent at any time, without affecting earlier processing.",
        ]} />
        <LP>To exercise any of these, email <a href="mailto:privacy@aranyaceylon.com" style={{ color: "var(--brand)", fontWeight: 600 }}>privacy@aranyaceylon.com</a>. We will respond within a reasonable period and may need to verify your identity first.</LP>
      </React.Fragment>
    ),
  },
  {
    id: "transfers", title: "International transfers & children",
    body: (
      <React.Fragment>
        <LP>We ship to more than forty countries, so your information may be processed outside your home country, including in Sri Lanka where we are based. Where required, we put appropriate safeguards in place for these transfers.</LP>
        <LP>Our store is intended for adults. We do not knowingly collect information from children under 16. If you believe a child has provided us information, contact us and we will delete it.</LP>
      </React.Fragment>
    ),
  },
  {
    id: "changes", title: "Changes to this policy",
    body: (
      <React.Fragment>
        <LP>We may update this policy as our store and the law evolve. When we make material changes we will update the date above and, where appropriate, notify you by email or a notice on the site. Please review it from time to time.</LP>
      </React.Fragment>
    ),
  },
];
window.PRIVACY_SECTIONS = PRIVACY_SECTIONS;
