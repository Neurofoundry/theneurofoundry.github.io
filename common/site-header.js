(function () {
  const script = document.currentScript;
  const basePath = script && script.dataset.base ? script.dataset.base : '';
  const mount = document.querySelector('[data-site-header]');

  if (!mount) return;

  const ensureIconLink = (rel, attrs) => {
    const existing = document.head.querySelector(`link[rel="${rel}"]`);
    const link = existing || document.createElement('link');
    link.rel = rel;

    Object.entries(attrs).forEach(([key, value]) => {
      link.setAttribute(key, value);
    });

    if (!existing) {
      document.head.appendChild(link);
    }
  };

  const faviconPath = `${basePath}anvil.png`;
  ensureIconLink('icon', { type: 'image/png', href: faviconPath });
  ensureIconLink('apple-touch-icon', { href: faviconPath });

  const ensureHeadLink = (selector, attrs) => {
    if (document.head.querySelector(selector)) return;
    const link = document.createElement('link');

    Object.entries(attrs).forEach(([key, value]) => {
      link.setAttribute(key, value);
    });

    document.head.appendChild(link);
  };

  const changaUrl = 'https://fonts.googleapis.com/css2?family=Changa:wght@600;700;800&display=swap';
  ensureHeadLink('link[data-nf-font-preconnect="googleapis"]', {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
    'data-nf-font-preconnect': 'googleapis'
  });
  ensureHeadLink('link[data-nf-font-preconnect="gstatic"]', {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossorigin: '',
    'data-nf-font-preconnect': 'gstatic'
  });
  ensureHeadLink('link[data-nf-font="changa-preload"]', {
    rel: 'preload',
    as: 'style',
    href: changaUrl,
    'data-nf-font': 'changa-preload'
  });
  ensureHeadLink('link[data-nf-font="changa"]', {
    rel: 'stylesheet',
    href: changaUrl,
    'data-nf-font': 'changa'
  });

  const links = [
    { href: 'index.html', label: 'Home' },
    { href: '/services/', label: 'Services' },
    { href: '/downloads/', label: 'Downloads' },
    { href: '/workshop/', label: 'Workshop' },
    { href: '/about/', label: 'About' }
  ];

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const homePages = new Set(['index.html', 'home.html', 'index_responsive.html', 'index_combined.html', 'index_mobile.html']);
  const navItems = links.map((link) => {
    const href = link.href.startsWith('/') ? link.href : `${basePath}${link.href}`;
    const isCurrent = currentPage === link.href || window.location.pathname === link.href || (link.href === 'index.html' && homePages.has(currentPage));
    const currentAttr = isCurrent ? ' aria-current="page"' : '';
    return `<a href="${href}"${currentAttr}>${link.label}</a>`;
  }).join('');
  const mobileNavItems = `${navItems}<a href="${basePath}members/signup/">Sign Up</a>`;
  const loginLink = `<a class="nf-login-link" href="${basePath}members/login/">Login</a>`;

  mount.innerHTML = `
    <header class="nf-site-header">
      <div class="nf-header-container">
        <a class="nf-brand" href="${basePath}index.html" aria-label="Neurofoundry home">
          <div class="nf-brand-icon"><img src="${basePath}anvil.png" alt=""></div>
          <span class="nf-brand-font-loading">NEUROFOUNDRY</span>
        </a>
        <nav class="nf-nav-links" aria-label="Main navigation">
          ${navItems}
          ${loginLink}
        </nav>
        <div class="nf-mobile-actions">
          ${loginLink}
          <button class="nf-menu-toggle" type="button" aria-label="Open navigation menu" aria-expanded="false" aria-controls="nf-mobile-menu">
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </button>
          <nav class="nf-mobile-menu" id="nf-mobile-menu" aria-label="Mobile navigation" hidden>
            ${mobileNavItems}
          </nav>
        </div>
      </div>
    </header>
  `;

  const toggle = mount.querySelector('.nf-menu-toggle');
  const menu = mount.querySelector('#nf-mobile-menu');
  const brandText = mount.querySelector('.nf-brand span');

  const showBrandText = () => {
    if (brandText) {
      brandText.classList.remove('nf-brand-font-loading');
    }
  };

  if (document.fonts && document.fonts.load) {
    document.fonts.load('700 18px Changa').then(showBrandText).catch(showBrandText);
    window.setTimeout(showBrandText, 1200);
  } else {
    showBrandText();
  }

  if (!toggle || !menu) return;

  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
  };

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    menu.hidden = expanded;
  });

  document.addEventListener('click', (event) => {
    if (!mount.contains(event.target)) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  });
})();
