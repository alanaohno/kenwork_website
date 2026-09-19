// Swaps TOMORI's off/on lamp photos to match the current Wood species +
// Sasawashi Color selection. Wood species is a real Shopify variant, so its
// changes arrive via the theme's own PUB_SUB_EVENTS.variantChange. Color is
// a cart line-item property (not a real variant), so its changes are read
// directly from the radio group's change event instead.
//
// Slide navigation itself (prev/next, which slide is visible) is handled by
// the shared <simple-image-gallery> custom element (simple-image-gallery.js)
// — this script only swaps image src and then calls its showSlide(0) so the
// change is immediately visible.
document.addEventListener('DOMContentLoaded', function () {
  var container = document.querySelector('[data-tomori-cover-gallery]');
  if (!container) return;

  var dataScript = container.querySelector('[data-tomori-cover-gallery-data]');
  var galleryData = {};
  try {
    galleryData = JSON.parse(dataScript.textContent) || {};
  } catch (error) {
    galleryData = {};
  }

  var offImage = container.querySelector('[data-tomori-cover-image="off"]');
  var onImage = container.querySelector('[data-tomori-cover-image="on"]');
  var sectionId = container.dataset.sectionId;

  var currentWood = null;
  var currentColor = null;

  function updateImages() {
    if (!currentWood || !currentColor) return;
    var woodData = galleryData[currentWood];
    if (!woodData) return;
    var pair = woodData[currentColor];
    if (!pair) return;
    offImage.src = pair[0];
    onImage.src = pair[1];
    if (typeof container.showSlide === 'function') container.showSlide(0);
  }

  function getCheckedColor() {
    var checked = document.querySelector('input[name="properties[Sasawashi Color]"]:checked');
    return checked ? checked.value : null;
  }

  function getSelectedWood() {
    var selectedVariantScript = document.querySelector(
      '#variant-selects-' + sectionId + ' [data-selected-variant]'
    );
    if (!selectedVariantScript) return null;
    try {
      var variant = JSON.parse(selectedVariantScript.textContent);
      return variant.option1;
    } catch (error) {
      return null;
    }
  }

  currentColor = getCheckedColor();
  currentWood = getSelectedWood();
  updateImages();

  document.addEventListener('change', function (event) {
    if (event.target.name === 'properties[Sasawashi Color]') {
      currentColor = event.target.value;
      updateImages();
    }
  });

  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
    subscribe(PUB_SUB_EVENTS.variantChange, function (event) {
      if (event.data.sectionId !== sectionId) return;
      currentWood = event.data.variant.option1;
      updateImages();
    });
  }
});
