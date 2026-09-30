import { STRIPE_API_BASE_URL, STRIPE_SECRET_KEY } from '../config/stripe';

/**
 * Fetches a Terminal connection token directly from the Stripe API using
 * the secret key bundled in this demo (see config/stripe.ts for why that's
 * unsafe outside of a demo). In production this function's body would
 * instead be a single `fetch()` to your own backend endpoint, which calls
 * `stripe.terminal.connectionTokens.create()` server-side.
 */
export async function fetchConnectionToken(): Promise<string> {
  console.log('[TerminalDemo] fetchConnectionToken: requesting…');
  const response = await fetch(`${STRIPE_API_BASE_URL}/terminal/connection_tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const json = await response.json();

  if (!response.ok) {
    console.log('[TerminalDemo] fetchConnectionToken: error', JSON.stringify(json));
    throw new Error(json?.error?.message ?? 'Failed to fetch connection token');
  }

  console.log('[TerminalDemo] fetchConnectionToken: got secret', json.secret?.slice(0, 12));
  return json.secret as string;
}

/**
 * Creates a PaymentIntent on the platform account with no connected-account
 * scoping (no `Stripe-Account` header, no `on_behalf_of`).
 *
 * WARNING: Stripe rejects `application_fee_amount` on a PaymentIntent that
 * isn't associated with a connected account, so this call will fail with
 * an API error as long as `applicationFeeAmount` is non-zero. To collect a
 * platform fee, the connected account must be identified somehow - either
 * back via a `connectedAccountId` param + `Stripe-Account` header, or via
 * `on_behalf_of`.
 */
export async function createDirectChargePaymentIntent(params: {
  amount: number;
  currency: string;
  applicationFeeAmount: number;
}): Promise<{ id: string; clientSecret: string }> {
  const body = new URLSearchParams({
    amount: String(params.amount),
    currency: params.currency,
    'payment_method_types[]': 'card_present',
    capture_method: 'automatic',
    application_fee_amount: String(params.applicationFeeAmount),
  });

  const response = await fetch(`${STRIPE_API_BASE_URL}/payment_intents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.error?.message ?? 'Failed to create PaymentIntent');
  }

  return { id: json.id as string, clientSecret: json.client_secret as string };
}
