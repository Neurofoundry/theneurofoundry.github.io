(function () {
  const script = document.currentScript;
  const basePath = script && script.dataset.base ? script.dataset.base : '';
  const mount = document.querySelector('[data-site-footer]');

  if (!mount) return;

  const links = [
    { href: 'index.html', label: 'Home' },
    { href: 'services/', label: 'Services' },
    { href: 'about/', label: 'About' },
    { href: 'docs/privacy-policy/', label: 'Privacy Policy' },
    { href: 'docs/terms-of-service/', label: 'Terms of Service' }
  ];

  const linkHtml = links.map((link) => {
    const href = link.external && /^https?:\/\//i.test(link.href) ? link.href : `${basePath}${link.href}`;
    const externalAttrs = link.external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${href}"${externalAttrs}>${link.label}</a>`;
  }).join('');

  mount.innerHTML = `
    <footer class="nf-site-footer">
      <div class="nf-footer-content">
        <p>&copy; 2025 The Neurofoundry.</p>
        <nav class="nf-footer-links" aria-label="Footer navigation">
          ${linkHtml}
        </nav>
      </div>
    </footer>
  `;
})();
