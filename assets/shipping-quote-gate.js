if (!customElements.get('shipping-quote-gate')) {
  customElements.define(
    'shipping-quote-gate',
    class ShippingQuoteGate extends HTMLElement {
      connectedCallback() {
        this.zipInput = this.querySelector('[data-zip-input]');
        this.submitButton = this.querySelector('[data-shipping-quote-submit]');
        this.panels = Array.from(this.querySelectorAll('[data-panel]'));
        this.backButtons = Array.from(this.querySelectorAll('[data-shipping-quote-back]'));
        this.woodSpecies = this.dataset.woodSpecies;
        this.zipToState = null;

        this.zipInput.addEventListener('input', this.validate.bind(this));
        this.submitButton.addEventListener('click', this.handleSubmit.bind(this));
        this.backButtons.forEach((button) => {
          button.addEventListener('click', () => this.showGate());
        });

        // Submitting HabachyForm is a real full-page POST — save scroll
        // position first so the reload can land back in the same spot
        // instead of jumping to wherever the browser's default
        // anchor-scroll behavior would otherwise put it.
        this.querySelectorAll('form').forEach((form) => {
          form.addEventListener('submit', () => this.saveScrollPosition());
        });

        this.validate();
        this.showPanelAfterFormSubmission();
      }

      // If the page just reloaded after a real contact-form submission,
      // Shopify already rendered a success/error message in the Habachy
      // panel — surface that panel (and restore the locked ZIP display from
      // sessionStorage, since Shopify doesn't echo custom form fields back
      // after a real page reload).
      showPanelAfterFormSubmission() {
        const habachyPanel = this.panels.find((panel) => panel.dataset.panel === 'habachy');
        if (!habachyPanel || !habachyPanel.querySelector('.form-status, .shipping-quote-gate__sent')) return;

        const savedZip = this.restoreLockedZip();
        if (savedZip) this.applyLockedZip(savedZip);

        this.showPanel('habachy');
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

      validate() {
        this.submitButton.disabled = !/^\d{5}$/.test(this.zipInput.value.trim());
      }

      // Only one panel is visible at a time: the gate (ZIP form) or a
      // single result panel. Returning to the gate keeps whatever ZIP the
      // shopper already typed so a mistyped one is easy to fix.
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

      applyLockedZip(zip) {
        this.setValue('[data-habachy-zip]', zip || '');
        this.setText('[data-habachy-zip-display]', zip || '—');
      }

      persistLockedZip(zip) {
        try {
          sessionStorage.setItem('shippingQuoteGateZip', zip);
        } catch (error) {
          // sessionStorage unavailable (private browsing, etc.) — non-fatal.
        }
      }

      restoreLockedZip() {
        try {
          return sessionStorage.getItem('shippingQuoteGateZip');
        } catch (error) {
          return null;
        }
      }

      formatMoney(amount) {
        return '$' + Number(amount).toFixed(2);
      }

      handleSubmit() {
        if (this.submitButton.disabled) return;

        const zip = this.zipInput.value.trim();
        // Same price is shown to every US shopper regardless of ZIP — only
        // the action (contact form vs. real cart) differs.
        const pricing = (window.usPricing || {})[this.woodSpecies];

        if (this.isExclusiveZip(zip)) {
          this.applyLockedZip(zip);
          this.persistLockedZip(zip);

          if (pricing) {
            this.setText('[data-habachy-price]', this.formatMoney(pricing.price));
            this.setText('[data-habachy-shipping]', this.formatMoney(pricing.shipping));
          }

          this.showPanel('habachy');
        } else {
          this.setText('[data-us-zip-display]', zip);
          if (pricing) {
            this.setText('[data-us-price]', this.formatMoney(pricing.price));
            this.setText('[data-us-shipping]', this.formatMoney(pricing.shipping));
          }
          this.showPanel('purchase');
        }
      }
    }
  );
}
