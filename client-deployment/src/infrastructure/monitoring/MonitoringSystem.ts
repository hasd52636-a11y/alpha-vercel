// src/infrastructure/monitoring/MonitoringSystem.ts
interface HealthCheck {
  name: string;
  check(): Promise<HealthStatus>;
  onFailure?(): void;
}

interface HealthStatus {
  healthy: boolean;
  metrics: PerformanceMetrics;
  lastChecked: Date;
  error?: Error;
}

interface PerformanceMetrics {
  responseTime: number;
  errorRate: number;
  throughput: number;
  resourceUsage: {
    cpu: number;
    memory: number;
  };
}

class MonitoringSystem {
  private healthChecks: Map<string, HealthCheck> = new Map();
  private rollbackManager: RollbackManager;
  private alertService: AlertService;
  private config: any;

  constructor() {
    this.config = require('../../config/SafeConfig').SafeConfig.getInstance();
    this.rollbackManager = new RollbackManager();
    this.alertService = new AlertService();
    this.initializeCoreMonitoring();
  }

  registerHealthCheck(check: HealthCheck): void {
    this.healthChecks.set(check.name, check);
    console.log(`注册健康检查: ${check.name}`);
  }

  startMonitoring(): void {
    if (!this.config.getConfig().enabled) {
      console.log('监控系统已启动（仅监控模式）');
      return;
    }

    setInterval(async () => {
      await this.performSystemHealthCheck();
    }, parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'));
    
    setInterval(async () => {
      await this.performCriticalServiceCheck();
    }, 5000);
  }

  private async performSystemHealthCheck(): Promise<void> {
    const checkPromises = Array.from(this.healthChecks.entries())
      .map(async ([name, check]) => {
        try {
          const status = await check.check();
          if (!status.healthy) {
            console.warn(`健康检查失败: ${name}`, status.error);
            await this.handleUnhealthyService(name, check, status);
          }
          return { name, status };
        } catch (error) {
          console.error(`健康检查执行异常: ${name}`, error);
          return { name, status: { healthy: false, error: error as Error } };
        }
      });

    const results = await Promise.allSettled(checkPromises);
    this.processHealthResults(results);
  }

  private async handleUnhealthyService(
    serviceName: string, 
    check: HealthCheck, 
    status: HealthStatus
  ): Promise<void> {
    this.alertService.sendAlert({
      type: 'SERVICE_UNHEALTHY',
      service: serviceName,
      error: status.error,
      metrics: status.metrics
    });

    if (check.onFailure) {
      try {
        await check.onFailure();
      } catch (rollbackError) {
        console.error(`回退执行失败: ${serviceName}`, rollbackError);
        await this.rollbackManager.emergencyRollback(serviceName);
      }
    }
  }

  private initializeCoreMonitoring(): void {
    // 注册核心服务健康检查
    this.registerHealthCheck({
      name: 'cache-service',
      check: async () => {
        const cache = (global as any).cacheService;
        return {
          healthy: cache && typeof cache.get === 'function',
          metrics: { responseTime: 0, errorRate: 0, throughput: 0, resourceUsage: { cpu: 0, memory: 0 } },
          lastChecked: new Date()
        };
      }
    });

    this.registerHealthCheck({
      name: 'data-processor',
      check: async () => {
        const processor = (global as any).dataProcessor;
        return {
          healthy: processor && typeof processor.processData === 'function',
          metrics: { responseTime: 0, errorRate: 0, throughput: 0, resourceUsage: { cpu: 0, memory: 0 } },
          lastChecked: new Date()
        };
      }
    });
  }

  private processHealthResults(results: any[]): void {
    const failedChecks = results
      .filter(result => result.status === 'rejected' || !result.value?.status?.healthy)
      .map(result => result.value?.name || 'unknown');
    
    if (failedChecks.length > 0) {
      console.warn('健康检查发现问题:', failedChecks);
    }
  }

  private async performCriticalServiceCheck(): Promise<void> {
    // 快速检查关键服务
    const criticalServices = ['cache-service', 'data-processor'];
    for (const serviceName of criticalServices) {
      const check = this.healthChecks.get(serviceName);
      if (check) {
        try {
          const status = await check.check();
          if (!status.healthy) {
            console.error(`关键服务异常: ${serviceName}`);
          }
        } catch (error) {
          console.error(`关键服务检查失败: ${serviceName}`, error);
        }
      }
    }
  }
}

// 简单的回退管理器实现
class RollbackManager {
  async emergencyRollback(failedService?: string): Promise<void> {
    console.warn('执行紧急回退...');
    // 这里实现实际的回退逻辑
  }
}

// 简单的告警服务实现
class AlertService {
  sendAlert(alert: any): void {
    console.warn('告警:', alert);
    // 这里实现实际的告警逻辑
  }
}

export { MonitoringSystem, HealthCheck, HealthStatus, PerformanceMetrics };