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
        top: clamp(18px, 4vw, 34px);
        right: clamp(14px, 3vw, 32px);
        bottom: clamp(18px, 4vw, 34px);
        width: min(46vw, 640px);
        min-height: 150px;
        pointer-events: none;
        overflow: hidden;
        border: 1px solid rgba(224, 71, 60, 0.18);
        border-radius: 8px;
        background: rgba(8, 9, 9, 0.35);
        z-index: 1;
        mask-image: linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.18) 14%, #000 38%);
        -webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.18) 14%, #000 38%);
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
        transform: translateX(18%);
        transition: opacity 900ms ease, transform 900ms ease;
      }

      .nf-shared-carousel-slide.is-active {
        opacity: 1;
        transform: translateX(0);
      }

      .nf-shared-carousel-slide.is-exiting {
        opacity: 0;
        transform: translateX(-18%);
      }

      .nf-shared-carousel-slide img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        display: block;
      }

      @media (max-width: 860px) {
        .nf-shared-carousel {
          opacity: 0.26;
          width: min(70vw, 520px);
        }
      }

      @media (max-width: 640px) {
        .nf-shared-carousel {
          display: none;
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
    const previous = slides[current];
    current = (current + 1) % slides.length;
    const next = slides[current];

    previous.classList.remove('is-active');
    previous.classList.add('is-exiting');
    next.classList.remove('is-exiting');
    next.classList.add('is-active');

    window.setTimeout(() => {
      previous.classList.remove('is-exiting');
    }, 950);
  }, Math.max(delay, 2000));
})();
