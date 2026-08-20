import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacy Statement — Bizcon RSVP",
  description:
    "How Bizcon RSVP processes personal data for organisations, staff, and event attendees.",
};

export default function PrivacyStatementPage() {
  return (
    <LegalPageShell
      eyebrow="Legal"
      title="Privacy Statement"
      updated="20 August 2026"
    >
      <p>
        This Privacy Statement explains how Bizcon RSVP (&quot;Bizcon&quot;,
        &quot;we&quot;, &quot;us&quot;) processes personal information when you
        use bizconrsvp.com and related services. It is written for organisation
        customers, their staff, invitees, and attendees of professional
        summits and conferences hosted on the Platform.
      </p>
      <p>
        It complements — and does not replace — privacy notices that an event
        organisation may provide to its guests.
      </p>

      <LegalSection title="1. Roles: who is responsible for your data">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong style={{ color: "#1B1815" }}>Event organisations</strong>{" "}
            generally act as the <em>controller</em> of invitee and attendee
            data for their events (who is invited, registration answers,
            categories, communications, and event-day records).
          </li>
          <li>
            <strong style={{ color: "#1B1815" }}>Bizcon</strong> provides the
            Platform as a multi-tenant service provider / <em>processor</em> for
            that organisation data, and as a controller for account, billing
            contact, product analytics, security, and support data we need to
            operate the service.
          </li>
        </ul>
        <p>
          If you are an invitee or attendee, questions about why you were
          invited or what an organiser collected should usually go to that
          organisation first. You may also contact us at the address below.
        </p>
      </LegalSection>

      <LegalSection title="2. Whose data we process">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Organisation owners, admins, and event staff</li>
          <li>
            Invitees and registered attendees (delegates, speakers, sponsors,
            exhibitors, VIPs, media, government or official guests, investors,
            and other categories defined by the organiser)
          </li>
          <li>People who request a demo or contact us via our website</li>
          <li>Website visitors (limited technical data)</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Categories of personal data">
        <p>Depending on your role and the event configuration, we may process:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong style={{ color: "#1B1815" }}>Identity and contact</strong> —
            name, email, phone, company, job title, country, category.
          </li>
          <li>
            <strong style={{ color: "#1B1815" }}>Account data</strong> —
            authentication identifiers via our identity provider (Clerk),
            organisation membership, and event roles.
          </li>
          <li>
            <strong style={{ color: "#1B1815" }}>Invitation and registration</strong>{" "}
            — invitation status and timestamps, registration form answers,
            dietary or accessibility information if the organiser requests it,
            application submissions where public apply is enabled.
          </li>
          <li>
            <strong style={{ color: "#1B1815" }}>Networking profile</strong> —
            interests, looking-for / offering, industries, geographies,
            directory visibility, and matchmaking preferences.
          </li>
          <li>
            <strong style={{ color: "#1B1815" }}>Meetings and calendar</strong> —
            meeting requests, scheduled times, rooms, and calendar connection
            tokens when you connect Google Calendar (or other providers when
            available) to sync meeting invites.
          </li>
          <li>
            <strong style={{ color: "#1B1815" }}>Event operations</strong> —
            session registrations, QR / check-in status, communications
            history, exports performed by authorised staff.
          </li>
          <li>
            <strong style={{ color: "#1B1815" }}>AI matchmaking</strong> —
            structured profile fields and optional AI-generated insights when
            both the event and the relevant attendees have opted in.
          </li>
          <li>
            <strong style={{ color: "#1B1815" }}>Technical and security</strong>{" "}
            — IP address (e.g. audit / rate limiting), device or browser
            metadata, logs needed to secure the service, and bot-protection
            signals (e.g. Turnstile) on public flows.
          </li>
        </ul>
        <p>
          We aim to collect only what is necessary for the stated event and
          platform purposes.
        </p>
      </LegalSection>

      <LegalSection title="4. How we use personal data">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Provide and secure multi-tenant event workspaces</li>
          <li>
            Send and track invitations, registration, reminders, and
            transactional emails on behalf of organisations
          </li>
          <li>
            Operate attendee portals, profiles, privacy controls, directories,
            meetings, agenda, and check-in
          </li>
          <li>
            Run optional matchmaking and AI insights where enabled and opted in
          </li>
          <li>Sync accepted meetings to connected calendars</li>
          <li>
            Produce organiser reports and exports for authorised staff
          </li>
          <li>
            Maintain audit logs for invite, register, check-in, admin, and
            export actions
          </li>
          <li>
            Improve reliability, prevent abuse, and respond to support or demo
            requests
          </li>
          <li>Comply with legal obligations</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Legal bases">
        <p>
          Where data protection law requires a legal basis (for example GDPR /
          UK GDPR / POPIA concepts), we rely on: performance of a contract
          (providing the Platform or completing registration); legitimate
          interests (securing the service, product improvement, fraud
          prevention) balanced against your rights; consent where required
          (certain marketing, optional AI insights, calendar OAuth grants); and
          legal obligation where applicable. Organisations are responsible for
          their own basis when they invite and process guest data.
        </p>
      </LegalSection>

      <LegalSection title="6. Sharing and processors">
        <p>
          We do not sell personal data. We share data with:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            The host organisation and its authorised staff for the relevant
            event
          </li>
          <li>
            Other attendees only as permitted by privacy settings and feature
            design (e.g. directory fields you allow)
          </li>
          <li>
            Service providers that host or power the Platform (e.g. cloud
            hosting and database, email delivery, authentication, bot
            protection, object storage, optional AI providers, calendar APIs)
          </li>
          <li>
            Authorities when required by law or to protect rights and safety
          </li>
        </ul>
        <p>
          Tenant isolation is enforced so one organisation cannot access
          another organisation&apos;s events, guests, or reports through the
          Platform&apos;s normal authorisation model.
        </p>
      </LegalSection>

      <LegalSection title="7. International transfers">
        <p>
          Infrastructure and providers may process data in regions outside your
          country. Where required, we use appropriate safeguards (such as
          standard contractual clauses or equivalent measures) with processors.
        </p>
      </LegalSection>

      <LegalSection title="8. Retention">
        <p>
          We retain personal data for as long as needed to provide the service
          to the organisation, comply with law, resolve disputes, and maintain
          security records. Organisations may cancel registrations or manage
          event data according to product tools. Account and audit records may
          be kept longer where necessary for security and compliance.
        </p>
      </LegalSection>

      <LegalSection title="9. Security">
        <p>
          We apply layered controls appropriate to an event platform holding
          personal and commercially sensitive information, including
          authentication, organisation- and event-scoped authorisation,
          hashed invitation / QR tokens, rate limiting on sensitive flows,
          encryption of certain secrets (e.g. calendar tokens), and audit
          logging. No method of transmission or storage is perfectly secure;
          please protect invitation links and account credentials.
        </p>
      </LegalSection>

      <LegalSection title="10. Your choices and rights">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Attendees can manage profile and privacy settings (directory
            visibility, matchmaking, AI insights, email/phone visibility) in the
            attendee portal where available.
          </li>
          <li>
            You may disconnect calendar integrations from the Calendar page.
          </li>
          <li>
            Depending on your location, you may have rights to access, correct,
            delete, restrict, or object to certain processing, and to data
            portability or complaint to a supervisory authority.
          </li>
        </ul>
        <p>
          To exercise rights relating to an event&apos;s guest list, contact the
          organising organisation and/or{" "}
          <a
            href="mailto:hello@bizconrsvp.com"
            className="font-medium underline-offset-4 hover:underline"
            style={{ color: "#1B1815" }}
          >
            hello@bizconrsvp.com
          </a>
          . We may need to verify identity and may redirect attendee requests to
          the relevant organisation when they are the controller.
        </p>
      </LegalSection>

      <LegalSection title="11. Children">
        <p>
          Bizcon is designed for professional events and is not directed at
          children. We do not knowingly collect personal data from children
          under 16 (or higher age where required locally) for Platform accounts.
          If you believe we have, contact us to delete it.
        </p>
      </LegalSection>

      <LegalSection title="12. Cookies and similar technologies">
        <p>
          We use cookies and similar technologies necessary for authentication,
          session security, and core product function. Bot-protection widgets on
          public invite/register flows may set their own cookies. Optional
          analytics cookies, if introduced, will be described and controlled as
          required by law.
        </p>
      </LegalSection>

      <LegalSection title="13. Changes">
        <p>
          We may update this Privacy Statement as the product or law evolves.
          The &quot;Last updated&quot; date at the top will change when we do.
          Significant changes may also be communicated through the product or
          by email to organisation contacts where appropriate.
        </p>
      </LegalSection>

      <LegalSection title="14. Contact">
        <p>
          Privacy enquiries:{" "}
          <a
            href="mailto:hello@bizconrsvp.com"
            className="font-medium underline-offset-4 hover:underline"
            style={{ color: "#1B1815" }}
          >
            hello@bizconrsvp.com
          </a>
          .
        </p>
        <p>
          Related:{" "}
          <a
            href="/termsofservice"
            className="font-medium underline-offset-4 hover:underline"
            style={{ color: "#1B1815" }}
          >
            Terms of Service
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
