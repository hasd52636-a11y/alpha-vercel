import { createClient } from '@supabase/supabase-js';

export const runtimeConfig = {
  runtime: 'edge',
};

async function createEmbedding(text, apiKey) {
  try {
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
    return normalizeVector(data.data[0].embedding);
  } catch (error) {
    console.error('Embedding error:', error);
    throw error;
  }
}

function normalizeVector(vec) {
  const magnitude = Math.sqrt(vec.reduce((sum, a) => sum + a * a, 0));
  if (magnitude === 0) return vec;
  return vec.map(a => a / magnitude);
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
    const { action, document, query, projectId, apiKey } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Zhipu API key required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ 
        error: 'Supabase not configured',
        supabaseUrl: supabaseUrl ? 'set' : 'missing',
        supabaseKey: supabaseKey ? 'set' : 'missing'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const targetProjectId = projectId || 'global';

    if (action === 'upsert') {
      if (!document) {
        return new Response(JSON.stringify({ error: 'Document required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const embedding = await createEmbedding(document.content, apiKey);
      
      const { error } = await supabase.from('knowledge_vectors').upsert({
        id: document.id || `doc_${Date.now()}`,
        content: document.content,
        embedding: embedding,
        metadata: {
          projectId: targetProjectId,
          title: document.title || 'Untitled',
          type: document.type || 'text',
          createdAt: new Date().toISOString(),
          tags: document.tags || [],
        },
        project_id: targetProjectId,
      }, {
        onConflict: 'id'
      });

      if (error) {
        throw new Error(`Supabase upsert error: ${error.message}`);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        id: document.id || `doc_${Date.now()}`,
        message: 'Document vectorized and stored' 
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'search') {
      if (!query) {
        return new Response(JSON.stringify({ error: 'Query required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const queryEmbedding = await createEmbedding(query, apiKey);
      
      try {
        const { data, error } = await supabase.rpc('match_knowledge', {
          query_embedding: queryEmbedding,
          match_threshold: 0.1,
          match_count: 10,
          filter_project_id: targetProjectId
        });

        if (error) throw error;

        const results = (data || []).map(row => ({
          id: row.id,
          score: row.similarity,
          content: row.content,
          metadata: row.metadata,
        }));

        return new Response(JSON.stringify({ 
          success: true, 
          results,
          message: `Found ${results.length} documents`
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
            score: cosineSimilarity(queryEmbedding, doc.embedding),
            content: doc.content,
            metadata: doc.metadata,
          }))
          .filter(result => result.score > 0.1)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);

        return new Response(JSON.stringify({ 
          success: true, 
          results,
          message: `Found ${results.length} documents (fallback mode)`
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (action === 'delete') {
      const { id } = await req.json();
      if (!id) {
        return new Response(JSON.stringify({ error: 'Document ID required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase
        .from('knowledge_vectors')
        .delete()
        .eq('id', id)
        .eq('project_id', targetProjectId);

      if (error) {
        throw new Error(`Supabase delete error: ${error.message}`);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Document deleted' 
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list') {
      const { data, error } = await supabase
        .from('knowledge_vectors')
        .select('id, metadata, created_at, embedding')
        .eq('project_id', targetProjectId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Supabase list error: ${error.message}`);
      }

      const documents = (data || []).map(doc => ({
        id: doc.id,
        title: doc.metadata?.title || 'Untitled',
        type: doc.metadata?.type || 'text',
        createdAt: doc.metadata?.createdAt || doc.created_at,
        tags: doc.metadata?.tags || [],
        hasEmbedding: !!doc.embedding,
      }));

      return new Response(JSON.stringify({ 
        success: true, 
        documents,
        total: documents.length
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Deep Research - 深度研究功能
    if (action === 'deep_research') {
      if (!query) {
        return new Response(JSON.stringify({ error: 'Query required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 先检索相关知识库内容
      const queryEmbedding = await createEmbedding(query, apiKey);
      
      let contextDocs = [];
      try {
        const { data } = await supabase.rpc('match_knowledge', {
          query_embedding: queryEmbedding,
          match_threshold: 0.1,
          match_count: 10,
          filter_project_id: targetProjectId
        });
        contextDocs = data || [];
      } catch {
        const { data: allDocs } = await supabase
          .from('knowledge_vectors')
          .select('*')
          .eq('project_id', targetProjectId);

        contextDocs = (allDocs || [])
          .filter(doc => doc.embedding)
          .map(doc => ({
            id: doc.id,
            similarity: cosineSimilarity(queryEmbedding, doc.embedding),
            content: doc.content,
            metadata: doc.metadata,
          }))
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 10);
      }

      // 使用智谱API进行深度分析
      const context = contextDocs.map(doc => 
        `[相似度: ${(doc.similarity || doc.similarity || 0).toFixed(2)}]\n${doc.content}`
      ).join('\n\n---\n\n');

      const researchPrompt = `你是一个专业的研究分析师。请根据以下知识库资料，对用户提出的问题进行深入分析和研究。

知识库资料：
${context || '（暂无相关知识库资料）'}

用户问题：${query}

请进行深度分析研究：
1. 先分析问题的核心要点
2. 从知识库中提取相关信息
3. 进行综合分析和推理
4. 提供详细的研究结论
5. 如有不确定之处，明确指出

请用专业、详细的方式回答。`;

      const glmResponse = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'glm-4.7',
          messages: [
            { role: 'system', content: '你是一个专业的研究分析师，擅长深度分析和综合研究。' },
            { role: 'user', content: researchPrompt }
          ],
          temperature: 0.7,
          max_tokens: 4096,
          thinking: { type: 'enabled' }
        }),
      });

      if (!glmResponse.ok) {
        throw new Error(`GLM API error: ${glmResponse.status}`);
      }

      const glmData = await glmResponse.json();
      const analysis = glmData.choices?.[0]?.message?.content || '研究分析完成，未找到相关信息。';

      return new Response(JSON.stringify({ 
        success: true, 
        result: analysis,
        sources: contextDocs.map(doc => ({
          title: doc.metadata?.title || '未知来源',
          similarity: doc.similarity || doc.similarity || 0
        })),
        message: '深度研究完成'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Knowledge API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
