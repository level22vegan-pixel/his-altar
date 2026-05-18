import { useLocation } from "wouter";

export default function PrivacyPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1 as never)}
          className="text-neutral-500 hover:text-neutral-300 text-xs uppercase tracking-widest mb-8 flex items-center gap-1 transition"
        >
          ← Back
        </button>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white tracking-wide">Privacy Policy</h1>
          <p className="text-neutral-500 text-xs mt-2 tracking-wider uppercase">His Altar Ministry Management Platform</p>
          <p className="text-neutral-600 text-xs mt-3">
            Effective Date: <span className="text-neutral-500">May 18, 2026</span> &nbsp;·&nbsp; Last Updated: <span className="text-neutral-500">May 18, 2026</span>
          </p>
        </div>

        <div className="h-px bg-neutral-800 mb-8" />

        <div className="space-y-8 text-sm text-neutral-400 leading-relaxed">

          <Section title="Introduction">
            At His Altar, we take privacy seriously — especially given the deeply personal nature of the
            information entrusted to our platform. This Privacy Policy explains how we collect, use, store,
            protect, and handle data when you use His Altar ("the Platform"), a pastoral care management
            tool designed for churches and ministries.
            <br /><br />
            Please read this policy carefully. By using the Platform, you agree to the practices described here.
          </Section>

          <Section num="1" title="Who This Policy Applies To">
            This policy applies to:
            <RoleList items={[
              ["Church Administrators", "authorized representatives who create and manage a church account"],
              ["Church Staff and Volunteers", "individuals added to the Platform by a Church Administrator"],
              ["Congregation Members", "individuals whose information is recorded in the Platform by church staff"],
            ]} />
            If you are a congregation member whose information has been recorded by a church using this
            Platform, please contact that church directly for questions about how they manage your
            information. You may also contact us at{" "}
            <ContactLink />.
          </Section>

          <Section num="2" title="Information We Collect">
            <SubHeading>2.1 Information You Provide Directly</SubHeading>
            <p className="mt-2 font-medium text-neutral-300">Account Registration Information:</p>
            <BulletList items={[
              "Church name and contact details",
              "Administrator name, email address, and password",
              "Billing information (processed securely through our payment provider, Stripe)",
              "Church size, denomination, and other onboarding details",
            ]} />
            <p className="mt-4 font-medium text-neutral-300">Staff and Volunteer Profiles:</p>
            <BulletList items={[
              "Name, email address, and role",
              "Login credentials",
              "Activity logs within the Platform",
            ]} />
            <p className="mt-4 font-medium text-neutral-300">Congregation Member Records (entered by church staff):</p>
            <BulletList items={[
              "Full name and contact information",
              "Date and type of altar call or prayer request",
              "Nature of prayer request or spiritual need",
              "Follow-up call logs and notes",
              "Spiritual care history and progress notes",
              "Any additional information church staff chooses to record",
            ]} />
            <SubHeading className="mt-6">2.2 Information Collected Automatically</SubHeading>
            <p className="mt-2">When you use the Platform, we automatically collect:</p>
            <BulletList items={[
              "IP address and device information",
              "Browser type and operating system",
              "Pages visited and features used",
              "Login timestamps and session duration",
              "Error logs and performance data",
            ]} />
            <p className="mt-3">This information is used solely to operate, maintain, and improve the Platform.</p>
            <SubHeading className="mt-6">2.3 Information from Third Parties</SubHeading>
            <p className="mt-2">We may receive limited information from:</p>
            <BulletList items={[
              "Stripe — payment confirmation and subscription status (we never store full card numbers)",
              "Email service providers — delivery confirmations for system notifications",
            ]} />
          </Section>

          <Section num="3" title="How We Use Your Information">
            We use the information collected to:
            <BulletList items={[
              "Create and manage your church account",
              "Provide and operate the Platform's features",
              "Process subscription payments and billing",
              "Send account-related notifications (trial reminders, payment receipts, system alerts)",
              "Provide customer support when you contact us",
              "Monitor and improve Platform performance and security",
              "Comply with legal obligations",
              "Investigate and prevent fraud or abuse",
            ]} />
            We do not use congregation member records for any purpose other than providing the Platform service to your church.
          </Section>

          <Section num="4" title="How We Do NOT Use Your Information">
            We make the following firm commitments:
            <BulletList items={[
              "We will never sell your data or your congregation's data to any third party",
              "We will never use congregation member records for advertising or marketing purposes",
              "We will never share individual prayer requests, altar call records, or follow-up notes with any outside party except as required by law",
              "We will never use your congregation's data to train artificial intelligence or machine learning models",
              "We will never contact your congregation members directly",
            ]} />
          </Section>

          <Section num="5" title="How We Share Information">
            We do not sell or rent your information. We share information only in the following limited circumstances:
            <SubHeading className="mt-4">5.1 Service Providers</SubHeading>
            <p className="mt-2">We work with trusted third-party service providers who help us operate the Platform. These providers are contractually bound to handle data securely and only for the purposes we specify. They include:</p>
            <BulletList items={[
              "Stripe — payment processing",
              "Replit — cloud infrastructure and data storage (United States)",
              "Transactional email provider — system notification delivery",
            ]} />
            <SubHeading className="mt-4">5.2 Legal Requirements</SubHeading>
            <p className="mt-2">We may disclose information if required to do so by law, court order, or governmental authority, or if we believe in good faith that disclosure is necessary to protect the rights, property, or safety of His Altar, our users, or the public.</p>
            <SubHeading className="mt-4">5.3 Business Transfers</SubHeading>
            <p className="mt-2">In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity. We will notify you by email and in-app notice at least 30 days before any such transfer and provide the option to delete your account and data.</p>
            <SubHeading className="mt-4">5.4 With Your Consent</SubHeading>
            <p className="mt-2">We may share information in any other circumstance with your explicit written consent.</p>
          </Section>

          <Section num="6" title="Data Storage and Security">
            <SubHeading>6.1 Where Data is Stored</SubHeading>
            <p className="mt-2">All data is stored on secure servers located in the United States. If you are located outside this region, you consent to the transfer of your data to our servers.</p>
            <SubHeading className="mt-4">6.2 Security Measures</SubHeading>
            <p className="mt-2">We implement industry-standard security practices including:</p>
            <BulletList items={[
              "AES-256 encryption for data at rest",
              "TLS 1.2+ encryption for all data in transit",
              "Role-based access controls limiting who can view data",
              "Regular security audits and vulnerability assessments",
              "Multi-factor authentication options for all accounts",
              "Automated backups with secure offsite storage",
              "Activity logging and anomaly detection",
            ]} />
            <SubHeading className="mt-4">6.3 Security Limitations</SubHeading>
            <p className="mt-2">While we implement strong security measures, no system is completely secure. We cannot guarantee absolute security of your data. In the event of a data breach that affects your church's information, we will notify you within 72 hours of becoming aware of the breach.</p>
          </Section>

          <Section num="7" title="Data Retention">
            <SubList items={[
              ["7.1 Active Accounts", "We retain your church's data for as long as your account remains active."],
              ["7.2 After Cancellation", "Upon cancellation of your subscription, your data is retained for 30 days during which you may export it. After this period, all data is permanently and irreversibly deleted from our systems and backups within 90 days."],
              ["7.3 Trial Accounts", "If a trial account is not converted to a paid subscription, data is retained for 90 days after trial expiration before permanent deletion."],
              ["7.4 Congregation Member Records", "Church administrators may set custom retention periods for congregation member records within their account settings. Records may also be manually deleted by authorized church staff at any time."],
            ]} />
          </Section>

          <Section num="8" title="Your Rights and Choices">
            <SubHeading>8.1 Church Administrator Rights</SubHeading>
            <p className="mt-2">As a Church Administrator, you have the right to:</p>
            <BulletList items={[
              "Access all data stored under your church account at any time",
              "Export a complete copy of your church's data in CSV or PDF format",
              "Correct or update any account information",
              "Delete individual congregation member records",
              "Request permanent deletion of your entire account and all associated data",
              "Restrict certain types of data processing by contacting us",
            ]} />
            <SubHeading className="mt-4">8.2 Congregation Member Rights</SubHeading>
            <p className="mt-2">If you are a congregation member whose information has been recorded by a church using this Platform, your rights regarding that data are primarily governed by your relationship with that church. However, you may contact us at <ContactLink /> and we will work with the relevant church administrator to address your request.</p>
            <SubHeading className="mt-4">8.3 How to Exercise Your Rights</SubHeading>
            <p className="mt-2">To exercise any of the above rights, contact us at <ContactLink />. We will respond to all requests within 30 days.</p>
          </Section>

          <Section num="9" title="Sensitive Personal Information">
            We recognize that altar call and prayer request records represent some of the most sensitive personal information a person can share. This may include:
            <BulletList items={[
              "Health and medical disclosures",
              "Mental health concerns",
              "Addiction and substance struggles",
              "Family crises and relationship matters",
              "Grief and loss",
              "Financial hardship",
              "Spiritual and faith struggles",
            ]} />
            We treat all such information with the highest level of care and confidentiality. Access to congregation member records within our own organization is strictly limited to essential technical personnel and only when required for support or maintenance purposes. Any such internal access is logged and audited.
          </Section>

          <Section num="10" title="Children's Privacy">
            The Platform is not designed for direct use by individuals under the age of 13. Church staff may record information about minors who come to the altar as part of their pastoral care responsibilities. When such records exist:
            <BulletList items={[
              "They must be handled in compliance with all applicable laws protecting minors",
              "Church administrators are responsible for ensuring appropriate consent and care",
              "We recommend restricting access to minor records to senior pastoral staff only",
            ]} />
            If you believe we have inadvertently collected personal information from a minor without appropriate authorization, please contact us immediately at <ContactLink />.
          </Section>

          <Section num="11" title="Cookies and Tracking">
            We use cookies and similar technologies to:
            <BulletList items={[
              "Keep you logged in during your session",
              "Remember your preferences and settings",
              "Analyze how the Platform is used (anonymized)",
              "Detect and prevent security threats",
            ]} />
            We do not use third-party advertising cookies. You may configure your browser to refuse cookies, but doing so may affect Platform functionality.
          </Section>

          <Section num="12" title="Third-Party Links">
            The Platform may contain links to third-party websites or resources. We are not responsible for the privacy practices or content of those third parties. We encourage you to review the privacy policies of any third-party sites you visit.
          </Section>

          <Section num="13" title="California Privacy Rights (CCPA)">
            If you are a California resident, you have additional rights under the California Consumer Privacy Act, including the right to:
            <BulletList items={[
              "Know what personal information we collect and how it is used",
              "Request deletion of your personal information",
              "Opt out of the sale of your personal information (we do not sell personal information)",
              "Non-discrimination for exercising your privacy rights",
            ]} />
            To exercise these rights, contact us at <ContactLink />.
          </Section>

          <Section num="14" title="European Privacy Rights (GDPR)">
            If you are located in the European Economic Area, you have rights under the General Data Protection Regulation, including the right to:
            <BulletList items={[
              "Access your personal data",
              "Correct inaccurate personal data",
              "Request erasure of your personal data",
              "Object to or restrict processing of your personal data",
              "Data portability",
              "Lodge a complaint with your local supervisory authority",
            ]} />
            Our legal basis for processing your data is the performance of our contract with you (providing the Platform service) and our legitimate interests in operating a secure and effective service. To exercise these rights, contact us at <ContactLink />.
          </Section>

          <Section num="15" title="Changes to This Policy">
            We may update this Privacy Policy from time to time. We will notify you of material changes by:
            <BulletList items={[
              "Sending an email to your registered address",
              "Displaying a prominent notice within the Platform",
              "Updating the \"Last Updated\" date at the top of this policy",
            ]} />
            We will provide at least 30 days notice before material changes take effect. Your continued use of the Platform after changes take effect constitutes acceptance of the updated policy.
          </Section>

          <Section num="16" title="Contact Us">
            If you have questions, concerns, or requests regarding this Privacy Policy or how we handle your data, please contact us:
            <div className="mt-4 bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-4 space-y-1.5 text-neutral-400">
              <p className="text-white font-medium">His Altar</p>
              <p>Attn: Privacy Officer</p>
              <p>
                <a href="mailto:support@hisaltar.com" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
                  support@hisaltar.com
                </a>
              </p>
              <p>(424) 234-1669</p>
              <p className="text-neutral-600 text-xs pt-1">Response time: within 30 days of receipt</p>
            </div>
          </Section>

        </div>

        <div className="h-px bg-neutral-800 my-8" />

        <p className="text-center text-neutral-600 text-xs italic">
          By using His Altar, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.
        </p>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate("/org/signup")}
            className="text-purple-400 hover:text-purple-300 text-xs uppercase tracking-widest transition"
          >
            ← Back to Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactLink() {
  return (
    <a href="mailto:support@hisaltar.com" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
      support@hisaltar.com
    </a>
  );
}

function Section({ num, title, children }: { num?: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-white font-semibold text-sm mb-3">
        {num && <span className="text-purple-500 mr-2">{num}.</span>}{title}
      </h2>
      <div className="text-neutral-400 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function SubHeading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-neutral-300 font-medium mt-2 ${className}`}>{children}</p>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-1.5 ml-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="text-purple-600 mt-1.5 shrink-0 text-xs">▸</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SubList({ items }: { items: [string, string][] }) {
  return (
    <div className="mt-3 space-y-3">
      {items.map(([label, text]) => (
        <p key={label}>
          <span className="text-neutral-300 font-medium">{label}.</span>{" "}{text}
        </p>
      ))}
    </div>
  );
}

function RoleList({ items }: { items: [string, string][] }) {
  return (
    <ul className="mt-3 space-y-2 ml-1">
      {items.map(([role, desc]) => (
        <li key={role} className="flex items-start gap-2.5">
          <span className="text-purple-600 mt-1.5 shrink-0 text-xs">▸</span>
          <span><span className="text-neutral-300 font-medium">{role}</span> — {desc}</span>
        </li>
      ))}
    </ul>
  );
}
