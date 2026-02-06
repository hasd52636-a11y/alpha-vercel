import {
  Tool,
  ToolDefinition,
  ToolExecutionResult,
  ToolCategory,
  ImportedTool,
  ToolFormat,
  validateToolDefinition,
  convertToOpenAIFormat,
  TOOL_IMPORT_EXAMPLE
} from '../types/toolTypes';
import { logger } from '../utils/logger';

class ToolManager {
  private tools: Map<string, Tool> = new Map();
  private importedTools: Map<string, ImportedTool> = new Map();
  private executionHistory: Map<string, ToolExecutionResult[]> = new Map();
  private maxHistorySize: number = 100;

  constructor() {
    this.registerBuiltInTools();
    this.loadFromStorage();
  }

  private registerBuiltInTools() {
    this.tools.set('search_knowledge_base', this.createKnowledgeSearchTool());
    this.tools.set('get_project_info', this.createProjectInfoTool());
    this.tools.set('get_analytics_data', this.createAnalyticsTool());
    this.tools.set('export_data', this.createExportTool());
    this.tools.set('calculate', this.createCalculatorTool());
    this.tools.set('get_current_time', this.createTimeTool());
  }

  private createKnowledgeSearchTool(): Tool {
    return {
      id: 'search_knowledge_base',
      name: '知识库搜索',
      description: '在知识库中搜索相关信息',
      version: '1.0.0',
      category: 'search',
      parameters: {
        query: {
          type: 'string',
          description: '搜索查询关键词'
        },
        projectId: {
          type: 'string',
          description: '项目ID'
        },
        maxResults: {
          type: 'integer',
          description: '最大返回结果数'
        }
      },
      requiredParams: ['query'],
      executor: async (params) => {
        const startTime = Date.now();
        try {
          const projectService = await import('./projectService');
          const results = await projectService.searchKnowledge(params.query, params.projectId, params.maxResults || 5);
          return {
            success: true,
            result: results,
            executionTime: Date.now() - startTime
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : '搜索失败',
            executionTime: Date.now() - startTime
          };
        }
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['搜索', '知识库', 'RAG'],
        examples: ['搜索产品使用方法', '查找故障排除信息']
      }
    };
  }

  private createProjectInfoTool(): Tool {
    return {
      id: 'get_project_info',
      name: '获取项目信息',
      description: '获取指定项目的详细信息',
      version: '1.0.0',
      category: 'database',
      parameters: {
        projectId: {
          type: 'string',
          description: '项目唯一标识符'
        }
      },
      requiredParams: ['projectId'],
      executor: async (params) => {
        const startTime = Date.now();
        try {
          const projectService = await import('./projectService');
          const project = await projectService.getProjectById(params.projectId);
          return {
            success: true,
            result: project,
            executionTime: Date.now() - startTime
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : '获取项目信息失败',
            executionTime: Date.now() - startTime
          };
        }
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['项目', '信息', '数据库'],
        examples: ['获取项目配置', '查看项目状态']
      }
    };
  }

  private createAnalyticsTool(): Tool {
    return {
      id: 'get_analytics_data',
      name: '获取分析数据',
      description: '获取项目的分析统计数据',
      version: '1.0.0',
      category: 'analytics',
      parameters: {
        projectId: {
          type: 'string',
          description: '项目ID'
        },
        period: {
          type: 'string',
          enum: ['day', 'week', 'month', 'year'],
          description: '统计周期'
        }
      },
      requiredParams: ['projectId'],
      executor: async (params) => {
        const startTime = Date.now();
        try {
          const savedData = localStorage.getItem('smartguide_analytics');
          let analytics = savedData ? JSON.parse(savedData) : {};
          const projectData = analytics[params.projectId] || {};
          return {
            success: true,
            result: {
              projectId: params.projectId,
              period: params.period || 'week',
              data: projectData
            },
            executionTime: Date.now() - startTime
          };
        } catch (error) {
          return {
            success: false,
            error: '获取分析数据失败',
            executionTime: Date.now() - startTime
          };
        }
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['分析', '统计', '数据'],
        examples: ['查看本周访问量', '获取用户统计']
      }
    };
  }

  private createExportTool(): Tool {
    return {
      id: 'export_data',
      name: '导出数据',
      description: '导出项目数据到指定格式',
      version: '1.0.0',
      category: 'file',
      parameters: {
        projectId: {
          type: 'string',
          description: '要导出的项目ID'
        },
        format: {
          type: 'string',
          enum: ['json', 'csv', 'pdf'],
          description: '导出格式'
        }
      },
      requiredParams: ['projectId', 'format'],
      executor: async (params) => {
        const startTime = Date.now();
        try {
          const response = await fetch('/api/export/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: params.projectId,
              format: params.format || 'json'
            })
          });
          const data = await response.json();
          return {
            success: true,
            result: data,
            executionTime: Date.now() - startTime
          };
        } catch (error) {
          return {
            success: false,
            error: '导出失败',
            executionTime: Date.now() - startTime
          };
        }
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['导出', '下载', '文件'],
        examples: ['导出JSON数据', '导出CSV报表']
      }
    };
  }

  private createCalculatorTool(): Tool {
    return {
      id: 'calculate',
      name: '计算器',
      description: '执行数学计算',
      version: '1.0.0',
      category: 'utility',
      parameters: {
        expression: {
          type: 'string',
          description: '数学表达式'
        }
      },
      requiredParams: ['expression'],
      executor: async (params) => {
        const startTime = Date.now();
        try {
          const result = Function(`"use strict"; return (${params.expression})`)();
          return {
            success: true,
            result: { expression: params.expression, result },
            executionTime: Date.now() - startTime
          };
        } catch (error) {
          return {
            success: false,
            error: '计算表达式无效',
            executionTime: Date.now() - startTime
          };
        }
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['计算', '数学', '工具']
      }
    };
  }

  private createTimeTool(): Tool {
    return {
      id: 'get_current_time',
      name: '获取当前时间',
      description: '获取当前日期和时间',
      version: '1.0.0',
      category: 'utility',
      parameters: {
        timezone: {
          type: 'string',
          description: '时区（可选，默认本地时间）'
        }
      },
      requiredParams: [],
      executor: async (params) => {
        const startTime = Date.now();
        try {
          const now = new Date();
          return {
            success: true,
            result: {
              iso: now.toISOString(),
              local: now.toLocaleString('zh-CN'),
              timestamp: now.getTime(),
              timezone: params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            executionTime: Date.now() - startTime
          };
        } catch (error) {
          return {
            success: false,
            error: '获取时间失败',
            executionTime: Date.now() - startTime
          };
        }
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['时间', '日期', '工具']
      }
    };
  }

  async importTool(rawData: any, format: ToolFormat): Promise<{ success: boolean; tool?: ImportedTool; error?: string }> {
    try {
      let definition: ToolDefinition;
      
      switch (format) {
        case 'openai':
          const openaiValidation = validateToolDefinition(rawData);
          if (!openaiValidation.valid) {
            return { success: false, error: openaiValidation.errors.join(', ') };
          }
          definition = rawData;
          break;
          
        case 'langchain':
          definition = convertToOpenAIFormat(rawData);
          break;
          
        case 'anthropic':
          definition = this.convertAnthropicFormat(rawData);
          break;
          
        case 'mcp':
          definition = this.convertMCPFormat(rawData);
          break;
          
        case 'custom':
          definition = this.parseCustomFormat(rawData);
          break;
          
        default:
          return { success: false, error: `Unsupported format: ${format}` };
      }

      const toolId = `imported_${definition.function.name}_${Date.now()}`;
      const importedTool: ImportedTool = {
        id: toolId,
        format,
        rawData,
        parsedDefinition: definition,
        enabled: true
      };

      this.importedTools.set(toolId, importedTool);
      this.saveToStorage();
      
      logger.info(`Tool imported successfully: ${definition.function.name}`, { toolId, format });
      return { success: true, tool: importedTool };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      logger.error('Failed to import tool', { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  private convertAnthropicFormat(data: any): ToolDefinition {
    return {
      type: 'function',
      function: {
        name: data.name || data.tool_name,
        description: data.description || '',
        parameters: data.input_schema || {
          type: 'object',
          properties: {}
        }
      }
    };
  }

  private convertMCPFormat(data: any): ToolDefinition {
    return {
      type: 'function',
      function: {
        name: data.name,
        description: data.description || '',
        parameters: {
          type: 'object',
          properties: data.parameters || {}
        }
      }
    };
  }

  private parseCustomFormat(data: any): ToolDefinition {
    return {
      type: 'function',
      function: {
        name: data.name || data.function?.name,
        description: data.description || '',
        parameters: data.parameters || {
          type: 'object',
          properties: {}
        }
      }
    };
  }

  async executeTool(toolName: string, args: Record<string, any>): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    const builtInTool = this.tools.get(toolName);
    if (builtInTool) {
      const result = await builtInTool.executor(args);
      this.recordExecution(toolName, result);
      return result;
    }
    
    for (const [, importedTool] of this.importedTools) {
      if (importedTool.parsedDefinition.function.name === toolName && importedTool.enabled) {
        const result = await this.executeImportedTool(importedTool, args);
        this.recordExecution(toolName, result);
        return result;
      }
    }
    
    return {
      success: false,
      error: `Tool not found: ${toolName}`,
      executionTime: Date.now() - startTime
    };
  }

  private async executeImportedTool(tool: ImportedTool, args: Record<string, any>): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    if (tool.rawData.executor || tool.rawData.handler) {
      try {
        const executor = new Function('args', tool.rawData.executor || tool.rawData.handler);
        const result = await executor(args);
        return {
          success: true,
          result,
          executionTime: Date.now() - startTime
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Execution failed',
          executionTime: Date.now() - startTime
        };
      }
    }
    
    if (tool.rawData.endpoint) {
      try {
        const response = await fetch(tool.rawData.endpoint, {
          method: tool.rawData.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...tool.rawData.headers
          },
          body: tool.rawData.method !== 'GET' ? JSON.stringify(args) : undefined
        });
        const data = await response.json();
        return {
          success: true,
          result: data,
          executionTime: Date.now() - startTime
        };
      } catch (error) {
        return {
          success: false,
          error: 'API call failed',
          executionTime: Date.now() - startTime
        };
      }
    }
    
    return {
      success: false,
      error: 'No executor or endpoint defined',
      executionTime: Date.now() - startTime
    };
  }

  private recordExecution(toolName: string, result: ToolExecutionResult) {
    const history = this.executionHistory.get(toolName) || [];
    history.push(result);
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
    this.executionHistory.set(toolName, history);
  }

  getToolDefinitions(): ToolDefinition[] {
    const definitions: ToolDefinition[] = [];
    
    for (const tool of this.tools.values()) {
      definitions.push({
        type: 'function',
        function: {
          name: tool.id,
          description: tool.description,
          parameters: {
            type: 'object',
            properties: tool.parameters,
            required: tool.requiredParams
          }
        }
      });
    }
    
    for (const [, importedTool] of this.importedTools) {
      if (importedTool.enabled) {
        definitions.push(importedTool.parsedDefinition);
      }
    }
    
    return definitions;
  }

  getAllTools(): Array<{ id: string; name: string; description: string; category: ToolCategory; enabled: boolean; format?: ToolFormat }> {
    const tools: Array<{ id: string; name: string; description: string; category: ToolCategory; enabled: boolean; format?: ToolFormat }> = [];
    
    for (const tool of this.tools.values()) {
      tools.push({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        category: tool.category,
        enabled: true
      });
    }
    
    for (const [, importedTool] of this.importedTools) {
      tools.push({
        id: importedTool.id,
        name: importedTool.parsedDefinition.function.name,
        description: importedTool.parsedDefinition.function.description,
        category: 'custom' as ToolCategory,
        enabled: importedTool.enabled,
        format: importedTool.format
      });
    }
    
    return tools;
  }

  toggleTool(toolId: string, enabled: boolean): boolean {
    const builtInTool = this.tools.get(toolId);
    if (builtInTool) {
      return true;
    }
    
    const importedTool = this.importedTools.get(toolId);
    if (importedTool) {
      importedTool.enabled = enabled;
      this.saveToStorage();
      return true;
    }
    
    return false;
  }

  deleteTool(toolId: string): boolean {
    if (this.tools.has(toolId)) {
      return false;
    }
    
    if (this.importedTools.delete(toolId)) {
      this.saveToStorage();
      return true;
    }
    
    return false;
  }

  getToolExamples(format: ToolFormat): string {
    return JSON.stringify(TOOL_IMPORT_EXAMPLE[format] || TOOL_IMPORT_EXAMPLE.openai, null, 2);
  }

  private saveToStorage() {
    const exportedTools = Array.from(this.importedTools.values()).map(tool => ({
      ...tool,
      executor: undefined
    }));
    localStorage.setItem('smartguide_imported_tools', JSON.stringify(exportedTools));
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem('smartguide_imported_tools');
      if (saved) {
        const importedTools = JSON.parse(saved);
        for (const tool of importedTools) {
          this.importedTools.set(tool.id, tool);
        }
      }
    } catch (error) {
      logger.error('Failed to load imported tools', { error });
    }
  }

  getExecutionHistory(toolName?: string) {
    if (toolName) {
      return this.executionHistory.get(toolName) || [];
    }
    return Object.fromEntries(this.executionHistory);
  }
}

export const toolManager = new ToolManager();
export { ToolManager };
