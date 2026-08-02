# SpendScript

SpendScript is a policy-controlled procurement platform built for the Agentic Commerce Hackathon. It turns each signed-in employee's request into persisted structured requirements, evaluates the organization's supplier catalog deterministically, captures manager approval, creates a merchant-scoped Prava mandate, completes the authorized purchase, and preserves a safe audit record.

The application does not fabricate successful AI, payment, or checkout results. Supabase authentication and persistence are required for the product workspace. OpenAI must be connected to create a mission, and Prava must be connected with an enrolled sandbox card before approval or execution can continue.

## Product workflow

1. Sign in to the seeded Acme Labs workspace.
2. Create a mission for 8 USB-C hubs under $350.
3. Review and edit the structured requirements.
4. Source 14 controlled offers and run deterministic policy/ranking.
5. Approve the $308 recommendation and define the spending contract.
6. Create a Prava mandate for Merchant A, one charge, $308, 24 hours.
7. Attempt $358 and observe `THRESHOLD_EXCEEDED` with no checkout.
8. Execute $308 and inspect the transaction plus immutable activity trail.

The included Acme Labs records are optional starter content for reviewers. They use the same organization-scoped database tables, APIs, RLS policies, state transitions, and audit trail as every newly created mission; they are not a browser-side simulation or runtime fallback.

## Stack

- Next.js 15 App Router, TypeScript, Tailwind CSS 4, Geist
- shadcn-style source-owned components with Radix Dialog
- Supabase Auth/Postgres/RLS using `@supabase/ssr`
- OpenAI Responses API structured outputs with shared Zod schemas
- Prava sandbox REST API at `https://sandbox.api.prava.space`
- Vitest for deterministic policy, scoring, state, and redaction tests

## Run locally

Prerequisites: Node.js 20+, pnpm 10+, a Supabase project, OpenAI API key, and Prava sandbox account.

```bash
cd spendscript
pnpm install
pnpm dev
```

Open [http://localhost:3000/setup](http://localhost:3000/setup). The local bootstrap wizard prepares the deployment and writes `.env.local`, which is ignored by Git. Supabase must be configured at deployment level because it provides authentication, organization membership, RLS, and the encrypted integration store.

After signing in, open **Shared integrations** at `/settings`. An organization administrator can connect or replace OpenAI and Prava once for the entire business. Every member sees the same safe connection status and uses those providers in server operations, but raw credentials are never returned, prefilled, or exposed to browser code. Admins can also invite teammates into the same workspace from this screen.

For the fastest judge setup:

1. Paste the Supabase project URL, publishable key, service-role key, and choose the judge password.
2. Click **Test connection**. If the database schema is missing, finish the other providers, save, then use **Copy migration SQL** on the completion screen and run it in Supabase SQL Editor.
3. The wizard can accept OpenAI and Prava as deployment fallbacks for first boot. After sign-in, they can be replaced with organization-specific connections from **Shared integrations**.
4. In the authenticated Integration Center, enter the OpenAI project key/model and Prava `sk_test_*`, `pk_test_*`, and enrolled sandbox customer ID. Each connection is tested before it becomes available to every member.
5. Click **Test, save & prepare judge login**. Once the migration exists, the wizard creates or repairs the first administrator account and loads the optional starter catalog.
6. Continue to sign in with the email and password you entered.

Without Supabase, authenticated product routes fail closed and direct the operator back to setup. Missing OpenAI or Prava connections surface actionable errors at the exact step that requires them; SpendScript never substitutes a simulated provider response.

## Manual environment setup

The wizard above is recommended. If needed, copy `.env.example` to `.env.local` and fill it directly. Do not paste secrets into chat or commit the file. `OPENAI_API_KEY` and the Prava values are optional deployment fallbacks; authenticated organization settings take precedence.

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEMO_EMAIL=judge@spendscript.dev
DEMO_PASSWORD=choose-a-strong-demo-password

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
INTEGRATION_ENCRYPTION_KEY=GENERATE_A_STABLE_32_BYTE_SECRET

OPENAI_API_KEY=YOUR_OPENAI_KEY
OPENAI_MODEL=gpt-5.6

PRAVA_BASE_URL=https://sandbox.api.prava.space
PRAVA_SECRET_KEY=sk_test_...
NEXT_PUBLIC_PRAVA_PUBLISHABLE_KEY=pk_test_...
PRAVA_CUSTOMER_ID=your-enrolled-customer-id
```

The readiness endpoint is `GET /api/readiness`. It returns booleans only and never returns values.

## Supabase

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard).
2. Use the setup wizard's **Copy migration SQL** button, or run both `supabase/migrations/202608010001_initial_schema.sql` and `supabase/migrations/202608020002_shared_integrations.sql` manually.
3. Return to `/setup` and save again. The wizard upserts the organization, policy, approved merchants, 14 offers, primary mission, profile, and admin membership.

For a fully manual fallback, run `supabase/seed.sql`, set the environment values, and create the judge account with:

```bash
pnpm seed:judge
```

The migrations create organization-scoped RLS policies on every application table. `organization_integrations` has no browser-readable policy at all; only the service-role server can access its AES-256-GCM ciphertext. Safe connection changes go to `integration_audit_events`, which organization members may read but nobody may mutate. `activity_events` is also immutable, and `transition_mission` changes status plus appends its event in one transaction.

Team invitations use Supabase Auth email invites. Add both `https://YOUR_DEPLOYMENT/auth/callback` and the local callback URL to Supabase Auth redirect URLs. Invited users set their password at `/invite/accept`, then see the same organization missions, policies, vendors, transactions, audit events, and integration health.

For production, set the Site URL and allowed redirect URLs in Supabase Auth to the Vercel deployment URL. The project uses separate browser/server clients and middleware token refresh following [Supabase SSR guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs&queryGroups=framework).

## OpenAI

Mission extraction and policy parsing use `responses.parse` plus `zodTextFormat`. The organization connection configured at `/settings` takes precedence over the deployment fallback. The default model is `gpt-5.6` and can be changed per organization. One transient failure is retried. Refusals, timeouts, and missing structured output surface as recoverable errors; the app never silently substitutes an AI result in live mode.

The model never decides compliance. Budgets, merchants, quantity, seller rating, delivery, expiry, and approval thresholds are enforced by the deterministic policy engine. Offer scoring is fixed at 35% requirement match, 25% cost, 15% delivery, 10% merchant approval, 10% seller trust, and 5% return flexibility.

## Prava sandbox

1. Create `pk_test_*` and `sk_test_*` keys in the [Prava dashboard](https://dashboard.prava.space).
2. Enroll the sandbox test card/customer, then connect its customer ID from **Shared integrations**. The environment value remains only a deployment fallback.
3. Use an HTTPS Vercel URL for `NEXT_PUBLIC_APP_URL`; Prava hosted callbacks require HTTPS.
4. From Mission Control, create the authorization and finish the real passkey prompt.

The integration uses:

- `GET /v1/listCards` for non-sensitive card metadata
- `POST /v1/sessions` with `mandate_setup` for hosted passkey approval
- `GET /v1/mandates/{id}` for synchronous confirmation
- `POST /v1/mandates/{id}/charge` for the $358 block and valid $308 charge
- `POST /v1/mandates/{id}/charges/{txnId}/report` after checkout
- mandate lifecycle cancellation for revocation

Plaintext Prava credentials never enter an API response, log, audit event, analytics event, or browser state. Organization credentials are stored only as authenticated AES-256-GCM ciphertext. Scoped payment credentials returned during a valid charge live only long enough to pass into the controlled checkout adapter in the same server request and are never serialized. See [Prava sandbox testing](https://docs.prava.space/api-reference/testing) and [mandate charging](https://docs.prava.space/api-reference/mandate-charge).

## Quality checks

```bash
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

## Deploy to Vercel

1. Push the `spendscript` directory to a Git repository.
2. Import it in Vercel with the Next.js preset.
3. Add every environment variable above to Preview and Production.
4. Set `NEXT_PUBLIC_APP_URL` to the deployment URL and add the same URL to Supabase Auth redirects.
5. Deploy, then run the judge workflow once using the Prava sandbox passkey.

`vercel.json` pins the install, build, and framework settings. No deployment can truthfully be marked Prava-verified until the sandbox keys, enrolled card, HTTPS callback, and WebAuthn approval are complete.

## Main code locations

- `src/app/(dashboard)` — routed product screens
- `src/app/api` — authenticated API handlers
- `src/lib/domain` — schemas, state machine, policy and decision engines
- `src/lib/providers` — OpenAI, catalog, Prava, and checkout adapters
- `src/lib/supabase` — SSR browser/server/admin clients and refresh middleware
- `supabase` — migration and seeded Acme Labs dataset
