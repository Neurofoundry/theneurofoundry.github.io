(function () {
  const script = document.currentScript;
  const basePath = script && script.dataset.base ? script.dataset.base : '';
  const mount = document.querySelector('[data-site-carousel]');

  if (!mount) return;

  const galleries = {
    services: [
      'assets/carousel/services/1.png',
      'assets/carousel/services/2.png',
      'assets/carousel/services/3.png',
      'assets/carousel/services/4.png',
      'assets/carousel/services/5.png',
      'assets/carousel/services/6.png'
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
        inset: 0;
        width: 100%;
        min-height: 150px;
        pointer-events: none;
        overflow: hidden;
        border: 0;
        border-radius: 0;
        background: transparent;
        z-index: 1;
        mask-image: linear-gradient(to right, #000 0%, #000 32%, #050505 40%, #161616 52%, #4d4d4d 66%, #ffffff 82%);
        -webkit-mask-image: linear-gradient(to right, #000 0%, #000 32%, #050505 40%, #161616 52%, #4d4d4d 66%, #ffffff 82%);
        mask-mode: luminance;
        -webkit-mask-mode: luminance;
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
        transform: translateX(0);
        transition: none;
      }

      .nf-shared-carousel-slide.is-active {
        opacity: 1;
        animation: nf-carousel-slide-in 900ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
      }

      .nf-shared-carousel-slide.is-leaving {
        opacity: 0;
        animation: nf-carousel-slide-out 900ms cubic-bezier(0.7, 0, 0.2, 1) both;
      }

      .nf-shared-carousel-slide img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: 64% center;
        display: block;
        transform: scale(1.08) translateX(8%);
      }

      .nf-shared-carousel-slide.is-active img {
        animation: nf-carousel-drift var(--nf-carousel-delay, 8000ms) linear forwards;
      }

      @media (prefers-reduced-motion: reduce) {
        .nf-shared-carousel-slide,
        .nf-shared-carousel-slide.is-active img {
          animation: none;
          transition-duration: 500ms;
        }
      }

      @keyframes nf-carousel-drift {
        from {
          transform: scale(1.08) translateX(8%);
        }
        82% {
          transform: scale(1.1) translateX(-2%);
        }
        to {
          transform: scale(1.13) translateX(-16%);
        }
      }

      @keyframes nf-carousel-slide-in {
        from {
          opacity: 0;
          transform: translateX(22%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes nf-carousel-slide-out {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(-28%);
        }
      }

      @media (max-width: 860px) {
        .nf-shared-carousel {
          opacity: 0.68;
          width: 100%;
          mask-image: linear-gradient(to right, #000 0%, #000 38%, #050505 46%, #1b1b1b 58%, #5f5f5f 74%, #ffffff 88%);
          -webkit-mask-image: linear-gradient(to right, #000 0%, #000 38%, #050505 46%, #1b1b1b 58%, #5f5f5f 74%, #ffffff 88%);
        }
      }

      @media (max-width: 640px) {
        .nf-shared-carousel {
          display: block;
          inset: 0;
          width: 100%;
          height: 100%;
          min-height: 0;
          opacity: 0.62;
          mask-image: linear-gradient(to right, #000 0%, #000 34%, #050505 42%, #191919 54%, #5c5c5c 72%, #ffffff 92%);
          -webkit-mask-image: linear-gradient(to right, #000 0%, #000 34%, #050505 42%, #191919 54%, #5c5c5c 72%, #ffffff 92%);
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

  if (slides.length < 2) return;

  const transitionDuration = 900;

  window.setInterval(() => {
    const previous = slides[current];
    previous.classList.remove('is-active');
    previous.classList.add('is-leaving');

    current = (current + 1) % slides.length;
    slides[current].classList.add('is-active');

    window.setTimeout(() => {
      previous.classList.remove('is-leaving');
    }, transitionDuration);
  }, Math.max(delay, 2000));
})();
