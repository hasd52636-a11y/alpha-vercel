export enum ProjectStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISABLED = 'disabled'
}

export enum AIProvider {
  ZHIPU = 'zhipu',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic'
}

export enum KnowledgeType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio'
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  aiProvider: AIProvider;
  apiKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeItem {
  id: string;
  projectId: string;
  type: KnowledgeType;
  content: string;
  title: string;
  tags: string[];
  createdAt: string;
}

export interface QRCode {
  id: string;
  projectId: string;
  url: string;
  code: string;
  createdAt: string;
  expiresAt: string;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video';
}

export interface Ticket {
  id: string;
  projectId: string;
  userId: string;
  messages: Message[];
  status: 'open' | 'closed' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export interface ProductProject {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  aiProvider: AIProvider;
  apiKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectConfig {
  id: string;
  projectId: string;
  aiProvider: AIProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  createdAt: string;
  updatedAt: string;
}
