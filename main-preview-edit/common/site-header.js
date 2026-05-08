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

  mount.innerHTML = `
    <header class="nf-site-header">
      <div class="nf-header-container">
        <a class="nf-brand" href="${basePath}index.html" aria-label="Neurofoundry home">
          <div class="nf-brand-icon"><img src="${basePath}assets/ui/anvil.png" alt=""></div>
          <span>NEUROFOUNDRY</span>
        </a>
        <nav class="nf-nav-links" aria-label="Main navigation">
          ${navItems}
        </nav>
      </div>
    </header>
  `;
})();
