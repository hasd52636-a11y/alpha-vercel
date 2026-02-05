import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  BookOpen, 
  BarChart3, 
  Settings, 
  Users, 
  Clock, 
  TrendingUp, 
  ThumbsUp, 
  Filter, 
  Search, 
  Download, 
  RefreshCw 
} from 'lucide-react';
import { knowledgeCallService } from '../services/knowledgeCallService';
import { userInteractionService } from '../services/userInteractionService';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}

const AdminDashboard: React.FC = () => {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [highFrequencyQueries, setHighFrequencyQueries] = useState<Array<{
    query: string;
    count: number;
  }>>([]);
  const [userInteractions, setUserInteractions] = useState<any[]>([]);
  const [knowledgeCalls, setKnowledgeCalls] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalInteractions: 0,
    avgSatisfaction: 0,
    avgProcessingTime: 0,
    totalKnowledgeCalls: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // 导航项
  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: '仪表盘',
      icon: <LayoutDashboard size={20} />,
      active: activeNav === 'dashboard'
    },
    {
      id: 'interactions',
      label: '用户交互',
      icon: <MessageSquare size={20} />,
      active: activeNav === 'interactions'
    },
    {
      id: 'knowledge',
      label: '知识库管理',
      icon: <BookOpen size={20} />,
      active: activeNav === 'knowledge'
    },
    {
      id: 'analytics',
      label: '数据分析',
      icon: <BarChart3 size={20} />,
      active: activeNav === 'analytics'
    },
    {
      id: 'settings',
      label: '规则管理',
      icon: <Settings size={20} />,
      active: activeNav === 'settings'
    }
  ];

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 加载高频问题
        const queries = knowledgeCallService.getHighFrequencyQueries(10);
        setHighFrequencyQueries(queries);

        // 加载用户交互记录
        const interactions = userInteractionService.getInteractions(20);
        setUserInteractions(interactions);

        // 加载知识库调用记录
        const calls = knowledgeCallService.getCalls(20);
        setKnowledgeCalls(calls);

        // 计算统计数据
        const avgSatisfaction = userInteractionService.getAverageSatisfaction();
        const avgProcessingTime = userInteractionService.getAverageProcessingTime();
        const totalInteractions = userInteractionService.getInteractions().length;
        const totalKnowledgeCalls = knowledgeCallService.getCalls().length;

        setStats({
          totalUsers: new Set(interactions.map(i => i.userId)).size,
          totalInteractions,
          avgSatisfaction,
          avgProcessingTime,
          totalKnowledgeCalls
        });
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    
    // 每30秒自动刷新数据
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // 刷新数据
  const handleRefresh = () => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 加载高频问题
        const queries = knowledgeCallService.getHighFrequencyQueries(10);
        setHighFrequencyQueries(queries);

        // 加载用户交互记录
        const interactions = userInteractionService.getInteractions(20);
        setUserInteractions(interactions);

        // 加载知识库调用记录
        const calls = knowledgeCallService.getCalls(20);
        setKnowledgeCalls(calls);

        // 计算统计数据
        const avgSatisfaction = userInteractionService.getAverageSatisfaction();
        const avgProcessingTime = userInteractionService.getAverageProcessingTime();
        const totalInteractions = userInteractionService.getInteractions().length;
        const totalKnowledgeCalls = knowledgeCallService.getCalls().length;

        setStats({
          totalUsers: new Set(interactions.map(i => i.userId)).size,
          totalInteractions,
          avgSatisfaction,
          avgProcessingTime,
          totalKnowledgeCalls
        });
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  };

  // 导出数据
  const handleExport = () => {
    const interactionsData = userInteractionService.exportInteractions();
    const knowledgeCallsData = knowledgeCallService.exportCalls();
    
    // 创建导出文件
    const exportData = {
      interactions: JSON.parse(interactionsData),
      knowledgeCalls: JSON.parse(knowledgeCallsData),
      stats,
      exportDate: new Date().toISOString()
    };

    // 下载导出文件
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* 侧边导航栏 */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-900">管理平台</h1>
          <p className="text-sm text-slate-500 mt-1">AI客服系统后台管理</p>
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
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <p className="font-medium text-slate-900">管理员</p>
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
            <h2 className="text-xl font-bold text-slate-900">
              {activeNav === 'dashboard' && '仪表盘'}
              {activeNav === 'interactions' && '用户交互'}
              {activeNav === 'knowledge' && '知识库管理'}
              {activeNav === 'analytics' && '数据分析'}
              {activeNav === 'settings' && '规则管理'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索..."
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>
            
            <button
              onClick={handleExport}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="导出数据"
            >
              <Download size={20} className="text-slate-700" />
            </button>
            
            <button
              onClick={handleRefresh}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="刷新数据"
            >
              <RefreshCw size={20} className="text-slate-700" />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeNav === 'dashboard' && (
            <div className="space-y-8">
              {/* 核心指标卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">总用户数</p>
                      <p className="text-2xl font-bold text-slate-900">{stats.totalUsers}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                      <Users size={24} />
                    </div>
                  </div>
                  <div className="flex items-center text-sm">
                    <TrendingUp size={16} className="text-green-500 mr-2" />
                    <span className="text-green-500">+12.5% 较上周</span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">总交互次数</p>
                      <p className="text-2xl font-bold text-slate-900">{stats.totalInteractions}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                      <MessageSquare size={24} />
                    </div>
                  </div>
                  <div className="flex items-center text-sm">
                    <TrendingUp size={16} className="text-green-500 mr-2" />
                    <span className="text-green-500">+8.3% 较上周</span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">满意度评分</p>
                      <p className="text-2xl font-bold text-slate-900">{stats.avgSatisfaction.toFixed(1)}/5</p>
                    </div>
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                      <ThumbsUp size={24} />
                    </div>
                  </div>
                  <div className="flex items-center text-sm">
                    <TrendingUp size={16} className="text-green-500 mr-2" />
                    <span className="text-green-500">+0.2 较上周</span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">平均处理时间</p>
                      <p className="text-2xl font-bold text-slate-900">{Math.round(stats.avgProcessingTime)}ms</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                      <Clock size={24} />
                    </div>
                  </div>
                  <div className="flex items-center text-sm">
                    <TrendingUp size={16} className="text-red-500 mr-2" />
                    <span className="text-red-500">-150ms 较上周</span>
                  </div>
                </div>
              </div>

              {/* 高频问题分析 */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">高频问题分析</h3>
                    <p className="text-sm text-slate-500 mt-1">最近的高频用户问题</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm flex items-center gap-1">
                      <Filter size={16} />
                      筛选
                    </button>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-medium text-slate-500">问题</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500">出现次数</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {highFrequencyQueries.map((item, index) => (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-slate-900">{item.query}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-sm">
                              {item.count}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button className="text-violet-600 hover:text-violet-800 text-sm">
                              查看详情
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {highFrequencyQueries.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-slate-500">暂无高频问题数据</p>
                  </div>
                )}
              </div>

              {/* 最近用户交互 */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">最近用户交互</h3>
                    <p className="text-sm text-slate-500 mt-1">最近的用户与AI的交互记录</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm flex items-center gap-1">
                      <Filter size={16} />
                      筛选
                    </button>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-medium text-slate-500">用户问题</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500">AI回答</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500">满意度</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500">时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userInteractions.map((interaction, index) => (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-slate-900 max-w-xs truncate">
                            {interaction.userMessage}
                          </td>
                          <td className="py-3 px-4 text-slate-900 max-w-xs truncate">
                            {interaction.aiResponse}
                          </td>
                          <td className="py-3 px-4">
                            {interaction.satisfaction ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                {interaction.satisfaction}/5
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-full text-sm">
                                未评价
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-500">
                            {new Date(interaction.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {userInteractions.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-slate-500">暂无用户交互数据</p>
                  </div>
                )}
              </div>

              {/* 知识库使用情况 */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">知识库使用情况</h3>
                    <p className="text-sm text-slate-500 mt-1">最近的知识库调用记录</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm flex items-center gap-1">
                      <Filter size={16} />
                      筛选
                    </button>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-medium text-slate-500">查询内容</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500">匹配文档数</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500">响应时间</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500">时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {knowledgeCalls.map((call, index) => (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-slate-900 max-w-xs truncate">
                            {call.query}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                              {call.matchedDocuments.length}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-700">
                            {call.responseTime}ms
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-500">
                            {new Date(call.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {knowledgeCalls.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-slate-500">暂无知识库使用数据</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 其他导航项的内容可以在这里添加 */}
          {activeNav !== 'dashboard' && (
            <div className="text-center py-12">
              <p className="text-slate-500">{navItems.find(item => item.id === activeNav)?.label} 功能开发中</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
