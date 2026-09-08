// Fills the TANKEN standing desk's price display (rendered in the normal
// price position, same markup/position as every other product) with the
// US-specific price from us-pricing.js, when the shopper is in the US.
document.querySelectorAll('[data-tanken-us-price]').forEach(function (el) {
  var woodSpecies = el.dataset.woodSpecies;
  var pricing = (window.usPricing || {})[woodSpecies];
  if (pricing) {
    el.textContent = '$' + Number(pricing.price).toFixed(2);
  }
});
