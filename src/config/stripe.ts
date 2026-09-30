/**
 * Demo-only Stripe configuration.
 *
 * SECURITY WARNING
 * -----------------
 * `STRIPE_SECRET_KEY` is bundled into the app so this demo can fetch a
 * Terminal connection token without a backend. Never ship a secret key
 * inside a mobile app binary in production - anyone can extract it and
 * make API calls (including creating charges) as your Stripe account.
 * In a real app, `fetchConnectionToken` in src/api/stripe.ts must call
 * YOUR OWN server, and your server calls Stripe with the secret key.
 *
 * PaymentIntent creation itself does NOT need the secret key here - the
 * Stripe Terminal SDK's `createPaymentIntent` call is authenticated by the
 * reader's connection token, which is why it can safely run on the client.
 *
 * The key itself is never committed - `babel-plugin-transform-inline-environment-variables`
 * inlines it from the `STRIPE_SECRET_KEY` env var at bundle time. Export it
 * yourself before running Metro/Gradle locally; CI supplies it from a
 * repository secret.
 */
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? '';

export const STRIPE_API_BASE_URL = 'https://api.stripe.com/v1';

export const CURRENCY = 'usd';
