// src/setup/infrastructure.ts
import { MonitoringSystem } from '../infrastructure/monitoring/MonitoringSystem';
import { ServiceBackup } from '../infrastructure/backup/ServiceBackup';
import { SafeConfig } from '../config/SafeConfig';

class InfrastructureSetup {
  private static instance: InfrastructureSetup;
  private monitoring: MonitoringSystem;
  private backup: ServiceBackup;
  private config: SafeConfig;

  private constructor() {
    this.config = SafeConfig.getInstance();
  }

  static getInstance(): InfrastructureSetup {
    if (!InfrastructureSetup.instance) {
      InfrastructureSetup.instance = new InfrastructureSetup();
    }
    return InfrastructureSetup.instance;
  }

  async deploy(): Promise<boolean> {
    console.log('开始部署基础设施...');
    
    try {
      // 1. 初始化监控系统
      await this.initializeMonitoring();
      
      // 2. 创建服务备份
      await this.createServiceBackups();
      
      // 3. 启动监控
      this.startMonitoring();
      
      console.log('基础设施部署完成');
      return true;
      
    } catch (error) {
      console.error('基础设施部署失败:', error);
      return false;
    }
  }

  private async initializeMonitoring(): Promise<void> {
    this.monitoring = new MonitoringSystem();
    console.log('监控系统初始化完成');
  }

  private async createServiceBackups(): Promise<void> {
    this.backup = new ServiceBackup();
    await this.backup.backupAllServices();
    console.log('服务备份创建完成');
  }

  private startMonitoring(): void {
    this.monitoring.startMonitoring();
    console.log('监控系统已启动');
  }

  async emergencyRollback(): Promise<void> {
    if (this.backup) {
      await this.backup.emergencyRollback();
    }
  }

  getMonitoring(): MonitoringSystem {
    return this.monitoring;
  }

  getBackup(): ServiceBackup {
    return this.backup;
  }
}

// 部署函数
async function deployInfrastructure(): Promise<boolean> {
  const setup = InfrastructureSetup.getInstance();
  return await setup.deploy();
}

// 紧急回退函数
async function emergencyRollback(): Promise<void> {
  const setup = InfrastructureSetup.getInstance();
  await setup.emergencyRollback();
}

export { deployInfrastructure, emergencyRollback, InfrastructureSetup };