// src/config/SafeConfig.ts
interface OptimizationConfig {
  enabled: boolean;
  safetyChecks: boolean;
  rollbackOnFailure: boolean;
  performanceThreshold: number;
  compatibilityMode: boolean;
  optimizationLevel: 'conservative' | 'balanced' | 'aggressive';
}

class SafeConfig {
  private static instance: SafeConfig;
  private config: OptimizationConfig;
  private environment: 'development' | 'production' | 'testing';

  private constructor() {
    this.environment = this.detectEnvironment();
    this.config = this.loadConfiguration();
  }

  static getInstance(): SafeConfig {
    if (!SafeConfig.instance) {
      SafeConfig.instance = new SafeConfig();
    }
    return SafeConfig.instance;
  }

  getConfig(): OptimizationConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<OptimizationConfig>): boolean {
    const oldConfig = { ...this.config };
    const newConfig = { ...this.config, ...updates };
    
    if (!this.validateConfigChange(oldConfig, newConfig)) {
      console.warn('配置变更验证失败，拒绝更新');
      return false;
    }
    
    this.config = newConfig;
    console.log('配置更新成功:', updates);
    return true;
  }

  isOptimizationSafe(): boolean {
    if (this.environment === 'production') {
      return this.config.safetyChecks && 
             this.config.rollbackOnFailure && 
             this.config.performanceThreshold > 0;
    }
    return true;
  }

  private loadConfiguration(): OptimizationConfig {
    return {
      enabled: process.env.ENABLE_OPTIMIZATION === 'true',
      safetyChecks: process.env.SAFETY_CHECKS !== 'false',
      rollbackOnFailure: process.env.ROLLBACK_ON_FAILURE !== 'false',
      performanceThreshold: parseFloat(process.env.PERFORMANCE_THRESHOLD || '0.8'),
      compatibilityMode: process.env.COMPATIBILITY_MODE === 'true',
      optimizationLevel: (process.env.OPTIMIZATION_LEVEL as any) || 'conservative'
    };
  }

  private detectEnvironment(): 'development' | 'production' | 'testing' {
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'production') return 'production';
    if (nodeEnv === 'test') return 'testing';
    return 'development';
  }

  private validateConfigChange(
    oldConfig: OptimizationConfig, 
    newConfig: OptimizationConfig
  ): boolean {
    if (oldConfig.safetyChecks && !newConfig.safetyChecks) {
      console.error('禁止禁用安全检查');
      return false;
    }
    
    if (oldConfig.rollbackOnFailure && !newConfig.rollbackOnFailure) {
      console.error('禁止禁用自动回退');
      return false;
    }
    
    return true;
  }
}

export { SafeConfig, OptimizationConfig };