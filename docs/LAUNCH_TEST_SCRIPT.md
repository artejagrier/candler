# Candler launch test script

Run this against a non-production Supabase project, private R2 bucket, Stripe
test mode, and a dedicated Agent project before promoting the same configuration.

1. Apply migrations `0001` through `0005`; confirm every migration succeeds.
2. Create an account, verify its email, sign in, and confirm `/app` opens onboarding.
3. Create a project and confirm Development, Preview, and Production exist.
4. Refresh and sign out/in; confirm the project and onboarding completion persist.
5. Add a Production secret containing a unique test value. Refresh and confirm only its name/metadata appears.
6. Reveal it after a fresh login. If MFA is not enrolled, confirm the password re-check dialog; after confirmation the value hides after 15 seconds and an audit event exists. Access-token refresh alone must not skip this check.
7. Update its metadata, rotate its value, reveal again, then delete with confirmation.
8. Import a `.env` containing public and private entries. Confirm preview detection, independent encryption, and duplicate skipping.
9. Add an authenticator using a known RFC-compatible `otpauth://totp/...` URI. Compare generated codes with another trusted authenticator, then rename and delete it.
10. Add multiple recovery codes, reveal them, copy one, mark it used, refresh, verify the remaining count, then delete the set.
11. Review Candler Health. Independently create duplicate, expired, rotation-due, orphaned, and environment-mismatch metadata and confirm deterministic findings—never breach claims.
12. Ask Agent which projects use a service, what is missing in Production, which credentials need rotation, storage usage, and weekly changes.
13. Enter `sk_test_CANDLER_DO_NOT_LEAK_123` in a prompt. Confirm stored conversation, provider trace, response, and audit metadata contain only `[REDACTED_CREDENTIAL]`.
14. Upload a small file. Observe Uploading → Verifying → Backed Up. Refresh and confirm persistence.
15. Download it through the short-lived URL and compare its checksum and contents.
16. Upload a folder in a supporting browser; confirm relative paths. Confirm ordinary uploads still work where folder selection is unsupported.
17. Rename and move files/folders. Trash and restore them. Permanently delete a trashed test file only after confirmation and confirm the private object is removed.
18. Attempt a file above the configured limit, over quota, and more than 20 authorizations in one minute; confirm rejection.
19. Subscribe to Candler Pro in Stripe test mode. Ignore the success redirect until the verified webhook updates Billing.
20. Subscribe/change Cloud 500 and Cloud 1TB; confirm database quota changes only after webhooks.
21. Open Billing Portal, change payment method, cancel/reactivate where safe, and confirm entitlement reconciliation.
22. Replay a webhook event. Confirm `stripe_webhook_events` prevents duplicate provisioning.
23. Run `npm run test:rls` with two dedicated users. Confirm all isolation assertions pass.
24. As User B, manually request User A reveal, authenticator, recovery, Cloud download, and Agent resources by ID; confirm 404/403 and no signed URL.
25. Change/reset password, enroll MFA, complete MFA login, sign out, and exercise logout-all if enabled in the Supabase project.
26. Search for project names, secret names, services, files/folders, and Agent titles. Search for a raw secret value and confirm no result.
27. Review Activity and confirm every sensitive operation is present with no credential values/codes.
28. Test desktop widths 1440 and 1280, tablet 1024 and 768, and mobile 390. Check dialogs, tables, upload controls, Agent, billing, and mobile navigation.
29. In development, use the protected preview control to test Morning/Sunrise, Afternoon/Day, Evening/Sunset, and Night. Confirm contrast without changing the protected sky.
30. At Night, confirm stars, twinkle, cloud behavior, shooting star, reduced-motion behavior, and state transitions.
31. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm audit`.
32. Call `/api/health`; production promotion requires HTTP 200 without revealing any environment values.

## Remaining V1 security notes

- Reveals require either an MFA-assured session (`aal2`) or a password re-authentication cookie valid for 15 minutes. Candler does not treat a refreshed access token as recent authentication.
- Supabase does not expose a complete device/session inventory; Security settings only offer sign-out and global sign-out.
- Cross-user isolation is enforced by RLS plus server-side membership checks. Run `npm run test:rls` with two dedicated users before launch.

Do not test with production credentials, irreplaceable files, or live payment cards.
