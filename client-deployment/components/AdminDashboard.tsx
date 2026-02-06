import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Settings, 
  Users, 
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  Save,
  X,
  RefreshCw,
  Brain,
  Code,
  Image,
  FileText,
  Zap,
  LayoutDashboard,
  Search,
  BookOpen,
  Package,
  Copy
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { knowledgeService } from '../services/knowledgeService';
import { projectService } from '../services/projectService';
import { linkService } from '../services/linkService';
import { qrCodeService } from '../services/qrCodeService';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}

const AdminDashboard: React.FC = () => {
  const [activeNav, setActiveNav] = useState('chat');
  
  // OpenClaw对话功能状态
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  
  // 语音功能状态
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recognitionStatus, setRecognitionStatus] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // OpenClaw控制设置状态
  const [apiKey, setApiKey] = useState(localStorage.getItem('zhipuApiKey') || '');
  const [model, setModel] = useState('GLM-4.7');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [identity, setIdentity] = useState(localStorage.getItem('openclawIdentity') || '智能助手');
  const [role, setRole] = useState(localStorage.getItem('openclawRole') || '您是OpenClaw，一个强大的AI助手，具有分析、判断、生图、写文章、开发工具代码、植入技能等能力。请以专业、友好的语气回答问题，提供有价值的建议。');
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // 知识库检索状态
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // 模板管理状态
  const [templates, setTemplates] = useState([
    {
      id: 'template_1',
      name: '客户服务模板',
      content: '您好！感谢您的咨询。关于您提到的问题，我们的建议是：[知识库内容]。请问还有其他问题吗？'
    },
    {
      id: 'template_2',
      name: '技术支持模板',
      content: '感谢您的技术咨询。根据我们的分析，[知识库内容]。如果您需要进一步的帮助，请随时告知。'
    },
    {
      id: 'template_3',
      name: '默认模板',
      content: '[知识库内容]'
    }
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState('template_1');
  
  // 技能库管理状态
  const [skills, setSkills] = useState<Array<{
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    version: string;
    lastUpdated: string;
  }>>([]);
  const [newSkill, setNewSkill] = useState({
    name: '',
    description: ''
  });
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [skillSaveSuccess, setSkillSaveSuccess] = useState(false);
  
  // 功能模块管理状态
  const [modules, setModules] = useState<Array<{
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    version: string;
    lastUpdated: string;
    category: string;
  }>>([]);
  
  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 导航项 - 包含对话、技能库、功能管理、项目管理和设置
  const navItems: NavItem[] = [
    {
      id: 'chat',
      label: 'OpenClaw对话',
      icon: <MessageSquare size={20} />,
      active: activeNav === 'chat'
    },
    {
      id: 'projects',
      label: '产品集成',
      icon: <Package size={20} />,
      active: activeNav === 'projects'
    },
    {
      id: 'skills',
      label: '技能库管理',
      icon: <Zap size={20} />,
      active: activeNav === 'skills'
    },
    {
      id: 'modules',
      label: '功能管理',
      icon: <LayoutDashboard size={20} />,
      active: activeNav === 'modules'
    },
    {
      id: 'settings',
      label: 'OpenClaw设置',
      icon: <Settings size={20} />,
      active: activeNav === 'settings'
    }
  ];

  // 滚动到聊天底部
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // 开始录制语音
  const startRecording = async () => {
    try {
      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // 创建媒体记录器
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // 处理数据可用事件
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // 处理录制结束事件
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        
        // 创建音频URL用于播放
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // 处理语音识别
        handleSpeechRecognition(audioBlob);
      };
      
      // 开始录制
      mediaRecorder.start();
      setIsRecording(true);
      setRecognitionStatus('正在录制...');
    } catch (error) {
      console.error('开始录制失败:', error);
      setRecognitionStatus('无法访问麦克风，请检查权限');
    }
  };
  
  // 停止录制语音
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // 停止媒体流
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsRecording(false);
    setRecognitionStatus('正在识别...');
  };
  
  // 处理语音识别
  const handleSpeechRecognition = async (blob: Blob) => {
    try {
      // 将Blob转换为Base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const audioData = base64Audio.split(',')[1]; // 移除数据URL前缀
        
        // 调用AI服务进行语音识别
        const recognizedText = await aiService.recognizeSpeech(audioData, 'zhipu');
        
        if (recognizedText) {
          setChatInput(recognizedText);
          setRecognitionStatus('识别完成');
          
          // 自动发送识别后的文本
          // handleChatSend();
        } else {
          setRecognitionStatus('识别失败，请重试');
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('语音识别失败:', error);
      setRecognitionStatus('识别失败，请检查网络连接');
    }
  };
  
  // 播放语音
  const playAudio = () => {
    if (audioUrl && !isPlaying) {
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio(audioUrl);
        audioElementRef.current.onended = () => {
          setIsPlaying(false);
        };
      } else {
        audioElementRef.current.src = audioUrl;
      }
      
      audioElementRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(error => {
          console.error('播放失败:', error);
        });
    } else if (audioElementRef.current && isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    }
  };
  
  // 清理音频资源
  const cleanupAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setIsPlaying(false);
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
  };
  
  // 清理录制资源
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      cleanupAudio();
    };
  }, []);
  
  // 项目管理状态
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [qrLinks, setQrLinks] = useState<string[]>([]);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [projectMessage, setProjectMessage] = useState('');
  
  // 加载项目列表
  const loadProjects = async () => {
    try {
      const projectList = await projectService.getAllProjects();
      setProjects(projectList);
    } catch (error) {
      console.error('加载项目失败:', error);
      setProjectMessage('加载项目失败，请重试');
    }
  };
  
  // 生成项目二维码链接
  const generateProjectQrLinks = async (projectId: string) => {
    try {
      setGeneratingQr(true);
      setProjectMessage('正在生成二维码链接...');
      
      // 生成链接
      const links = linkService.generateLinksForProject(projectId);
      setQrLinks(links);
      
      setProjectMessage('二维码链接生成成功！');
      setTimeout(() => setProjectMessage(''), 3000);
    } catch (error) {
      console.error('生成二维码链接失败:', error);
      setProjectMessage('生成二维码链接失败，请重试');
    } finally {
      setGeneratingQr(false);
    }
  };
  
  // 获取项目的二维码链接
  const getProjectQrLinks = async (projectId: string) => {
    try {
      const links = linkService.getAllLinksForProject(projectId);
      setQrLinks(links);
    } catch (error) {
      console.error('获取二维码链接失败:', error);
      setProjectMessage('获取二维码链接失败，请重试');
    }
  };
  
  // 加载项目数据
  useEffect(() => {
    loadProjects();
  }, []);

  // 发送聊天消息
  const handleChatSend = async () => {
    const text = chatInput.trim();
    if (!text) return;

    // 添加用户消息
    const userMessage = {
      id: `user_${Date.now()}`,
      role: 'user' as const,
      content: text,
      timestamp: Date.now()
    };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsAiTyping(true);
    setStreamingMessage('');

    try {
      // 检查是否有API密钥
      const storedApiKey = localStorage.getItem('zhipuApiKey');
      if (!storedApiKey) {
        setChatMessages(prev => [...prev, {
          id: `ai_${Date.now()}`,
          role: 'assistant' as const,
          content: '请先在设置中配置智谱AI API密钥。',
          timestamp: Date.now()
        }]);
        setIsAiTyping(false);
        return;
      }

      // 使用商家自己的API密钥
      aiService.setZhipuApiKey(storedApiKey);
      knowledgeService.setApiKey(storedApiKey);

      // 步骤1：检索知识库
      setIsSearching(true);
      const searchResults = await knowledgeService.search(text);
      setSearchResults(searchResults);
      setIsSearching(false);

      // 步骤2：应用模板
      const template = templates.find(t => t.id === selectedTemplate) || templates[2];
      let knowledgeContent = '';
      
      if (searchResults.length > 0) {
        // 取最相关的知识库内容
        const topResult = searchResults[0];
        knowledgeContent = topResult.content.substring(0, 500); // 限制长度
      } else {
        knowledgeContent = '根据我的知识，';
      }

      // 步骤3：构建系统指令 - 使用用户设置的角色描述
      const systemInstruction = localStorage.getItem('openclawRole') || `你是${localStorage.getItem('openclawIdentity') || 'OpenClaw'}，一个强大的AI助手，具有分析、判断、生图、写文章、开发工具代码、植入技能等能力。请以专业、友好的语气回答问题，提供有价值的建议。`;

      // 步骤4：构建提示词
      const prompt = `${template.content.replace('[知识库内容]', knowledgeContent)}\n\n用户问题：${text}`;

      // 步骤5：获取AI响应
      await aiService.getSmartResponse(
        prompt,
        searchResults.map(result => result.content), // 传入知识库内容
        'zhipu',
        systemInstruction,
        {
          stream: true,
          callback: (chunk: string, isDone: boolean) => {
            setStreamingMessage(prev => prev + chunk);
            if (isDone) {
              setChatMessages(prev => [...prev, {
                id: `ai_${Date.now()}`,
                role: 'assistant' as const,
                content: streamingMessage + chunk,
                timestamp: Date.now()
              }]);
              setStreamingMessage('');
              setIsAiTyping(false);
              scrollToBottom();
            }
          },
          projectConfig: {
            provider: 'zhipu',
            model: model
          } as any
        }
      );
    } catch (error) {
      console.error('OpenClaw对话失败:', error);
      setChatMessages(prev => [...prev, {
        id: `ai_${Date.now()}`,
        role: 'assistant' as const,
        content: 'OpenClaw服务暂时不可用，请稍后重试。',
        timestamp: Date.now()
      }]);
      setIsAiTyping(false);
      setIsSearching(false);
    } finally {
      scrollToBottom();
    }
  };

  // 键盘事件处理
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  };

  // 保存OpenClaw设置
  const handleSaveSettings = async () => {
    setIsSaveLoading(true);
    setSaveSuccess(false);
    
    try {
      // 保存API密钥到本地存储
      localStorage.setItem('zhipuApiKey', apiKey);
      
      // 保存其他设置
      localStorage.setItem('openclawModel', model);
      localStorage.setItem('openclawTemperature', temperature.toString());
      localStorage.setItem('openclawMaxTokens', maxTokens.toString());
      localStorage.setItem('openclawIdentity', identity);
      localStorage.setItem('openclawRole', role);
      
      // 应用设置
      aiService.setZhipuApiKey(apiKey);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('保存设置失败:', error);
    } finally {
      setIsSaveLoading(false);
    }
  };

  // 加载技能库
  const loadSkills = () => {
    try {
      // 从本地存储加载技能
      const storedSkills = localStorage.getItem('openclawSkills');
      if (storedSkills) {
        setSkills(JSON.parse(storedSkills));
      } else {
        // 默认技能
        const defaultSkills = [
          {
            id: '1',
            name: '系统分析',
            description: '分析系统状态并提供优化建议',
            enabled: true,
            version: '1.0.0',
            lastUpdated: new Date().toISOString()
          },
          {
            id: '2',
            name: '代码生成',
            description: '生成各种工具代码',
            enabled: true,
            version: '1.0.0',
            lastUpdated: new Date().toISOString()
          },
          {
            id: '3',
            name: '图像生成',
            description: '生成创意图像',
            enabled: true,
            version: '1.0.0',
            lastUpdated: new Date().toISOString()
          },
          {
            id: '4',
            name: '文章撰写',
            description: '撰写各类专业文章',
            enabled: true,
            version: '1.0.0',
            lastUpdated: new Date().toISOString()
          }
        ];
        setSkills(defaultSkills);
        localStorage.setItem('openclawSkills', JSON.stringify(defaultSkills));
      }
    } catch (error) {
      console.error('加载技能库失败:', error);
    }
  };

  // 初始化加载技能库
  useEffect(() => {
    loadSkills();
  }, []);

  // 添加新技能
  const handleAddSkill = async () => {
    if (!newSkill.name.trim() || !newSkill.description.trim()) return;
    
    setIsAddingSkill(true);
    
    try {
      const skill = {
        id: `skill_${Date.now()}`,
        name: newSkill.name.trim(),
        description: newSkill.description.trim(),
        enabled: true,
        version: '1.0.0',
        lastUpdated: new Date().toISOString()
      };
      
      const updatedSkills = [...skills, skill];
      setSkills(updatedSkills);
      localStorage.setItem('openclawSkills', JSON.stringify(updatedSkills));
      
      // 重置表单
      setNewSkill({ name: '', description: '' });
      setSkillSaveSuccess(true);
      setTimeout(() => setSkillSaveSuccess(false), 3000);
    } catch (error) {
      console.error('添加技能失败:', error);
    } finally {
      setIsAddingSkill(false);
    }
  };

  // 切换技能状态
  const toggleSkillStatus = (skillId: string) => {
    const updatedSkills = skills.map(skill => 
      skill.id === skillId 
        ? { ...skill, enabled: !skill.enabled, lastUpdated: new Date().toISOString() }
        : skill
    );
    setSkills(updatedSkills);
    localStorage.setItem('openclawSkills', JSON.stringify(updatedSkills));
  };

  // 删除技能
  const deleteSkill = (skillId: string) => {
    const updatedSkills = skills.filter(skill => skill.id !== skillId);
    setSkills(updatedSkills);
    localStorage.setItem('openclawSkills', JSON.stringify(updatedSkills));
  };

  // 加载功能模块
  const loadModules = () => {
    try {
      // 从本地存储加载模块
      const storedModules = localStorage.getItem('openclawModules');
      if (storedModules) {
        setModules(JSON.parse(storedModules));
      } else {
        // 默认功能模块（默认全部开启）
        const defaultModules = [
          {
            id: 'module_1',
            name: '知识库管理',
            description: '管理和维护知识库内容，支持知识向量化和检索',
            enabled: true,
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            category: '核心功能'
          },
          {
            id: 'module_2',
            name: '项目管理',
            description: '创建和管理项目，跟踪项目状态和数据',
            enabled: true,
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            category: '核心功能'
          },
          {
            id: 'module_3',
            name: '用户交互管理',
            description: '管理用户会话和交互历史，分析用户满意度',
            enabled: true,
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            category: '核心功能'
          },
          {
            id: 'module_4',
            name: '工具管理',
            description: '创建和配置工具，执行和监控工具运行',
            enabled: true,
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            category: '核心功能'
          },
          {
            id: 'module_5',
            name: '数据分析',
            description: '分析系统数据和用户行为，提供数据驱动的决策支持',
            enabled: true,
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            category: '分析功能'
          },
          {
            id: 'module_6',
            name: '系统监控',
            description: '监控系统状态和性能，及时发现和处理异常',
            enabled: true,
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            category: '系统功能'
          }
        ];
        setModules(defaultModules);
        localStorage.setItem('openclawModules', JSON.stringify(defaultModules));
      }
    } catch (error) {
      console.error('加载功能模块失败:', error);
    }
  };

  // 初始化加载功能模块
  useEffect(() => {
    loadModules();
  }, []);

  // 切换模块状态
  const toggleModuleStatus = (moduleId: string) => {
    const updatedModules = modules.map(module => 
      module.id === moduleId 
        ? { ...module, enabled: !module.enabled, lastUpdated: new Date().toISOString() }
        : module
    );
    setModules(updatedModules);
    localStorage.setItem('openclawModules', JSON.stringify(updatedModules));
  };

  // 快速操作按钮
  const quickActions = [
    { icon: <Brain size={16} />, label: '分析系统状态', action: () => setChatInput('分析当前系统状态并提供优化建议') },
    { icon: <Code size={16} />, label: '生成工具代码', action: () => setChatInput('生成一个用于数据导出的工具代码') },
    { icon: <Image size={16} />, label: '生成图像', action: () => setChatInput('生成一个关于人工智能的创意图像') },
    { icon: <FileText size={16} />, label: '撰写文章', action: () => setChatInput('撰写一篇关于AI客服未来发展的文章') },
    { icon: <Zap size={16} />, label: '植入技能', action: () => setChatInput('如何为系统植入新的技能') }
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* 侧边导航栏 */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-violet-700">阿尔法01</h1>
          <p className="text-sm text-slate-500 mt-1">OpenClaw控制面板</p>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveNav(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    item.active
                      ? 'bg-violet-50 text-violet-700 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-lg">
            <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <p className="font-medium text-violet-700">管理员</p>
              <p className="text-xs text-slate-500">系统管理员</p>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部栏 */}
        <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-violet-700">
              {activeNav === 'chat' && 'OpenClaw对话'}
              {activeNav === 'projects' && '项目管理'}
              {activeNav === 'skills' && '技能库管理'}
              {activeNav === 'modules' && '功能管理'}
              {activeNav === 'settings' && 'OpenClaw设置'}
            </h2>
          </div>
          
          {activeNav === 'chat' && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setChatMessages([]);
                }}
                className="p-2 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors"
                title="清空对话"
              >
                <X size={20} />
              </button>
              <button
                onClick={() => {
                  // 重新连接
                  setIsAiTyping(false);
                  setStreamingMessage('');
                }}
                className="p-2 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors"
                title="重新连接"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          )}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* OpenClaw对话窗口 */}
          {activeNav === 'chat' && (
            <div className="h-full flex gap-6">
              {/* 左边：后台与OpenClaw的对话 */}
              <div className="flex-1 flex flex-col">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
                  {/* 聊天头部 */}
                  <div className="p-4 border-b border-slate-200 bg-violet-50">
                    <h3 className="text-lg font-bold text-violet-800 flex items-center gap-2">
                      <MessageSquare size={20} className="text-violet-600" />
                      后台与OpenClaw对话
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">利用OpenClaw的分析、判断、生图、写文章、开发工具代码、技能植入等能力</p>
                  </div>
                  
                  {/* 快速操作按钮 */}
                  <div className="p-3 border-b border-slate-200 bg-white">
                    <div className="flex flex-wrap gap-2">
                      {quickActions.map((action, index) => (
                        <button
                          key={index}
                          onClick={action.action}
                          className="px-3 py-1.5 bg-violet-50 text-violet-700 rounded-full text-sm flex items-center gap-1.5 hover:bg-violet-100 transition-colors"
                        >
                          {action.icon}
                          <span>{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* 聊天内容区 */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-12">
                        <MessageSquare size={48} className="mx-auto text-violet-300 mb-4" />
                        <p className="text-slate-500">开始与OpenClaw对话</p>
                        <p className="text-sm text-slate-400 mt-2">你可以利用OpenClaw的多种能力来解决问题</p>
                      </div>
                    )}
                    
                    {chatMessages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[80%] ${msg.role === 'user' ? 'bg-violet-100 text-violet-800 rounded-l-lg rounded-tr-lg' : 'bg-white border border-slate-200 rounded-r-lg rounded-tl-lg'} p-3 shadow-sm`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <p className="text-xs text-slate-400 mt-1 text-right">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {/* 流式消息 */}
                    {streamingMessage && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] bg-white border border-slate-200 rounded-r-lg rounded-tl-lg p-3 shadow-sm">
                          <p className="whitespace-pre-wrap">
                            {streamingMessage}
                            <span className="animate-pulse">▌</span>
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* 加载指示器 */}
                    {isAiTyping && !streamingMessage && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 rounded-r-lg rounded-tl-lg p-3 shadow-sm">
                          <div className="flex space-x-2">
                            <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={chatEndRef} />
                  </div>
                  
                  {/* 模板选择 */}
                  <div className="p-3 border-t border-slate-200 bg-white">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">
                        回复模板
                      </label>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                      >
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* 知识库检索状态 */}
                  {isSearching && (
                    <div className="p-3 border-t border-slate-200 bg-blue-50 flex items-center gap-2">
                      <Search size={16} className="text-blue-600 animate-spin" />
                      <span className="text-sm text-blue-700">正在检索知识库...</span>
                    </div>
                  )}
                  
                  {/* 聊天输入区 */}
                  <div className="p-4 border-t border-slate-200 bg-slate-50">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <ImageIcon size={20} className="text-violet-600" />
                      </button>
                      <button 
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`p-2 rounded-lg transition-colors ${isRecording ? 'bg-red-100 border-red-300 text-red-600' : 'bg-white border-slate-300 text-violet-600'} border hover:bg-slate-100`}
                        title={isRecording ? '停止录制' : '开始录制'}
                      >
                        {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                      </button>
                      {audioUrl && (
                        <button 
                          onClick={playAudio}
                          className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                          title={isPlaying ? '暂停播放' : '播放录音'}
                        >
                          {isPlaying ? <VolumeX size={20} className="text-violet-600" /> : <Volume2 size={20} className="text-violet-600" />}
                        </button>
                      )}
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                      />
                      <textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="输入您的问题..."
                        className="flex-1 p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none max-h-[120px]"
                      />
                      <button
                        onClick={handleChatSend}
                        disabled={!chatInput.trim() || isAiTyping}
                        className="p-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                    <div className="mt-2 space-y-1">
                      {recognitionStatus && (
                        <div className="text-xs text-blue-600 flex items-center gap-1">
                          <Mic size={14} className="text-blue-600" />
                          <span>{recognitionStatus}</span>
                        </div>
                      )}
                      <div className="text-xs text-slate-500">
                        <p>💡 提示：你可以使用OpenClaw的多种能力，如分析、生图、写文章、开发代码、植入技能等</p>
                        <p className="mt-1">🎤 语音功能：点击麦克风按钮开始语音输入，系统会自动识别并转换为文本</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 右边：所有用户与OpenClaw的对话信息流 */}
              <div className="w-1/3 flex flex-col">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
                  {/* 信息流头部 */}
                  <div className="p-4 border-b border-slate-200 bg-violet-50">
                    <h3 className="text-lg font-bold text-violet-800 flex items-center gap-2">
                      <MessageSquare size={20} className="text-violet-600" />
                      用户对话信息流
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">所有用户与OpenClaw的对话记录</p>
                  </div>
                  
                  {/* 信息流内容 */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* 模拟用户对话信息流 */}
                    {/* 在实际应用中，这里会显示真实的用户对话记录 */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                            <Users size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">用户 1</p>
                            <p className="text-xs text-slate-500">扫码用户</p>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500">{new Date().toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">用户：您好，我想咨询一下产品的使用方法</p>
                      <p className="text-sm text-slate-700">OpenClaw：您好！感谢您的咨询。关于产品的使用方法，我们的建议是...</p>
                    </div>
                    
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                            <Users size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">用户 2</p>
                            <p className="text-xs text-slate-500">扫码用户</p>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500">{new Date().toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">用户：我的订单什么时候能发货？</p>
                      <p className="text-sm text-slate-700">OpenClaw：您好！关于您的订单发货时间，我们的建议是...</p>
                    </div>
                    
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                            <Users size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">用户 3</p>
                            <p className="text-xs text-slate-500">扫码用户</p>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500">{new Date().toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">用户：如何申请退款？</p>
                      <p className="text-sm text-slate-700">OpenClaw：您好！关于退款申请，我们的建议是...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 产品集成管理窗口 */}
          {activeNav === 'projects' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
                <h3 className="text-lg font-bold text-violet-700 flex items-center gap-2 mb-6">
                  <Package size={20} className="text-violet-600" />
                  产品集成管理
                </h3>
                
                {projectMessage && (
                  <div className={`p-3 rounded-lg mb-4 ${projectMessage.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                    {projectMessage}
                  </div>
                )}
                
                <div className="space-y-6">
                  {/* 产品列表 - 同步自产品管理 */}
                  <div>
                    <h4 className="text-md font-medium text-slate-700 mb-3">
                      产品列表
                      <span className="text-xs font-normal text-slate-500 ml-2">(同步自产品管理)</span>
                    </h4>
                    {projects.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-lg">
                        <Package size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-500">暂无产品，请在产品管理中创建</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {projects.map((project) => (
                          <div key={project.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-medium text-slate-900">{project.name}</h5>
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                                    OpenClaw已集成
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600 mt-1">{project.description}</p>
                                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
                                  <span>创建: {new Date(project.createdAt).toLocaleDateString()}</span>
                                  <span>更新: {new Date(project.updatedAt).toLocaleDateString()}</span>
                                  <span>知识库: {project.knowledgeBase?.length || 0} 条</span>
                                  <span>AI配置: 已启用</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedProject(project);
                                    getProjectQrLinks(project.id);
                                  }}
                                  className="p-2 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors"
                                  title="查看二维码链接"
                                >
                                  <Image size={18} />
                                </button>
                                <button
                                  onClick={() => generateProjectQrLinks(project.id)}
                                  disabled={generatingQr}
                                  className="p-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="生成二维码链接"
                                >
                                  {generatingQr ? (
                                    <RefreshCw size={18} className="animate-spin" />
                                  ) : (
                                    <Image size={18} />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* OpenClaw集成状态 */}
                  {projects.length > 0 && (
                    <div className="bg-violet-50 p-4 rounded-lg">
                      <h4 className="text-md font-medium text-violet-700 mb-3">
                        OpenClaw集成状态
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <p className="text-sm text-slate-500">已集成产品</p>
                          <p className="text-2xl font-bold text-violet-700">{projects.length}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <p className="text-sm text-slate-500">总知识库条目</p>
                          <p className="text-2xl font-bold text-violet-700">
                            {projects.reduce((total, project) => total + (project.knowledgeBase?.length || 0), 0)}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <p className="text-sm text-slate-500">二维码链接</p>
                          <p className="text-2xl font-bold text-violet-700">{qrLinks.length > 0 ? qrLinks.length : '0'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* 二维码链接管理 */}
                  {selectedProject && (
                    <div className="bg-violet-50 p-4 rounded-lg">
                      <h4 className="text-md font-medium text-violet-700 mb-3">
                        {selectedProject.name} - OpenClaw二维码链接
                      </h4>
                      {qrLinks.length > 0 ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {qrLinks.slice(0, 10).map((link, index) => (
                              <div key={index} className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate">链接 {index + 1}</p>
                                    <p className="text-xs text-slate-500 mt-1 truncate break-all">{link}</p>
                                  </div>
                                  <button
                                    onClick={() => navigator.clipboard.writeText(link)}
                                    className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                    title="复制链接"
                                  >
                                    <Copy size={16} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                          {qrLinks.length > 10 && (
                            <div className="text-center py-3">
                              <p className="text-sm text-slate-500">共 {qrLinks.length} 个链接，显示前 10 个</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-white rounded-lg border border-dashed border-slate-200">
                          <Image size={32} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-slate-500">暂无二维码链接</p>
                          <button
                            onClick={() => generateProjectQrLinks(selectedProject.id)}
                            disabled={generatingQr}
                            className="mt-3 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {generatingQr ? '生成中...' : '生成OpenClaw二维码链接'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* 技能库管理窗口 */}
          {activeNav === 'skills' && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
                <h3 className="text-lg font-bold text-violet-700 flex items-center gap-2 mb-6">
                  <Zap size={20} className="text-violet-600" />
                  技能库管理
                </h3>
                
                <div className="space-y-6">
                  {/* 添加新技能 */}
                  <div className="bg-violet-50 p-4 rounded-lg">
                    <h4 className="text-md font-medium text-violet-700 mb-3">
                      添加新技能
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          技能名称
                        </label>
                        <input
                          type="text"
                          value={newSkill.name}
                          onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                          placeholder="输入技能名称"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          技能描述
                        </label>
                        <textarea
                          value={newSkill.description}
                          onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
                          placeholder="输入技能描述"
                          rows={3}
                        />
                      </div>
                      <button
                        onClick={handleAddSkill}
                        disabled={isAddingSkill || !newSkill.name.trim() || !newSkill.description.trim()}
                        className="w-full px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isAddingSkill ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            添加中...
                          </>
                        ) : (
                          <>
                            <Zap size={16} />
                            添加技能
                          </>
                        )}
                      </button>
                      
                      {/* 导入技能包 */}
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          导入技能包
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="file"
                            id="skillPackInput"
                            accept=".json"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  try {
                                    const skillPack = JSON.parse(event.target?.result as string);
                                    if (skillPack.skills && Array.isArray(skillPack.skills)) {
                                      const importedSkills = skillPack.skills.map((skill: any) => ({
                                        id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                        name: skill.name,
                                        description: skill.description,
                                        enabled: true,
                                        version: skill.version || '1.0.0',
                                        lastUpdated: new Date().toISOString()
                                      }));
                                      const updatedSkills = [...skills, ...importedSkills];
                                      setSkills(updatedSkills);
                                      localStorage.setItem('openclawSkills', JSON.stringify(updatedSkills));
                                      // 显示导入成功提示
                                      setSkillSaveSuccess(true);
                                      setTimeout(() => setSkillSaveSuccess(false), 3000);
                                    }
                                  } catch (error) {
                                    console.error('技能包解析失败:', error);
                                  }
                                };
                                reader.readAsText(file);
                              }
                            }}
                          />
                          <button
                            onClick={() => document.getElementById('skillPackInput')?.click()}
                            className="flex-1 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors flex items-center justify-center gap-2"
                          >
                            <FileText size={14} />
                            选择技能包文件
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          支持导入JSON格式的技能包文件
                        </p>
                      </div>
                      
                      {skillSaveSuccess && (
                        <div className="mt-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2">
                          <Save size={14} />
                          {newSkill.name.trim() ? '技能添加成功！' : '技能包导入成功！'}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 技能列表 */}
                  <div>
                    <h4 className="text-md font-medium text-slate-700 mb-3">
                      技能列表
                    </h4>
                    {skills.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-lg">
                        <Zap size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-500">暂无技能，请添加新技能</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {skills.map((skill) => (
                          <div key={skill.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-medium text-slate-900">{skill.name}</h5>
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${skill.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {skill.enabled ? '启用' : '禁用'}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600 mt-1">{skill.description}</p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                  <span>版本: {skill.version}</span>
                                  <span>更新: {new Date(skill.lastUpdated).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleSkillStatus(skill.id)}
                                  className={`p-2 rounded-lg transition-colors ${skill.enabled ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                                  title={skill.enabled ? '禁用技能' : '启用技能'}
                                >
                                  {skill.enabled ? (
                                    <X size={18} />
                                  ) : (
                                    <Zap size={18} />
                                  )}
                                </button>
                                <button
                                  onClick={() => deleteSkill(skill.id)}
                                  className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                  title="删除技能"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 技能使用说明 */}
              <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h4 className="text-md font-bold text-violet-700 mb-3">
                  技能使用说明
                </h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-violet-600 mt-1">•</span>
                    <span>添加技能后，OpenClaw会根据技能描述自动学习和应用该技能</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-violet-600 mt-1">•</span>
                    <span>启用的技能会在对话中自动触发，禁用的技能不会被使用</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-violet-600 mt-1">•</span>
                    <span>技能描述越详细，OpenClaw的执行效果越好</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-violet-600 mt-1">•</span>
                    <span>可以通过对话直接调用特定技能，例如："使用系统分析技能分析当前状态"</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* 功能管理窗口 */}
          {activeNav === 'modules' && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-bold text-violet-700 flex items-center gap-2 mb-6">
                  <LayoutDashboard size={20} className="text-violet-600" />
                  功能管理
                </h3>
                
                <div className="space-y-6">
                  {/* 功能模块列表 */}
                  <div>
                    <h4 className="text-md font-medium text-slate-700 mb-3">
                      功能模块列表
                    </h4>
                    {modules.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-lg">
                        <LayoutDashboard size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-500">暂无功能模块，请检查系统配置</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* 按分类分组显示 */}
                        {Array.from(new Set(modules.map(m => m.category))).map(category => (
                          <div key={category}>
                            <h5 className="text-sm font-medium text-slate-500 mb-2">
                              {category}
                            </h5>
                            <div className="space-y-3">
                              {modules.filter(m => m.category === category).map((module) => (
                                <div key={module.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <h5 className="font-medium text-slate-900">{module.name}</h5>
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${module.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                          {module.enabled ? '启用' : '禁用'}
                                        </span>
                                      </div>
                                      <p className="text-sm text-slate-600 mt-1">{module.description}</p>
                                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                        <span>版本: {module.version}</span>
                                        <span>更新: {new Date(module.lastUpdated).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => toggleModuleStatus(module.id)}
                                      className={`p-2 rounded-lg transition-colors ${module.enabled ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                                      title={module.enabled ? '禁用模块' : '启用模块'}
                                    >
                                      {module.enabled ? (
                                        <X size={18} />
                                      ) : (
                                        <Zap size={18} />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 功能管理说明 */}
              <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h4 className="text-md font-bold text-violet-700 mb-3">
                  功能管理说明
                </h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-violet-600 mt-1">•</span>
                    <span>所有功能模块默认处于开启状态，确保系统完整运行</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-violet-600 mt-1">•</span>
                    <span>可以根据需要禁用不需要的功能模块，提高系统性能</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-violet-600 mt-1">•</span>
                    <span>功能模块状态会实时保存，系统重启后保持上次设置</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-violet-600 mt-1">•</span>
                    <span>OpenClaw会根据启用的功能模块自动调整其行为和响应策略</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* OpenClaw设置窗口 */}
          {activeNav === 'settings' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-bold text-violet-700 flex items-center gap-2 mb-6">
                  <Settings size={20} className="text-violet-600" />
                  OpenClaw控制设置
                </h3>
                
                <div className="space-y-6">
                  {/* API密钥设置 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      智谱AI API密钥
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                        placeholder="请输入您的智谱AI API密钥"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      请在智谱AI官网获取API密钥，这将用于所有OpenClaw的AI功能
                    </p>
                  </div>
                  
                  {/* 模型设置 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      AI模型
                    </label>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    >
                      <option value="GLM-4.7">GLM-4.7</option>
                      <option value="GLM-4.6v">GLM-4.6v</option>
                      <option value="GLM-4">GLM-4</option>
                    </select>
                  </div>
                  
                  {/* 温度设置 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      温度 ({temperature})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      控制输出的随机性，值越高生成的内容越多样化
                    </p>
                  </div>
                  
                  {/* 最大令牌设置 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      最大响应令牌数
                    </label>
                    <input
                      type="number"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                      min="100"
                      max="4000"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      控制AI响应的最大长度，值越大响应越详细但处理时间越长
                    </p>
                  </div>
                  
                  {/* 身份设置 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      OpenClaw身份
                    </label>
                    <input
                      type="text"
                      value={identity}
                      onChange={(e) => setIdentity(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                      placeholder="输入OpenClaw的身份"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      设定OpenClaw的身份标识，例如：智能助手、专家顾问等
                    </p>
                  </div>
                  
                  {/* 角色设置 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      OpenClaw角色描述
                    </label>
                    <textarea
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
                      placeholder="输入OpenClaw的角色描述"
                      rows={4}
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      详细描述OpenClaw的职能、能力和行为准则，这将影响OpenClaw的回答风格和内容
                    </p>
                  </div>
                  
                  {/* 保存按钮 */}
                  <div className="pt-4">
                    <button
                      onClick={handleSaveSettings}
                      disabled={isSaveLoading}
                      className="w-full px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSaveLoading ? (
                        <>
                          <RefreshCw size={18} className="animate-spin" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          保存设置
                        </>
                      )}
                    </button>
                    {saveSuccess && (
                      <div className="mt-3 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2">
                        <Save size={16} />
                        设置保存成功！
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 功能说明 */}
              <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h4 className="text-md font-bold text-violet-700 mb-3">
                  OpenClaw 能力说明
                </h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-violet-600 mt-1">•</span>
                    <span><strong>分析判断</strong>：分析系统状态、用户数据和交互模式，提供专业判断</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-violet-600 mt-1">•</span>
                    <span><strong>图像生成</strong>：根据描述生成高质量的创意图像</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-violet-600 mt-1">•</span>
                    <span><strong>文章撰写</strong>：撰写各类专业文章和内容</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-violet-600 mt-1">•</span>
                    <span><strong>工具代码开发</strong>：生成各类实用工具代码</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-violet-600 mt-1">•</span>
                    <span><strong>技能植入</strong>：为系统添加新的功能和能力</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
