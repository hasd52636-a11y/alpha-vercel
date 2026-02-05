import React, { useState, useEffect } from 'react';
import { 
  ThumbsUp, 
  ThumbsDown, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Save, 
  SkipForward, 
  Filter, 
  Search, 
  RefreshCw, 
  Clock, 
  MapPin, 
  Smartphone, 
  Monitor, 
  Tablet, 
  MessageSquare, 
  BookOpen 
} from 'lucide-react';
import { userInteractionService } from '../services/userInteractionService';

interface EvaluationState {
  interactionId: string;
  satisfaction: number | null;
  category: string;
  resolved: boolean;
  knowledgeBaseSuggestion: string;
  notes: string;
}

const ManualEvaluationPanel: React.FC = () => {
  const [interactions, setInteractions] = useState<any[]>([]);
  const [filteredInteractions, setFilteredInteractions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [evaluationState, setEvaluationState] = useState<EvaluationState>({
    interactionId: '',
    satisfaction: null,
    category: '未分类',
    resolved: false,
    knowledgeBaseSuggestion: '',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, unevaluated, evaluated
  const [isSaving, setIsSaving] = useState(false);

  // 评价分类选项
  const categories = [
    '未分类',
    '安装问题',
    '使用指导',
    '故障排查',
    '维护保养',
    '产品咨询',
    '其他问题'
  ];

  // 加载用户交互记录
  useEffect(() => {
    const loadInteractions = async () => {
      setIsLoading(true);
      try {
        const allInteractions = userInteractionService.getInteractions(50);
        setInteractions(allInteractions);
        filterInteractions(allInteractions, filter, searchQuery);
      } catch (error) {
        console.error('加载交互记录失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInteractions();
  }, []);

  // 筛选交互记录
  const filterInteractions = (allInteractions: any[], currentFilter: string, query: string) => {
    let filtered = allInteractions;

    // 按评价状态筛选
    if (currentFilter === 'unevaluated') {
      filtered = filtered.filter(i => i.satisfaction === null);
    } else if (currentFilter === 'evaluated') {
      filtered = filtered.filter(i => i.satisfaction !== null);
    }

    // 按搜索词筛选
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(i => 
        i.userMessage.toLowerCase().includes(lowerQuery) ||
        i.aiResponse.toLowerCase().includes(lowerQuery) ||
        i.category.toLowerCase().includes(lowerQuery)
      );
    }

    setFilteredInteractions(filtered);
    setCurrentIndex(0);
    if (filtered.length > 0) {
      initializeEvaluationState(filtered[0]);
    }
  };

  // 处理筛选和搜索
  useEffect(() => {
    filterInteractions(interactions, filter, searchQuery);
  }, [filter, searchQuery]);

  // 初始化评价状态
  const initializeEvaluationState = (interaction: any) => {
    setEvaluationState({
      interactionId: interaction.id,
      satisfaction: interaction.satisfaction,
      category: interaction.category,
      resolved: interaction.resolved,
      knowledgeBaseSuggestion: '',
      notes: ''
    });
  };

  // 处理评分
  const handleSatisfactionChange = (score: number) => {
    setEvaluationState(prev => ({ ...prev, satisfaction: score }));
  };

  // 处理分类变更
  const handleCategoryChange = (category: string) => {
    setEvaluationState(prev => ({ ...prev, category }));
  };

  // 处理解决状态变更
  const handleResolvedChange = (resolved: boolean) => {
    setEvaluationState(prev => ({ ...prev, resolved }));
  };

  // 处理知识库建议变更
  const handleKnowledgeBaseSuggestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEvaluationState(prev => ({ ...prev, knowledgeBaseSuggestion: e.target.value }));
  };

  // 处理备注变更
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEvaluationState(prev => ({ ...prev, notes: e.target.value }));
  };

  // 保存评价
  const handleSaveEvaluation = async () => {
    if (!evaluationState.interactionId) return;

    setIsSaving(true);
    try {
      // 更新满意度
      if (evaluationState.satisfaction !== null) {
        userInteractionService.updateSatisfaction(evaluationState.interactionId, evaluationState.satisfaction);
      }

      // 更新分类
      if (evaluationState.category) {
        userInteractionService.updateCategory(evaluationState.interactionId, evaluationState.category);
      }

      // 更新解决状态
      userInteractionService.updateResolutionStatus(evaluationState.interactionId, evaluationState.resolved);

      // 重新加载交互记录
      const allInteractions = userInteractionService.getInteractions(50);
      setInteractions(allInteractions);
      filterInteractions(allInteractions, filter, searchQuery);

      // 移动到下一条
      handleNext();
    } catch (error) {
      console.error('保存评价失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 移动到下一条
  const handleNext = () => {
    if (currentIndex < filteredInteractions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      initializeEvaluationState(filteredInteractions[currentIndex + 1]);
    } else {
      // 循环到第一条
      setCurrentIndex(0);
      if (filteredInteractions.length > 0) {
        initializeEvaluationState(filteredInteractions[0]);
      }
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    const allInteractions = userInteractionService.getInteractions(50);
    setInteractions(allInteractions);
    filterInteractions(allInteractions, filter, searchQuery);
  };

  // 获取设备图标
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'desktop':
        return <Monitor size={16} className="text-blue-600" />;
      case 'mobile':
        return <Smartphone size={16} className="text-green-600" />;
      case 'tablet':
        return <Tablet size={16} className="text-purple-600" />;
      default:
        return <Smartphone size={16} className="text-gray-600" />;
    }
  };

  const currentInteraction = filteredInteractions[currentIndex];

  return (
    <div className="space-y-6">
      {/* 面板标题和控制栏 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">人工评价面板</h2>
          <p className="text-sm text-slate-500 mt-1">
            人工评价用户交互，提升系统智能水平
            {filteredInteractions.length > 0 && (
              <span className="ml-2 text-blue-600 font-medium">
                ({currentIndex + 1}/{filteredInteractions.length})
              </span>
            )}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索交互记录..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            />
          </div>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          >
            <option value="all">全部</option>
            <option value="unevaluated">未评价</option>
            <option value="evaluated">已评价</option>
          </select>
          
          <button
            onClick={handleRefresh}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="刷新数据"
          >
            <RefreshCw size={20} className="text-slate-700" />
          </button>
        </div>
      </div>

      {/* 无数据提示 */}
      {filteredInteractions.length === 0 && (
        <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="w-24 h-24 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquare size={48} />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">暂无交互记录</h3>
          <p className="text-slate-500">
            {filter === 'unevaluated' ? '没有未评价的交互记录' :
             filter === 'evaluated' ? '没有已评价的交互记录' :
             '没有交互记录，请稍后再试'}
          </p>
          <button
            onClick={handleRefresh}
            className="mt-6 px-6 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors"
          >
            刷新数据
          </button>
        </div>
      )}

      {/* 交互内容和评价表单 */}
      {filteredInteractions.length > 0 && currentInteraction && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：交互内容 */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">交互详情</h3>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock size={14} />
                {new Date(currentInteraction.timestamp).toLocaleString()}
              </div>
            </div>

            {/* 用户信息 */}
            <div className="flex items-center gap-3 mb-6 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-slate-500" />
                <span className="text-sm text-slate-700">{currentInteraction.location}</span>
              </div>
              <div className="flex items-center gap-2">
                {getDeviceIcon(currentInteraction.deviceType)}
                <span className="text-sm text-slate-700">{currentInteraction.deviceType}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-slate-500" />
                <span className="text-sm text-slate-700">{currentInteraction.processingTime}ms</span>
              </div>
            </div>

            {/* 用户问题 */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <MessageSquare size={16} />
                </div>
                <h4 className="font-medium text-slate-700">用户问题</h4>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-slate-900">{currentInteraction.userMessage}</p>
              </div>
            </div>

            {/* AI回答 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <MessageSquare size={16} />
                </div>
                <h4 className="font-medium text-slate-700">AI回答</h4>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <p className="text-slate-900">{currentInteraction.aiResponse}</p>
              </div>
            </div>
          </div>

          {/* 右侧：评价表单 */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">人工评价</h3>
              {currentInteraction.satisfaction && (
                <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-1">
                  <CheckCircle size={14} />
                  已评价
                </div>
              )}
            </div>

            {/* 满意度评分 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">满意度评分 (10分制)</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                  <button
                    key={score}
                    onClick={() => handleSatisfactionChange(score)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all text-sm ${
                      evaluationState.satisfaction === score
                        ? 'bg-violet-600 text-white scale-110'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-sm text-slate-500">
                {evaluationState.satisfaction && (
                  <span className="font-medium text-violet-600">
                    {evaluationState.satisfaction <= 5 ? '不满意' : evaluationState.satisfaction <= 8 ? '一般' : '满意'} ({evaluationState.satisfaction}/10)
                  </span>
                )}
              </div>
            </div>

            {/* 问题分类 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">问题分类</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryChange(category)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      evaluationState.category === category
                        ? 'bg-violet-100 text-violet-700 font-medium border border-violet-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* 解决状态 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">解决状态</label>
              <div className="flex gap-4">
                <button
                  onClick={() => handleResolvedChange(true)}
                  className={`flex-1 px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                    evaluationState.resolved
                      ? 'bg-green-100 text-green-700 font-medium border border-green-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <CheckCircle size={18} />
                  <span>已解决</span>
                </button>
                <button
                  onClick={() => handleResolvedChange(false)}
                  className={`flex-1 px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                    !evaluationState.resolved
                      ? 'bg-red-100 text-red-700 font-medium border border-red-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <XCircle size={18} />
                  <span>未解决</span>
                </button>
              </div>
            </div>

            {/* 知识库建议 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <div className="flex items-center gap-1">
                  <BookOpen size={16} className="text-violet-600" />
                  知识库建议
                </div>
              </label>
              <textarea
                value={evaluationState.knowledgeBaseSuggestion}
                onChange={handleKnowledgeBaseSuggestionChange}
                placeholder="建议添加或修改的知识库内容..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                rows={3}
              />
            </div>

            {/* 备注 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">备注</label>
              <textarea
                value={evaluationState.notes}
                onChange={handleNotesChange}
                placeholder="评价备注..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                rows={2}
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={handleSaveEvaluation}
                disabled={isSaving}
                className="flex-1 px-6 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    保存中...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    保存评价
                  </>
                )}
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <SkipForward size={18} />
                下一条
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 评价统计 */}
      {filteredInteractions.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">评价统计</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm font-medium text-slate-500">总交互数</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{interactions.length}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-700">已评价</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {interactions.filter(i => i.satisfaction !== null).length}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-700">未评价</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {interactions.filter(i => i.satisfaction === null).length}
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm font-medium text-amber-700">平均满意度</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">
                {userInteractionService.getAverageSatisfaction().toFixed(1)}/5
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualEvaluationPanel;
