// Vercel Edge Function for data export API
export const config = {
  runtime: 'edge', // 使用边缘函数
};

// 注意：在真实的部署环境中，您需要使用持久化存储（如数据库）来存储API密钥
// 以下内存存储仅适用于演示目的，在实际部署时会因无状态特性而失效
// 这里我们使用全局变量来模拟存储（在Vercel边缘函数中仍然有限制）
if (!global.apiKeys) {
  global.apiKeys = new Map();
}
if (!global.exportTokens) {
  global.exportTokens = new Map();
}

const apiKeys = global.apiKeys;
const exportTokens = global.exportTokens;

// 生成安全的API密钥
function generateApiKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 生成唯一的导出链接
function generateExportToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 验证API密钥
function validateApiKey(apiKey) {
  const keyData = apiKeys.get(apiKey);
  if (!keyData) {
    return false;
  }
  // 检查密钥是否过期（有效期一年）
  const now = new Date();
  if (now > keyData.expiresAt) {
    apiKeys.delete(apiKey);
    return false;
  }
  return true;
}

// 验证导出令牌
function validateExportToken(token) {
  const tokenData = exportTokens.get(token);
  if (!tokenData) {
    return false;
  }
  // 检查令牌是否过期（有效期一年）
  const now = new Date();
  if (now > tokenData.expiresAt) {
    exportTokens.delete(token);
    return false;
  }
  return true;
}

export default async function handler(req) {
  // 解析URL和路径
  const url = new URL(req.url);
  const path = url.pathname;
  
  // 在边缘函数中，我们不能依赖服务导入，所以使用简化的数据结构
  
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Api-Key',
      }
    });
  }

  // 设置CORS头
  const corsHeaders = {
    'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Api-Key',
  };

  try {
    if (req.method === 'POST' && path.endsWith('/generate-key')) {
      // 生成新的API密钥和导出链接
      let requestBody;
      try {
        requestBody = await req.json();
      } catch (parseError) {
        console.error('Error parsing request body:', parseError);
        return new Response(
          JSON.stringify({ error: { message: 'Invalid JSON in request body' } }), 
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      const { projectId } = requestBody;
      
      if (!projectId) {
        return new Response(
          JSON.stringify({ error: { message: 'Missing projectId' } }), 
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // 在真实环境中，您需要验证项目是否存在
      // 为演示目的，我们接受特殊的全局ID
      // 为了避免边缘函数中的服务导入问题，暂时跳过验证
      // 实际部署时，可根据需要启用验证
      /*
      if (projectId !== 'global-analytics') {
        try {
          const { projectService } = await import('../../services/projectService');
          // 验证项目是否存在（对于全局分析数据，允许特殊ID）
          const validation = await projectService.validateProjectId(projectId);
          if (!validation.valid) {
            return new Response(
              JSON.stringify({ error: { message: 'Project not found' } }), 
              { 
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
        } catch (validationError) {
          console.error('Project validation error:', validationError);
          return new Response(
            JSON.stringify({ error: { message: 'Validation service unavailable' } }), 
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          );
        }
      }
      */

      // 生成API密钥
      const apiKey = generateApiKey();
      const exportToken = generateExportToken();
      
      const now = new Date();
      const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 一年后
      
      // 存储API密钥和导出令牌
      apiKeys.set(apiKey, {
        projectId,
        expiresAt: oneYearFromNow,
        createdAt: now
      });
      
      exportTokens.set(exportToken, {
        projectId,
        apiKey,
        expiresAt: oneYearFromNow,
        createdAt: now
      });

      // 构建导出链接
      const exportUrl = `${req.headers.get('origin') || 'http://localhost:3000'}/api/export/data/download?token=${exportToken}`;
      
      return new Response(
        JSON.stringify({
          success: true,
          apiKey: apiKey,
          exportUrl: exportUrl,
          expiresAt: oneYearFromNow.toISOString(),
          createdAt: now.toISOString()
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
      
    } else if (req.method === 'GET' && path.includes('/download')) {
      // 下载导出数据
      const token = url.searchParams.get('token');
      
      if (!token) {
        return new Response(
          JSON.stringify({ error: { message: 'Missing token' } }), 
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      if (!validateExportToken(token)) {
        return new Response(
          JSON.stringify({ error: { message: 'Invalid or expired token' } }), 
          { 
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      const tokenData = exportTokens.get(token);
      const apiKeyData = apiKeys.get(tokenData.apiKey);
      
      // 创建完整的导出数据（避免边缘函数中的服务导入问题）
      // 在实际部署中，可以从数据库或其他持久化存储中获取完整数据
      
      // 获取用户设备和浏览器信息（从请求头中获取）
      const userAgent = req.headers.get('user-agent') || 'Unknown';
      const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'Unknown';
      const origin = req.headers.get('origin') || req.headers.get('referer') || 'Direct Access';
      
      // 创建完整的导出数据
      const exportData = {
        // 项目信息
        project: {
          id: tokenData.projectId,
          name: tokenData.projectId === 'global-analytics' ? 'Global Analytics Data' : 'Project Data',
          description: 'Exported analytics and project data',
          config: {},
          knowledgeBase: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },

        // 项目配置
        config: {},

        // 知识库
        knowledgeBase: [],

        // 链接使用统计（模拟数据）
        linkStats: {
          totalGenerated: 10,
          totalUsed: 5,
          activeLinks: 3
        },

        // 所有链接信息（空数组或模拟数据）
        allLinks: [],

        // 分析数据（模拟数据）
        analytics: {
          uniqueUsers: 0,
          avgHelpTime: 0,
          csatScore: 0,
          bypassRate: 0,
          serviceTypeData: [],
          issueDistribution: [
            { name: 'Installation', value: 0 },
            { name: 'WIFI Setup', value: 0 },
            { name: 'Hardware', value: 0 },
            { name: 'Others', value: 0 },
          ],
          // 如果有对话历史或其他交互数据，也会包含在这里
          interactions: []
        },

        // 用户设备和环境信息
        environment: {
          userAgent: userAgent,
          ipAddress: ipAddress,
          origin: origin,
          timestamp: new Date().toISOString()
        },

        // 生成时间戳
        exportedAt: new Date().toISOString(),

        // 数据导出版本
        exportVersion: '1.0',

        // API密钥信息（不含敏感信息）
        apiKeyInfo: {
          createdAt: apiKeyData.createdAt.toISOString(),
          expiresAt: apiKeyData.expiresAt.toISOString()
        }
      };

      // 设置下载响应头
      const responseHeaders = {
        ...corsHeaders,
        'Content-Disposition': `attachment; filename="project_data_export_${tokenData.projectId}_${Date.now()}.json"`,
        'Content-Type': 'application/json',
      };
      
      return new Response(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: responseHeaders
      });
      
    } else if (req.method === 'GET' && path.endsWith('/validate')) {
      // 验证API密钥
      const apiKey = req.headers.get('Api-Key');
      
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: { message: 'Missing Api-Key header' } }), 
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      if (validateApiKey(apiKey)) {
        const keyData = apiKeys.get(apiKey);
        return new Response(
          JSON.stringify({
            valid: true,
            projectId: keyData.projectId,
            expiresAt: keyData.expiresAt.toISOString(),
            createdAt: keyData.createdAt.toISOString()
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } else {
        return new Response(
          JSON.stringify({ 
            valid: false,
            error: { message: 'Invalid or expired API key' } 
          }), 
          { 
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: { message: 'Method not allowed' } }), 
        { 
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Export API Error:', error);
    return new Response(
      JSON.stringify({ error: { message: 'Internal server error', details: error.message } }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}