/**
 * Neurofoundry Authentication Client
 * Frontend JavaScript library for managing authentication
 */

class NeurofoundryAuth {
  constructor(config = {}) {
    this.apiUrl = config.apiUrl || 'http://localhost:3000/api';
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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
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
          name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
        })
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
  loginWithOAuth(provider) {
    const width = 600;
    const height = 700;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    const popup = window.open(
      `${this.apiUrl}/auth/${provider}`,
      `${provider}_oauth`,
      `width=${width},height=${height},top=${top},left=${left},resizable,scrollbars`
    );

    return new Promise((resolve, reject) => {
      // Listen for messages from popup
      const messageHandler = (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'oauth_success') {
          window.removeEventListener('message', messageHandler);
          this.saveAuthState(event.data.user, event.data.token);
          resolve(event.data);
        } else if (event.data.type === 'oauth_error') {
          window.removeEventListener('message', messageHandler);
          reject(new Error(event.data.message));
        }
      };

      window.addEventListener('message', messageHandler);

      // Check if popup was closed
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          reject(new Error('OAuth window was closed'));
        }
      }, 500);
    });
  }

  /**
   * Handle OAuth callback (for redirect-based OAuth)
   */
  handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    if (error) {
      throw new Error(error);
    }

    if (token) {
      // For popup-based OAuth, send message to opener
      if (window.opener) {
        window.opener.postMessage({
          type: 'oauth_success',
          token: token
        }, window.location.origin);
        window.close();
      } else {
        // For redirect-based OAuth, save state directly
        this.token = token;
        this.getProfile().then(() => {
          window.location.href = '/dashboard.html';
        });
      }
    }
  }
}

// Create global instance
window.NeurofoundryAuth = NeurofoundryAuth;

// Initialize default instance
window.nfAuth = new NeurofoundryAuth({
  apiUrl: window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : 'https://api.theneurofoundry.com/api'
});
