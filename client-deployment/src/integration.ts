// src/integration.ts - 项目主入口集成点
import { initializeOptimizer } from './optimization-main';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

class Smart008MainIntegration {
  static async integrate(): Promise<void> {
    console.log('🚀 开始集成智能优化系统到 smart008-main - 019');
    
    try {
      // 初始化优化系统
      const optimizer = await initializeOptimizer();
      
      // 检查集成状态
      const status = optimizer.getStatus();
      console.log('✅ 智能优化系统集成完成');
      console.log('当前状态:', JSON.stringify(status, null, 2));
      
      // 根据配置决定是否启用优化
      if (status.config.enabled) {
        console.log('🎯 优化功能已启用');
      } else {
        console.log('🛡️  优化功能当前禁用，运行监控模式');
      }
      
    } catch (error) {
      console.error('❌ 集成过程中发生错误:', error);
      // 即使集成失败，也要确保原有系统正常运行
      console.log('⚠️  继续运行原有系统...');
    }
  }
}

// 导出集成函数供主应用调用
export { Smart008MainIntegration };

// 如果直接运行此文件，则执行集成
if (require.main === module) {
  Smart008MainIntegration.integrate().catch(console.error);
}