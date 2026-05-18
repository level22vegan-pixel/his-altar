import { useLocation } from "wouter";

export default function TermsPage() {
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
          <h1 className="text-2xl font-semibold text-white tracking-wide">Terms of Service</h1>
          <p className="text-neutral-500 text-xs mt-2 tracking-wider uppercase">His Altar Ministry Management Platform</p>
          <p className="text-neutral-600 text-xs mt-3">
            Effective Date: <span className="text-neutral-500">May 18, 2026</span> &nbsp;·&nbsp; Last Updated: <span className="text-neutral-500">May 18, 2026</span>
          </p>
        </div>

        <div className="h-px bg-neutral-800 mb-8" />

        <div className="prose-custom space-y-8 text-sm text-neutral-400 leading-relaxed">
          <Section num="1" title="Acceptance of Terms">
            By creating an account on His Altar ("the Platform"), you ("Church Administrator," "User," or "You") agree to be bound by these Terms of Service ("Terms") on behalf of yourself and your church or ministry organization ("Church"). If you do not agree to these Terms, you may not use the Platform.
            <br /><br />
            These Terms constitute a legally binding agreement between you and His Altar ("we," "us," or "our").
          </Section>

          <Section num="2" title="Description of Service">
            His Altar is a pastoral care management platform designed to help churches and ministries record, organize, and follow up with individuals who come forward during altar calls and prayer services. The Platform provides tools for:
            <BulletList items={[
              "Recording altar call and prayer request information",
              "Managing follow-up call schedules and logs",
              "Tracking spiritual care history for congregation members",
              "Coordinating pastoral staff and volunteers",
            ]} />
          </Section>

          <Section num="3" title="Eligibility">
            To use this Platform, you must:
            <BulletList items={[
              "Be at least 18 years of age",
              "Be an authorized representative of a legitimate church, ministry, or religious organization",
              "Have legal authority to enter into binding agreements on behalf of your organization",
              "Provide accurate and complete registration information",
            ]} />
            We reserve the right to verify the legitimacy of any church or ministry and to decline service at our discretion.
          </Section>

          <Section num="4" title="Account Registration and Security">
            <SubList items={[
              ["4.1", "You must provide accurate, current, and complete information when creating your account."],
              ["4.2", "You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account."],
              ["4.3", "You must immediately notify us at support@hisaltar.com if you suspect unauthorized access to your account."],
              ["4.4", "You may not share your account credentials with unauthorized individuals or allow anyone outside your church staff to access the Platform under your account."],
              ["4.5", "You are responsible for all staff accounts you create under your church's account and for revoking access when staff members leave your organization."],
            ]} />
          </Section>

          <Section num="5" title="Subscription Plans and Billing">
            <SubList items={[
              ["5.1 Free Trial", "New accounts receive a 30-day free trial with full access to all features of your selected plan. No payment is required during the trial period."],
              ["5.2 Trial Expiration", "At the end of your 30-day trial, your account will require an active paid subscription to continue accessing the Platform. Your data will be retained for 90 days after trial expiration before permanent deletion."],
              ["5.3 Subscription Fees", "Subscription fees are billed monthly or annually depending on your chosen billing cycle. Fees are charged in advance at the beginning of each billing period."],
              ["5.4 Price Changes", "We reserve the right to change subscription pricing with 30 days advance written notice. Continued use of the Platform after a price change constitutes acceptance of the new pricing."],
              ["5.5 Refunds", "All subscription fees are non-refundable except where required by applicable law. We do not offer prorated refunds for unused portions of a billing period."],
              ["5.6 Failed Payments", "If a payment fails, we will notify you and attempt to process payment again. Accounts with failed payments may be suspended after 7 days. Your data will be preserved during a 30-day grace period."],
              ["5.7 Cancellation", "You may cancel your subscription at any time. Cancellation takes effect at the end of your current billing period. You will retain access to the Platform until the billing period ends."],
            ]} />
          </Section>

          <Section num="6" title="Acceptable Use">
            You agree to use the Platform only for its intended purpose of pastoral care and church ministry management. You agree not to:
            <BulletList items={[
              "Use the Platform for any unlawful purpose",
              "Record information about individuals without a legitimate pastoral care purpose",
              "Share access to the Platform with individuals outside your church staff or authorized volunteers",
              "Attempt to access another church's data or accounts",
              "Upload malicious code, viruses, or harmful content",
              "Use the Platform to harass, intimidate, or harm any individual",
              "Sell, resell, or sublicense access to the Platform to any third party",
              "Attempt to reverse engineer, decompile, or extract the Platform's source code",
              "Use automated tools to scrape or extract data from the Platform",
            ]} />
          </Section>

          <Section num="7" title="Sensitive Personal Data">
            <SubList items={[
              ["7.1 Nature of Data", "You acknowledge that the Platform is used to store sensitive personal information, including but not limited to prayer requests, health disclosures, family matters, addiction struggles, mental health concerns, and other deeply personal matters shared during altar calls and prayer moments."],
              ["7.2 Your Responsibility", "You are solely responsible for: obtaining any consent required from individuals whose information you record; informing your congregation that altar and prayer records may be kept; ensuring all staff with Platform access handle data with appropriate confidentiality; and complying with all applicable privacy laws regarding the data you collect."],
              ["7.3 Minors", "If you record information about individuals under the age of 18, you agree to handle such records with the highest standard of care and in compliance with all applicable laws protecting minors."],
              ["7.4 Our Role", "We act as a data processor on your behalf. We do not access, use, or share individual congregation member records except as required to provide technical support at your request or as required by law."],
            ]} />
          </Section>

          <Section num="8" title="Data Ownership and Portability">
            <SubList items={[
              ["8.1", "All congregation member data you enter into the Platform remains your property and the property of your church."],
              ["8.2", "You may export a full copy of your church's data at any time through the Platform's export feature or by contacting support@hisaltar.com."],
              ["8.3", "Upon cancellation or account deletion, we will provide a 30-day window during which you may export your data. After this window, all data will be permanently and irreversibly deleted from our systems."],
            ]} />
          </Section>

          <Section num="9" title="Privacy">
            Your use of the Platform is also governed by our{" "}
            <a href="/privacy" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">Privacy Policy</a>,
            which is incorporated into these Terms by reference. Please read the Privacy Policy carefully before using the Platform.
          </Section>

          <Section num="10" title="Confidentiality">
            You acknowledge that altar call records, prayer requests, and follow-up notes stored in the Platform are confidential pastoral communications. You agree to:
            <BulletList items={[
              "Limit staff access to records on a need-to-know basis",
              "Not discuss or disclose individual records outside of appropriate pastoral care contexts",
              "Implement reasonable internal policies governing staff access to the Platform",
              "Promptly revoke Platform access for any staff member who is no longer authorized",
            ]} />
          </Section>

          <Section num="11" title="Intellectual Property">
            <SubList items={[
              ["11.1", "The Platform, including its design, features, code, and content, is owned by His Altar and protected by applicable intellectual property laws."],
              ["11.2", "We grant you a limited, non-exclusive, non-transferable license to use the Platform during your active subscription solely for your church's internal pastoral care purposes."],
              ["11.3", "Your church's data belongs to you. We claim no ownership over any congregation member information you enter into the Platform."],
            ]} />
          </Section>

          <Section num="12" title="Disclaimers">
            <SubList items={[
              ["12.1", "The Platform is provided \u201cas is\u201d and \u201cas available\u201d without warranties of any kind, express or implied."],
              ["12.2", "We do not warrant that the Platform will be uninterrupted, error-free, or completely secure."],
              ["12.3", "We are not responsible for the pastoral care decisions made by your church or staff using information stored in the Platform."],
              ["12.4", "The Platform is a management tool only. We make no representations regarding the spiritual, emotional, or psychological outcomes of any pastoral care activity."],
            ]} />
          </Section>

          <Section num="13" title="Limitation of Liability">
            To the fullest extent permitted by law, His Altar shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform, including but not limited to loss of data, loss of revenue, or unauthorized access to congregation member records. Our total liability to you for any claim shall not exceed the amount you paid us in the 3 months preceding the claim.
          </Section>

          <Section num="14" title="Indemnification">
            You agree to indemnify, defend, and hold harmless His Altar and its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable legal fees) arising from:
            <BulletList items={[
              "Your use of the Platform",
              "Your violation of these Terms",
              "Any data you store on the Platform",
              "Your failure to obtain required consents from congregation members",
              "Any breach of confidentiality by you or your staff",
            ]} />
          </Section>

          <Section num="15" title="Termination">
            <SubList items={[
              ["15.1", "You may terminate your account at any time by canceling your subscription and requesting account deletion."],
              ["15.2", "We may suspend or terminate your account immediately if you violate these Terms, engage in unlawful activity, or pose a risk to other users or the Platform."],
              ["15.3", "Upon termination, your right to access the Platform ceases immediately. Data retention and deletion will follow the terms in Section 8."],
            ]} />
          </Section>

          <Section num="16" title="Changes to These Terms">
            We reserve the right to update these Terms at any time. We will notify you of material changes by email and through an in-app notice at least 30 days before changes take effect. Your continued use of the Platform after changes take effect constitutes acceptance of the updated Terms.
          </Section>

          <Section num="17" title="Governing Law">
            These Terms are governed by the laws of the State of California, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of Riverside County, California.
          </Section>

          <Section num="18" title="Contact">
            For questions about these Terms, contact us at:
            <div className="mt-3 text-neutral-500 space-y-0.5">
              <p>His Altar</p>
              <p>
                <a href="mailto:support@hisaltar.com" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
                  support@hisaltar.com
                </a>
              </p>
            </div>
          </Section>
        </div>

        <div className="h-px bg-neutral-800 my-8" />

        <p className="text-center text-neutral-600 text-xs italic">
          By checking the acceptance box during registration, you confirm that you have read, understood, and agree to these Terms of Service.
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

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-white font-semibold text-sm mb-3">
        <span className="text-purple-500 mr-2">{num}.</span>{title}
      </h2>
      <div className="text-neutral-400 text-sm leading-relaxed">{children}</div>
    </div>
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
