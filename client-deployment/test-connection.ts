import { AIService } from './services/aiService';

async function testServerConnection() {
  console.log('=== 测试本地客户端与部署服务器的连接 ===\n');
  
  const aiService = new AIService();
  
  try {
    console.log('1. 测试基础连接...');
    console.log('   服务器地址: https://sora2.wboke.com');
    console.log('   本地客户端: http://localhost:3004\n');
    
    console.log('2. 测试 API 调用...');
    console.log('   API 端点: /api/zhipu');
    console.log('   代理配置: https://sora2.wboke.com\n');
    
    console.log('3. 测试 AI 响应...');
    const testMessage = '你好，这是一个测试消息';
    console.log(`   测试消息: ${testMessage}\n`);
    
    const response = await aiService.getSmartResponse(
      testMessage,
      [],
      'zhipu',
      '你是一个测试助手，请简短回复。',
      {
        stream: false,
        temperature: 0.7,
        maxTokens: 100
      }
    );
    
    console.log('4. 测试结果:');
    console.log('   ✅ 连接成功！');
    console.log(`   ✅ AI 响应: ${response}\n`);
    
    console.log('=== 测试完成 ===');
    console.log('本地客户端可以正常与部署的服务器通讯！\n');
    
    return true;
  } catch (error) {
    console.error('4. 测试结果:');
    console.error('   ❌ 连接失败！');
    console.error(`   ❌ 错误信息: ${error}\n`);
    
    console.log('=== 测试完成 ===');
    console.log('本地客户端无法与部署的服务器通讯。\n');
    
    return false;
  }
}

testServerConnection();
