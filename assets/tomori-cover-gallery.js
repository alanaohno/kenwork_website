// TOMORI's wood+color combo photos (e.g. hiba_black_off.jpg) are real,
// already-uploaded product media — not a custom gallery. This script layers
// two things on top of the theme's own native <media-gallery>:
//
// 1. Hides every combo slide/thumbnail that doesn't belong to the currently
//    selected Wood species (a real variant) + Sasawashi Color, so the strip
//    only shows that combo's on/off photos + any general/common ones.
//    Re-applied on every real variant change (PUB_SUB_EVENTS.variantChange)
//    and every Color change.
// 2. Jumps to the matching "off" photo via the gallery's own
//    setActiveMedia() method after filtering — Color is a cart line-item
//    property, not a real variant, so nothing native reacts to it on its own.
//
// Nothing here replaces or duplicates the native gallery markup/behavior —
// hidden slides are automatically excluded from slider navigation by the
// theme's own SliderComponent (it filters to elements with clientWidth > 0).
document.addEventListener('DOMContentLoaded', function () {
  var COMBO_PATTERN = /(sakura|hiba|walnut)_(black|natural|olive|orange)_(on|off)/i;

  function getMediaGallery() {
    return document.querySelector('media-gallery');
  }

  function getMediaItems(root) {
    // Main slides carry data-media-id; thumbnail <li>s carry data-target instead.
    return Array.prototype.slice.call(root.querySelectorAll('li[data-media-id], li[data-target]'));
  }

  function parseCombo(el) {
    var img = el.querySelector('img');
    if (!img) return null;
    var match = img.src.match(COMBO_PATTERN);
    if (!match) return null;
    return { wood: match[1].toLowerCase(), color: match[2].toLowerCase(), state: match[3].toLowerCase() };
  }

  function getSelectedWoodKey() {
    var selectedVariantScript = document.querySelector('variant-selects [data-selected-variant]');
    if (!selectedVariantScript) return null;
    try {
      var variant = JSON.parse(selectedVariantScript.textContent);
      var title = (variant.option1 || '').toLowerCase();
      if (title.indexOf('hiba') !== -1) return 'hiba';
      if (title.indexOf('sakura') !== -1) return 'sakura';
      if (title.indexOf('walnut') !== -1) return 'walnut';
    } catch (error) {
      // ignore
    }
    return null;
  }

  function getSelectedColorKey() {
    var checked = document.querySelector('input[name="properties[Sasawashi Color]"]:checked');
    if (!checked) return null;
    return checked.value.toLowerCase().replace('dark ', '');
  }

  function applyComboFilter() {
    var mediaGallery = getMediaGallery();
    var woodKey = getSelectedWoodKey();
    var colorKey = getSelectedColorKey();
    if (!mediaGallery || !woodKey || !colorKey) return;

    [mediaGallery.elements.viewer, mediaGallery.elements.thumbnails].forEach(function (component) {
      if (!component) return;
      var items = getMediaItems(component);
      if (!items.length) return;

      var offEl = null;
      var onEl = null;
      var common = [];
      var hiddenEls = [];
      items.forEach(function (el) {
        var combo = parseCombo(el);
        if (!combo) {
          common.push(el);
        } else if (combo.wood !== woodKey || combo.color !== colorKey) {
          hiddenEls.push(el);
        } else if (combo.state === 'off' && !offEl) {
          offEl = el;
        } else if (combo.state === 'on' && !onEl) {
          onEl = el;
        } else {
          // Same wood+color+state uploaded more than once: show only the first.
          console.warn('Tomori gallery: duplicate ' + combo.state + ' photo hidden', el.querySelector('img').src);
          hiddenEls.push(el);
        }
      });

      // Always: off, on, then the common photos (hidden ones parked at the end).
      var ordered = [offEl, onEl].filter(Boolean).concat(common);
      var parent = items[0].parentNode;
      ordered.forEach(function (el) {
        el.hidden = false;
        parent.appendChild(el);
      });
      hiddenEls.forEach(function (el) {
        el.hidden = true;
        parent.appendChild(el);
      });

      if (typeof component.resetPages === 'function') component.resetPages();
    });

    jumpToCurrentSelection();
  }

  function jumpToCurrentSelection() {
    var mediaGallery = getMediaGallery();
    var woodKey = getSelectedWoodKey();
    var colorKey = getSelectedColorKey();
    if (!mediaGallery || !woodKey || !colorKey) return;

    var targetEl = getMediaItems(mediaGallery.elements.viewer).find(function (el) {
      var combo = el.dataset.mediaId && parseCombo(el);
      return combo && combo.wood === woodKey && combo.color === colorKey && combo.state === 'off';
    });
    if (targetEl && typeof mediaGallery.setActiveMedia === 'function') {
      mediaGallery.setActiveMedia(targetEl.dataset.mediaId, false);
    }
  }

  if (!getMediaGallery()) return;

  applyComboFilter();

  document.addEventListener('change', function (event) {
    if (event.target.name === 'properties[Sasawashi Color]') {
      applyComboFilter();
    }
  });

  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
    subscribe(PUB_SUB_EVENTS.variantChange, function () {
      // Give the AJAX-swapped gallery markup a tick to land before filtering it.
      window.setTimeout(applyComboFilter, 0);
    });
  }
});
