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
        this.zipToState = null;

        this.countrySelect.addEventListener('change', () => {
          this.handleCountryChange();
          this.validate();
        });

        this.zipInput.addEventListener('input', this.validate.bind(this));
        this.submitButton.addEventListener('click', this.handleSubmit.bind(this));
        this.backButtons.forEach((button) => {
          button.addEventListener('click', () => this.showGate());
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
          (panel) => panel.dataset.panel !== 'gate' && panel.querySelector('.form-status')
        );
        if (!submittedPanel) return;

        const saved = this.restoreLockedValues();
        if (saved) this.applyLockedDisplay(saved.country, saved.zip);

        this.showPanel(submittedPanel.dataset.panel);
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
