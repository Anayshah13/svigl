import Link from "next/link";
import { LegalDocument, LegalSection } from "@/features/legal/LegalDocument";

const TOC = [
  { id: "acceptance", label: "Acceptance of terms" },
  { id: "description", label: "Description of service" },
  { id: "eligibility", label: "Eligibility" },
  { id: "accounts", label: "Accounts and authentication" },
  { id: "conduct", label: "User conduct" },
  { id: "ugc", label: "User-generated content" },
  { id: "multiplayer", label: "Multiplayer interactions" },
  { id: "ip", label: "Intellectual property" },
  { id: "third-parties", label: "Third-party services" },
  { id: "availability", label: "Service availability" },
  { id: "termination", label: "Termination and suspension" },
  { id: "disclaimers", label: "Disclaimer of warranties" },
  { id: "liability", label: "Limitation of liability" },
  { id: "indemnification", label: "Indemnification" },
  { id: "changes", label: "Changes to the service or terms" },
  { id: "governing-law", label: "Governing law" },
  { id: "contact", label: "Contact" },
];

export function TermsContent() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="Terms & Conditions"
      lastUpdated="August 4, 2026"
      description="The rules and conditions that apply when you access or use Svigl."
      toc={TOC}
      relatedHref="/policies"
      relatedLabel="View Privacy Policy"
    >
      <LegalSection id="acceptance" title="1. Acceptance of terms">
        <p>
          These Terms &amp; Conditions (&quot;Terms&quot;) govern your access to and use of Svigl
          (the &quot;Service&quot;). By accessing or using the Service — including by signing in with
          Google, playing as a guest, joining a room, drawing, chatting, browsing galleries, or using
          Labs — you agree to these Terms and acknowledge our{" "}
          <Link href="/policies">Privacy Policy</Link>.
        </p>
        <p>If you do not agree, do not use the Service.</p>
      </LegalSection>

      <LegalSection id="description" title="2. Description of service">
        <p>
          Svigl is an online, browser-based drawing and multiplayer game platform. Depending on
          available features, the Service may allow you to:
        </p>
        <ul>
          <li>sign in with Google or play as a guest;</li>
          <li>create or join multiplayer rooms;</li>
          <li>draw, guess, chat, and otherwise participate in gameplay;</li>
          <li>view published drawings in galleries;</li>
          <li>maintain a profile and related stats; and</li>
          <li>use Labs and related experimental experiences.</li>
        </ul>
        <p>
          Features may change over time. These Terms do not promise that any particular feature will
          remain available indefinitely.
        </p>
      </LegalSection>

      <LegalSection id="eligibility" title="3. Eligibility">
        <p>
          You may use the Service only if you are legally capable of agreeing to these Terms under the
          laws that apply to you, or if you have appropriate parent or guardian authorization where
          required.
        </p>
        <p>
          The Service does not currently implement an age gate. If you are not able to form a binding
          contract or otherwise cannot lawfully use the Service on your own, you should use it only
          with the involvement of a parent or guardian as required by applicable law.
        </p>
      </LegalSection>

      <LegalSection id="accounts" title="4. Accounts and authentication">
        <p>Svigl currently supports:</p>
        <ul>
          <li>
            <strong>Google authentication</strong>, which uses Google OAuth / OpenID Connect; and
          </li>
          <li>
            <strong>Guest access</strong>, which creates or reconnects a guest account tied to a
            browser-stored device identifier.
          </li>
        </ul>
        <p>You are responsible for:</p>
        <ul>
          <li>activity that occurs through your account or authenticated session;</li>
          <li>
            choosing and maintaining a display name that is accurate enough for ordinary use and not
            abusive, deceptive, or otherwise prohibited by these Terms; and
          </li>
          <li>
            keeping access to your devices and accounts secure to the extent within your control.
          </li>
        </ul>
        <p>
          Guest accounts can persist across visits from the same browser until site storage is
          cleared or the account is otherwise removed. Signing out ends your current session but does
          not necessarily delete your account or content.
        </p>
        <p>
          We may suspend, restrict, or terminate access if we reasonably believe an account or session
          is being misused, compromises security, or violates these Terms.
        </p>
      </LegalSection>

      <LegalSection id="conduct" title="5. User conduct">
        <p>
          You agree to use the Service in a lawful and respectful manner. Because Svigl includes
          drawings, chat, usernames, avatars, and multiplayer interaction, the following rules are
          especially important.
        </p>
        <p>You must not:</p>
        <ul>
          <li>harass, threaten, intimidate, or abuse other users;</li>
          <li>engage in hateful, discriminatory, or otherwise abusive behavior;</li>
          <li>
            create, send, or display sexually explicit, pornographic, or otherwise inappropriate
            content;
          </li>
          <li>submit illegal content or use the Service to commit or promote unlawful activity;</li>
          <li>impersonate another person, entity, or Svigl;</li>
          <li>spam rooms, chats, or other users;</li>
          <li>cheat, exploit bugs, or use unfair advantages intended to disrupt gameplay;</li>
          <li>
            use bots, scripts, or automation intended to disrupt, overwhelm, or manipulate the
            Service;
          </li>
          <li>attempt to interfere with servers, networking, rooms, or other users&apos; gameplay;</li>
          <li>probe, scan, or exploit vulnerabilities in the Service;</li>
          <li>attempt unauthorized access to accounts, systems, or data;</li>
          <li>introduce malware, malicious code, or harmful content;</li>
          <li>
            scrape, harvest, or systematically extract data from the Service in ways that are abusive
            or unauthorized;
          </li>
          <li>circumvent access controls, rate limits, or other restrictions; or</li>
          <li>use the Service in any way that violates applicable law.</li>
        </ul>
      </LegalSection>

      <LegalSection id="ugc" title="6. User-generated content">
        <p>
          The Service allows you to submit or create content, including drawings, canvas interactions,
          chat messages, usernames, avatars, feedback, and other materials you provide
          (&quot;User Content&quot;).
        </p>
        <p>
          As between you and Svigl, you retain ownership of your original User Content to the extent
          you own it under applicable law. These Terms do not transfer ownership of your drawings to
          Svigl.
        </p>
        <p>
          By submitting User Content, you grant Svigl a limited, worldwide, non-exclusive,
          royalty-free license to host, store, transmit, display, reproduce, process, moderate, and
          otherwise use that content solely as reasonably necessary to operate, maintain, secure, and
          improve the Service (for example, to show drawings in a room, publish completed drawings to
          galleries, display usernames and avatars, and process reactions or scores).
        </p>
        <p>You are solely responsible for the User Content you submit. You represent that:</p>
        <ul>
          <li>you have the rights needed to submit the content and grant the license above;</li>
          <li>your content does not infringe others&apos; rights; and</li>
          <li>your content complies with these Terms and applicable law.</li>
        </ul>
        <p>
          We reserve the right to remove, restrict, hide, or refuse User Content that we reasonably
          believe violates these Terms, applicable law, or the safety or integrity of the Service.
          Availability of moderation tools may vary, and removal is not guaranteed to be immediate or
          comprehensive.
        </p>
      </LegalSection>

      <LegalSection id="multiplayer" title="7. Multiplayer interactions">
        <p>
          Multiplayer rooms involve interaction with other users. You may encounter drawings,
          messages, usernames, avatars, and other content created by others.
        </p>
        <p>
          Svigl does not guarantee that all user-generated content will be appropriate, accurate,
          inoffensive, or lawful. You use multiplayer features at your own discretion and should leave
          rooms or stop interacting if you encounter content that is unsuitable for you.
        </p>
        <p>
          If you believe content or behavior violates these Terms, you may contact us through the
          channels listed in the Contact section. Svigl does not currently provide a dedicated
          in-product reporting workflow for every content type, and we do not promise that every
          report will result in a particular outcome.
        </p>
      </LegalSection>

      <LegalSection id="ip" title="8. Intellectual property">
        <p>
          The Service — including Svigl&apos;s software, branding, logos, user interface, original
          graphics, design elements, and other platform materials created by or for Svigl — is
          protected by applicable intellectual property laws.
        </p>
        <p>
          These Terms do not transfer ownership of Svigl&apos;s intellectual property to you. Subject
          to these Terms, you may use the Service for its intended personal, non-commercial gameplay
          and browsing purposes. You may not copy, modify, distribute, reverse engineer, or create
          derivative works from Svigl&apos;s platform materials except as permitted by law or with
          our prior written permission.
        </p>
        <p>
          This section does not claim ownership of User Content you create. Ownership of User Content
          is addressed in the User-Generated Content section.
        </p>
      </LegalSection>

      <LegalSection id="third-parties" title="9. Third-party services">
        <p>
          The Service relies on and may interact with third-party services, including Google
          authentication, Google Analytics (when configured), email-delivery providers used for
          feedback, hosting providers, and database infrastructure.
        </p>
        <p>
          Your use of those third-party services may be subject to their own terms and privacy
          policies. Svigl is not responsible for third-party services that we do not control, except
          to the extent required by applicable law.
        </p>
      </LegalSection>

      <LegalSection id="availability" title="10. Service availability">
        <p>
          We aim to keep the Service available, but we do not guarantee uninterrupted, error-free, or
          always-available operation.
        </p>
        <p>We reserve the right to:</p>
        <ul>
          <li>modify features;</li>
          <li>perform maintenance;</li>
          <li>temporarily suspend access; and</li>
          <li>discontinue features or the Service entirely.</li>
        </ul>
        <p>
          We are not liable for downtime, data loss, or interruptions except to the extent such
          liability cannot be limited under applicable law.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="11. Termination and suspension">
        <p>
          We may restrict, suspend, or terminate your access to the Service, in whole or in part, if
          we reasonably believe that you have:
        </p>
        <ul>
          <li>violated these Terms;</li>
          <li>abused other users or the Service;</li>
          <li>created a security threat;</li>
          <li>cheated or exploited the Service;</li>
          <li>engaged in illegal behavior; or</li>
          <li>interfered with other users or the operation of the Service.</li>
        </ul>
        <p>
          You may stop using the Service at any time. Stopping use, or signing out, does not
          automatically delete your account or stored content. Requests related to deletion of
          personal information are addressed in the Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection id="disclaimers" title="12. Disclaimer of warranties">
        <p>
          To the fullest extent permitted by applicable law, the Service is provided on an
          &quot;as is&quot; and &quot;as available&quot; basis. We disclaim warranties of any kind,
          whether express, implied, or statutory, including implied warranties of merchantability,
          fitness for a particular purpose, title, and non-infringement.
        </p>
        <p>
          Without limiting the foregoing, we do not warrant that the Service will be uninterrupted,
          secure, free of defects, or free of harmful components, or that User Content will be
          accurate or appropriate.
        </p>
        <p>
          Some jurisdictions do not allow certain warranty disclaimers. In those jurisdictions, the
          above disclaimers apply only to the extent permitted by law.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="13. Limitation of liability">
        <p>
          To the fullest extent permitted by applicable law, Svigl and its operators, contributors,
          and service providers will not be liable for any indirect, incidental, special,
          consequential, exemplary, or punitive damages, or for any loss of profits, data, goodwill,
          or other intangible losses, arising out of or related to your use of (or inability to use)
          the Service.
        </p>
        <p>
          To the fullest extent permitted by applicable law, our total liability for any claim arising
          out of or relating to the Service or these Terms will not exceed the greater of (a) the
          amount you paid us to use the Service in the twelve (12) months before the claim, if any, or
          (b) USD $50.
        </p>
        <p>
          Nothing in these Terms is intended to exclude or limit liability that cannot be excluded or
          limited under applicable law.
        </p>
      </LegalSection>

      <LegalSection id="indemnification" title="14. Indemnification">
        <p>
          To the extent permitted by applicable law, you agree to indemnify and hold harmless Svigl
          and its operators and contributors from and against reasonable claims, liabilities, damages,
          losses, and expenses (including reasonable legal fees) arising out of or related to:
        </p>
        <ul>
          <li>your misuse of the Service;</li>
          <li>your violation of these Terms; or</li>
          <li>your User Content, including claims that it infringes or violates others&apos; rights.</li>
        </ul>
      </LegalSection>

      <LegalSection id="changes" title="15. Changes to the service or terms">
        <p>
          We may update these Terms from time to time. When we do, we will revise the &quot;Last
          updated&quot; date at the top of this page. For material revisions, we may also provide
          notice through the Service or by other reasonable means.
        </p>
        <p>
          Continued use of the Service after updated Terms become effective constitutes acceptance of
          the revised Terms, except where applicable law requires a different process.
        </p>
      </LegalSection>

      <LegalSection id="governing-law" title="16. Governing law">
        <p>
          <strong>[GOVERNING LAW / JURISDICTION TO BE CONFIRMED]</strong>
        </p>
        <p>
          Until a governing law and dispute forum are confirmed, these Terms are intended to be
          interpreted in a commercially reasonable manner under generally accepted principles of
          contract interpretation, without creating a fictional jurisdiction or legal entity.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="17. Contact">
        <p>For questions about these Terms, contact:</p>
        <ul>
          <li>
            Email: <strong>[LEGAL CONTACT EMAIL]</strong>
          </li>
          <li>
            In-product feedback: <Link href="/feedback">Feedback page</Link>
          </li>
          <li>
            Project issues:{" "}
            <a
              href="https://github.com/Anayshah13/svigl/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Issues
            </a>
          </li>
        </ul>
      </LegalSection>
    </LegalDocument>
  );
}
