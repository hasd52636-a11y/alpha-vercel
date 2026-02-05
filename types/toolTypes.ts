export interface ToolParameter {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  properties?: Record<string, ToolParameter>;
  items?: ToolParameter;
  required?: string[];
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, ToolParameter>;
      required?: string[];
    };
  };
}

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  category: ToolCategory;
  parameters: Record<string, ToolParameter>;
  requiredParams: string[];
  executor: (params: Record<string, any>) => Promise<ToolExecutionResult>;
  metadata: ToolMetadata;
}

export interface ToolMetadata {
  createdAt: string;
  updatedAt: string;
  tags: string[];
  examples?: string[];
  limitations?: string[];
  requiresAuth?: boolean;
  rateLimit?: {
    requests: number;
    window: number; // seconds
  };
}

export type ToolCategory = 
  | 'search'
  | 'database'
  | 'api'
  | 'file'
  | 'analytics'
  | 'communication'
  | 'utility'
  | 'custom';

export interface ImportedTool {
  id: string;
  format: ToolFormat;
  rawData: any;
  parsedDefinition: ToolDefinition;
  enabled: boolean;
  config?: Record<string, any>;
}

export type ToolFormat = 
  | 'openai'      // OpenAI Tool Schema
  | 'langchain'   // LangChain Tool Format
  | 'anthropic'   // Anthropic Claude Tool Format
  | 'mcp'         // Model Context Protocol
  | 'custom';     // Custom JSON format

export const OPENAI_TOOL_SCHEMA: ToolDefinition = {
  type: 'function',
  function: {
    name: '',
    description: '',
    parameters: {
      type: 'object',
      properties: {}
    }
  }
};

export const LANCHAIN_TOOL_SCHEMA = {
  type: 'tool',
  name: '',
  description: '',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  }
};

export const TOOL_IMPORT_EXAMPLE = {
  openai: {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City name'
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'Temperature unit'
          }
        },
        required: ['location']
      }
    }
  },
  langchain: {
    type: 'tool',
    name: 'get_weather',
    description: 'Get current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City name'
        }
      },
      required: ['location']
    }
  },
  custom: {
    id: 'weather_tool',
    name: '天气查询工具',
    description: '查询指定城市的天气信息',
    version: '1.0.0',
    category: 'utility',
    parameters: {
      city: {
        type: 'string',
        description: '城市名称'
      }
    },
    requiredParams: ['city'],
    endpoint: 'https://api.weather.example.com',
    method: 'GET'
  }
};

export function validateToolDefinition(definition: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!definition.type || definition.type !== 'function') {
    errors.push('Missing or invalid "type" field (must be "function")');
  }
  
  if (!definition.function?.name) {
    errors.push('Missing "function.name"');
  }
  
  if (!definition.function?.description) {
    errors.push('Missing "function.description"');
  }
  
  if (!definition.function?.parameters) {
    errors.push('Missing "function.parameters"');
  } else if (definition.function.parameters.type !== 'object') {
    errors.push('Parameters must be of type "object"');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function convertToOpenAIFormat(tool: any): ToolDefinition {
  if (tool.type === 'function') {
    return tool;
  }
  
  if (tool.type === 'tool') {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters || {
          type: 'object',
          properties: {}
        }
      }
    };
  }
  
  return OPENAI_TOOL_SCHEMA;
}
