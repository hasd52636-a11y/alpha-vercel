export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required: boolean;
  }>;
  execute: (params: Record<string, any>) => Promise<any>;
}

export class ToolManager {
  private tools: Record<string, Tool> = {};

  constructor() {
    this.registerDefaultTools();
  }

  private registerDefaultTools() {
    // 注册网络搜索工具
    this.registerTool({
      name: 'web_search',
      description: 'Search the web for current information',
      parameters: {
        query: {
          type: 'string',
          description: 'Search query',
          required: true
        },
        num_results: {
          type: 'number',
          description: 'Number of results to return',
          required: false
        }
      },
      execute: async (params) => {
        const { query, num_results = 3 } = params;
        // 这里可以集成真实的搜索 API
        return {
          results: Array(num_results).fill(0).map((_, i) => ({
            title: `Search result ${i + 1} for "${query}"`,
            snippet: `This is a sample search result for your query about "${query}"`,
            url: `https://example.com/search?q=${encodeURIComponent(query)}&result=${i + 1}`
          }))
        };
      }
    });

    // 注册计算器工具
    this.registerTool({
      name: 'calculator',
      description: 'Perform mathematical calculations',
      parameters: {
        expression: {
          type: 'string',
          description: 'Mathematical expression to evaluate',
          required: true
        }
      },
      execute: async (params) => {
        const { expression } = params;
        try {
          const result = eval(expression);
          return { result };
        } catch (error) {
          throw new Error('Invalid mathematical expression');
        }
      }
    });
  }

  registerTool(tool: Tool) {
    this.tools[tool.name] = tool;
    console.log(`Tool registered: ${tool.name}`);
  }

  getTool(name: string): Tool | null {
    return this.tools[name] || null;
  }

  getAllTools(): Tool[] {
    return Object.values(this.tools);
  }

  async executeTool(name: string, params: Record<string, any>): Promise<any> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    try {
      const startTime = Date.now();
      const result = await tool.execute(params);
      
      console.log(`Tool ${name} executed in ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      console.error(`Tool execution failed: ${name}`, error);
      throw error;
    }
  }

  selectToolForTask(task: string): string | null {
    const toolKeywords: Record<string, string[]> = {
      web_search: ['search', 'find', 'lookup', 'information', 'current', 'latest'],
      calculator: ['calculate', 'compute', 'math', 'equation', 'solve']
    };

    const taskLower = task.toLowerCase();
    
    for (const [toolName, keywords] of Object.entries(toolKeywords)) {
      if (keywords.some(keyword => taskLower.includes(keyword))) {
        return toolName;
      }
    }

    return null;
  }
}

export const toolManager = new ToolManager();