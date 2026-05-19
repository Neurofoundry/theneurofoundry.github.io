/**
 * Neurofoundry Authentication Client
 * Frontend JavaScript library for managing authentication
 */

class NeurofoundryAuth {
  constructor(config = {}) {
    this.apiUrl = config.apiUrl || NeurofoundryAuth.resolveDefaultApiUrl();
    this.frontendOrigin = config.frontendOrigin || null;
    this.storageKey = 'nf_auth';
    this.user = null;
    this.token = null;

    // Load auth state from storage
    this.loadAuthState();
  }

  /**
   * Load authentication state from localStorage
   */
  loadAuthState() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.user = data.user;
        this.token = data.token;
      }
    } catch (error) {
      console.error('Error loading auth state:', error);
    }
  }

  /**
   * Save authentication state to localStorage
   */
  saveAuthState(user, token) {
    this.user = user;
    this.token = token;

    localStorage.setItem(this.storageKey, JSON.stringify({
      user,
      token,
      timestamp: Date.now()
    }));

    // Dispatch custom event for auth state changes
    window.dispatchEvent(new CustomEvent('auth-state-changed', {
      detail: { user, token }
    }));
  }

  /**
   * Clear authentication state
   */
  clearAuthState() {
    this.user = null;
    this.token = null;
    localStorage.removeItem(this.storageKey);
    window.dispatchEvent(new CustomEvent('auth-state-changed', {
      detail: { user: null, token: null }
    }));
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * Make authenticated API request
   */
  async apiRequest(endpoint, options = {}) {
    const url = `${this.apiUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include' // Include cookies
    });

    // Handle JSON parsing with better error handling
    let data;
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        console.error('Raw response:', responseText);
        throw new Error(`Invalid JSON response from server: ${jsonError.message}`);
      }
    } else {
      // If not JSON, try to read as text
      const text = await response.text();
      console.warn('Non-JSON response received:', text.substring(0, 200));
      data = { message: text };
    }

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  }

  /**
   * Register new user
   */
  async register(userData) {
    try {
      const data = await this.apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          howHeardAboutNeurofoundry: userData.howHeardAboutNeurofoundry || '',
          dataRetentionAcknowledged: !!userData.dataRetentionAcknowledged,
          marketingOptOut: !!userData.marketingOptOut
        })
      });

      if (data.success && data.data && data.data.tokens && data.data.tokens.accessToken) {
        this.saveAuthState(data.data.user, data.data.tokens.accessToken);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Login with email and password
   */
  async login(email, password) {
    try {
      const data = await this.apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (data.success && data.data) {
        this.saveAuthState(data.data.user, data.data.tokens.accessToken);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Logout
   */
  async logout() {
    try {
      await this.apiRequest('/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthState();
    }
  }

  /**
   * Get current user profile
   */
  async getProfile() {
    try {
      const data = await this.apiRequest('/user/me');
      if (data.success && data.data) {
        this.user = data.data.user;
        this.saveAuthState(this.user, this.token);
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData) {
    try {
      const data = await this.apiRequest('/profile', {
        method: 'PATCH',
        body: JSON.stringify(profileData)
      });
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload avatar
   */
  async uploadAvatar(file) {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const url = `${this.apiUrl}/profile/avatar`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData,
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(email) {
    try {
      const data = await this.apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token, password) {
    try {
      const data = await this.apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password })
      });
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * OAuth Login - opens popup window
   */
  loginWithOAuth(provider, redirectPath = '/members/profile/') {
    const width = 600;
    const height = 700;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    const popupUrl = new URL(`${this.apiUrl}/auth/${provider}`);
    popupUrl.searchParams.set('redirect', redirectPath);

    const popup = window.open(
      popupUrl.toString(),
      `${provider}_oauth`,
      `width=${width},height=${height},top=${top},left=${left},resizable,scrollbars`
    );

    if (!popup) {
      return Promise.reject(new Error('OAuth popup was blocked by the browser'));
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      const apiOrigin = new URL(this.apiUrl).origin;
      const allowedOrigins = new Set([
        window.location.origin,
        apiOrigin
      ]);
      if (this.frontendOrigin) {
        allowedOrigins.add(this.frontendOrigin);
      }

      const cleanup = () => {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
      };

      const finalizeReject = (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      const finalizeResolve = (data) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(data);
      };

      const attemptDevOAuthFallback = async () => {
        try {
          const data = await this.apiRequest(`/auth/dev-oauth/${provider}`, {
            method: 'POST',
            body: JSON.stringify({ redirect: redirectPath })
          });
          const token = data?.data?.tokens?.accessToken;
          const user = data?.data?.user;
          if (data?.success && token && user) {
            this.saveAuthState(user, token);
            finalizeResolve({
              type: 'oauth_success',
              token,
              user,
              provider,
              mock: true,
              fallback: 'dev_oauth_endpoint'
            });
            return true;
          }
          return false;
        } catch (_) {
          return false;
        }
      };

      // Listen for messages from popup
      const messageHandler = async (event) => {
        if (!allowedOrigins.has(event.origin)) return;

        if (event.data.type === 'oauth_success') {
          const token = event.data.token;
          let user = event.data.user || null;

          if (!token) {
            return finalizeReject(new Error('OAuth completed but no token was returned'));
          }

          this.token = token;

          if (!user) {
            try {
              const profile = await this.getProfile();
              user = profile?.data?.user || this.user;
            } catch (error) {
              return finalizeReject(new Error(`OAuth completed but profile fetch failed: ${error.message}`));
            }
          }

          if (!user) {
            return finalizeReject(new Error('OAuth completed but no user data was returned'));
          }

          this.saveAuthState(user, token);
          finalizeResolve({ ...event.data, user, token });
        } else if (event.data.type === 'oauth_error') {
          finalizeReject(new Error(event.data.message || 'OAuth failed'));
        }
      };

      window.addEventListener('message', messageHandler);

      // Check if popup was closed
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          attemptDevOAuthFallback().then((didFallback) => {
            if (!didFallback) {
              finalizeReject(new Error('OAuth window was closed'));
            }
          });
        }
      }, 500);
    });
  }

  /**
   * Handle OAuth callback (for redirect-based OAuth)
   */
  async handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');
    const rawRedirectPath = urlParams.get('redirect') || '/members/profile/';
    const redirectPath = rawRedirectPath.startsWith('/') && !rawRedirectPath.startsWith('//')
      ? rawRedirectPath
      : '/members/profile/';

    if (error) {
      if (window.opener) {
        window.opener.postMessage({
          type: 'oauth_error',
          message: error
        }, '*');
        window.close();
      }
      throw new Error(error);
    }

    if (token) {
      this.token = token;

      let user = null;
      try {
        const profile = await this.getProfile();
        user = profile?.data?.user || this.user;
      } catch (profileError) {
        console.warn('Could not fetch profile during OAuth callback:', profileError);
      }

      // For popup-based OAuth, send message to opener
      if (window.opener) {
        window.opener.postMessage({
          type: 'oauth_success',
          token: token,
          user
        }, '*');
        setTimeout(() => window.close(), 100);
      } else {
        // For redirect-based OAuth, save state directly
        if (user) {
          this.saveAuthState(user, token);
        }
        window.location.href = redirectPath;
      }
    }
  }

  static resolveDefaultApiUrl() {
    const hostname = window.location.hostname || '';
    const protocol = window.location.protocol || '';

    if (protocol === 'file:' || hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }

    if (hostname.endsWith('theneurofoundry.com')) {
      return 'https://api.theneurofoundry.com/api';
    }

    return `${window.location.origin}/api`;
  }
}

// Create global instance
window.NeurofoundryAuth = NeurofoundryAuth;

// Initialize default instance
window.nfAuth = new NeurofoundryAuth({
  apiUrl: NeurofoundryAuth.resolveDefaultApiUrl()
});
