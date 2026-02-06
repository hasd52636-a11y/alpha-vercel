// 缓存管理器，用于管理各种缓存数据
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount?: number; // 访问次数，用于LRU算法
}

export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private maxSize: number = 1000; // 最大缓存项数量
  private memoryLimit: number = 50 * 1024 * 1024; // 内存限制（50MB）
  private currentMemoryUsage: number = 0; // 当前内存使用量

  constructor(maxSize: number = 1000, memoryLimit: number = 50 * 1024 * 1024) {
    this.maxSize = maxSize;
    this.memoryLimit = memoryLimit;
    this.startCleanupTimer();
  }

  private startCleanupTimer(): void {
    if (typeof window !== 'undefined') {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, 2 * 60 * 1000); // 每2分钟清理一次，提高清理频率
    }
  }

  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }

  /**
   * 估算数据大小（字节）
   * @param data 要估算大小的数据
   */
  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param data 缓存数据
   * @param ttl 生存时间（毫秒），默认10分钟
   */
  set<T>(key: string, data: T, ttl: number = 10 * 60 * 1000): void {
    // 检查缓存大小限制
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    // 检查内存使用限制
    const dataSize = this.estimateSize(data);
    while (this.currentMemoryUsage + dataSize > this.memoryLimit && this.cache.size > 0) {
      this.evictLRU();
    }

    // 移除旧缓存项（如果存在）
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.currentMemoryUsage -= this.estimateSize(oldEntry.data);
    }

    // 添加新缓存项
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 1
    });

    this.currentMemoryUsage += dataSize;
  }

  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存数据，如果不存在或已过期则返回undefined
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.currentMemoryUsage -= this.estimateSize(entry.data);
      this.cache.delete(key);
      return undefined;
    }

    // 更新访问计数和时间戳
    entry.accessCount = (entry.accessCount || 0) + 1;
    entry.timestamp = Date.now();
    this.cache.set(key, entry);

    return entry.data as T;
  }

  /**
   * 删除指定缓存项
   * @param key 缓存键
   */
  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentMemoryUsage -= this.estimateSize(entry.data);
    }
    this.cache.delete(key);
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.currentMemoryUsage = 0;
  }

  /**
   * 清除过期的缓存项
   */
  cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.currentMemoryUsage -= this.estimateSize(entry.data);
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    // 如果清理后仍然超过大小限制，继续清理
    while (this.cache.size > this.maxSize * 0.8) {
      this.evictLRU();
      cleanedCount++;
    }

    // 定期输出清理统计
    if (cleanedCount > 0 && typeof console !== 'undefined') {
      console.log(`Cache cleanup: removed ${cleanedCount} items, current size: ${this.cache.size}`);
    }
  }

  /**
   * 使用LRU算法驱逐缓存项
   */
  private evictLRU(): void {
    if (this.cache.size === 0) return;

    let lruKey: string | null = null;
    let lruEntry: CacheEntry | null = null;
    let minAccessCount = Infinity;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      const accessCount = entry.accessCount || 0;
      const timestamp = entry.timestamp;

      if (accessCount < minAccessCount || 
          (accessCount === minAccessCount && timestamp < oldestTimestamp)) {
        minAccessCount = accessCount;
        oldestTimestamp = timestamp;
        lruKey = key;
        lruEntry = entry;
      }
    }

    if (lruKey && lruEntry) {
      this.currentMemoryUsage -= this.estimateSize(lruEntry.data);
      this.cache.delete(lruKey);
    }
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取当前内存使用量
   */
  getMemoryUsage(): number {
    return this.currentMemoryUsage;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    memoryUsage: number;
    memoryLimit: number;
    maxSize: number;
  } {
    return {
      size: this.cache.size,
      memoryUsage: this.currentMemoryUsage,
      memoryLimit: this.memoryLimit,
      maxSize: this.maxSize
    };
  }
}

// 创建全局缓存实例
export const globalCache = new CacheManager();

// 创建专用缓存实例
export const aiCache = new CacheManager(500, 25 * 1024 * 1024); // AI响应缓存（25MB）
export const knowledgeCache = new CacheManager(800, 30 * 1024 * 1024); // 知识库缓存（30MB）
export const userCache = new CacheManager(300, 15 * 1024 * 1024); // 用户数据缓存（15MB）

// 定期清理过期缓存
setInterval(() => {
  globalCache.cleanup();
  aiCache.cleanup();
  knowledgeCache.cleanup();
  userCache.cleanup();
}, 2 * 60 * 1000); // 每2分钟清理一次