import type { Metadata } from "next";
import { LegalList, LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms of Service | ARI Press Automation",
  description: "Terms of Service for ARI Press Automation — media video publishing platform.",
};

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service" lastUpdated="June 2026">
      <p>
        ARI Press Automation is a web-based platform designed for media teams, publishers, and
        authorized users who want to generate, prepare, manage, and publish short-form news videos
        to connected social media accounts.
      </p>
      <p>
        By using this application, you agree to use it only for lawful, authorized, and legitimate
        media publishing purposes.
      </p>

      <LegalSection title="1. Use of the Service">
        <p>
          ARI Press Automation allows authorized users to import approved news sources, generate
          video scripts, create vertical news videos, prepare captions and subtitles, manage media
          assets, and publish or upload content to connected TikTok accounts.
        </p>
        <p>
          The service is intended only for official, authorized, and legitimate publishing
          workflows. Users must not use the application for spam, fake accounts, impersonation,
          misleading content, unauthorized scraping, harassment, or any activity that violates
          applicable laws or platform rules.
        </p>
      </LegalSection>

      <LegalSection title="2. User Responsibilities">
        <p>
          Users are responsible for ensuring that they have the legal right to use any news
          articles, images, videos, audio, logos, trademarks, or other media processed through the
          application.
        </p>
        <p>
          Users are responsible for reviewing generated content before publication and ensuring that
          published content is accurate, lawful, and compliant with TikTok policies and any
          applicable copyright or media regulations.
        </p>
      </LegalSection>

      <LegalSection title="3. TikTok Account Connection">
        <p>
          ARI Press Automation may allow users to connect TikTok accounts through TikTok Login or
          OAuth authorization. The application may use the permissions granted by the user only to
          identify the connected account and upload or publish content requested by the authorized
          user.
        </p>
        <p>
          The application does not create fake TikTok accounts, does not bypass TikTok systems, and
          does not post to any account without authorization.
        </p>
      </LegalSection>

      <LegalSection title="4. Content Generation">
        <p>
          The application may use automated systems and artificial intelligence tools to generate
          scripts, subtitles, summaries, descriptions, hashtags, voice-over audio, and video
          layouts.
        </p>
        <p>
          Generated content may contain errors. Users must review all generated content before
          publishing. ARI Press Automation is not responsible for inaccurate, incomplete, or
          misleading content published by users.
        </p>
      </LegalSection>

      <LegalSection title="5. Prohibited Uses">
        <p>Users may not use the service to:</p>
        <LegalList
          items={[
            "publish illegal, harmful, misleading, defamatory, or infringing content;",
            "upload or publish content without the required rights or permissions;",
            "impersonate another person, organization, government agency, or media outlet;",
            "operate spam networks or automated fake engagement systems;",
            "violate TikTok policies or any applicable law.",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Intellectual Property">
        <p>
          Users retain responsibility for the content they upload, import, generate, or publish. The
          ARI Press Automation name, interface, software, and branding are owned by the
          application owner unless otherwise stated.
        </p>
      </LegalSection>

      <LegalSection title="7. Service Availability">
        <p>
          The service may be updated, interrupted, limited, or discontinued at any time. We do not
          guarantee uninterrupted availability or error-free operation.
        </p>
      </LegalSection>

      <LegalSection title="8. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, ARI Press Automation and its owner are not liable
          for damages, losses, account restrictions, copyright claims, platform enforcement actions,
          or other consequences resulting from user-generated or user-published content.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes to These Terms">
        <p>
          We may update these Terms of Service from time to time. Continued use of the service
          after changes means that you accept the updated terms.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>For questions about these Terms, contact:</p>
        <p>
          <a
            href="mailto:alexandrucarp43@gmail.com"
            className="font-medium text-violet-400 hover:text-violet-300"
          >
            alexandrucarp43@gmail.com
          </a>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
