(function () {
  const script = document.currentScript;
  const basePath = script && script.dataset.base ? script.dataset.base : '';
  const rootPath = script && script.dataset.root ? script.dataset.root.replace(/\/?$/, '/') : basePath;
  const currentKey = script && script.dataset.current ? script.dataset.current : '';
  const mount = document.querySelector('[data-site-header]');
  let cookieAuthState = null;

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
  const resolveHref = (href) => {
    if (/^https?:\/\//i.test(href)) return href;
    if (href.startsWith('/')) return `${rootPath.replace(/\/$/, '')}${href}`;
    return `${basePath}${href}`;
  };
  const navItems = links.map((link) => {
    const href = resolveHref(link.href);
    const isCurrent = currentKey ? currentKey === link.key : currentPage === link.href || window.location.pathname === link.href || (link.href === 'index.html' && homePages.has(currentPage));
    const currentAttr = isCurrent ? ' aria-current="page"' : '';
    return `<a href="${href}"${currentAttr}>${link.label}</a>`;
  }).join('');
  const mobileNavItems = `${navItems}<a href="${basePath}members/signup/">Sign Up</a>`;

  const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));

  const getAuthState = () => {
    try {
      const stored = window.localStorage && window.localStorage.getItem('nf_auth');
      if (stored) {
        const data = JSON.parse(stored);
        if (data && data.token && data.user) return data;
      }
    } catch (_) {
      // Ignore malformed local auth and fall back to the shared API cookie.
    }

    return cookieAuthState;
  };

  const resolveApiBase = () => {
    const hostname = window.location.hostname || '';
    const protocol = window.location.protocol || '';

    if (protocol === 'file:' || hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }

    if (hostname.endsWith('theneurofoundry.com')) {
      return 'https://api.theneurofoundry.com/api';
    }

    return `${window.location.origin}/api`;
  };

  const hydrateAuthFromCookie = async () => {
    if (getAuthState()) return;

    try {
      const response = await fetch(`${resolveApiBase()}/profile`, {
        credentials: 'include'
      });
      if (!response.ok) return;
      const data = await response.json();
      const user = data && data.data && (data.data.profile || data.data.user);
      if (!user) return;
      cookieAuthState = {
        user,
        token: ''
      };
      updateAuthSlots();
    } catch (_) {
      // Logged-out visitors and blocked cookie checks should keep seeing Login.
    }
  };

  const getProfileInitial = (user) => {
    const source = user.firstName || user.name || user.email || 'N';
    return String(source).trim().charAt(0).toUpperCase() || 'N';
  };

  const getProfileDisplayName = (user) => {
    const source = user.firstName || user.name || user.email || 'Profile';
    return String(source).trim().split(/\s+/)[0] || 'Profile';
  };

  const getProfileLabel = (user) => {
    const name = user.firstName || user.name || user.email || 'Profile';
    return `${name}'s profile`;
  };

  const getAvatarSrc = (avatar) => {
    if (!avatar) return '';
    const value = String(avatar);
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('/api/') && window.NeurofoundryAuth && window.NeurofoundryAuth.resolveDefaultApiUrl) {
      try {
        return `${new URL(window.NeurofoundryAuth.resolveDefaultApiUrl()).origin}${value}`;
      } catch (_) {
        return value;
      }
    }
    if (value.startsWith('/')) return value;
    return `${basePath}${value.replace(/^\.?\//, '')}`;
  };

  const renderAuthLink = () => {
    const authState = getAuthState();
    const loginHref = `${basePath}members/login/?redirect=${encodeURIComponent(window.location.href)}`;
    if (!authState) {
      return `<a class="nf-login-link" href="${loginHref}">Login</a>`;
    }

    const user = authState.user;
    const initial = escapeHtml(getProfileInitial(user));
    const displayName = escapeHtml(getProfileDisplayName(user));
    const avatarSrc = getAvatarSrc(user.avatar);
    const avatarImg = avatarSrc ? `<img src="${escapeHtml(avatarSrc)}" alt="">` : '';
    return `
      <a class="nf-profile-link" href="${basePath}members/profile/" aria-label="${escapeHtml(getProfileLabel(user))}" title="Profile">
        <span class="nf-profile-avatar" aria-hidden="true">
          ${avatarImg}
          <span>${initial}</span>
        </span>
        <span class="nf-profile-name">${displayName}</span>
      </a>
    `;
  };

  mount.innerHTML = `
    <header class="nf-site-header">
      <div class="nf-header-container">
        <a class="nf-brand" href="${basePath}index.html" aria-label="Neurofoundry home">
          <div class="nf-brand-icon"><img src="${basePath}anvil.png" alt=""></div>
          <span class="nf-brand-font-loading">NEUROFOUNDRY</span>
        </a>
        <nav class="nf-nav-links" aria-label="Main navigation">
          ${navItems}
          <span class="nf-auth-slot" data-nf-auth-slot></span>
        </nav>
        <div class="nf-mobile-actions">
          <span class="nf-auth-slot" data-nf-auth-slot></span>
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

  const updateAuthSlots = () => {
    mount.querySelectorAll('[data-nf-auth-slot]').forEach((slot) => {
      slot.innerHTML = renderAuthLink();
    });
    mount.querySelectorAll('.nf-profile-avatar img').forEach((image) => {
      image.addEventListener('error', () => {
        image.remove();
      }, { once: true });
    });
  };

  updateAuthSlots();
  hydrateAuthFromCookie();
  window.addEventListener('auth-state-changed', updateAuthSlots);

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
