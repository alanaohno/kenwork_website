// Set to false to temporarily disable syncing country selection here to the
// site's real localization/currency (useful in local dev, where the
// /localization route Shopify's form posts to isn't reachable and makes the
// resulting reload/redirect confusing to debug). Flip back to true to
// restore the real cross-site currency sync.
window.habachyEnableLocalizationSync = false;

if (!customElements.get('shipping-quote-gate')) {
  customElements.define(
    'shipping-quote-gate',
    class ShippingQuoteGate extends HTMLElement {
      connectedCallback() {
        this.countrySelect = this.querySelector('[data-country-select]');
        this.zipWrapper = this.querySelector('[data-zip-wrapper]');
        this.zipInput = this.querySelector('[data-zip-input]');
        this.submitButton = this.querySelector('[data-shipping-quote-submit]');
        this.panels = Array.from(this.querySelectorAll('[data-panel]'));
        this.backButtons = Array.from(this.querySelectorAll('[data-shipping-quote-back]'));
        this.woodSpecies = this.dataset.woodSpecies;
        this.detectedCountry = this.dataset.detectedCountry;
        this.currentCountryIso = this.dataset.currentCountryIso;
        this.localizationForm = this.querySelector('#ShippingQuoteLocalizationForm');
        this.localeCountryInput = this.querySelector('[data-locale-country-input]');
        this.zipToState = null;

        this.prefillDetectedCountry();

        this.countrySelect.addEventListener('change', () => {
          this.handleCountryChange();
          this.validate();
          this.maybeSyncSiteLocalization();
        });

        this.zipInput.addEventListener('input', this.validate.bind(this));
        this.submitButton.addEventListener('click', this.handleSubmit.bind(this));
        this.backButtons.forEach((button) => {
          button.addEventListener('click', () => this.showGate());
        });

        // Submitting HabachyForm/NoShippingForm is a real full-page POST —
        // save scroll position first so the reload can land back in the
        // same spot instead of jumping to wherever the browser's default
        // anchor-scroll behavior would otherwise put it.
        this.querySelectorAll('form').forEach((form) => {
          form.addEventListener('submit', () => this.saveScrollPosition());
        });

        // Browsers restore <select>/<input> values on back-navigation and
        // bfcache restores, often without firing a change event (and after
        // connectedCallback has already run) — re-sync so the ZIP field's
        // visibility always matches the restored country value.
        this.onPageShow = () => {
          this.handleCountryChange();
          this.validate();
        };
        window.addEventListener('pageshow', this.onPageShow);

        this.handleCountryChange();
        this.validate();
        this.showPanelAfterFormSubmission();
      }

      disconnectedCallback() {
        window.removeEventListener('pageshow', this.onPageShow);
      }

      // If the page just reloaded after a real contact-form submission,
      // Shopify already rendered a success/error message inside the
      // relevant panel — surface that panel (and restore the locked
      // country/ZIP display from sessionStorage, since Shopify doesn't
      // echo custom form fields back after a real page reload).
      showPanelAfterFormSubmission() {
        const submittedPanel = this.panels.find(
          (panel) => panel.dataset.panel !== 'gate' && panel.querySelector('.form-status, .shipping-quote-gate__sent')
        );
        if (!submittedPanel) return;

        const saved = this.restoreLockedValues();
        if (saved) this.applyLockedDisplay(saved.country, saved.zip);

        this.showPanel(submittedPanel.dataset.panel);
        this.restoreScrollPosition();
      }

      saveScrollPosition() {
        try {
          sessionStorage.setItem('shippingQuoteGateScrollY', String(window.scrollY));
        } catch (error) {
          // sessionStorage unavailable — non-fatal, worst case the browser's
          // own default scroll position applies after reload.
        }
      }

      restoreScrollPosition() {
        let savedScrollY;
        try {
          savedScrollY = sessionStorage.getItem('shippingQuoteGateScrollY');
          sessionStorage.removeItem('shippingQuoteGateScrollY');
        } catch (error) {
          return;
        }
        if (savedScrollY === null) return;

        const scrollToSaved = () => window.scrollTo(0, parseInt(savedScrollY, 10));
        // Apply immediately, and again after full load — the browser's own
        // fragment-scroll (from the form's #id anchor) can otherwise happen
        // after this runs and override it.
        scrollToSaved();
        window.addEventListener('load', scrollToSaved, { once: true });
      }

      // Prefill the country dropdown with the site's already-detected country
      // (`localization.country`), same as the header's own country selector
      // shows. Set explicitly rather than relying on option pre-selection,
      // so this is correct regardless of markup quirks.
      prefillDetectedCountry() {
        if (!this.detectedCountry) return;
        const hasOption = Array.from(this.countrySelect.options).some(
          (option) => option.value === this.detectedCountry
        );
        if (hasOption) this.countrySelect.value = this.detectedCountry;
      }

      // If the shopper picks a different country than the site's currently
      // active one, and Shopify has a market/currency configured for it,
      // submit the site's real localization form so currency and prices
      // everywhere else on the site switch to match — same mechanism as the
      // header's country selector, just triggered from here too.
      maybeSyncSiteLocalization() {
        if (!window.habachyEnableLocalizationSync) return;
        if (!this.localizationForm || !this.localeCountryInput) return;
        const iso = (window.habachyCountryToIso || {})[this.countrySelect.value];
        if (!iso || iso === this.currentCountryIso) return;
        this.localeCountryInput.value = iso;
        this.localizationForm.submit();
      }

      isUS() {
        return this.countrySelect.value === 'United States';
      }

      handleCountryChange() {
        this.zipWrapper.hidden = !this.isUS();
      }

      validate() {
        let valid = !!this.countrySelect.value;
        if (this.isUS()) {
          valid = valid && /^\d{5}$/.test(this.zipInput.value.trim());
        }
        this.submitButton.disabled = !valid;
      }

      // Only one panel is visible at a time: the gate (country/ZIP form) or
      // a single result panel. Returning to the gate keeps whatever the
      // shopper already typed so a mistyped ZIP is easy to fix.
      showPanel(name) {
        this.panels.forEach((panel) => {
          panel.hidden = panel.dataset.panel !== name;
        });
      }

      showGate() {
        this.showPanel('gate');
        this.validate();
      }

      buildZipToStateLookup() {
        if (this.zipToState) return this.zipToState;
        this.zipToState = {};
        const data = window.habachyExclusiveZipcodes || {};
        Object.keys(data).forEach((state) => {
          data[state].forEach((zip) => {
            this.zipToState[zip] = state;
          });
        });
        return this.zipToState;
      }

      isExclusiveZip(zip) {
        const zipToState = this.buildZipToStateLookup();
        const normalized = String(zip).trim().padStart(5, '0');
        return Object.prototype.hasOwnProperty.call(zipToState, normalized);
      }

      setValue(selector, value) {
        const target = this.querySelector(selector);
        if (target) target.value = value;
      }

      setText(selector, text) {
        const target = this.querySelector(selector);
        if (target) target.textContent = text;
      }

      applyLockedDisplay(country, zip) {
        this.setValue('[data-habachy-country]', country || '');
        this.setValue('[data-habachy-zip]', zip || '');
        this.setText('[data-habachy-country-display]', country || '—');
        this.setText('[data-habachy-zip-display]', zip || '—');
        this.setValue('[data-noship-country]', country || '');
        this.setText('[data-noship-country-display]', country || '—');
      }

      persistLockedValues(country, zip) {
        try {
          sessionStorage.setItem('shippingQuoteGate', JSON.stringify({ country, zip }));
        } catch (error) {
          // sessionStorage unavailable (private browsing, etc.) — non-fatal.
        }
      }

      restoreLockedValues() {
        try {
          const raw = sessionStorage.getItem('shippingQuoteGate');
          return raw ? JSON.parse(raw) : null;
        } catch (error) {
          return null;
        }
      }

      formatMoney(amount) {
        return '$' + Number(amount).toFixed(2);
      }

      handleSubmit() {
        if (this.submitButton.disabled) return;

        const country = this.countrySelect.value;
        const zip = this.zipInput.value.trim();

        if (country === 'United States') {
          if (this.isExclusiveZip(zip)) {
            this.applyLockedDisplay(country, zip);
            this.persistLockedValues(country, zip);

            const pricing = (window.habachyPricing || {})[this.woodSpecies];
            const priceEl = this.querySelector('[data-habachy-price]');
            const shippingEl = this.querySelector('[data-habachy-shipping]');
            if (pricing) {
              if (priceEl) priceEl.textContent = this.formatMoney(pricing.price);
              if (shippingEl) shippingEl.textContent = this.formatMoney(pricing.shipping);
            }

            this.showPanel('habachy');
          } else {
            this.showPanel('purchase');
          }
          return;
        }

        const availableCountries = window.habachyAvailableCountries || [];
        if (availableCountries.indexOf(country) !== -1) {
          this.showPanel('purchase');
        } else {
          this.applyLockedDisplay(country, null);
          this.persistLockedValues(country, null);
          this.showPanel('no-shipping');
        }
      }
    }
  );
}
