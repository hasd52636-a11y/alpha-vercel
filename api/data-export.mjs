import { createClient } from '@supabase/supabase-js';

export const runtimeConfig = {
  runtime: 'edge',
};

// 数据导出API密钥（建议在Vercel环境变量中设置）
const API_SECRET_KEY = process.env.DATA_EXPORT_SECRET_KEY || 'smartguide-secret-key';

async function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase not configured');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

async function createEmbedding(text, apiKey) {
  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'embedding-3',
      input: [text],
      dimensions: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  
  const magnitude = Math.sqrt(data.data[0].embedding.reduce((sum, a) => sum + a * a, 0));
  if (magnitude === 0) return data.data[0].embedding;
  return data.data[0].embedding.map(a => a / magnitude);
}

function cosineSimilarity(vec1, vec2) {
  if (vec1.length !== vec2.length || vec1.length === 0) return 0;
  const dotProduct = vec1.reduce((sum, a, i) => sum + a * vec2[i], 0);
  const magnitude1 = Math.sqrt(vec1.reduce((sum, a) => sum + a * a, 0));
  const magnitude2 = Math.sqrt(vec2.reduce((sum, a) => sum + a * a, 0));
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  return dotProduct / (magnitude1 * magnitude2);
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { secret_key, action, query, project_id } = await req.json();

    // 验证密钥
    if (secret_key !== API_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Invalid secret key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const zhipuApiKey = process.env.ZHIPU_API_KEY;
    if (!zhipuApiKey) {
      return new Response(JSON.stringify({ error: 'Zhipu API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = await createSupabaseClient();

    // 获取所有项目
    if (action === 'list_projects') {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      return new Response(JSON.stringify({
        success: true,
        projects: data || [],
        total: data?.length || 0
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 搜索知识库
    if (action === 'search_knowledge') {
      if (!query) {
        return new Response(JSON.stringify({ error: 'Query required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const queryEmbedding = await createEmbedding(query, zhipuApiKey);
      const targetProjectId = project_id || 'global';

      try {
        const { data, error } = await supabase.rpc('match_knowledge', {
          query_embedding: queryEmbedding,
          match_threshold: 0.1,
          match_count: 20,
          filter_project_id: targetProjectId
        });

        if (error) throw error;

        const results = (data || []).map(row => ({
          id: row.id,
          content: row.content,
          metadata: row.metadata,
          similarity: row.similarity
        }));

        return new Response(JSON.stringify({
          success: true,
          query,
          project_id: targetProjectId,
          results,
          total: results.length
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (rpcError) {
        console.error('RPC error, using fallback:', rpcError);
        
        const { data: allDocs, error: fetchError } = await supabase
          .from('knowledge_vectors')
          .select('*')
          .eq('project_id', targetProjectId);

        if (fetchError) {
          throw new Error(`Supabase fetch error: ${fetchError.message}`);
        }

        const results = (allDocs || [])
          .filter(doc => doc.embedding)
          .map(doc => ({
            id: doc.id,
            content: doc.content,
            metadata: doc.metadata,
            similarity: cosineSimilarity(queryEmbedding, doc.embedding)
          }))
          .filter(result => result.similarity > 0.1)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 20);

        return new Response(JSON.stringify({
          success: true,
          query,
          project_id: targetProjectId,
          results,
          total: results.length,
          mode: 'fallback'
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // 获取所有知识库
    if (action === 'list_knowledge') {
      const targetProjectId = project_id || 'global';

      const { data, error } = await supabase
        .from('knowledge_vectors')
        .select('id, content, metadata, created_at')
        .eq('project_id', targetProjectId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      const documents = (data || []).map(doc => ({
        id: doc.id,
        content: doc.content,
        metadata: doc.metadata,
        created_at: doc.created_at
      }));

      return new Response(JSON.stringify({
        success: true,
        project_id: targetProjectId,
        documents,
        total: documents.length
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 获取统计数据
    if (action === 'get_stats') {
      const { data: projectCount } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true });

      const { data: knowledgeCount } = await supabase
        .from('knowledge_vectors')
        .select('id', { count: 'exact', head: true });

      return new Response(JSON.stringify({
        success: true,
        stats: {
          total_projects: projectCount || 0,
          total_knowledge_documents: knowledgeCount || 0,
          exported_at: new Date().toISOString()
        }
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Data export API error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
