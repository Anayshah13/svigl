import Link from "next/link";
import { LegalDocument, LegalSection } from "@/features/legal/LegalDocument";

const TOC = [
  { id: "introduction", label: "Introduction" },
  { id: "information-you-provide", label: "Information you provide" },
  { id: "information-collected-automatically", label: "Information collected automatically" },
  { id: "analytics", label: "Analytics" },
  { id: "how-we-use-information", label: "How information is used" },
  { id: "cookies", label: "Cookies and similar technologies" },
  { id: "third-party-services", label: "Third-party services" },
  { id: "data-sharing", label: "Data sharing" },
  { id: "data-retention", label: "Data retention" },
  { id: "data-security", label: "Data security" },
  { id: "your-choices", label: "Your choices and rights" },
  { id: "children", label: "Children and age" },
  { id: "international", label: "International data processing" },
  { id: "changes", label: "Policy changes" },
  { id: "contact", label: "Contact" },
];

export function PrivacyPolicyContent() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="Privacy Policy"
      lastUpdated="August 4, 2026"
      description="How Svigl collects, uses, stores, and handles information when you access or use the service."
      toc={TOC}
      relatedHref="/termsandconditions"
      relatedLabel="View Terms & Conditions"
    >
      <LegalSection id="introduction" title="1. Introduction">
        <p>
          This Privacy Policy explains how Svigl (&quot;Svigl,&quot; &quot;we,&quot; &quot;us,&quot; or
          &quot;our&quot;) collects, uses, stores, and handles information when you access or use the
          Svigl website, applications, gameplay features, and related services (collectively, the
          &quot;Service&quot;).
        </p>
        <p>
          By using the Service, you acknowledge this Privacy Policy. If you do not agree, please do
          not use the Service. This Policy should be read together with our{" "}
          <Link href="/termsandconditions">Terms &amp; Conditions</Link>.
        </p>
        <p>
          Svigl is a browser-based multiplayer drawing game and related experiences (including
          galleries, labs, and profile features). This Policy is written to reflect how the Service
          currently operates.
        </p>
      </LegalSection>

      <LegalSection id="information-you-provide" title="2. Information you provide">
        <p>Depending on how you use Svigl, you may provide or cause us to receive the following:</p>

        <h3 className="pt-1 text-base font-bold text-ink">Google authentication</h3>
        <p>
          If you sign in with Google, we use Google OAuth / OpenID Connect with the scopes{" "}
          <strong>openid</strong>, <strong>email</strong>, and <strong>profile</strong>. From Google,
          we receive and process:
        </p>
        <ul>
          <li>your Google account subject identifier;</li>
          <li>your email address (we require a verified email to complete sign-in);</li>
          <li>your name, which is used as your initial display name; and</li>
          <li>your Google profile picture URL, if provided.</li>
        </ul>
        <p>
          Temporary OAuth tokens used during sign-in are processed to complete authentication and are
          not stored as long-term application account credentials in our user database. After account
          creation, later Google sign-ins refresh the stored email; your chosen display name and
          avatar on Svigl are not automatically overwritten by Google on every login.
        </p>

        <h3 className="pt-1 text-base font-bold text-ink">Guest authentication</h3>
        <p>
          If you play as a guest, we create a guest account linked to a browser-generated device
          identifier stored in your browser. Guest accounts receive a generated display name and do
          not require an email address. Returning from the same browser with that identifier may
          reconnect you to the same guest account.
        </p>

        <h3 className="pt-1 text-base font-bold text-ink">Profile and account details</h3>
        <p>We store account information such as:</p>
        <ul>
          <li>an internal user identifier;</li>
          <li>authentication provider type (Google or guest);</li>
          <li>display name / username;</li>
          <li>avatar image URL or an uploaded avatar image (which may be stored as image data);</li>
          <li>email address for Google accounts; and</li>
          <li>
            aggregate gameplay counters associated with your account (for example, drawings completed
            and like/dislike totals).
          </li>
        </ul>
        <p>
          Public profile pages may show your username, avatar, provider type, and aggregate
          counters. Email addresses are not shown on public profiles.
        </p>

        <h3 className="pt-1 text-base font-bold text-ink">Gameplay, rooms, and interactions</h3>
        <p>
          When you create or join rooms and play, we process information needed to operate
          multiplayer gameplay, including room membership, ready state, scores, guess status, round
          participation, and related game-session state.
        </p>

        <h3 className="pt-1 text-base font-bold text-ink">Chat messages</h3>
        <p>
          Chat messages you send during a game are transmitted in real time to other participants as
          needed for gameplay. Chat message text is not stored in our application database as a
          persistent chat history. Messages may exist temporarily in active server memory while being
          processed and in other players&apos; browsers during the current session.
        </p>

        <h3 className="pt-1 text-base font-bold text-ink">Drawings and canvas activity</h3>
        <p>
          Drawing and canvas activity is processed to run the game. Committed canvas state during a
          round may be stored while the round is active. When a round ends, published drawings
          (including associated word, drawing document data, replay timeline information, and
          reaction totals) may be retained and shown in galleries or related features. Reactions such
          as likes and dislikes are associated with your account.
        </p>

        <h3 className="pt-1 text-base font-bold text-ink">Labs and other submissions</h3>
        <p>
          If you use Labs features, we may store personal-best scores linked to your account. If you
          submit feedback through the Feedback page, you may optionally provide a name and email
          address along with your message and feedback category. Feedback submissions are sent through
          a third-party email delivery service (EmailJS) and are not stored by Svigl&apos;s game
          database as part of that flow.
        </p>
      </LegalSection>

      <LegalSection
        id="information-collected-automatically"
        title="3. Information collected automatically"
      >
        <p>When you use the Service, we and our infrastructure may automatically process:</p>
        <ul>
          <li>
            <strong>Session and authentication information</strong>, including authentication cookies
            or tokens, session data used for OAuth sign-in, and related timestamps;
          </li>
          <li>
            <strong>Usage and gameplay events</strong>, such as room creation/joining, round and game
            lifecycle events, and authentication method events (including through analytics when
            enabled);
          </li>
          <li>
            <strong>Technical diagnostics</strong>, such as application server logs that may include
            request method/path, status codes, durations, internal user identifiers, room codes, and
            error details needed to operate and debug the Service; and
          </li>
          <li>
            <strong>Browser storage values</strong> used for guest identity, room continuity, and
            onboarding preferences (described below).
          </li>
        </ul>
        <p>
          Our application code does not currently collect IP addresses or user-agent strings as
          dedicated product fields. However, hosting providers, reverse proxies, and standard web
          server access logs may still process network and request metadata (which can include IP
          address and similar technical information) as part of ordinary internet infrastructure.
        </p>
      </LegalSection>

      <LegalSection id="analytics" title="4. Analytics">
        <p>
          Svigl may use <strong>Google Analytics 4</strong> when a Google Analytics measurement ID is
          configured for the deployment. Google Analytics is a third-party analytics service provided
          by Google.
        </p>
        <p>When enabled, analytics may collect information about:</p>
        <ul>
          <li>pages or screens viewed;</li>
          <li>interactions with the Service;</li>
          <li>authentication-related events (for example, Google or guest sign-in, and sign-out);</li>
          <li>room creation, joining, and leaving;</li>
          <li>gameplay events such as game/round start and finish, guesses, and drawing turns;</li>
          <li>certain technical events such as WebSocket disconnect reasons and API error statuses;</li>
          <li>
            approximate location, device, browser, and traffic/referral information as provided by
            Google Analytics; and
          </li>
          <li>
            an application user identifier associated with your Svigl account (including guest
            accounts) when analytics identification runs after sign-in.
          </li>
        </ul>
        <p>
          Analytics data is not treated as fully anonymous. Custom events may include values such as
          room codes, and Google Analytics may associate activity with identifiers under Google&apos;s
          practices. Google&apos;s collection and use of information is governed by Google&apos;s own
          terms and privacy documentation.
        </p>
      </LegalSection>

      <LegalSection id="how-we-use-information" title="5. How information is used">
        <p>We use information to:</p>
        <ul>
          <li>provide, operate, and maintain the Service;</li>
          <li>authenticate users and maintain sessions;</li>
          <li>enable multiplayer rooms, gameplay, galleries, profiles, and Labs features;</li>
          <li>display usernames, avatars, scores, drawings, and related gameplay state;</li>
          <li>prevent abuse, cheating, and security issues where practicable;</li>
          <li>diagnose technical problems and improve reliability, performance, and user experience;</li>
          <li>understand usage of the Service through analytics when enabled;</li>
          <li>respond to feedback and support requests you submit; and</li>
          <li>develop and improve features of the Service.</li>
        </ul>
      </LegalSection>

      <LegalSection id="cookies" title="6. Cookies and similar technologies">
        <h3 className="text-base font-bold text-ink">Essential authentication and session technologies</h3>
        <p>We use cookies and related storage that are needed for core Service functionality, including:</p>
        <ul>
          <li>
            an HTTP-only authentication cookie (<code className="rounded bg-plum-light px-1.5 py-0.5 font-mono text-[0.85em] text-plum">svigl_access_token</code>) containing a signed session token;
          </li>
          <li>
            a server session cookie used during Google OAuth (including redirect and OAuth state
            handling); and
          </li>
          <li>
            in some browser environments, a short-lived token fallback stored in{" "}
            <code className="rounded bg-plum-light px-1.5 py-0.5 font-mono text-[0.85em] text-plum">sessionStorage</code>{" "}
            and sent with API or WebSocket requests.
          </li>
        </ul>

        <h3 className="pt-1 text-base font-bold text-ink">Local and session storage</h3>
        <p>The Service may store information in your browser such as:</p>
        <ul>
          <li>a persistent guest device identifier;</li>
          <li>active room code and tab-lock information used to manage room sessions;</li>
          <li>post-authentication redirect paths; and</li>
          <li>onboarding dismissal preferences.</li>
        </ul>

        <h3 className="pt-1 text-base font-bold text-ink">Analytics technologies</h3>
        <p>
          When Google Analytics is enabled, Google may set or read cookies or similar identifiers used
          for analytics. These are distinct from Svigl&apos;s essential authentication cookies.
        </p>
        <p>
          You can control cookies through your browser settings. Blocking essential cookies may prevent
          sign-in or other core features from working.
        </p>
      </LegalSection>

      <LegalSection id="third-party-services" title="7. Third-party services">
        <p>
          Svigl relies on third-party services to operate. These providers process information under
          their own terms and privacy practices. Depending on configuration and how you use the
          Service, relevant providers include:
        </p>
        <ul>
          <li>
            <strong>Google</strong> — Google OAuth / OpenID Connect for authentication, and Google
            Analytics 4 for analytics when configured;
          </li>
          <li>
            <strong>EmailJS</strong> — delivery of feedback form submissions and automated
            AI-guesser limit / abuse alerts;
          </li>
          <li>
            <strong>PostgreSQL database infrastructure</strong> — persistent storage of accounts,
            rooms, gameplay state, drawings, and related data;
          </li>
          <li>
            <strong>Amazon Web Services (AWS)</strong> — backend hosting (EC2) used for the API /
            realtime server deployment path present in this project; and
          </li>
          <li>
            <strong>Frontend hosting providers</strong> — the Next.js frontend may be deployed on a
            separate host (for example, a platform such as Vercel). The specific production frontend
            host may vary by deployment.
          </li>
        </ul>
        <p>
          If you set an external avatar URL, your browser may request that image from the third-party
          host you specify. Links to external sites (such as GitHub, LinkedIn, or a personal
          portfolio) are governed by those sites&apos; own practices once you leave Svigl.
        </p>
      </LegalSection>

      <LegalSection id="data-sharing" title="8. Data sharing">
        <p>Svigl does not sell your personal information.</p>
        <p>We may share information in the following circumstances:</p>
        <ul>
          <li>
            with service and infrastructure providers that help us operate the Service (such as
            hosting, database, authentication, analytics, and feedback-delivery providers);
          </li>
          <li>
            with other users of the Service, to the extent necessary for multiplayer gameplay and
            public features (for example, usernames, avatars, scores, room participation, chat during
            a session, and published drawings);
          </li>
          <li>if required to comply with applicable law, legal process, or lawful requests;</li>
          <li>
            to protect the security, integrity, or rights of Svigl, our users, or others, including
            investigating abuse or fraud; and
          </li>
          <li>
            in connection with a business transfer, reorganization, or similar transaction, if one
            occurs in the future, subject to appropriate safeguards.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="data-retention" title="9. Data retention">
        <p>
          We retain information for as long as reasonably necessary to operate the Service, maintain
          security, resolve disputes, enforce our terms, comply with legal obligations, or for other
          legitimate business purposes related to the Service.
        </p>
        <p>In practice, retention currently differs by category:</p>
        <ul>
          <li>
            <strong>Account information</strong> (including guest accounts linked to a device
            identifier) is stored until removed through an account/data deletion process or other
            operational cleanup. Automated self-serve account deletion is not currently available in
            the product interface.
          </li>
          <li>
            <strong>Room and live game-session data</strong> may be deleted when rooms become empty
            or expire under the Service&apos;s presence/cleanup logic, though some related records may
            remain where the application preserves them.
          </li>
          <li>
            <strong>Chat messages</strong> are not retained as a persistent database chat history.
          </li>
          <li>
            <strong>Published drawings</strong>, reactions, Labs scores, and similar content may
            persist after a room ends so galleries, profiles, and related features can continue to
            function.
          </li>
          <li>
            <strong>Logs, analytics, and feedback-delivery records</strong> may be retained by us or
            by the relevant third-party providers according to operational needs and those
            providers&apos; practices.
          </li>
        </ul>
        <p>
          We do not currently publish fixed retention schedules for every data category. If you want
          specific information deleted, see the contact section below.
        </p>
      </LegalSection>

      <LegalSection id="data-security" title="10. Data security">
        <p>
          We use reasonable technical and organizational measures designed to protect information
          processed by the Service. These measures are intended to reduce risk, but no method of
          transmission or storage over the internet is completely secure.
        </p>
        <p>
          We cannot guarantee absolute security of the Service or of information processed through it.
          Please use strong account practices where applicable and avoid sharing sensitive personal
          information in chat, drawings, usernames, or feedback unless necessary.
        </p>
      </LegalSection>

      <LegalSection id="your-choices" title="11. Your choices and rights">
        <p>Depending on how you use Svigl, you may have the following options:</p>
        <ul>
          <li>
            <strong>Guest access</strong> — you may choose guest sign-in instead of Google
            authentication;
          </li>
          <li>
            <strong>Profile controls</strong> — you may update your display name and avatar through
            available profile features;
          </li>
          <li>
            <strong>Browser controls</strong> — you may clear cookies and site storage, which can sign
            you out and, for guests, disconnect the browser from a previous guest identity;
          </li>
          <li>
            <strong>Analytics controls</strong> — you may use browser settings, extensions, or other
            tools that limit analytics cookies or tracking where available; and
          </li>
          <li>
            <strong>Sign out</strong> — signing out clears your active authentication session, but does
            not by itself delete your account or stored content.
          </li>
        </ul>
        <p>
          Depending on where you live, applicable law may provide additional rights regarding access,
          correction, deletion, restriction, or objection to certain processing. Svigl does not
          currently offer an in-product automated account-deletion or data-export workflow.
        </p>
        <p>
          To request access to, correction of, or deletion of personal information associated with
          your account, contact us using the details in the Contact section. We may need to verify
          your request before acting on it, and some information may need to be retained where
          required for security, legal, or operational reasons.
        </p>
      </LegalSection>

      <LegalSection id="children" title="12. Children and age">
        <p>
          Svigl is a general-audience consumer drawing game and is not specifically directed to very
          young children. The Service does not currently implement an age-verification gate or
          parental-consent workflow.
        </p>
        <p>
          If you are not legally able to consent to the applicable terms or to the processing
          described in this Policy under the laws that apply to you, you should use the Service only
          with appropriate parent or guardian involvement where required. If you believe a child has
          provided personal information in a way that is inconsistent with applicable law, please
          contact us so we can review the situation.
        </p>
      </LegalSection>

      <LegalSection id="international" title="13. International data processing">
        <p>
          Svigl and its service providers may process information in countries other than the country
          where you live. Those countries may have different data-protection laws than your own.
        </p>
        <p>
          By using the Service, you understand that your information may be transferred to and
          processed in such locations as needed to operate hosting, authentication, analytics,
          feedback delivery, and related infrastructure. This Policy does not claim that any specific
          cross-border transfer framework has been implemented beyond ordinary use of those providers.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="14. Policy changes">
        <p>
          We may update this Privacy Policy from time to time. When we do, we will revise the
          &quot;Last updated&quot; date at the top of this page. Where changes are material, we may
          also provide additional notice through the Service or other reasonable means.
        </p>
        <p>
          Your continued use of the Service after an updated Policy becomes effective means you
          acknowledge the revised Policy.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="15. Contact">
        <p>
          For privacy questions, requests about your personal information, or related concerns, contact:
        </p>
        <ul>
          <li>
            Email:{" "}
            <strong>[PRIVACY CONTACT EMAIL]</strong>
          </li>
          <li>
            In-product feedback:{" "}
            <Link href="/feedback">Feedback page</Link>
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
        <p>
          Please note that feedback submitted through the Feedback page is transmitted via EmailJS and
          is intended for product feedback; privacy or legal requests are best sent to the privacy
          contact email once it has been configured.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
