/**
 * Payment provider registry.
 *
 * Selects the active payment provider adapter at runtime. Defaults to Razorpay.
 *
 * Adding a new provider:
 *   1. Implement a class extending `PaymentProviderPort` in
 *      `./providers/<name>.adapter.js`.
 *   2. Register it in buildProvider.
 */

import { RazorpayAdapter } from "./providers/razorpay.adapter.js";

let _provider = null;
let _providerName = null;

function resolveProviderName() {
  return "razorpay";
}

function buildProvider(name) {
  return new RazorpayAdapter();
}

let _overrideProvider = null;

/**
 * Returns the active provider singleton. Re-resolves when the env var
 * changes (used in tests).
 */
export function getActivePaymentProvider() {
  if (_overrideProvider) return _overrideProvider;

  const desired = resolveProviderName();
  if (_provider && _providerName === desired) {
    return _provider;
  }
  _provider = buildProvider(desired);
  _providerName = desired;
  return _provider;
}

/**
 * Test helper. Allows test code to swap the provider in for a fake.
 */
export function __setActivePaymentProviderForTests(provider, name = "test") {
  _overrideProvider = provider;
}

/**
 * Test helper. Forces the next `getActivePaymentProvider()` call to rebuild.
 */
export function __resetPaymentProviderForTests() {
  _overrideProvider = null;
  _provider = null;
  _providerName = null;
}
