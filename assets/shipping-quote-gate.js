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
        // anchor-scroll behavior would otherwise put it. Also save the typed
        // email client-side: Shopify doesn't reliably echo it back via
        // form.email on the post-redirect reload.
        this.querySelectorAll('form').forEach((form) => {
          form.addEventListener('submit', () => {
            this.saveScrollPosition();
            this.persistSubmittedEmail(form);
          });
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
        if (!habachyPanel) return;

        const sent = habachyPanel.querySelector('[data-habachy-sent]');
        const hasError = habachyPanel.querySelector('.form-status');
        const wasJustSubmitted = (sent && !sent.hidden) || hasError;
        if (!wasJustSubmitted) return;

        const savedZip = this.restoreLockedZip();
        if (savedZip) this.applyLockedZip(savedZip);

        if (sent && !sent.hidden) {
          const savedEmail = this.restoreSubmittedEmail();
          if (savedEmail) this.setText('[data-habachy-sent-email]', savedEmail);
        }

        this.showPanel('habachy');
        this.restoreScrollPosition();
      }

      persistSubmittedEmail(form) {
        const emailInput = form.querySelector('input[type="email"]');
        if (!emailInput) return;
        try {
          sessionStorage.setItem('shippingQuoteGateEmail', emailInput.value.trim());
        } catch (error) {
          // sessionStorage unavailable — non-fatal.
        }
      }

      restoreSubmittedEmail() {
        try {
          return sessionStorage.getItem('shippingQuoteGateEmail');
        } catch (error) {
          return null;
        }
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
        this.resetHabachyForm();
        this.validate();
      }

      // form.posted_successfully? is baked into the page's one server render
      // after a real reload — it can't turn back into "not yet submitted"
      // without another reload. So a "Sent" confirmation from an earlier
      // attempt would otherwise keep showing every time the shopper comes
      // back through the gate with a new ZIP. Reset the panel back to its
      // editable state client-side instead.
      resetHabachyForm() {
        const sent = this.querySelector('[data-habachy-sent]');
        const formContent = this.querySelector('[data-habachy-form-content]');
        if (sent) sent.hidden = true;
        if (formContent) formContent.hidden = false;
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

      handleSubmit() {
        if (this.submitButton.disabled) return;

        const zip = this.zipInput.value.trim();

        if (this.isExclusiveZip(zip)) {
          this.applyLockedZip(zip);
          this.persistLockedZip(zip);
          this.showPanel('habachy');
        } else {
          this.setText('[data-us-zip-display]', zip);
          this.showPanel('purchase');
        }
      }
    }
  );
}
