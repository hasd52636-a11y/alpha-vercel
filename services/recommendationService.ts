export interface Recommendation {
  id: string;
  type: 'solution' | 'product' | 'knowledge' | 'warning';
  title: string;
  description: string;
  confidence: number;
  tags: string[];
  ruleId: string;
  timestamp: Date;
}

export interface RecommendationContext {
  userMessage: string;
  userId: string;
  location: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  previousInteractions: Array<{
    userMessage: string;
    aiResponse: string;
    timestamp: Date;
  }>;
  knowledgeBaseMatches: Array<{
    id: string;
    title: string;
    similarity: number;
    content: string;
  }>;
}

export class RecommendationService {
  private readonly STORAGE_KEY = 'smartguide_recommendations';
  private readonly MAX_RECORDS = 100;

  constructor() {
    this.initializeStorage();
  }

  private initializeStorage(): void {
    const existing = localStorage.getItem(this.STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
    }
  }

  // 从本地存储加载规则
  private loadRules(): any[] {
    const rulesJson = localStorage.getItem('smartguide_core_rules');
    if (!rulesJson) {
      return [];
    }

    try {
      return JSON.parse(rulesJson);
    } catch (error) {
      console.error('Error loading rules:', error);
      return [];
    }
  }

  // 生成推荐
  generateRecommendations(context: RecommendationContext): Recommendation[] {
    const rules = this.loadRules();
    const recommendations: Recommendation[] = [];

    // 过滤出启用的推荐规则
    const recommendationRules = rules.filter(
      (rule: any) => rule.active && rule.type === 'recommendation'
    );

    // 按优先级排序规则
    recommendationRules.sort((a: any, b: any) => b.priority - a.priority);

    // 应用规则生成推荐
    recommendationRules.forEach((rule: any) => {
      const recommendation = this.applyRule(rule, context);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    });

    // 按置信度排序并限制数量
    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  // 应用单个规则生成推荐
  private applyRule(rule: any, context: RecommendationContext): Recommendation | null {
    try {
      // 解析规则条件
      const condition = rule.condition;
      const action = rule.action;

      // 检查条件是否匹配
      if (!this.evaluateCondition(condition, context)) {
        return null;
      }

      // 生成推荐
      const recommendation = this.createRecommendationFromAction(action, rule, context);
      if (recommendation) {
        this.saveRecommendation(recommendation);
      }

      return recommendation;
    } catch (error) {
      console.error('Error applying rule:', error);
      return null;
    }
  }

  // 评估条件
  private evaluateCondition(condition: string, context: RecommendationContext): boolean {
    // 简单的条件评估逻辑
    // 实际应用中可能需要更复杂的表达式解析
    const lowerCondition = condition.toLowerCase();
    const lowerUserMessage = context.userMessage.toLowerCase();

    // 检查关键词匹配
    if (lowerCondition.includes('包含关键词') && this.hasKeywordMatch(lowerCondition, lowerUserMessage)) {
      return true;
    }

    // 检查地域匹配
    if (lowerCondition.includes('地域') && this.hasLocationMatch(lowerCondition, context.location)) {
      return true;
    }

    // 检查设备类型匹配
    if (lowerCondition.includes('设备') && this.hasDeviceMatch(lowerCondition, context.deviceType)) {
      return true;
    }

    // 检查知识库匹配
    if (lowerCondition.includes('知识库') && this.hasKnowledgeBaseMatch(lowerCondition, context.knowledgeBaseMatches)) {
      return true;
    }

    return false;
  }

  // 检查关键词匹配
  private hasKeywordMatch(condition: string, userMessage: string): boolean {
    // 提取关键词
    const keywordMatch = condition.match(/包含关键词\s*[:：]\s*(.+)/i);
    if (!keywordMatch) {
      return false;
    }

    const keywords = keywordMatch[1].split(',').map(k => k.trim().toLowerCase());
    return keywords.some(keyword => userMessage.includes(keyword));
  }

  // 检查地域匹配
  private hasLocationMatch(condition: string, location: string): boolean {
    // 提取地域
    const locationMatch = condition.match(/地域\s*[:：]\s*(.+)/i);
    if (!locationMatch) {
      return false;
    }

    const locations = locationMatch[1].split(',').map(l => l.trim().toLowerCase());
    return locations.some(loc => location.toLowerCase().includes(loc));
  }

  // 检查设备类型匹配
  private hasDeviceMatch(condition: string, deviceType: string): boolean {
    // 提取设备类型
    const deviceMatch = condition.match(/设备\s*[:：]\s*(.+)/i);
    if (!deviceMatch) {
      return false;
    }

    const devices = deviceMatch[1].split(',').map(d => d.trim().toLowerCase());
    return devices.includes(deviceType.toLowerCase());
  }

  // 检查知识库匹配
  private hasKnowledgeBaseMatch(condition: string, knowledgeBaseMatches: any[]): boolean {
    // 提取知识库关键词
    const knowledgeMatch = condition.match(/知识库\s*[:：]\s*(.+)/i);
    if (!knowledgeMatch) {
      return false;
    }

    const keywords = knowledgeMatch[1].split(',').map(k => k.trim().toLowerCase());
    return knowledgeBaseMatches.some(match => {
      const lowerTitle = match.title.toLowerCase();
      const lowerContent = match.content.toLowerCase();
      return keywords.some(keyword => lowerTitle.includes(keyword) || lowerContent.includes(keyword));
    });
  }

  // 从动作创建推荐
  private createRecommendationFromAction(action: string, rule: any, context: RecommendationContext): Recommendation | null {
    // 解析动作
    const lowerAction = action.toLowerCase();

    if (lowerAction.includes('推荐解决方案')) {
      return this.createSolutionRecommendation(action, rule, context);
    } else if (lowerAction.includes('推荐产品')) {
      return this.createProductRecommendation(action, rule, context);
    } else if (lowerAction.includes('推荐知识库')) {
      return this.createKnowledgeRecommendation(action, rule, context);
    } else if (lowerAction.includes('警告')) {
      return this.createWarningRecommendation(action, rule, context);
    }

    return null;
  }

  // 创建解决方案推荐
  private createSolutionRecommendation(action: string, rule: any, context: RecommendationContext): Recommendation {
    const titleMatch = action.match(/推荐解决方案\s*[:：]\s*(.+)/i);
    const title = titleMatch ? titleMatch[1] : '解决方案推荐';

    return {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'solution',
      title,
      description: '基于您的问题，我们推荐以下解决方案',
      confidence: 0.8,
      tags: ['解决方案', '推荐'],
      ruleId: rule.id,
      timestamp: new Date()
    };
  }

  // 创建产品推荐
  private createProductRecommendation(action: string, rule: any, context: RecommendationContext): Recommendation {
    const titleMatch = action.match(/推荐产品\s*[:：]\s*(.+)/i);
    const title = titleMatch ? titleMatch[1] : '产品推荐';

    return {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'product',
      title,
      description: '基于您的需求，我们推荐以下产品',
      confidence: 0.7,
      tags: ['产品', '推荐'],
      ruleId: rule.id,
      timestamp: new Date()
    };
  }

  // 创建知识库推荐
  private createKnowledgeRecommendation(action: string, rule: any, context: RecommendationContext): Recommendation {
    const titleMatch = action.match(/推荐知识库\s*[:：]\s*(.+)/i);
    const title = titleMatch ? titleMatch[1] : '知识库推荐';

    return {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'knowledge',
      title,
      description: '您可能会对以下知识库内容感兴趣',
      confidence: 0.9,
      tags: ['知识库', '推荐'],
      ruleId: rule.id,
      timestamp: new Date()
    };
  }

  // 创建警告推荐
  private createWarningRecommendation(action: string, rule: any, context: RecommendationContext): Recommendation {
    const titleMatch = action.match(/警告\s*[:：]\s*(.+)/i);
    const title = titleMatch ? titleMatch[1] : '警告';

    return {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'warning',
      title,
      description: '请注意以下潜在问题',
      confidence: 0.85,
      tags: ['警告', '注意'],
      ruleId: rule.id,
      timestamp: new Date()
    };
  }

  // 保存推荐
  private saveRecommendation(recommendation: Recommendation): void {
    const recommendations = this.getRecommendations();
    recommendations.unshift(recommendation);

    if (recommendations.length > this.MAX_RECORDS) {
      recommendations.splice(this.MAX_RECORDS);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recommendations));
  }

  // 获取推荐
  getRecommendations(limit: number = this.MAX_RECORDS): Recommendation[] {
    const recommendationsJson = localStorage.getItem(this.STORAGE_KEY);
    if (!recommendationsJson) {
      return [];
    }

    try {
      const recommendations = JSON.parse(recommendationsJson) as Recommendation[];
      return recommendations.slice(0, limit).map(rec => ({
        ...rec,
        timestamp: new Date(rec.timestamp)
      }));
    } catch (error) {
      console.error('Error parsing recommendations:', error);
      return [];
    }
  }

  // 获取用户的推荐
  getUserRecommendations(userId: string, limit: number = 10): Recommendation[] {
    const recommendations = this.getRecommendations();
    // 这里可以根据userId过滤推荐
    return recommendations.slice(0, limit);
  }

  // 获取基于地域的推荐
  getLocationBasedRecommendations(location: string, limit: number = 10): Recommendation[] {
    const recommendations = this.getRecommendations();
    // 这里可以根据location过滤推荐
    return recommendations.slice(0, limit);
  }

  // 获取基于设备的推荐
  getDeviceBasedRecommendations(deviceType: string, limit: number = 10): Recommendation[] {
    const recommendations = this.getRecommendations();
    // 这里可以根据deviceType过滤推荐
    return recommendations.slice(0, limit);
  }

  // 清除推荐
  clearRecommendations(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
  }

  // 导出推荐
  exportRecommendations(): string {
    const recommendations = this.getRecommendations();
    return JSON.stringify(recommendations, null, 2);
  }
}

export const recommendationService = new RecommendationService();