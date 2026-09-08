// The price shown to every US customer, regardless of whether their ZIP is
// in a Habachy-exclusive state — only the *action* differs (contact form vs.
// real Add to Cart), not the displayed price. Keep this numerically in sync
// with the product's real US-market price: this only controls what's
// *displayed*, not what checkout actually charges.
//
// PLACEHOLDER data — replace keys with the real Wood Species option values
// (must match exactly, case-sensitive, what's configured on the product in
// Shopify admin) and replace price/shipping with real numbers, in the shop's
// currency, as plain numbers (no currency symbols).
window.usPricing = {
  "Kiso Hinoki": { price: 2400, shipping: 350 },
  "Walnut": { price: 2600, shipping: 400 }
};
