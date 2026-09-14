/**
 * Draft legal and trust copy for Candler.
 *
 * Counsel review is required before a broad public launch. These documents are
 * written as serious product drafts, not placeholder lorem. Do not surface
 * "not legal advice" banners on the customer-facing pages.
 */

import { SITE } from "@/config/site";
import {
  CURRENT_AUP_VERSION,
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
  LEGAL_EFFECTIVE_DATE_LABEL,
  LEGAL_ROUTES,
} from "@/lib/legal/versions";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalDocument = {
  slug: "terms" | "privacy" | "acceptable-use" | "security";
  title: string;
  description: string;
  version: string;
  effectiveLabel: string;
  updatedLabel: string;
  informational?: boolean;
  sections: LegalSection[];
};

const CONTACT = `hello@${SITE.domain}`;
const PRIVACY = `privacy@${SITE.domain}`;
const LEGAL = `legal@${SITE.domain}`;

export const TERMS_DOCUMENT: LegalDocument = {
  slug: "terms",
  title: "Terms of Service",
  description: `The terms that govern use of ${SITE.name}.`,
  version: CURRENT_TERMS_VERSION,
  effectiveLabel: LEGAL_EFFECTIVE_DATE_LABEL,
  updatedLabel: LEGAL_EFFECTIVE_DATE_LABEL,
  sections: [
    {
      id: "agreement",
      title: "Agreement",
      paragraphs: [
        `These Terms of Service (“Terms”) govern access to and use of ${SITE.name} at ${SITE.domain} and related applications, APIs, and services (the “Service”). By creating an account or using the Service, you agree to these Terms.`,
        `Use of ${SITE.name} is also subject to the Acceptable Use Policy at ${SITE.url}${LEGAL_ROUTES.acceptableUse}, which is incorporated into these Terms by reference. Privacy practices are described in the Privacy Policy at ${SITE.url}${LEGAL_ROUTES.privacy}.`,
      ],
    },
    {
      id: "eligibility",
      title: "Eligibility and account responsibility",
      paragraphs: [
        "You must be at least 16 years old, or the minimum age of digital consent in your country if higher, to create an account. If you use the Service on behalf of an organization, you represent that you have authority to bind that organization.",
        "You are responsible for your account, the accuracy of registration information, and all activity that occurs under your credentials. You must keep your password, recovery codes, authenticator devices, and session devices under your control. Notify us promptly at the contact below if you believe your account has been compromised.",
        `${SITE.name} does not guarantee that unauthorized access to your devices, email inbox, or reused passwords can be prevented. Secure login is a shared responsibility.`,
      ],
    },
    {
      id: "vault",
      title: "Candler Vault",
      paragraphs: [
        `Vault lets you store project secrets such as API keys and environment variables. Secret values are stored as ciphertext using AES-256-GCM. ${SITE.name} does not keep a plaintext value column for Vault secrets.`,
        "You are responsible for the secrets you store, for classifying them correctly, and for rotating them if a device, account, or integration is compromised. Reveal and copy of Vault values may require additional authentication (step-up). Metadata about secrets (names, environment, timestamps, and similar) may be processed unencrypted so the workspace can function.",
      ],
    },
    {
      id: "authenticator",
      title: "Authenticator",
      paragraphs: [
        "Candler Authenticator stores TOTP seeds so you can generate one-time codes. Seeds are stored encrypted at rest with AES-256-GCM. Generated codes are produced on demand and are not stored as a historical code log.",
        `Authenticator is a convenience aligned with standard TOTP. It is not a substitute for keeping backup factors. Losing access to ${SITE.name} and to your other factors may lock you out of third-party accounts that depend on those seeds.`,
      ],
    },
    {
      id: "recovery",
      title: "Recovery Codes",
      paragraphs: [
        `Recovery code sets you store in ${SITE.name} are encrypted at rest with AES-256-GCM. Recovery codes generated for your ${SITE.name} login are shown once when created. ${SITE.name} stores only what is required to verify and consume them.`,
        `You must store recovery codes in a place you control. ${SITE.name} cannot reconstruct a discarded one-time recovery code for you.`,
      ],
    },
    {
      id: "cloud",
      title: "Candler Cloud, backups, and Restore to Device",
      paragraphs: [
        "Candler Cloud stores files you upload in private object storage. Access is authorized by the Service using short-lived signed requests. Cloud buckets are not public. Storage quotas are enforced server-side and currently include 10 GB on Free, 50 GB on Candler Pro, 500 GB on Pro + Cloud 500, and 1 TB on Pro + Cloud 1 TB. Quotas and plan names may change.",
        "Restore to Device packages selected Cloud content for download to a machine you control. Restores can fail, be canceled, or be incomplete. You remain responsible for verifying restored files before relying on them.",
        `${SITE.name} does not guarantee that backups are complete, continuous, or free from corruption, and does not guarantee that Cloud objects cannot be lost. You should maintain independent backups of irreplaceable data.`,
      ],
    },
    {
      id: "billing",
      title: "Subscriptions, plans, and cancellation",
      paragraphs: [
        "Paid plans are billed through Stripe. Current published launch prices are Candler Pro at US$18 per month, Pro + Cloud 500 at US$29 per month, and Pro + Cloud 1 TB at US$39 per month, plus a Free plan with limited Cloud storage. Prices, entitlements, and taxes may change.",
        "Unless required by law or stated at checkout, fees are non-refundable. Canceling stops future renewal charges; you generally retain access through the end of the paid period. Failed payments may result in suspension or reversion to Free entitlements.",
        `You authorize ${SITE.name} and Stripe to store billing metadata necessary to operate subscriptions, invoices, and customer portals. ${SITE.name} does not store full payment-card numbers on its own servers.`,
      ],
    },
    {
      id: "integrations",
      title: "Third-party services and integrations",
      paragraphs: [
        `${SITE.name} is designed to bridge tools you already use, including GitHub, Vercel, Supabase, Stripe, Cloudflare, and others. Those providers have their own terms. ${SITE.name} does not replace them and is not responsible for their availability, data handling, or billing.`,
        "You are responsible for the credentials, webhooks, and authorizations you connect. Revoke access in the third-party product if you stop using the integration.",
      ],
    },
    {
      id: "agent",
      title: "Candler Agent",
      paragraphs: [
        "Candler Agent can help inspect workspace metadata and propose actions you authorize. Agent traffic may be processed by model providers such as OpenAI when the feature is enabled. Prompts and tool payloads are filtered for common secret patterns, and Agent is designed not to receive raw Vault secret values as a matter of product architecture. Filtering is not perfect.",
        "You must review Agent output before acting on it. You remain responsible for actions you approve, including any effect on third-party systems. Do not instruct Agent to attack systems, steal credentials, or otherwise violate the Acceptable Use Policy.",
      ],
    },
    {
      id: "content",
      title: "Your content and license to operate the Service",
      paragraphs: [
        `You retain ownership of content you submit, including project metadata, files, conversation text, and configuration. You grant ${SITE.name} a worldwide, non-exclusive license to host, transmit, encrypt, back up, display, and otherwise process that content solely as needed to provide and secure the Service.`,
        "You represent that you have the rights needed to submit the content and that it does not violate law or third-party rights.",
      ],
    },
    {
      id: "prohibited",
      title: "Prohibited use",
      paragraphs: [
        `You may not use the Service in violation of the Acceptable Use Policy, including illegal activity, malware distribution, unauthorized access, phishing, infrastructure abuse, or attempts to disrupt ${SITE.name} or third-party systems.`,
      ],
    },
    {
      id: "availability",
      title: "Availability, beta features, and security limitations",
      paragraphs: [
        `${SITE.name} is provided as a developing product. Features may be offered in beta, change, or be withdrawn. We do not warrant uninterrupted or error-free operation.`,
        `${SITE.name} uses encryption, tenant isolation, access controls, and logging as described on the Security page, but no internet service is absolutely secure. ${SITE.name} does not guarantee that data cannot be lost, accessed without authorization, or affected by defects, provider outages, or your own device security.`,
      ],
    },
    {
      id: "suspension",
      title: "Suspension and termination",
      paragraphs: [
        `We may suspend or terminate access if you violate these Terms, if required by law, or if needed to protect the Service or other users. You may stop using the Service and close your account by contacting ${CONTACT}.`,
        "After termination, we may delete or restrict access to content in accordance with the Privacy Policy and operational backups. You should export anything you need before you leave.",
      ],
    },
    {
      id: "disclaimers",
      title: "Disclaimers",
      paragraphs: [
        `THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, ${SITE.name.toUpperCase()} DISCLAIMS WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT, AND ANY WARRANTY THAT THE SERVICE WILL BE SECURE, ERROR-FREE, OR FREE OF DATA LOSS.`,
      ],
    },
    {
      id: "liability",
      title: "Limitation of liability",
      paragraphs: [
        `TO THE MAXIMUM EXTENT PERMITTED BY LAW, ${SITE.name.toUpperCase()} AND ITS OPERATORS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE, DATA, OR GOODWILL, EVEN IF ADVISED OF THE POSSIBILITY.`,
        "TO THE MAXIMUM EXTENT PERMITTED BY LAW, TOTAL LIABILITY ARISING OUT OF THE SERVICE WILL NOT EXCEED THE GREATER OF THE AMOUNTS YOU PAID TO CANDLER FOR THE SERVICE IN THE THREE MONTHS BEFORE THE CLAIM OR ONE HUNDRED U.S. DOLLARS (US$100).",
      ],
    },
    {
      id: "indemnity",
      title: "Indemnity",
      paragraphs: [
        `You will defend and indemnify ${SITE.name} and its operators against claims arising from your content, your use of the Service, your integrations, or your violation of these Terms or applicable law.`,
      ],
    },
    {
      id: "changes",
      title: "Changes to these Terms",
      paragraphs: [
        `We may update these Terms. The version identifier and effective date appear on this page. Material changes that require a new agreement will be presented in the product for acceptance before continued use of the workspace. Continued use after an informational update that does not require re-consent constitutes acceptance of the revised Terms where permitted by law.`,
      ],
    },
    {
      id: "law",
      title: "Governing law and disputes",
      paragraphs: [
        `The operating jurisdiction for ${SITE.name} is not yet finalized for public launch. Until a later revision names a governing law and venue, the parties will attempt to resolve disputes in good faith. Nothing in this section limits non-waivable consumer protections that apply to you.`,
      ],
    },
    {
      id: "contact",
      title: "Contact",
      paragraphs: [
        `Questions about these Terms: ${LEGAL} or ${CONTACT}.`,
      ],
    },
  ],
};

export const PRIVACY_DOCUMENT: LegalDocument = {
  slug: "privacy",
  title: "Privacy Policy",
  description: `How ${SITE.name} handles information.`,
  version: CURRENT_PRIVACY_VERSION,
  effectiveLabel: LEGAL_EFFECTIVE_DATE_LABEL,
  updatedLabel: LEGAL_EFFECTIVE_DATE_LABEL,
  sections: [
    {
      id: "scope",
      title: "Scope",
      paragraphs: [
        `This Privacy Policy describes how ${SITE.name} (“we”) handles information when you use the Service. It should be read with the Terms of Service. It is not a claim of zero collection or zero logging.`,
      ],
    },
    {
      id: "data",
      title: "Information we handle",
      paragraphs: [
        "We handle the following categories, depending on how you use the Service:",
      ],
      bullets: [
        "Account and profile information, such as name, email address, and authentication identifiers.",
        "Authentication data, including password hashes managed by Supabase Auth, session cookies, MFA factor metadata, and hashed or encrypted recovery-code material as applicable. We do not store your account password in plaintext.",
        "Billing metadata from Stripe, such as customer and subscription identifiers, plan, status, and period dates. We do not store full payment-card numbers on Candler servers.",
        "Project and workspace metadata, including names, environments, services, and similar organizational records.",
        "Encrypted Vault, Authenticator, and Recovery payloads (ciphertext, initialization vectors, authentication tags, and key version). Plaintext secret values are not stored as a Vault column. They may exist briefly in memory on a server during encrypt, decrypt, or authorized reveal.",
        "Cloud file bytes and Cloud metadata (filename, size, path, checksums, status). Files are stored in private object storage.",
        "Agent conversation text and tool metadata after secret-pattern sanitization. Agent is designed not to be given raw Vault secret values. Sanitization can miss secrets that do not match known patterns.",
        "Security and product logs, including audit events such as copies of secrets, authenticator codes, or recovery material, legal acceptance versions, and operational errors. Audit metadata is redacted for obvious secret fields and is not a transcript of secret values.",
        "Cookies and similar storage for authentication sessions.",
        "Browser localStorage and cookies for appearance preferences such as workspace mode and shade. Those preferences are not used as a substitute for legal consent.",
      ],
    },
    {
      id: "purpose",
      title: "Purpose of processing",
      paragraphs: [
        "We process information to create and authenticate accounts, provide Vault, Authenticator, Recovery, Cloud, Agent, billing, and workspace features, enforce quotas and access control, secure the Service, debug incidents, comply with law, and communicate with you about the account you asked us to operate.",
      ],
    },
    {
      id: "processors",
      title: "Service providers",
      paragraphs: [
        "We use processors who handle information on our instructions, including:",
      ],
      bullets: [
        "Supabase, for authentication, Postgres, and row-level security.",
        "Cloudflare R2, for private Cloud object storage and signed access.",
        "Stripe, for checkout, subscriptions, customer portal, and invoices.",
        "OpenAI, when Candler Agent is enabled, for model inference on sanitized conversation content.",
        "Vercel, for application hosting, logs, and related infrastructure where the product is deployed there.",
      ],
    },
    {
      id: "retention",
      title: "Retention and deletion",
      paragraphs: [
        "We retain account and workspace data while the account is active and for a limited period afterward as needed for backups, billing disputes, security investigations, and legal obligations. You may request deletion via the contact below. Some records, such as billing and security logs, may be retained longer where required.",
        "Legal consent records are kept to show which Terms and Privacy versions you accepted. They are not a marketing profile.",
      ],
    },
    {
      id: "security",
      title: "Security practices",
      paragraphs: [
        `${SITE.name} uses TLS in transit on supported deployments, AES-256-GCM for Vault/Authenticator/Recovery payloads, tenant isolation via Postgres row-level security, private Cloud storage, server-side quota checks, and step-up authentication for sensitive reveals. These measures reduce risk. They do not make processing risk-free.`,
      ],
    },
    {
      id: "international",
      title: "International processing",
      paragraphs: [
        `The Service and its processors may process information in the United States and other countries. Those countries may have different data-protection laws than your own. By using the Service you understand that your information may be transferred internationally as needed to operate ${SITE.name}.`,
      ],
    },
    {
      id: "rights",
      title: "Your rights",
      paragraphs: [
        "Depending on your location, you may have rights to access, correct, delete, or export personal information, or to object to or restrict certain processing. Requests can be sent to the privacy contact below. We may need to verify the account making the request.",
        "You can control appearance preferences in your browser. Clearing site data removes local appearance settings; it does not delete your account or legal consent records.",
      ],
    },
    {
      id: "children",
      title: "Children",
      paragraphs: [
        `${SITE.name} is not directed to children under 16, or under the higher digital-consent age in your country. We do not knowingly collect personal information from children below that age.`,
      ],
    },
    {
      id: "changes",
      title: "Changes",
      paragraphs: [
        "We may update this Policy. The version and dates on this page will change. We will require a fresh in-product acknowledgement when we decide a change is material to that effect. Not every edit will block the workspace.",
      ],
    },
    {
      id: "contact",
      title: "Contact",
      paragraphs: [
        `Privacy questions: ${PRIVACY}. General contact: ${CONTACT}.`,
      ],
    },
  ],
};

export const AUP_DOCUMENT: LegalDocument = {
  slug: "acceptable-use",
  title: "Acceptable Use Policy",
  description: `Rules for using ${SITE.name} responsibly.`,
  version: CURRENT_AUP_VERSION,
  effectiveLabel: LEGAL_EFFECTIVE_DATE_LABEL,
  updatedLabel: LEGAL_EFFECTIVE_DATE_LABEL,
  sections: [
    {
      id: "purpose",
      title: "Purpose",
      paragraphs: [
        `This Acceptable Use Policy (“AUP”) is part of the ${SITE.name} Terms of Service. It states what you may not do with the Service, including Vault, Authenticator, Recovery, Cloud, Agent, and integrations.`,
      ],
    },
    {
      id: "illegal",
      title: "Illegal and harmful activity",
      paragraphs: [
        "You may not use the Service to commit or facilitate crime, including fraud, exploitation, trafficking, or other unlawful activity. You may not store or distribute unlawful content.",
      ],
    },
    {
      id: "intrusion",
      title: "Unauthorized access, malware, and credential abuse",
      paragraphs: [
        `You may not use ${SITE.name} to write, host, or operate malware, ransomware, or exploit kits; to attempt unauthorized access to any system; to phish, harvest, or replay credentials; or to traffic in stolen accounts or session tokens.`,
        "Do not use Vault, Authenticator, Recovery, or Cloud as infrastructure for credential theft or for attacking third-party systems.",
      ],
    },
    {
      id: "infrastructure",
      title: "Infrastructure and Cloud abuse",
      paragraphs: [
        "You may not impose unreasonable automated load, probe or scrape the Service in a way that degrades it, attempt to bypass quotas or signed Cloud access, mine cryptocurrency on our infrastructure, or use Cloud storage for bulk content unrelated to software-project work in a way that harms other users.",
        `You may not attempt to disrupt ${SITE.name} or its processors.`,
      ],
    },
    {
      id: "agent",
      title: "Agent and integrations",
      paragraphs: [
        "You may not instruct Candler Agent or connected integrations to violate this AUP, to generate attack tooling, or to act on third-party systems without authorization. You remain responsible for actions you approve.",
      ],
    },
    {
      id: "content",
      title: "Content",
      paragraphs: [
        "You may not upload infringing content, or content that you do not have the right to store. You may not use the Service to host or share CSAM or other prohibited abusive material.",
      ],
    },
    {
      id: "enforcement",
      title: "Enforcement",
      paragraphs: [
        `We may investigate suspected abuse, suspend or terminate accounts, remove content, and notify providers or authorities where we believe we are required or where needed to protect the Service. Reports: ${LEGAL} or ${CONTACT}.`,
      ],
    },
  ],
};

export const SECURITY_DOCUMENT: LegalDocument = {
  slug: "security",
  title: "Security",
  description: `How ${SITE.name} approaches security today.`,
  version: CURRENT_TERMS_VERSION,
  effectiveLabel: LEGAL_EFFECTIVE_DATE_LABEL,
  updatedLabel: LEGAL_EFFECTIVE_DATE_LABEL,
  informational: true,
  sections: [
    {
      id: "honest",
      title: "An honest trust page",
      paragraphs: [
        `This page describes ${SITE.name}’s current security architecture. It is not a contract, not a certification, and not a promise of absolute safety. ${SITE.name} does not currently claim SOC 2, ISO 27001, or similar attestations, and does not describe its cryptography as “military-grade.”`,
      ],
    },
    {
      id: "encryption",
      title: "Encrypted Vault, Authenticator, and Recovery",
      paragraphs: [
        "Vault secret values, Authenticator TOTP seeds, and stored Recovery payloads are encrypted with AES-256-GCM. Ciphertext, IV, authentication tag, and key version are stored. There is no plaintext value column on Vault secrets. Encryption keys are server-side secrets, not browser secrets.",
        "Authorized reveal decrypts on the server for the signed-in owner after workspace and ownership checks. Sensitive reveals can require step-up authentication. Decrypted values may exist briefly in memory during that operation.",
      ],
    },
    {
      id: "isolation",
      title: "Tenant isolation and Cloud access",
      paragraphs: [
        "Application data is isolated with Postgres row-level security so one authenticated user cannot read another user’s workspace rows through the normal API. Cloud objects live in private R2 storage, addressed with owner-scoped keys, and are accessed with short-lived signed URLs rather than a public bucket.",
        "Cloud quotas are enforced on the server. Authenticated clients cannot mark objects backed up or write Cloud rows in ways the product does not authorize.",
      ],
    },
    {
      id: "agent",
      title: "Agent isolation",
      paragraphs: [
        "Candler Agent is built to work from metadata and sanitized text. Known secret patterns are redacted before model calls, and tool payloads are rejected if they still look like raw secrets. This is a boundary, not a proof that no secret can ever appear in a prompt you type yourself.",
      ],
    },
    {
      id: "logging",
      title: "Audit and logging",
      paragraphs: [
        "Security-relevant actions can write audit events (for example, that a secret was copied). Those events record metadata such as actor, workspace, and event type. They are not designed to store the secret, TOTP code, or password. Obvious sensitive fields are redacted before insert.",
      ],
    },
    {
      id: "limits",
      title: "Limits",
      paragraphs: [
        `${SITE.name} cannot protect a compromised laptop, reused password, or phishing site that impersonates us. Backups can fail. Processors can have incidents. You should use unique passwords, keep recovery codes offline, and keep independent copies of irreplaceable work.`,
      ],
    },
    {
      id: "contact",
      title: "Contact",
      paragraphs: [
        `Security reports: ${LEGAL} or ${CONTACT}. Please do not include live production secrets in the initial email.`,
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS = [TERMS_DOCUMENT, PRIVACY_DOCUMENT, AUP_DOCUMENT, SECURITY_DOCUMENT] as const;

export function legalDocumentBySlug(slug: LegalDocument["slug"]) {
  return LEGAL_DOCUMENTS.find((doc) => doc.slug === slug)!;
}
