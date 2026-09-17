// Toggles a fully-hidden review body open/closed via a "Read more"/"Read
// less" button. The quote line stays visible regardless; only the full
// review text is gated behind this toggle.
if (!customElements.get('review-text')) {
  customElements.define(
    'review-text',
    class ReviewText extends HTMLElement {
      connectedCallback() {
        this.content = this.querySelector('.multicolumn-card__review-text');
        this.button = this.querySelector('.multicolumn-card__review-toggle');
        if (!this.content || !this.button) return;

        this.button.addEventListener('click', () => {
          const willExpand = this.content.hidden;
          this.content.hidden = !willExpand;
          this.button.textContent = willExpand ? 'Read less' : 'Read more';
        });
      }
    }
  );
}
