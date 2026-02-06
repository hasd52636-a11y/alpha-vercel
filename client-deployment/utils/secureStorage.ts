/**
 * 安全存储工具
 * 提供增强的加密存储功能
 */

const STORAGE_KEY_PREFIX = 'sg_secure_';
const ENCRYPTION_VERSION = 'v2'; // 加密版本，用于未来升级

/**
 * 生成加密密钥
 * 使用浏览器内置的Web Crypto API
 */
const generateEncryptionKey = async (): Promise<CryptoKey> => {
  try {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    console.warn('Web Crypto API not available, falling back to base64');
    // 降级到Base64编码
    return null as unknown as CryptoKey;
  }
};

/**
 * 增强的编码/解码函数
 * 优先使用AES-GCM加密，降级到Base64编码
 */
const encode = async (data: string): Promise<string> => {
  try {
    // 检查Web Crypto API是否可用
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const key = await generateEncryptionKey();
      if (key) {
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(data);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        const encrypted = await crypto.subtle.encrypt(
          {
            name: 'AES-GCM',
            iv
          },
          key,
          encodedData
        );
        
        const result = {
          version: ENCRYPTION_VERSION,
          iv: Array.from(iv),
          data: Array.from(new Uint8Array(encrypted))
        };
        
        return btoa(JSON.stringify(result));
      }
    }
    
    // 降级到增强的Base64编码
    return btoa(encodeURIComponent(data + '|' + Date.now()));
  } catch (error) {
    console.warn('Encryption failed, falling back to basic encoding');
    return btoa(encodeURIComponent(data));
  }
};

const decode = async (encoded: string): Promise<string | null> => {
  try {
    const decodedData = atob(encoded);
    
    try {
      // 尝试解析AES-GCM加密数据
      const parsed = JSON.parse(decodedData);
      if (parsed.version === ENCRYPTION_VERSION) {
        const key = await generateEncryptionKey();
        if (key) {
          const iv = new Uint8Array(parsed.iv);
          const encryptedData = new Uint8Array(parsed.data);
          
          const decrypted = await crypto.subtle.decrypt(
            {
              name: 'AES-GCM',
              iv
            },
            key,
            encryptedData
          );
          
          const decoder = new TextDecoder();
          return decoder.decode(decrypted);
        }
      }
    } catch {
      // 不是AES-GCM格式，尝试降级解码
    }
    
    // 降级解码
    const decoded = decodeURIComponent(decodedData);
    // 移除时间戳
    return decoded.split('|')[0];
  } catch (error) {
    console.warn('Decryption failed:', error);
    return null;
  }
};

/**
 * 同步编码函数（用于不支持异步的场景）
 */
const encodeSync = (data: string): string => {
  try {
    return btoa(encodeURIComponent(data + '|' + Date.now()));
  } catch {
    return '';
  }
};

const decodeSync = (encoded: string): string | null => {
  try {
    const decoded = decodeURIComponent(atob(encoded));
    return decoded.split('|')[0];
  } catch {
    return null;
  }
};

/**
 * 检查是否为有效的编码字符串
 */
const isValidEncoded = (encoded: string): boolean => {
  try {
    const decoded = decodeSync(encoded);
    return decoded !== null && decoded.length > 0;
  } catch {
    return false;
  }
};

/**
 * 输入验证
 */
const validateInput = (key: string, value: any): boolean => {
  if (!key || typeof key !== 'string') {
    console.warn('secureStorage: invalid key');
    return false;
  }
  
  if (value === undefined || value === null) {
    console.warn('secureStorage: invalid value');
    return false;
  }
  
  // 检查key是否包含敏感信息
  const sensitiveKeywords = ['password', 'token', 'secret', 'key'];
  if (sensitiveKeywords.some(keyword => key.toLowerCase().includes(keyword))) {
    console.info('secureStorage: storing sensitive data');
  }
  
  return true;
};

export const secureStorage = {
  /**
   * 安全地存储字符串值
   */
  async setItem(key: string, value: string): Promise<boolean> {
    if (!validateInput(key, value)) {
      return false;
    }

    try {
      const encoded = await encode(value);
      if (!encoded) {
        // 降级到同步编码
        const syncEncoded = encodeSync(value);
        if (!syncEncoded) {
          console.warn('secureStorage: failed to encode value');
          return false;
        }
        localStorage.setItem(STORAGE_KEY_PREFIX + key, syncEncoded);
      } else {
        localStorage.setItem(STORAGE_KEY_PREFIX + key, encoded);
      }
      return true;
    } catch (error) {
      console.error('secureStorage: failed to set item', error);
      return false;
    }
  },

  /**
   * 安全地获取字符串值
   */
  async getItem(key: string): Promise<string | null> {
    if (!key) {
      return null;
    }

    try {
      const encoded = localStorage.getItem(STORAGE_KEY_PREFIX + key);
      if (!encoded) {
        return null;
      }

      // 检查是否为有效的编码字符串
      if (!isValidEncoded(encoded)) {
        console.warn('secureStorage: found invalid encoded data for key:', key);
        localStorage.removeItem(STORAGE_KEY_PREFIX + key);
        return null;
      }

      const decoded = await decode(encoded);
      if (!decoded) {
        // 降级到同步解码
        return decodeSync(encoded);
      }
      return decoded;
    } catch (error) {
      console.error('secureStorage: failed to get item', error);
      return null;
    }
  },

  /**
   * 同步获取字符串值（用于紧急情况）
   */
  getItemSync(key: string): string | null {
    if (!key) {
      return null;
    }

    try {
      const encoded = localStorage.getItem(STORAGE_KEY_PREFIX + key);
      if (!encoded) {
        return null;
      }

      return decodeSync(encoded);
    } catch (error) {
      console.error('secureStorage: failed to get item sync', error);
      return null;
    }
  },

  /**
   * 安全地存储对象
   */
  async setObject<T>(key: string, value: T): Promise<boolean> {
    try {
      const json = JSON.stringify(value);
      return await this.setItem(key, json);
    } catch (error) {
      console.warn('secureStorage: failed to stringify object for key:', key, error);
      return false;
    }
  },

  /**
   * 安全地获取对象
   */
  async getObject<T>(key: string, defaultValue?: T): Promise<T | null> {
    try {
      const json = await this.getItem(key);
      if (!json) {
        return defaultValue ?? null;
      }
      return JSON.parse(json) as T;
    } catch (error) {
      console.error('secureStorage: failed to parse object for key:', key, error);
      return defaultValue ?? null;
    }
  },

  /**
   * 移除指定项
   */
  removeItem(key: string): void {
    if (!key) return;
    try {
      localStorage.removeItem(STORAGE_KEY_PREFIX + key);
    } catch (error) {
      console.error('secureStorage: failed to remove item', error);
    }
  },

  /**
   * 清空所有安全存储的数据
   */
  clear(): void {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
          keys.push(key);
        }
      }
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('secureStorage: failed to clear', error);
    }
  },

  /**
   * 检查存储项是否存在
   */
  hasItem(key: string): boolean {
    if (!key) return false;
    try {
      return localStorage.getItem(STORAGE_KEY_PREFIX + key) !== null;
    } catch {
      return false;
    }
  },

  /**
   * 迁移旧版明文数据到加密存储
   * 保留向后兼容性
   */
  migrateFromPlainText(keys: string[]): void {
    keys.forEach(key => {
      const plainKey = key;
      const encryptedKey = STORAGE_KEY_PREFIX + key;
      
      // 如果已有加密版本，跳过
      if (this.hasItem(key)) return;
      
      // 尝试迁移明文数据
      try {
        const plainValue = localStorage.getItem(plainKey);
        if (plainValue) {
          this.setItem(key, plainValue);
          console.info('secureStorage: migrated key:', key);
          // 迁移后删除明文数据
          localStorage.removeItem(plainKey);
        }
      } catch (error) {
        console.warn('secureStorage: failed to migrate key:', key, error);
      }
    });
  },

  /**
   * 清除所有敏感数据
   */
  clearSensitiveData(): void {
    const sensitiveKeys = ['apiKey', 'token', 'password', 'secret'];
    sensitiveKeys.forEach(key => {
      this.removeItem(key);
    });
    console.info('secureStorage: cleared sensitive data');
  },

  /**
   * 获取存储统计信息
   */
  getStats(): {
    totalItems: number;
    sensitiveItems: number;
    storageUsed: number;
  } {
    try {
      const totalItems = localStorage.length;
      const sensitiveKeys = ['apiKey', 'token', 'password', 'secret'];
      const sensitiveItems = sensitiveKeys.filter(key => this.hasItem(key)).length;
      
      // 估算存储使用量
      let storageUsed = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            storageUsed += key.length + value.length;
          }
        }
      }
      
      return {
        totalItems,
        sensitiveItems,
        storageUsed
      };
    } catch {
      return {
        totalItems: 0,
        sensitiveItems: 0,
        storageUsed: 0
      };
    }
  }
};

/**
 * 便捷函数：存储API密钥
 */
export const setApiKey = async (key: string): Promise<boolean> => {
  return await secureStorage.setItem('zhipuApiKey', key);
};

/**
 * 便捷函数：获取API密钥
 */
export const getApiKey = async (): Promise<string | null> => {
  return await secureStorage.getItem('zhipuApiKey');
};

/**
 * 便捷函数：同步获取API密钥
 */
export const getApiKeySync = (): string | null => {
  return secureStorage.getItemSync('zhipuApiKey');
};

/**
 * 便捷函数：删除API密钥
 */
export const removeApiKey = (): void => {
  secureStorage.removeItem('zhipuApiKey');
};

/**
 * 安全生成CSRF令牌
 */
export const generateCSRFToken = (): string => {
  const token = Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15) + 
                Date.now().toString(36);
  secureStorage.setItem('csrfToken', token);
  return token;
};

/**
 * 验证CSRF令牌
 */
export const validateCSRFToken = async (token: string): Promise<boolean> => {
  const storedToken = await secureStorage.getItem('csrfToken');
  return storedToken === token;
};
