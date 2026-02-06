import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MessageSquare, Phone, Mail, QrCode, Settings, User, Home, LogOut, ChevronRight, CheckCircle, AlertCircle, Info, Menu, X, ExternalLink, Mic, Image, Video, Send } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { AIService } from '../services/aiService';

// 类型定义
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  verified: boolean;
}

// 主应用组件
const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

// 首页组件
const HomePage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-4xl">
        <div className="alpha-card p-12 text-center">
          <div className="mb-8">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-600 to-purple-400 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
              <MessageSquare className="w-16 h-16 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-purple-400 mb-4">
            阿尔法01
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            智能产品客服系统，圆润设计，立体有层次毛玻璃有光泽质感
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="alpha-btn text-lg py-4">
              开始使用
            </button>
            <button className="bg-white border border-purple-200 text-purple-600 px-8 py-4 rounded-xl font-semibold hover:bg-purple-50 transition-all">
              了解更多
            </button>
          </div>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<QrCode className="w-8 h-8 text-purple-500" />}
              title="扫码验证"
              description="用户扫码后验证身份，确保服务安全性"
            />
            <FeatureCard 
              icon={<MessageSquare className="w-8 h-8 text-purple-500" />}
              title="智能对话"
              description="基于知识库和历史记录解决日常问题"
            />
            <FeatureCard 
              icon={<Settings className="w-8 h-8 text-purple-500" />}
              title="自动化优化"
              description="自动执行流程并持续迭代优化系统"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// 功能卡片组件
const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => {
  return (
    <div className="alpha-card p-6 hover:scale-105 transition-transform">
      <div className="mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-gray-800">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

// 验证页面组件
const VerifyPage: React.FC = () => {
  const [verificationMethod, setVerificationMethod] = useState<'phone' | 'email'>('phone');
  const [inputValue, setInputValue] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // 模拟商家数据库/知识库
  const mockMerchantDatabase = {
    phones: ['13800138000', '13900139000', '13700137000'],
    emails: ['customer@example.com', 'user@test.com', 'support@company.com']
  };

  // 验证用户身份
  const verifyUserIdentity = async (value: string, method: 'phone' | 'email'): Promise<boolean> => {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 检查用户是否在商家数据库中
    if (method === 'phone') {
      return mockMerchantDatabase.phones.includes(value);
    } else {
      return mockMerchantDatabase.emails.includes(value);
    }
  };

  const handleVerify = async () => {
    if (!inputValue) return;
    
    setIsVerifying(true);
    setVerificationStatus('idle');
    setErrorMessage('');
    
    try {
      // 验证用户身份
      const isVerified = await verifyUserIdentity(inputValue, verificationMethod);
      
      if (isVerified) {
        setVerificationStatus('success');
        // 验证成功后跳转到聊天页面
        setTimeout(() => {
          window.location.href = '/chat';
        }, 1500);
      } else {
        setVerificationStatus('error');
        setErrorMessage('您的联系方式未在商家数据库中找到，请检查输入信息');
      }
    } catch (error) {
      setVerificationStatus('error');
      setErrorMessage('验证过程中发生错误，请稍后重试');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="alpha-card p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">身份验证</h2>
            <p className="text-gray-600">请输入您的联系方式进行验证</p>
          </div>
          
          <div className="mb-6 flex rounded-xl overflow-hidden border border-purple-200">
            <button 
              className={`flex-1 py-3 px-4 font-medium transition-colors ${verificationMethod === 'phone' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-purple-50'}`}
              onClick={() => setVerificationMethod('phone')}
            >
              <Phone className="inline-block w-4 h-4 mr-2" />
              手机号
            </button>
            <button 
              className={`flex-1 py-3 px-4 font-medium transition-colors ${verificationMethod === 'email' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-purple-50'}`}
              onClick={() => setVerificationMethod('email')}
            >
              <Mail className="inline-block w-4 h-4 mr-2" />
              邮箱
            </button>
          </div>
          
          <div className="mb-6">
            <input
              type={verificationMethod === 'phone' ? 'tel' : 'email'}
              placeholder={verificationMethod === 'phone' ? '请输入手机号' : '请输入邮箱'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={handleVerify}
            disabled={isVerifying || !inputValue}
            className="alpha-btn w-full py-3 flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                验证中...
              </>
            ) : (
              <>
                验证身份
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
          
          {verificationStatus === 'success' && (
            <div className="mt-4 alpha-status success">
              <CheckCircle className="w-4 h-4" />
              验证成功！正在跳转...
            </div>
          )}
          
          {verificationStatus === 'error' && (
            <div className="mt-4 alpha-status error">
              <AlertCircle className="w-4 h-4" />
              {errorMessage || '验证失败，请检查输入信息'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 聊天页面组件
const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiServiceRef = useRef<AIService | null>(null);
  const messageCacheRef = useRef<Map<string, string>>(new Map());
  
  // 初始化AI服务实例（使用useRef避免重复创建）
  useEffect(() => {
    if (!aiServiceRef.current) {
      aiServiceRef.current = new AIService();
    }
  }, []);
  
  // 获取AI服务实例
  const getAiService = (): AIService => {
    if (!aiServiceRef.current) {
      aiServiceRef.current = new AIService();
    }
    return aiServiceRef.current;
  };

  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 处理发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || isSending || isLoading) return;

    const trimmedInput = inputValue.trim();
    
    // 检查消息缓存
    const cachedResponse = messageCacheRef.current.get(trimmedInput);
    if (cachedResponse) {
      // 使用缓存的回复
      const newMessage: Message = {
        id: uuidv4(),
        content: trimmedInput,
        role: 'user',
        timestamp: new Date(),
        status: 'sent'
      };

      setMessages(prev => [...prev, newMessage]);
      setInputValue('');
      setIsSending(true);

      // 添加缓存的回复
      setTimeout(() => {
        const assistantMessage: Message = {
          id: uuidv4(),
          content: cachedResponse,
          role: 'assistant',
          timestamp: new Date(),
          status: 'sent'
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsSending(false);
      }, 500);
      return;
    }

    const newMessage: Message = {
      id: uuidv4(),
      content: trimmedInput,
      role: 'user',
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setIsSending(true);

    // 更新消息状态为已发送
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg
      ));

      // 调用AI服务获取回复
      const handleAIResponse = async () => {
        try {
          setIsLoading(true);
          // 流式获取AI回复
          let assistantMessageId = uuidv4();
          let assistantMessageContent = '';
          
          // 添加一个初始的助手消息（加载中状态）
          setMessages(prev => [...prev, {
            id: assistantMessageId,
            content: '',
            role: 'assistant',
            timestamp: new Date(),
            status: 'sending'
          }]);

          // 调用AI服务的流式接口
          await getAiService().getSmartResponse(
            trimmedInput,
            [], // 知识库为空，实际应用中应传入真实的知识库数据
            'zhipu', // 智谱AI提供商
            '你是阿尔法01，一个智能产品客服系统。请使用专业、友好的语言回答用户问题。',
            {
              stream: true,
              callback: (chunk, isDone) => {
                if (chunk) {
                  assistantMessageContent += chunk;
                  // 更新助手消息内容
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: assistantMessageContent }
                      : msg
                  ));
                }
                if (isDone) {
                  // 缓存回复
                  messageCacheRef.current.set(trimmedInput, assistantMessageContent);
                  // 更新助手消息状态为已发送
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, status: 'sent' }
                      : msg
                  ));
                  setIsSending(false);
                  setIsLoading(false);
                }
              },
              temperature: 0.7,
              maxTokens: 1024
            }
          );
        } catch (error) {
          console.error('AI服务调用失败:', error);
          // 错误处理：添加错误消息
          const errorMessage: Message = {
            id: uuidv4(),
            content: '抱歉，AI服务暂时无法响应，请稍后重试。',
            role: 'assistant',
            timestamp: new Date(),
            status: 'error'
          };
          setMessages(prev => [...prev, errorMessage]);
          setIsSending(false);
          setIsLoading(false);
        }
      };

      handleAIResponse();
    }, 300); // 减少延迟，提升响应速度
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 处理语音输入
  const handleVoiceInput = async () => {
    try {
      // 检查浏览器是否支持语音识别
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('您的浏览器不支持语音识别功能');
        return;
      }

      // 创建语音识别实例
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.continuous = false;
      recognition.interimResults = false;

      // 添加语音输入消息
      const voiceMessageId = uuidv4();
      setMessages(prev => [...prev, {
        id: voiceMessageId,
        content: '正在语音输入...',
        role: 'user',
        timestamp: new Date(),
        status: 'sending'
      }]);

      // 语音识别结果
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        
        // 更新消息内容
        setMessages(prev => prev.map(msg => 
          msg.id === voiceMessageId ? { ...msg, content: transcript, status: 'sent' } : msg
        ));
      };

      // 语音识别结束
      recognition.onend = () => {
        // 自动发送消息
        if (inputValue.trim()) {
          handleSend();
        }
      };

      // 语音识别错误
      recognition.onerror = (event: any) => {
        console.error('语音识别错误:', event.error);
        setMessages(prev => prev.map(msg => 
          msg.id === voiceMessageId ? { ...msg, content: '语音识别失败，请重试', status: 'error' } : msg
        ));
      };

      // 开始语音识别
      recognition.start();
    } catch (error) {
      console.error('语音输入失败:', error);
      alert('语音输入失败，请重试');
    }
  };

  // 处理图片上传
  const handleImageUpload = () => {
    // 创建隐藏的文件输入
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    // 处理文件选择
    fileInput.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        const file = target.files[0];
        
        // 读取文件并转换为base64
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64Image = event.target?.result as string;
          
          // 添加图片消息
          const imageMessageId = uuidv4();
          setMessages(prev => [...prev, {
            id: imageMessageId,
            content: `[图片]`,
            role: 'user',
            timestamp: new Date(),
            status: 'sending'
          }]);

          // 调用AI服务分析图片
          try {
            const analysisResult = await getAiService().analyzeInstallation(
              base64Image,
              '请分析这张图片，描述图片内容并回答相关问题',
              'zhipu'
            );
            
            // 更新图片消息状态
            setMessages(prev => prev.map(msg => 
              msg.id === imageMessageId ? { ...msg, status: 'sent' } : msg
            ));

            // 添加AI回复
            const assistantMessage: Message = {
              id: uuidv4(),
              content: analysisResult,
              role: 'assistant',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
          } catch (error) {
            console.error('图片分析失败:', error);
            setMessages(prev => prev.map(msg => 
              msg.id === imageMessageId ? { ...msg, status: 'error' } : msg
            ));
            
            // 添加错误回复
            const errorMessage: Message = {
              id: uuidv4(),
              content: '图片分析失败，请重试',
              role: 'assistant',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    
    // 触发文件选择
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  };

  // 处理视频上传
  const handleVideoUpload = () => {
    // 创建隐藏的文件输入
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'video/*';
    fileInput.style.display = 'none';
    
    // 处理文件选择
    fileInput.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        const file = target.files[0];
        
        // 检查文件大小
        if (file.size > 50 * 1024 * 1024) { // 50MB限制
          alert('视频文件过大，请选择50MB以下的视频');
          return;
        }
        
        // 添加视频消息
        const videoMessageId = uuidv4();
        setMessages(prev => [...prev, {
          id: videoMessageId,
          content: '正在上传视频...',
          role: 'user',
          timestamp: new Date(),
          status: 'sending'
        }]);

        // 模拟视频上传和分析
        setTimeout(() => {
          // 更新消息状态
          setMessages(prev => prev.map(msg => 
            msg.id === videoMessageId ? { ...msg, content: '[视频]', status: 'sent' } : msg
          ));

          // 添加AI回复
          const assistantMessage: Message = {
            id: uuidv4(),
            content: '视频已收到，正在分析中...\n\n这是一条模拟回复，实际应用中会由OpenClaw分析视频内容并提供详细回答。',
            role: 'assistant',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMessage]);
        }, 2000);
      }
    };
    
    // 触发文件选择
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-100 py-4 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-400 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">阿尔法01</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <User className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* 系统消息 */}
        <div className="flex justify-center">
          <div className="alpha-status info px-4 py-2">
            <Info className="w-4 h-4" />
            您好！我是阿尔法01，有什么可以帮助您的？
          </div>
        </div>

        {/* 消息列表 */}
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                {message.content}
              </div>
              <div className={`mt-1 text-xs text-gray-500 ${message.role === 'user' && message.status === 'sending' ? 'flex items-center justify-end gap-1' : ''}`}>
                {message.role === 'user' && message.status === 'sending' && (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                )}
                {message.role === 'user' && message.status === 'error' && (
                  <AlertCircle className="w-3 h-3 text-red-500 inline-block" />
                )}
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <footer className="border-t border-gray-100 p-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            {/* 多模态交互按钮 */}
            <div className="flex items-center gap-2">
              <button 
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                onClick={() => handleVoiceInput()}
                title="语音输入"
              >
                <Mic className="w-5 h-5 text-gray-600" />
              </button>
              <button 
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                onClick={() => handleImageUpload()}
                title="上传图片"
              >
                <Image className="w-5 h-5 text-gray-600" />
              </button>
              <button 
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                onClick={() => handleVideoUpload()}
                title="上传视频"
              >
                <Video className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <input
              type="text"
              placeholder="请输入您的问题..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <button
              onClick={handleSend}
              disabled={isSending || !inputValue.trim()}
              className={`p-3 rounded-xl ${isSending || !inputValue.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'} transition-colors`}
            >
              <Send className={`w-5 h-5 ${isSending || !inputValue.trim() ? 'text-gray-500' : 'text-white'}`} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

// 设置页面组件
const SettingsPage: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { icon: <Home className="w-5 h-5" />, label: '首页', path: '/' },
    { icon: <MessageSquare className="w-5 h-5" />, label: '智能客服', path: '/chat' },
    { icon: <QrCode className="w-5 h-5" />, label: '扫码验证', path: '/verify' },
    { icon: <Settings className="w-5 h-5" />, label: '设置', path: '/settings', active: true },
  ];

  return (
    <div className="flex-1 flex">
      {/* 侧边导航 */}
      <aside className="hidden md:block w-64 bg-white border-r border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-400 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-800">阿尔法01</h1>
          </div>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <a
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-colors ${item.active ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {item.icon}
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          
          <div className="mt-8 pt-8 border-t border-gray-100">
            <button className="flex items-center gap-3 px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors w-full">
              <LogOut className="w-5 h-5" />
              退出登录
            </button>
          </div>
        </nav>
      </aside>

      {/* 移动端导航按钮 */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-white rounded-xl shadow-md"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* 移动端侧边栏 */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40">
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white p-4">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-400 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-800">阿尔法01</h1>
            </div>
            <nav>
              <ul className="space-y-2">
                {menuItems.map((item) => (
                  <li key={item.path}>
                    <a
                      href={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-colors ${item.active ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      {item.icon}
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              
              <div className="mt-8 pt-8 border-t border-gray-100">
                <button className="flex items-center gap-3 px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors w-full">
                  <LogOut className="w-5 h-5" />
                  退出登录
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* 主内容 */}
      <main className="flex-1 p-6 bg-gray-50 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="alpha-card p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">设置</h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">基本设置</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-800">深色模式</p>
                      <p className="text-sm text-gray-500">切换到深色主题</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-800">通知提醒</p>
                      <p className="text-sm text-gray-500">接收消息通知</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">API 设置</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">智谱 API Key</label>
                    <input 
                      type="password" 
                      placeholder="sk-..." 
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">模型选择</label>
                    <select className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                      <option>glm-4</option>
                      <option>glm-4v</option>
                      <option>glm-3-turbo</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">关于</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">版本</span>
                    <span className="font-medium">1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">开发者</span>
                    <span className="font-medium">阿尔法团队</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">官方网站</span>
                    <a href="#" className="text-purple-600 flex items-center gap-1 hover:underline">
                      alpha01.com <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// 导出主应用
function HomePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-4xl">
        <div className="alpha-card p-12 text-center">
          <div className="mb-8">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-600 to-purple-400 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
              <MessageSquare className="w-16 h-16 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-purple-400 mb-4">
            阿尔法01
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            智能产品客服系统，圆润设计，立体有层次毛玻璃有光泽质感
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="alpha-btn text-lg py-4">
              开始使用
            </button>
            <button className="bg-white border border-purple-200 text-purple-600 px-8 py-4 rounded-xl font-semibold hover:bg-purple-50 transition-all">
              了解更多
            </button>
          </div>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<QrCode className="w-8 h-8 text-purple-500" />}
              title="扫码验证"
              description="用户扫码后验证身份，确保服务安全性"
            />
            <FeatureCard 
              icon={<MessageSquare className="w-8 h-8 text-purple-500" />}
              title="智能对话"
              description="基于知识库和历史记录解决日常问题"
            />
            <FeatureCard 
              icon={<Settings className="w-8 h-8 text-purple-500" />}
              title="自动化优化"
              description="自动执行流程并持续迭代优化系统"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// 导出主应用
export default App;