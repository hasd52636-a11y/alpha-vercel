
export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  type: string;
  embedding?: number[];
  createdAt: string;
  tags?: string[];
  vectorized: boolean;
}

export interface SearchResult {
  id: string;
  score: number;
  content: string;
  metadata: {
    projectId: string;
    title: string;
    type: string;
    createdAt: string;
    tags?: string[];
  };
}

export class KnowledgeService {
  private apiKey: string = '';
  private baseUrl: string = '/api/knowledge';
  private localStorageKey: string = 'alpha01_knowledge_base';

  setApiKey(key: string) {
    this.apiKey = key;
  }

  // 从本地存储获取知识库
  private getLocalKnowledgeBase(): KnowledgeDocument[] {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting local knowledge base:', error);
      return [];
    }
  }

  // 保存知识库到本地存储
  private saveLocalKnowledgeBase(documents: KnowledgeDocument[]): void {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(documents));
    } catch (error) {
      console.error('Error saving local knowledge base:', error);
    }
  }

  private async request(action: string, data: any): Promise<any> {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        apiKey: this.apiKey,
        ...data,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Knowledge service error');
    }

    return response.json();
  }

  async addDocument(document: Partial<KnowledgeDocument>, projectId?: string): Promise<{ id: string }> {
    try {
      // 尝试使用后端API
      const result = await this.request('upsert', { document, projectId });
      return { id: result.id };
    } catch (error) {
      console.warn('Backend API failed, using local storage:', error);
      // 回退到本地存储
      const documents = this.getLocalKnowledgeBase();
      const newId = document.id || `local_${Date.now()}`;
      const newDocument: KnowledgeDocument = {
        id: newId,
        title: document.title || 'Untitled',
        content: document.content || '',
        type: document.type || 'text',
        embedding: document.embedding,
        createdAt: document.createdAt || new Date().toISOString(),
        tags: document.tags,
        vectorized: document.vectorized || false
      };
      
      const updatedDocuments = [...documents.filter(doc => doc.id !== newId), newDocument];
      this.saveLocalKnowledgeBase(updatedDocuments);
      return { id: newId };
    }
  }

  async deleteDocument(id: string, projectId?: string): Promise<void> {
    try {
      // 尝试使用后端API
      await this.request('delete', { id, projectId });
    } catch (error) {
      console.warn('Backend API failed, using local storage:', error);
      // 回退到本地存储
      const documents = this.getLocalKnowledgeBase();
      const updatedDocuments = documents.filter(doc => doc.id !== id);
      this.saveLocalKnowledgeBase(updatedDocuments);
    }
  }

  async search(query: string, projectId?: string): Promise<SearchResult[]> {
    try {
      // 尝试使用后端API
      const result = await this.request('search', { query, projectId });
      return result.results || [];
    } catch (error) {
      console.warn('Backend API failed, using local search:', error);
      // 回退到本地搜索（简单的关键词匹配）
      const documents = this.getLocalKnowledgeBase();
      const results: SearchResult[] = [];
      
      documents.forEach(doc => {
        const lowerQuery = query.toLowerCase();
        const lowerContent = doc.content.toLowerCase();
        const lowerTitle = doc.title.toLowerCase();
        
        let score = 0;
        if (lowerContent.includes(lowerQuery)) score += 1;
        if (lowerTitle.includes(lowerQuery)) score += 0.5;
        if (doc.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))) score += 0.3;
        
        if (score > 0) {
          results.push({
            id: doc.id,
            score,
            content: doc.content,
            metadata: {
              projectId: projectId || 'local',
              title: doc.title,
              type: doc.type,
              createdAt: doc.createdAt,
              tags: doc.tags
            }
          });
        }
      });
      
      // 按分数排序
      return results.sort((a, b) => b.score - a.score);
    }
  }

  async listDocuments(projectId?: string): Promise<KnowledgeDocument[]> {
    try {
      // 尝试使用后端API
      const result = await this.request('list', { projectId });
      return result.documents || [];
    } catch (error) {
      console.warn('Backend API failed, using local storage:', error);
      // 回退到本地存储
      return this.getLocalKnowledgeBase();
    }
  }

  // 批量导入文档
  async batchImport(documents: Partial<KnowledgeDocument>[], projectId?: string): Promise<{ success: boolean; imported: number }> {
    try {
      // 尝试使用后端API
      const result = await this.request('batchImport', { documents, projectId });
      return { success: true, imported: result.imported || documents.length };
    } catch (error) {
      console.warn('Backend API failed, using local storage:', error);
      // 回退到本地存储
      const existingDocuments = this.getLocalKnowledgeBase();
      let imported = 0;
      
      const updatedDocuments = [...existingDocuments];
      
      documents.forEach(doc => {
        const newId = doc.id || `local_${Date.now()}_${imported}`;
        const newDocument: KnowledgeDocument = {
          id: newId,
          title: doc.title || 'Untitled',
          content: doc.content || '',
          type: doc.type || 'text',
          embedding: doc.embedding,
          createdAt: doc.createdAt || new Date().toISOString(),
          tags: doc.tags,
          vectorized: doc.vectorized || false
        };
        
        const existingIndex = updatedDocuments.findIndex(d => d.id === newId);
        if (existingIndex >= 0) {
          updatedDocuments[existingIndex] = newDocument;
        } else {
          updatedDocuments.push(newDocument);
        }
        imported++;
      });
      
      this.saveLocalKnowledgeBase(updatedDocuments);
      return { success: true, imported };
    }
  }

  // 清空本地知识库
  async clearLocalKnowledgeBase(): Promise<void> {
    this.saveLocalKnowledgeBase([]);
  }

  // 导出本地知识库
  async exportLocalKnowledgeBase(): Promise<KnowledgeDocument[]> {
    return this.getLocalKnowledgeBase();
  }
}

export const knowledgeService = new KnowledgeService();
