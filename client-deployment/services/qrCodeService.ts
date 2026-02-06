// 二维码生成服务
class QRCodeService {
  private static instance: QRCodeService;
  private baseUrl: string = 'https://api.qrserver.com/v1/create-qr-code/';

  private constructor() {
    // 初始化配置
  }

  public static getInstance(): QRCodeService {
    if (!QRCodeService.instance) {
      QRCodeService.instance = new QRCodeService();
    }
    return QRCodeService.instance;
  }

  // 生成二维码图片URL
  generateQRCodeUrl(data: string, options?: {
    size?: number;
    margin?: number;
    color?: string;
    bgColor?: string;
  }): string {
    const defaultOptions = {
      size: 256,
      margin: 1,
      color: '000000',
      bgColor: 'FFFFFF'
    };

    const mergedOptions = { ...defaultOptions, ...options };

    const params = new URLSearchParams({
      size: `${mergedOptions.size}x${mergedOptions.size}`,
      margin: mergedOptions.margin.toString(),
      color: mergedOptions.color,
      bgcolor: mergedOptions.bgColor,
      data: data
    });

    return `${this.baseUrl}?${params.toString()}`;
  }

  // 生成项目二维码
  generateProjectQRCode(projectId: string, link: string): string {
    return this.generateQRCodeUrl(link, {
      size: 300,
      margin: 2,
      color: '7c3aed', // 紫色
      bgColor: 'FFFFFF'
    });
  }

  // 批量生成二维码
  generateBatchQRCode(links: string[]): string[] {
    return links.map(link => this.generateQRCodeUrl(link));
  }

  // 验证二维码数据
  validateQRCodeData(data: string): boolean {
    // 检查数据是否是有效的URL
    try {
      new URL(data);
      return true;
    } catch {
      return false;
    }
  }

  // 解析二维码数据
  parseQRCodeData(data: string): {
    valid: boolean;
    url?: URL;
    projectId?: string;
  } {
    try {
      const url = new URL(data);
      const projectId = url.searchParams.get('pid');
      
      return {
        valid: true,
        url,
        projectId
      };
    } catch {
      return {
        valid: false
      };
    }
  }
}

// 导出单例实例
export const qrCodeService = QRCodeService.getInstance();
