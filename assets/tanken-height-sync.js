// Height is a cart line-item property (properties[Height]) on TANKEN, not a
// real Shopify variant option, so it has no server-side selected_value.
// Whenever any form containing a [data-tanken-height] hidden field is
// submitted (the Habachy contact form, the no-shipping-calculated contact
// form, etc.), fill that field in from whichever Height option is currently
// selected on the page.
document.addEventListener('submit', function (event) {
  var heightInput = event.target.querySelector('[data-tanken-height]');
  if (!heightInput) return;

  var checkedRadio = document.querySelector('input[name="properties[Height]"]:checked');
  if (!checkedRadio) return;

  var value = checkedRadio.value;
  if (value === 'Custom Height') {
    var customInput = document.querySelector('input[name="properties[Custom Height]"]');
    var customValue = customInput ? customInput.value.trim() : '';
    if (customValue) value = 'Custom Height: ' + customValue;
  }
  heightInput.value = value;
});
