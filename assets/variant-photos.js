// Optional per-combo photo override for TANKEN and TOMORI, layered on the
// theme's own native <media-gallery>.
//
// The product's `custom.variant_photos` JSON metafield (rendered by
// snippets/variant-photos.liquid) maps wood species -> color/leather -> an
// ordered list of photo file names (no extension), any number per combo:
//   {
//     "_show_unlisted_photos": true,
//     "sakura": { "black": ["sakura_black_off", "sakura_black_on"] }
//   }
// When the selected wood + color has an entry, only those photos are shown, in
// that order. Photos not named anywhere in the JSON ("common" photos) are shown
// after them only if "_show_unlisted_photos" is true, otherwise hidden. When
// the selection has no entry, the theme's own gallery is left as it is (so GG
// Variant Images / native variant photos behave as usual), except that photos
// the JSON lists for other combos are kept out of it.
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('script[data-variant-photos]').forEach(function (dataEl) {
    if (dataEl.dataset.initialized) return;
    dataEl.dataset.initialized = 'true';
    init(dataEl);
  });

  function init(dataEl) {
    var config = parseConfig(dataEl.textContent);
    if (!config) return;

    var woodPosition = dataEl.dataset.woodPosition;
    var colorPosition = dataEl.dataset.colorPosition;
    var colorInputName = dataEl.dataset.colorInputName;
    var root = dataEl.closest('product-info') || document;

    function parseConfig(json) {
      var parsed;
      try {
        parsed = JSON.parse(json);
      } catch (error) {
        console.warn('Variant photos: metafield is not valid JSON', error);
        return null;
      }
      var result = { showUnlisted: parsed._show_unlisted_photos === true, map: {}, allStems: {} };
      Object.keys(parsed || {}).forEach(function (wood) {
        if (wood.charAt(0) === '_') return;
        var woodKey = wood.toLowerCase();
        result.map[woodKey] = {};
        Object.keys(parsed[wood] || {}).forEach(function (color) {
          result.map[woodKey][color.toLowerCase()] = (parsed[wood][color] || []).map(function (stem) {
            var normalized = String(stem).toLowerCase();
            result.allStems[normalized] = true;
            return normalized;
          });
        });
      });
      return result;
    }

    function getMediaGallery() {
      return root.querySelector('media-gallery');
    }

    function getMediaItems(component) {
      return Array.prototype.slice.call(component.querySelectorAll('li[data-media-id], li[data-target]'));
    }

    // "…/files/sakura-black-close.jpg?v=123&width=416" -> "sakura-black-close"
    function getFileStem(el) {
      var img = el.querySelector('img');
      if (!img) return null;
      var path = img.src.split('?')[0];
      var name = decodeURIComponent(path.substring(path.lastIndexOf('/') + 1));
      return name
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/_\d+x\d*$/i, '')
        .toLowerCase();
    }

    function getSelectedColor(variant) {
      if (colorPosition) return String(variant['option' + colorPosition] || '').toLowerCase();
      var checked = colorInputName && root.querySelector('input[name="' + colorInputName + '"]:checked');
      return checked ? checked.value.toLowerCase() : '';
    }

    function getSelectedPhotoList() {
      var script = root.querySelector('variant-selects [data-selected-variant]');
      if (!script) return null;
      var variant;
      try {
        variant = JSON.parse(script.textContent);
      } catch (error) {
        return null;
      }
      var wood = String(variant['option' + woodPosition] || '').toLowerCase();
      var color = getSelectedColor(variant);
      var woodKey = Object.keys(config.map).find(function (key) {
        return wood.indexOf(key) !== -1;
      });
      if (!woodKey) return null;
      var colorKey = Object.keys(config.map[woodKey]).find(function (key) {
        return color.indexOf(key) !== -1;
      });
      return colorKey ? config.map[woodKey][colorKey] : null;
    }

    // Puts every item back in the theme's original order and un-hides what we hid.
    function restore(items) {
      items.forEach(function (el, index) {
        if (el.dataset.variantPhotosOrigIndex === undefined) el.dataset.variantPhotosOrigIndex = index;
      });
      items
        .slice()
        .sort(function (a, b) {
          return a.dataset.variantPhotosOrigIndex - b.dataset.variantPhotosOrigIndex;
        })
        .forEach(function (el) {
          if (el.dataset.variantPhotosHidden) {
            el.hidden = false;
            delete el.dataset.variantPhotosHidden;
          }
          items[0].parentNode.appendChild(el);
        });
    }

    function apply() {
      var mediaGallery = getMediaGallery();
      if (!mediaGallery) return;
      var photoList = getSelectedPhotoList();

      [mediaGallery.elements.viewer, mediaGallery.elements.thumbnails].forEach(function (component) {
        if (!component) return;
        var items = getMediaItems(component);
        if (!items.length) return;

        restore(items);
        if (photoList) {
          var parent = items[0].parentNode;
          var shown = [];
          photoList.forEach(function (stem) {
            var match = items.find(function (el) {
              return getFileStem(el) === stem && shown.indexOf(el) === -1;
            });
            if (match) shown.push(match);
            else console.warn('Variant photos: no photo found named "' + stem + '"');
          });
          if (config.showUnlisted) {
            items.forEach(function (el) {
              if (shown.indexOf(el) === -1 && !config.allStems[getFileStem(el)]) shown.push(el);
            });
          }
          shown.forEach(function (el) {
            parent.appendChild(el);
          });
          items.forEach(function (el) {
            if (shown.indexOf(el) === -1) {
              hide(el);
              parent.appendChild(el);
            }
          });
        } else {
          // No entry for this selection: keep the theme's own gallery, minus
          // any photo the JSON claims for a different combo.
          items.forEach(function (el) {
            if (config.allStems[getFileStem(el)]) hide(el);
          });
        }
        if (typeof component.resetPages === 'function') component.resetPages();
      });

      var viewer = mediaGallery.elements.viewer;
      var active = viewer && viewer.querySelector('li.is-active');
      if (photoList || (active && active.hidden)) showFirstPhoto(mediaGallery);
    }

    function hide(el) {
      el.hidden = true;
      el.dataset.variantPhotosHidden = 'true';
    }

    function showFirstPhoto(mediaGallery) {
      if (!mediaGallery.elements.viewer || typeof mediaGallery.setActiveMedia !== 'function') return;
      var first = getMediaItems(mediaGallery.elements.viewer).find(function (el) {
        return !el.hidden && el.dataset.mediaId;
      });
      if (first) mediaGallery.setActiveMedia(first.dataset.mediaId, false);
    }

    apply();

    // A line-item-property color (Tomori) isn't a real variant, so nothing
    // native reacts when it changes.
    if (colorInputName) {
      root.addEventListener('change', function (event) {
        if (event.target.name === colorInputName) apply();
      });
    }

    if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      subscribe(PUB_SUB_EVENTS.variantChange, function () {
        // Give any swapped gallery markup a tick to land before filtering it.
        window.setTimeout(apply, 0);
      });
    }
  }
});
