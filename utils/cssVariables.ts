/**
 * CSS 变量动态映射工具
 * 用于将 UICustomization 配置转换为 CSS 变量
 */

import { UICustomization } from '../types';

/**
 * 计算颜色的相对亮度 (WCAG 2.0)
 */
const getRelativeLuminance = (hexColor: string): number => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return 0.5;
  
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * 计算两个颜色的对比度
 */
const getContrastRatio = (color1: string, color2: string): number => {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * 将十六进制颜色转换为 RGB
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

/**
 * 调整颜色亮度以达到最小对比度
 */
const adjustColorForContrast = (foreground: string, background: string, minRatio: number = 4.5): string => {
  let contrast = getContrastRatio(foreground, background);
  let adjustedColor = foreground;
  
  if (contrast >= minRatio) {
    return foreground;
  }
  
  const bgRgb = hexToRgb(background);
  if (!bgRgb) return foreground;
  
  const fgRgb = hexToRgb(foreground);
  if (!fgRgb) return foreground;
  
  const isBgLight = getRelativeLuminance(background) > 0.5;
  
  let factor = 0.1;
  for (let i = 0; i < 10 && contrast < minRatio; i++) {
    const adjusted = isBgLight 
      ? { r: Math.max(0, fgRgb.r - factor * 255), g: Math.max(0, fgRgb.g - factor * 255), b: Math.max(0, fgRgb.b - factor * 255) }
      : { r: Math.min(255, fgRgb.r + factor * 255), g: Math.min(255, fgRgb.g + factor * 255), b: Math.min(255, fgRgb.b + factor * 255) };
    
    adjustedColor = rgbToHex(adjusted.r, adjusted.g, adjusted.b);
    contrast = getContrastRatio(adjustedColor, background);
    factor *= 1.5;
  }
  
  return adjustedColor;
};

/**
 * 将 RGB 转换为十六进制颜色
 */
const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

/**
 * 确保文本颜色与背景有足够对比度
 */
const ensureContrast = (textColor: string, backgroundColor: string, element: string): string => {
  const contrast = getContrastRatio(textColor, backgroundColor);
  if (contrast < 4.5) {
    const adjusted = adjustColorForContrast(textColor, backgroundColor, 4.5);
    return adjusted;
  }
  return textColor;
};

/**
 * 将 UICustomization 转换为 CSS 变量对象
 */
export const mapUICustomizationToCSSVariables = (uiCustomization?: UICustomization): React.CSSProperties => {
  if (!uiCustomization) {
    return getDefaultCSSVariables();
  }

  const backgroundColor = uiCustomization.backgroundColor || '#f8fafc';
  const primaryColor = uiCustomization.primaryColor || '#f59e0b';
  const textColor = uiCustomization.textColor || '#1e293b';
  const aiMessageBg = uiCustomization.aiMessageBg || '#ffffff';
  const userMessageBg = uiCustomization.userMessageBg || '#f59e0b';
  const inputBg = uiCustomization.inputBg || '#f1f5f9';

  const adjustedTextColor = ensureContrast(textColor, backgroundColor, 'text');
  const adjustedAiMessageText = ensureContrast(
    uiCustomization.aiMessageText || textColor, 
    aiMessageBg, 
    'ai-message-text'
  );
  const adjustedUserMessageText = ensureContrast(
    uiCustomization.userMessageText || '#ffffff', 
    userMessageBg, 
    'user-message-text'
  );
  const adjustedInputText = ensureContrast(
    uiCustomization.inputText || textColor, 
    inputBg, 
    'input-text'
  );

  const cssVars: Record<string, string> = {
    // 主色调
    '--primary-color': primaryColor,
    '--secondary-color': uiCustomization.secondaryColor || '#6366f1',
    '--text-color': adjustedTextColor,

    // 背景设置
    '--bg-main': backgroundColor,
    '--bg-opacity': uiCustomization.backgroundOpacity?.toString() || '1',

    // 对话框样式 - 确保对比度
    '--user-message-bg': userMessageBg,
    '--user-message-text': adjustedUserMessageText,
    '--ai-message-bg': aiMessageBg,
    '--ai-message-text': adjustedAiMessageText,
    '--message-border-radius': getBorderRadiusValue(uiCustomization.messageBorderRadius),

    // 输入框样式 - 确保对比度
    '--input-bg': inputBg,
    '--input-border': uiCustomization.inputBorder || '#e2e8f0',
    '--input-text': adjustedInputText,
    '--input-placeholder': uiCustomization.inputPlaceholder || adjustColorForContrast('#64748b', inputBg, 4.5),

    // 按钮样式
    '--button-primary': uiCustomization.buttonPrimary || primaryColor,
    '--button-secondary': uiCustomization.buttonSecondary || '#6b7280',
    '--button-text': ensureContrast(uiCustomization.buttonText || '#ffffff', primaryColor, 'button-text'),

    // 字体设置
    '--font-family': getFontFamilyValue(uiCustomization.fontFamily, uiCustomization.customFontUrl),
    '--font-size': getFontSizeValue(uiCustomization.fontSize),
    '--font-weight': uiCustomization.fontWeight || 'normal',

    // 头像设置
    '--user-avatar-bg': uiCustomization.userAvatar?.bgColor || primaryColor,
    '--user-avatar-text': ensureContrast(uiCustomization.userAvatar?.textColor || '#ffffff', primaryColor, 'user-avatar-text'),
    '--ai-avatar-bg': uiCustomization.aiAvatar?.bgColor || '#6366f1',
    '--ai-avatar-text': ensureContrast(uiCustomization.aiAvatar?.textColor || '#ffffff', '#6366f1', 'ai-avatar-text'),
  };

  // 处理背景渐变
  if (uiCustomization.backgroundType === 'gradient') {
    const gradient = uiCustomization.backgroundGradient;
    cssVars['--bg-gradient'] = `linear-gradient(${gradient.direction}, ${gradient.from}, ${gradient.to})`;
  }

  // 处理背景图片
  if (uiCustomization.backgroundType === 'image' && uiCustomization.backgroundImage) {
    cssVars['--bg-image'] = `url(${uiCustomization.backgroundImage})`;
  }

  return cssVars as React.CSSProperties;
};

/**
 * 获取默认 CSS 变量
 */
export const getDefaultCSSVariables = (): React.CSSProperties => {
  return {
    '--primary-color': '#f59e0b',
    '--secondary-color': '#6366f1',
    '--text-color': '#1e293b',
    '--bg-main': '#f8fafc',
    '--user-message-bg': '#f59e0b',
    '--user-message-text': '#ffffff',
    '--ai-message-bg': '#ffffff',
    '--ai-message-text': '#1e293b',
    '--message-border-radius': '12px',
    '--input-bg': '#f1f5f9',
    '--input-border': '#e2e8f0',
    '--input-text': '#1e293b',
    '--input-placeholder': '#64748b',
    '--button-primary': '#f59e0b',
    '--button-secondary': '#6b7280',
    '--button-text': '#ffffff',
    '--font-family': 'system-ui, -apple-system, sans-serif',
    '--font-size': '14px',
    '--font-weight': 'normal',
  } as React.CSSProperties;
};

/**
 * 获取边框圆角值
 */
const getBorderRadiusValue = (borderRadius?: string): string => {
  const radiusMap: Record<string, string> = {
    'none': '0px',
    'sm': '4px',
    'md': '8px',
    'lg': '12px',
    'xl': '16px',
    'full': '24px'
  };
  
  return radiusMap[borderRadius || 'md'] || '12px';
};

/**
 * 获取字体族值
 */
const getFontFamilyValue = (fontFamily?: string, customFontUrl?: string): string => {
  if (fontFamily === 'custom' && customFontUrl) {
    return `"CustomFont", system-ui, -apple-system, sans-serif`;
  }
  
  const fontMap: Record<string, string> = {
    'system': 'system-ui, -apple-system, sans-serif',
    'serif': 'Georgia, "Times New Roman", serif',
    'mono': '"SF Mono", Monaco, "Cascadia Code", monospace'
  };
  
  return fontMap[fontFamily || 'system'] || 'system-ui, -apple-system, sans-serif';
};

/**
 * 获取字体大小值
 */
const getFontSizeValue = (fontSize?: string): string => {
  const sizeMap: Record<string, string> = {
    'xs': '12px',
    'sm': '14px',
    'base': '16px',
    'lg': '18px',
    'xl': '20px'
  };
  
  return sizeMap[fontSize || 'sm'] || '14px';
};

/**
 * 应用 CSS 变量到文档根元素
 */
export const applyCSSVariablesToRoot = (variables: React.CSSProperties): void => {
  const root = document.documentElement;
  
  Object.entries(variables).forEach(([key, value]) => {
    if (typeof value === 'string') {
      root.style.setProperty(key, value);
    }
  });
};

/**
 * 移除文档根元素的 CSS 变量
 */
export const removeCSSVariablesFromRoot = (variableNames: string[]): void => {
  const root = document.documentElement;
  
  variableNames.forEach(name => {
    root.style.removeProperty(name);
  });
};