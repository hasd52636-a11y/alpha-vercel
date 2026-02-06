export interface UserInteraction {
  id: string;
  userId: string;
  sessionId: string;
  userMessage: string;
  aiResponse: string;
  satisfaction: number | null; // 1-5分，null表示未评价
  processingTime: number; // 处理时间（毫秒）
  timestamp: Date;
  location: string; // 地域
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  resolved: boolean; // 问题是否解决
  category: string; // 问题分类
}

export class UserInteractionService {
  private readonly STORAGE_KEY = 'smartguide_user_interactions';
  private readonly MAX_RECORDS = 50;

  constructor() {
    this.initializeStorage();
  }

  private initializeStorage(): void {
    const existing = localStorage.getItem(this.STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
    }
  }

  private getUserId(): string {
    let userId = localStorage.getItem('user_id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('user_id', userId);
    }
    return userId;
  }

  private getSessionId(): string {
    let sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  private getDeviceInfo(): {
    deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    browser: string;
    os: string;
  } {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;

    // 检测设备类型
    let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      if (/iPad/i.test(userAgent)) {
        deviceType = 'tablet';
      } else {
        deviceType = 'mobile';
      }
    } else {
      deviceType = 'desktop';
    }

    // 检测浏览器
    let browser = 'Unknown';
    if (userAgent.indexOf('Firefox') > -1) {
      browser = 'Firefox';
    } else if (userAgent.indexOf('Chrome') > -1) {
      browser = 'Chrome';
    } else if (userAgent.indexOf('Safari') > -1) {
      browser = 'Safari';
    } else if (userAgent.indexOf('Edge') > -1) {
      browser = 'Edge';
    } else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident/') > -1) {
      browser = 'Internet Explorer';
    }

    // 检测操作系统
    let os = 'Unknown';
    if (platform.indexOf('Win') > -1) {
      os = 'Windows';
    } else if (platform.indexOf('Mac') > -1) {
      os = 'MacOS';
    } else if (platform.indexOf('Linux') > -1) {
      os = 'Linux';
    } else if (/Android|iPhone|iPad|iPod/i.test(userAgent)) {
      if (/Android/i.test(userAgent)) {
        os = 'Android';
      } else {
        os = 'iOS';
      }
    }

    return { deviceType, browser, os };
  }

  private getLocation(): string {
    // 这里可以集成地理位置API获取真实地域信息
    // 为了简单起见，暂时返回默认值
    return '未知地域';
  }

  recordInteraction(userMessage: string, aiResponse: string, processingTime: number, category: string = '未分类'): string {
    const deviceInfo = this.getDeviceInfo();
    const interaction: UserInteraction = {
      id: `interaction_${Date.now()}`,
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      userMessage,
      aiResponse,
      satisfaction: null,
      processingTime,
      timestamp: new Date(),
      location: this.getLocation(),
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      resolved: false,
      category
    };

    const interactions = this.getInteractions();
    interactions.unshift(interaction);
    
    if (interactions.length > this.MAX_RECORDS) {
      interactions.splice(this.MAX_RECORDS);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(interactions));
    return interaction.id;
  }

  updateSatisfaction(interactionId: string, satisfaction: number): boolean {
    const interactions = this.getInteractions();
    const index = interactions.findIndex(i => i.id === interactionId);
    
    if (index === -1) {
      return false;
    }

    interactions[index].satisfaction = satisfaction;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(interactions));
    return true;
  }

  updateResolutionStatus(interactionId: string, resolved: boolean): boolean {
    const interactions = this.getInteractions();
    const index = interactions.findIndex(i => i.id === interactionId);
    
    if (index === -1) {
      return false;
    }

    interactions[index].resolved = resolved;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(interactions));
    return true;
  }

  updateCategory(interactionId: string, category: string): boolean {
    const interactions = this.getInteractions();
    const index = interactions.findIndex(i => i.id === interactionId);
    
    if (index === -1) {
      return false;
    }

    interactions[index].category = category;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(interactions));
    return true;
  }

  getInteractions(limit: number = this.MAX_RECORDS): UserInteraction[] {
    const interactions = localStorage.getItem(this.STORAGE_KEY);
    if (!interactions) {
      return [];
    }

    try {
      const parsed = JSON.parse(interactions) as UserInteraction[];
      return parsed.slice(0, limit).map(interaction => ({
        ...interaction,
        timestamp: new Date(interaction.timestamp)
      }));
    } catch (error) {
      console.error('Error parsing user interactions:', error);
      return [];
    }
  }

  getRecentInteractions(days: number = 7): UserInteraction[] {
    const interactions = this.getInteractions();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return interactions.filter(interaction => interaction.timestamp >= cutoffDate);
  }

  getHighFrequencyQuestions(limit: number = 10): Array<{
    question: string;
    count: number;
  }> {
    const interactions = this.getInteractions();
    const questionCounts = new Map<string, number>();

    // 统计问题频率
    interactions.forEach(interaction => {
      const question = interaction.userMessage.trim().toLowerCase();
      if (question) {
        questionCounts.set(question, (questionCounts.get(question) || 0) + 1);
      }
    });

    // 转换为数组并排序
    return Array.from(questionCounts.entries())
      .map(([question, count]) => ({ question, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  getInteractionsByDeviceType(): Record<string, number> {
    const interactions = this.getInteractions();
    const deviceCounts = {
      desktop: 0,
      mobile: 0,
      tablet: 0,
      unknown: 0
    };

    interactions.forEach(interaction => {
      deviceCounts[interaction.deviceType]++;
    });

    return deviceCounts;
  }

  getInteractionsByLocation(): Array<{
    location: string;
    count: number;
  }> {
    const interactions = this.getInteractions();
    const locationCounts = new Map<string, number>();

    interactions.forEach(interaction => {
      const location = interaction.location;
      locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
    });

    return Array.from(locationCounts.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
  }

  getAverageSatisfaction(): number {
    const interactions = this.getInteractions();
    const ratedInteractions = interactions.filter(i => i.satisfaction !== null);
    
    if (ratedInteractions.length === 0) {
      return 0;
    }

    const total = ratedInteractions.reduce((sum, i) => sum + (i.satisfaction || 0), 0);
    return total / ratedInteractions.length;
  }

  getAverageProcessingTime(): number {
    const interactions = this.getInteractions();
    if (interactions.length === 0) {
      return 0;
    }

    const total = interactions.reduce((sum, i) => sum + i.processingTime, 0);
    return total / interactions.length;
  }

  clearInteractions(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
  }

  exportInteractions(): string {
    const interactions = this.getInteractions();
    return JSON.stringify(interactions, null, 2);
  }
}

export const userInteractionService = new UserInteractionService();
