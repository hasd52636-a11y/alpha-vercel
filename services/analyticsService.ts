export interface AnalyticsEvent {
  id: string;
  type: 'page_view' | 'click' | 'message' | 'video_play' | 'error';
  timestamp: Date;
  userId: string;
  sessionId: string;
  data: Record<string, any>;
}

export class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  trackEvent(type: AnalyticsEvent['type'], data: Record<string, any>): void {
    const event: AnalyticsEvent = {
      id: `event_${Date.now()}`,
      type,
      timestamp: new Date(),
      userId: this.getUserId(),
      sessionId: this.sessionId,
      data
    };

    this.events.push(event);
    this.sendEventToBackend(event);
  }

  private async sendEventToBackend(event: AnalyticsEvent): Promise<void> {
    try {
      console.log('Analytics event:', event);
      // 这里可以实现发送到后端的逻辑
    } catch (error) {
      console.error('Failed to send analytics event:', error);
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

  getEventStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.events.forEach(event => {
      stats[event.type] = (stats[event.type] || 0) + 1;
    });
    return stats;
  }

  getRecentEvents(limit: number = 10): AnalyticsEvent[] {
    return this.events.slice(-limit).reverse();
  }

  clearEvents(): void {
    this.events = [];
  }
}

export const analyticsService = new AnalyticsService();