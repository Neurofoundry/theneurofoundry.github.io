(function () {
  const script = document.currentScript;
  const basePath = script && script.dataset.base ? script.dataset.base : '';
  const mount = document.querySelector('[data-site-footer]');

  if (!mount) return;

  const links = [
    { href: 'index.html', label: 'Home' },
    { href: 'services/', label: 'Services' },
    { href: 'downloads/', label: 'Downloads' },
    { href: 'https://forge.theneurofoundry.com/', label: 'Forge', external: true },
    { href: 'about/', label: 'About' },
    { href: 'docs/privacy-policy/', label: 'Privacy Policy' }
  ];

  const linkHtml = links.map((link) => {
    const href = link.external && /^https?:\/\//i.test(link.href) ? link.href : `${basePath}${link.href}`;
    const externalAttrs = link.external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${href}"${externalAttrs}>${link.label}</a>`;
  }).join('');

  mount.innerHTML = `
    <footer class="nf-site-footer">
      <div class="nf-footer-content">
        <p>&copy; 2025 The Neurofoundry. Forged with intent.</p>
        <nav class="nf-footer-links" aria-label="Footer navigation">
          ${linkHtml}
        </nav>
      </div>
    </footer>
  `;
})();
