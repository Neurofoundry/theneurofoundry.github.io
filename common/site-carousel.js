(function () {
  const script = document.currentScript;
  const basePath = script && script.dataset.base ? script.dataset.base : '';
  const mount = document.querySelector('[data-site-carousel]');

  if (!mount) return;

  const galleries = {
    services: [
      'assets/indexgallery/1.png',
      'assets/indexgallery/2.png',
      'assets/indexgallery/3.png',
      'assets/indexgallery/4.png',
      'assets/indexgallery/5.png',
      'assets/indexgallery/6.png',
      'assets/indexgallery/7.png',
      'assets/indexgallery/8.png',
      'assets/indexgallery/9.png'
    ],
    downloads: [
      'assets/indexgallery/1.png',
      'assets/indexgallery/2.png',
      'assets/indexgallery/3.png'
    ],
    workshop: [
      'assets/indexgallery/4.png',
      'assets/indexgallery/5.png',
      'assets/indexgallery/6.png'
    ]
  };

  const ensureStyle = () => {
    if (document.getElementById('nf-shared-carousel-style')) return;

    const style = document.createElement('style');
    style.id = 'nf-shared-carousel-style';
    style.textContent = `
      .nf-shared-carousel {
        position: absolute;
        top: clamp(16px, 3.2vw, 24px);
        right: clamp(12px, 1.8vw, 24px);
        bottom: clamp(16px, 3.2vw, 24px);
        width: min(58vw, 920px);
        min-height: 150px;
        pointer-events: none;
        overflow: hidden;
        border: 1px solid rgba(224, 71, 60, 0.18);
        border-radius: 8px;
        background: rgba(8, 9, 9, 0.35);
        z-index: 1;
        mask-image: linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.18) 12%, rgba(0, 0, 0, 0.72) 34%, #000 58%);
        -webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.18) 12%, rgba(0, 0, 0, 0.72) 34%, #000 58%);
      }

      .nf-shared-carousel-track {
        position: relative;
        width: 100%;
        height: 100%;
      }

      .nf-shared-carousel-slide {
        position: absolute;
        inset: 0;
        opacity: 0;
        transition: opacity 900ms ease;
      }

      .nf-shared-carousel-slide.is-active {
        opacity: 1;
      }

      .nf-shared-carousel-slide img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        display: block;
        transform: scale(1.04) translateX(2%);
      }

      .nf-shared-carousel-slide.is-active img {
        animation: nf-carousel-drift var(--nf-carousel-delay, 8000ms) linear forwards;
      }

      @keyframes nf-carousel-drift {
        from {
          transform: scale(1.04) translateX(2%);
        }
        to {
          transform: scale(1.08) translateX(-4%);
        }
      }

      @media (max-width: 860px) {
        .nf-shared-carousel {
          opacity: 0.68;
          width: min(66vw, 560px);
          mask-image: linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.28) 20%, #000 62%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.28) 20%, #000 62%);
        }
      }

      @media (max-width: 640px) {
        .nf-shared-carousel {
          display: block;
          top: 23px;
          right: 14px;
          bottom: auto;
          width: min(50vw, 190px);
          height: 98px;
          min-height: 0;
          opacity: 1;
          border-color: rgba(224, 71, 60, 0.28);
          mask-image: linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.42) 26%, #000 72%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.42) 26%, #000 72%);
        }
      }
    `;
    document.head.appendChild(style);
  };

  const resolveAsset = (path) => {
    if (/^https?:\/\//i.test(path) || path.startsWith('/')) return path;
    return `${basePath}${path}`;
  };

  const galleryName = mount.dataset.gallery || 'services';
  const delay = Number(mount.dataset.interval || script.dataset.interval || 8000);
  const images = galleries[galleryName] || galleries.services;

  if (!images || !images.length) return;

  ensureStyle();

  mount.classList.add('nf-shared-carousel');
  mount.setAttribute('aria-hidden', 'true');
  mount.style.setProperty('--nf-carousel-delay', `${Math.max(delay, 2000)}ms`);
  mount.innerHTML = `
    <div class="nf-shared-carousel-track">
      ${images.map((src, index) => `
        <div class="nf-shared-carousel-slide${index === 0 ? ' is-active' : ''}">
          <img src="${resolveAsset(src)}" alt="">
        </div>
      `).join('')}
    </div>
  `;

  const slides = Array.from(mount.querySelectorAll('.nf-shared-carousel-slide'));
  let current = 0;

  if (slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  window.setInterval(() => {
    slides[current].classList.remove('is-active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('is-active');
  }, Math.max(delay, 2000));
})();
