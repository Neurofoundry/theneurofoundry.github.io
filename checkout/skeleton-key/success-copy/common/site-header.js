(function () {
  const script = document.currentScript;
  const basePath = script && script.dataset.base ? script.dataset.base : '';
  const mount = document.querySelector('[data-site-header]');

  if (!mount) return;

  const links = [
    { href: 'index.html', label: 'Home' },
    { href: 'projects.html', label: 'Projects' },
    { href: 'technology.html', label: 'Technology' },
    { href: 'downloads.html', label: 'Downloads' },
    { href: 'about.html', label: 'About' }
  ];

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const homePages = new Set(['index.html', 'home.html', 'index_responsive.html', 'index_combined.html', 'index_mobile.html']);
  const navItems = links.map((link) => {
    const isCurrent = currentPage === link.href || (link.href === 'index.html' && homePages.has(currentPage));
    const currentAttr = isCurrent ? ' aria-current="page"' : '';
    return `<a href="${basePath}${link.href}"${currentAttr}>${link.label}</a>`;
  }).join('');
  const mobileNavItems = `${navItems}<a href="${basePath}members/signup/">Sign Up</a>`;
  const loginLink = `<a class="nf-login-link" href="${basePath}members/login/">Login</a>`;

  mount.innerHTML = `
    <header class="nf-site-header">
      <div class="nf-header-container">
        <a class="nf-brand" href="${basePath}index.html" aria-label="Neurofoundry home">
          <div class="nf-brand-icon"><img src="${basePath}anvil.png" alt=""></div>
          <span>NEUROFOUNDRY</span>
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
