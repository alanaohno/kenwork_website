// Generic one-at-a-time image viewer: only one [data-gallery-slide] child is
// visible at a time (via the is-active class), and prev/next buttons step
// through them. No scroll/swipe — just click navigation. Reused by both the
// plain product gallery (Tanken) and TOMORI's wood+color-aware gallery
// (which additionally swaps slide images via its own script, then calls
// showSlide(0) here to jump back to the updated slide).
if (!customElements.get('simple-image-gallery')) {
  customElements.define(
    'simple-image-gallery',
    class SimpleImageGallery extends HTMLElement {
      connectedCallback() {
        this.slides = Array.from(this.querySelectorAll('[data-gallery-slide]'));
        this.prevButton = this.querySelector('[data-gallery-prev]');
        this.nextButton = this.querySelector('[data-gallery-next]');
        this.currentLabel = this.querySelector('[data-gallery-current]');
        this.slideIndex = 0;

        if (this.prevButton) this.prevButton.addEventListener('click', () => this.showSlide(this.slideIndex - 1));
        if (this.nextButton) this.nextButton.addEventListener('click', () => this.showSlide(this.slideIndex + 1));

        this.showSlide(0);
      }

      showSlide(index) {
        if (!this.slides.length) return;
        this.slideIndex = (index + this.slides.length) % this.slides.length;
        this.slides.forEach((slide, i) => {
          slide.classList.toggle('is-active', i === this.slideIndex);
        });
        if (this.currentLabel) this.currentLabel.textContent = this.slideIndex + 1;
      }
    }
  );
}
