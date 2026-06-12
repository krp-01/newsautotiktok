import type { Metadata } from "next";
import { LegalList, LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy | ARI Press Automation",
  description: "Privacy Policy for ARI Press Automation — how we collect and use data.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" lastUpdated="June 2026">
      <p>
        ARI Press Automation respects user privacy. This Privacy Policy explains what information we
        collect, how we use it, and how we protect it.
      </p>

      <LegalSection title="1. Information We Collect">
        <p>We may collect the following information:</p>
        <LegalList
          items={[
            "account information provided by authorized users, such as name, email address, and role;",
            "connected TikTok account information provided through TikTok OAuth, such as account identifier and basic profile information;",
            "access tokens and refresh tokens required to upload or publish content to authorized TikTok accounts;",
            "news sources, RSS URLs, article metadata, generated scripts, generated videos, captions, subtitles, and publishing history;",
            "technical logs, error messages, and usage data needed to operate and improve the service.",
          ]}
        />
      </LegalSection>

      <LegalSection title="2. How We Use Information">
        <p>We use collected information to:</p>
        <LegalList
          items={[
            "provide and operate the ARI Press Automation platform;",
            "allow users to connect TikTok accounts securely;",
            "generate, manage, upload, and publish authorized media content;",
            "store publishing history and job status;",
            "debug errors, improve performance, and secure the service;",
            "comply with legal, security, and platform requirements.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. TikTok Data">
        <p>
          When a user connects a TikTok account, the application may receive TikTok account
          authorization data through TikTok Login or OAuth.
        </p>
        <p>
          We use TikTok data only to identify the connected account and perform actions requested by
          the authorized user, such as uploading or publishing videos. We do not sell TikTok data,
          share it with advertisers, or use it for unauthorized tracking.
        </p>
      </LegalSection>

      <LegalSection title="4. Access Tokens">
        <p>
          Access tokens and refresh tokens are stored securely and are used only to perform authorized
          actions for the connected TikTok account. Users may disconnect their account or request
          deletion of their data.
        </p>
      </LegalSection>

      <LegalSection title="5. Content and Media">
        <p>
          Users are responsible for the content they import, generate, upload, or publish using the
          platform. The application may store generated scripts, videos, subtitles, and publishing
          records in order to provide the service.
        </p>
      </LegalSection>

      <LegalSection title="6. Data Sharing">
        <p>We do not sell personal data. We may share limited data only when necessary to:</p>
        <LegalList
          items={[
            "operate hosting, database, AI, or media processing services;",
            "comply with legal obligations;",
            "protect the security and integrity of the service;",
            "perform actions requested by the authorized user.",
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Data Retention">
        <p>
          We keep user data only as long as needed to provide the service, comply with legal
          obligations, resolve disputes, or maintain security. Users may request deletion of their
          account data by contacting us.
        </p>
      </LegalSection>

      <LegalSection title="8. Security">
        <p>
          We use reasonable technical and organizational measures to protect user data. However, no
          online system is completely secure, and we cannot guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection title="9. Children">
        <p>
          ARI Press Automation is not intended for children under the age required by applicable law
          to use professional publishing tools or connected social media services.
        </p>
      </LegalSection>

      <LegalSection title="10. User Rights">
        <p>
          Depending on applicable law, users may request access, correction, deletion, or restriction
          of their personal data by contacting us.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to This Privacy Policy">
        <p>
          We may update this Privacy Policy from time to time. The updated version will be posted on
          this page with a new &ldquo;Last updated&rdquo; date.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
