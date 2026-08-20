import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Terms of Service — Bizcon RSVP",
  description:
    "Terms governing use of Bizcon RSVP by event organisations, staff, and attendees.",
};

export default function TermsOfServicePage() {
  return (
    <LegalPageShell
      eyebrow="Legal"
      title="Terms of Service"
      updated="20 August 2026"
    >
      <p>
        These Terms of Service (&quot;Terms&quot;) govern access to and use of
        Bizcon RSVP (&quot;Bizcon&quot;, &quot;we&quot;, &quot;us&quot;, or
        &quot;the Platform&quot;), the event intelligence service at
        bizconrsvp.com. By creating an organisation account, accepting an
        invitation, registering for an event, or otherwise using the Platform,
        you agree to these Terms.
      </p>

      <LegalSection title="1. Who these Terms apply to">
        <p>Bizcon serves professional summits and conferences. Users include:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong style={{ color: "#1B1815" }}>Organisation customers</strong>{" "}
            — summit organisers, conference directors, government event teams,
            investment forums, and industry associations that create and manage
            events.
          </li>
          <li>
            <strong style={{ color: "#1B1815" }}>Organisation staff</strong> —
            owners, admins, event managers, registration staff, and check-in
            staff acting under an organisation.
          </li>
          <li>
            <strong style={{ color: "#1B1815" }}>Attendees and invitees</strong>{" "}
            — delegates, speakers, sponsors, exhibitors, VIPs, media,
            government or official guests, investors, and other invitees who
            accept invitations, register, or use the attendee portal.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. The service">
        <p>
          Bizcon is a multi-tenant platform for curated event operations. Core
          capabilities include contact and invitee management, invitation
          delivery, registration, attendee profiles, optional matchmaking,
          meeting requests and scheduling, calendar connections, agenda and
          sessions, communications, QR check-in, reporting, and related tools.
        </p>
        <p>
          An invitation is not registration. The typical lifecycle is Invited →
          Accepted → Registered → Confirmed → optional Matchmaking → Meetings →
          Checked In. Organisations remain responsible for how they invite,
          approve, and communicate with their guests.
        </p>
      </LegalSection>

      <LegalSection title="3. Accounts and eligibility">
        <p>
          You must provide accurate information when you sign up or register.
          Authentication is provided through our identity provider. You are
          responsible for safeguarding access to your account and for activity
          under it.
        </p>
        <p>
          Organisation owners and admins control membership and event roles.
          Staff must only use permissions granted by their organisation and must
          not attempt to access data belonging to other organisations or events.
        </p>
      </LegalSection>

      <LegalSection title="4. Organisation responsibilities">
        <p>If you use Bizcon on behalf of an organisation, you represent that you
          have authority to bind that organisation, and you agree that the
          organisation:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Is responsible for the lawfulness of invitee lists, invitation
            content, registration questions, and communications it sends.
          </li>
          <li>
            Must have a lawful basis to process personal data of invitees and
            attendees (including consent, contract, or legitimate interest where
            applicable).
          </li>
          <li>
            Will not upload unlawful, misleading, or infringing content, or use
            the Platform to spam, harass, or discriminate unlawfully.
          </li>
          <li>
            Will configure event settings, categories, rooms, forms, and staff
            access appropriately for its events.
          </li>
          <li>
            Remains the primary controller of guest and attendee data it uploads
            or collects for its events, as described in our Privacy Statement.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Attendee and invitee terms">
        <p>
          When you open an invitation link, accept or decline, register, build a
          profile, enable matchmaking, request meetings, connect a calendar, or
          present a check-in code, you agree to:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Provide accurate registration and profile information for the event.
          </li>
          <li>
            Use the attendee directory, meetings, and matchmaking features
            professionally and in good faith.
          </li>
          <li>
            Respect other attendees&apos; privacy choices and not scrape,
            export, or misuse contact or profile data.
          </li>
          <li>
            Keep invitation and check-in links confidential; they are personal
            to you.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Matchmaking, meetings, and calendar sync">
        <p>
          Matchmaking and AI insights are optional and subject to event settings
          and individual privacy opt-ins. Meeting requests may be rate-limited.
          Scheduling may consider agenda sessions, rooms, and connected calendar
          availability where configured.
        </p>
        <p>
          If you connect Google Calendar or another calendar provider, you
          authorise Bizcon to create or update event entries needed for accepted
          meetings, using the scopes you grant. You can disconnect calendars in
          the attendee portal. Calendar providers remain subject to their own
          terms.
        </p>
      </LegalSection>

      <LegalSection title="7. Acceptable use">
        <p>You must not:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Probe, overload, or disrupt the Platform, or attempt to bypass
            authentication, tenant isolation, or rate limits.
          </li>
          <li>
            Access or process personal data outside your authorised role.
          </li>
          <li>
            Reverse engineer the Platform except where applicable law permits.
          </li>
          <li>
            Use Bizcon for unlawful surveillance, spam, fraud, or content that
            violates others&apos; rights.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Intellectual property">
        <p>
          Bizcon and its branding, software, and documentation remain our
          property or that of our licensors. Organisations retain ownership of
          their event content and guest data. Attendees retain rights in content
          they submit, subject to the licence needed for the Platform and the
          host organisation to run the event.
        </p>
      </LegalSection>

      <LegalSection title="9. Third-party services">
        <p>
          The Platform relies on infrastructure and service providers such as
          hosting, databases, email delivery, authentication, bot protection,
          storage, analytics, AI providers (where enabled), and calendar APIs.
          Your use of those providers through Bizcon may also be subject to their
          terms.
        </p>
      </LegalSection>

      <LegalSection title="10. Availability and changes">
        <p>
          We aim for reliable service but do not guarantee uninterrupted
          availability. Features may change as we improve the product. Material
          changes to these Terms will be reflected by updating the &quot;Last
          updated&quot; date on this page. Continued use after changes
          constitutes acceptance where permitted by law.
        </p>
      </LegalSection>

      <LegalSection title="11. Disclaimers">
        <p>
          The Platform is provided on an &quot;as is&quot; and &quot;as
          available&quot; basis to the fullest extent permitted by law. We do
          not warrant that matchmaking suggestions, AI insights, or scheduling
          outcomes will meet every business objective. Organisations are
          responsible for final event decisions.
        </p>
      </LegalSection>

      <LegalSection title="12. Limitation of liability">
        <p>
          To the maximum extent permitted by applicable law, Bizcon and its
          suppliers are not liable for indirect, incidental, special,
          consequential, or punitive damages, or for loss of profits, data,
          goodwill, or business interruption arising from use of the Platform.
          Our aggregate liability for claims relating to the Platform in any
          twelve-month period is limited to the fees paid by the organisation
          customer to Bizcon for the Platform in that period (or, if none, one
          hundred US dollars or local equivalent).
        </p>
        <p>
          Nothing in these Terms excludes liability that cannot be limited under
          applicable law, including for death or personal injury caused by
          negligence, or for fraud.
        </p>
      </LegalSection>

      <LegalSection title="13. Suspension and termination">
        <p>
          We may suspend or terminate access for material breach, unlawful use,
          security risk, or non-payment where applicable. Organisations may stop
          using the Platform by closing their account according to available
          account processes. Provisions that by nature should survive
          (including intellectual property, disclaimers, and liability limits)
          will survive termination.
        </p>
      </LegalSection>

      <LegalSection title="14. Governing law">
        <p>
          These Terms are governed by the laws of South Africa, without regard
          to conflict-of-law rules, unless mandatory local consumer protections
          require otherwise for individual attendees. Courts of competent
          jurisdiction in South Africa shall have exclusive jurisdiction, except
          where mandatory law gives you the right to bring claims in your place
          of residence.
        </p>
      </LegalSection>

      <LegalSection title="15. Contact">
        <p>
          Questions about these Terms:{" "}
          <a
            href="mailto:hello@bizconrsvp.com"
            className="font-medium underline-offset-4 hover:underline"
            style={{ color: "#1B1815" }}
          >
            hello@bizconrsvp.com
          </a>
          . For privacy matters, see our{" "}
          <a
            href="/privacystatment"
            className="font-medium underline-offset-4 hover:underline"
            style={{ color: "#1B1815" }}
          >
            Privacy Statement
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
