/**
 * Local file-backed key-value store with Map-like methods.
 * Used as a persistent fallback when external DB is not configured.
 */

const fs = require('fs');
const path = require('path');

class LocalFileStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.map = new Map();
    this.loaded = false;
  }

  ensureLoaded() {
    if (this.loaded) return;
    this.loaded = true;

    try {
      if (!fs.existsSync(this.filePath)) {
        return;
      }
      const raw = fs.readFileSync(this.filePath, 'utf8');
      if (!raw.trim()) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        Object.entries(parsed).forEach(([key, value]) => {
          this.map.set(key, value);
        });
      }
    } catch (error) {
      console.error('⚠️  Failed to load local store file:', error.message);
    }
  }

  persist() {
    try {
      const dir = path.dirname(this.filePath);
      fs.mkdirSync(dir, { recursive: true });
      const serialized = JSON.stringify(Object.fromEntries(this.map), null, 2);
      fs.writeFileSync(this.filePath, serialized, 'utf8');
    } catch (error) {
      console.error('❌ Failed to persist local store:', error.message);
      throw error;
    }
  }

  get(key) {
    this.ensureLoaded();
    return this.map.get(key);
  }

  set(key, value) {
    this.ensureLoaded();
    this.map.set(key, value);
    this.persist();
    return this;
  }

  delete(key) {
    this.ensureLoaded();
    const deleted = this.map.delete(key);
    this.persist();
    return deleted;
  }

  entries() {
    this.ensureLoaded();
    return this.map.entries();
  }
}

module.exports = { LocalFileStore };
