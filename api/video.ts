// Vercel Edge Function for video generation API
export const config = {
  runtime: 'edge', // 使用边缘函数，全球访问速度最快
};

export default async function handler(req) {
  try {
    if (req.method === 'POST') {
      return await handleVideoGeneration(req);
    } else if (req.method === 'GET') {
      return await handleVideoStatus(req);
    } else {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Video API Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 处理视频生成请求
async function handleVideoGeneration(req) {
  const { prompt, duration = 10, resolution = '720p', model = 'cogvideox-3' } = await req.json();

  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Prompt is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const startTime = Date.now();
    
    // 调用 CogVideoX-3 API
    const response = await fetch('https://open.bigmodel.cn/api/mt/cogvideox-3/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        prompt,
        duration,
        resolution,
        model
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('CogVideoX-3 API Error:', response.status, errorData);
      return new Response(JSON.stringify({ error: errorData.error || 'Video generation failed' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    
    console.log('Video generation completed in', Date.now() - startTime, 'ms');

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Video generation error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate video' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 处理视频状态查询
async function handleVideoStatus(req) {
  const url = new URL(req.url);
  const taskId = url.searchParams.get('task_id');

  if (!taskId) {
    return new Response(JSON.stringify({ error: 'Task ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response = await fetch(`https://open.bigmodel.cn/api/mt/cogvideox-3/v1/status?task_id=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('CogVideoX-3 status error:', response.status, errorData);
      return new Response(JSON.stringify({ error: errorData.error || 'Failed to get video status' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Video status error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get video status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}