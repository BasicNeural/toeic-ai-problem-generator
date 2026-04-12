const STORAGE_KEY = 'gemini_api_keys';
const INDEX_KEY = 'gemini_api_key_index';

export const ApiKeyManager = {
  getKeys(): string[] {
    try {
      const keys = localStorage.getItem(STORAGE_KEY);
      return keys ? JSON.parse(keys) : [];
    } catch {
      return [];
    }
  },
  getAllKeys(): string[] {
    return this.getKeys();
  },
  addKey(key: string) {
    const keys = this.getKeys();
    if (!keys.includes(key)) {
      keys.push(key);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
      window.dispatchEvent(new CustomEvent('apiKeysUpdated'));
    }
  },
  removeKey(key: string) {
    const keys = this.getKeys();
    const newKeys = keys.filter(k => k !== key);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newKeys));
    
    const allKeys = this.getAllKeys();
    let currentIndex = this.getIndex();
    if (currentIndex >= allKeys.length) {
      this.setIndex(Math.max(0, allKeys.length - 1));
    }
    window.dispatchEvent(new CustomEvent('apiKeysUpdated'));
  },
  
  getIndex(): number {
    try {
      return parseInt(localStorage.getItem(INDEX_KEY) || '0', 10);
    } catch {
      return 0;
    }
  },
  
  setIndex(index: number) {
    localStorage.setItem(INDEX_KEY, index.toString());
    window.dispatchEvent(new CustomEvent('apiKeyChanged', { detail: { index } }));
  },
  
  getCurrentKey(): string {
    const keys = this.getAllKeys();
    if (keys.length === 0) return '';
    return keys[this.getIndex() % keys.length];
  },
  
  rotateKey() {
    const keys = this.getAllKeys();
    if (keys.length > 0) {
      const newIndex = (this.getIndex() + 1) % keys.length;
      this.setIndex(newIndex);
      window.dispatchEvent(new CustomEvent('apiKeyRotated'));
    }
  }
};
