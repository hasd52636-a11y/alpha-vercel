import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Trash2,
  Save,
  Edit,
  Filter,
  RefreshCw,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Tag,
  Target,
  Award,
  FileText
} from 'lucide-react';

interface Rule {
  id: string;
  name: string;
  description: string;
  type: 'category' | 'scoring' | 'recommendation' | 'knowledge_base';
  condition: string;
  action: string;
  priority: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CoreRuleEditor: React.FC = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [showForm, setShowForm] = useState(false);

  // 规则类型选项
  const ruleTypes = [
    { value: 'category', label: '分类规则', icon: Tag, color: 'text-blue-600' },
    { value: 'scoring', label: '评分规则', icon: Award, color: 'text-amber-600' },
    { value: 'recommendation', label: '推荐规则', icon: Target, color: 'text-green-600' },
    { value: 'knowledge_base', label: '知识库规则', icon: FileText, color: 'text-purple-600' }
  ];

  // 加载规则
  useEffect(() => {
    const loadRules = async () => {
      setIsLoading(true);
      try {
        const savedRules = localStorage.getItem('smartguide_core_rules');
        if (savedRules) {
          const parsedRules = JSON.parse(savedRules) as Rule[];
          setRules(parsedRules.map(rule => ({
            ...rule,
            createdAt: new Date(rule.createdAt),
            updatedAt: new Date(rule.updatedAt)
          })));
        } else {
          setRules([]);
        }
      } catch (error) {
        console.error('加载规则失败:', error);
        setRules([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRules();
  }, []);

  // 保存规则到本地存储
  const saveRules = (updatedRules: Rule[]) => {
    localStorage.setItem('smartguide_core_rules', JSON.stringify(updatedRules));
    setRules(updatedRules);
  };

  // 创建新规则
  const createNewRule = () => {
    const newRule: Rule = {
      id: `rule_${Date.now()}`,
      name: '新规则',
      description: '规则描述',
      type: 'category',
      condition: '',
      action: '',
      priority: 5,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setEditingRule(newRule);
    setShowForm(true);
  };

  // 编辑规则
  const editRule = (rule: Rule) => {
    setEditingRule({ ...rule });
    setShowForm(true);
  };

  // 删除规则
  const deleteRule = (ruleId: string) => {
    if (confirm('确定要删除这条规则吗？')) {
      const updatedRules = rules.filter(rule => rule.id !== ruleId);
      saveRules(updatedRules);
    }
  };

  // 保存规则
  const handleSaveRule = () => {
    if (!editingRule) return;

    setIsSaving(true);
    try {
      const updatedRule = {
        ...editingRule,
        updatedAt: new Date()
      };

      const existingIndex = rules.findIndex(rule => rule.id === updatedRule.id);
      let updatedRules;

      if (existingIndex >= 0) {
        // 更新现有规则
        updatedRules = [...rules];
        updatedRules[existingIndex] = updatedRule;
      } else {
        // 添加新规则
        updatedRules = [updatedRule, ...rules];
      }

      saveRules(updatedRules);
      setEditingRule(null);
      setShowForm(false);
    } catch (error) {
      console.error('保存规则失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 切换规则状态
  const toggleRuleStatus = (ruleId: string) => {
    const updatedRules = rules.map(rule => 
      rule.id === ruleId ? { ...rule, active: !rule.active, updatedAt: new Date() } : rule
    );
    saveRules(updatedRules);
  };

  // 导出规则
  const exportRules = () => {
    const rulesJson = JSON.stringify(rules, null, 2);
    const blob = new Blob([rulesJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartguide_rules_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导入规则
  const handleImportRules = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedRules = JSON.parse(content) as Rule[];
        const validatedRules = importedRules.map(rule => ({
          ...rule,
          createdAt: new Date(rule.createdAt),
          updatedAt: new Date(rule.updatedAt)
        }));
        saveRules([...validatedRules, ...rules]);
        alert('规则导入成功！');
      } catch (error) {
        alert('规则导入失败：无效的JSON格式');
        console.error('导入规则失败:', error);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // 筛选规则
  const filteredRules = filterType === 'all' 
    ? rules 
    : rules.filter(rule => rule.type === filterType);

  // 获取规则类型图标
  const getRuleTypeIcon = (type: string) => {
    const ruleType = ruleTypes.find(rt => rt.value === type);
    if (!ruleType) return <Tag size={18} />;
    const Icon = ruleType.icon;
    return <Icon size={18} className={ruleType.color} />;
  };

  return (
    <div className="space-y-6">
      {/* 面板标题和控制栏 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">核心规则编辑器</h2>
          <p className="text-sm text-slate-500 mt-1">
            定义和管理系统核心规则，实现智能分类、评分和推荐
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          >
            <option value="all">全部规则</option>
            <option value="category">分类规则</option>
            <option value="scoring">评分规则</option>
            <option value="recommendation">推荐规则</option>
            <option value="knowledge_base">知识库规则</option>
          </select>
          
          <button
            onClick={createNewRule}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors flex items-center gap-2"
          >
            <PlusCircle size={18} />
            新建规则
          </button>
          
          <button
            onClick={exportRules}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="导出规则"
          >
            <Download size={20} className="text-slate-700" />
          </button>
          
          <label
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            title="导入规则"
          >
            <Upload size={20} className="text-slate-700" />
            <input
              type="file"
              accept=".json"
              onChange={handleImportRules}
              className="hidden"
            />
          </label>
          
          <button
            onClick={() => window.location.reload()}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="刷新数据"
          >
            <RefreshCw size={20} className="text-slate-700" />
          </button>
        </div>
      </div>

      {/* 规则表单 */}
      {showForm && editingRule && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">
              {rules.some(r => r.id === editingRule.id) ? '编辑规则' : '新建规则'}
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingRule(null);
              }}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <Trash2 size={20} className="text-slate-500" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">规则名称</label>
                <input
                  type="text"
                  value={editingRule.name}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  placeholder="输入规则名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">规则类型</label>
                <select
                  value={editingRule.type}
                  onChange={(e) => setEditingRule({ ...editingRule, type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                >
                  {ruleTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">规则描述</label>
              <textarea
                value={editingRule.description}
                onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                placeholder="输入规则描述"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">触发条件</label>
              <textarea
                value={editingRule.condition}
                onChange={(e) => setEditingRule({ ...editingRule, condition: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                placeholder="输入触发条件（如：包含关键词、匹配模式等）"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">执行动作</label>
              <textarea
                value={editingRule.action}
                onChange={(e) => setEditingRule({ ...editingRule, action: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                placeholder="输入执行动作（如：分类为XX、评分加XX、推荐XX）"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">优先级</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editingRule.priority}
                  onChange={(e) => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) || 5 })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>
              
              <div className="md:col-span-2 flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRule.active}
                    onChange={(e) => setEditingRule({ ...editingRule, active: e.target.checked })}
                    className="w-4 h-4 text-violet-600 focus:ring-violet-500/20 border-slate-300 rounded"
                  />
                  <span className="text-sm font-medium text-slate-700">启用规则</span>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSaveRule}
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
                  保存规则
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingRule(null);
              }}
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 规则列表 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-200">
          {filteredRules.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-24 h-24 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Filter size={48} />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">暂无规则</h3>
              <p className="text-slate-500 mb-6">点击"新建规则"按钮创建您的第一条规则</p>
              <button
                onClick={createNewRule}
                className="px-6 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors flex items-center gap-2 mx-auto"
              >
                <PlusCircle size={18} />
                新建规则
              </button>
            </div>
          ) : (
            filteredRules.map((rule) => (
              <div key={rule.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getRuleTypeIcon(rule.type)}
                      <h4 className="font-bold text-slate-900">{rule.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        rule.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {rule.active ? '启用' : '禁用'}
                      </span>
                      <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-full font-medium">
                        优先级: {rule.priority}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{rule.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <div className="text-xs font-medium text-slate-500 mb-1">触发条件</div>
                        <div className="text-sm text-slate-700">{rule.condition || '无'}</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <div className="text-xs font-medium text-slate-500 mb-1">执行动作</div>
                        <div className="text-sm text-slate-700">{rule.action || '无'}</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      更新时间: {rule.updatedAt.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 items-end">
                    <button
                      onClick={() => toggleRuleStatus(rule.id)}
                      className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                        rule.active
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {rule.active ? '禁用' : '启用'}
                    </button>
                    <button
                      onClick={() => editRule(rule)}
                      className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors flex items-center gap-1"
                    >
                      <Edit size={14} />
                      编辑
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="px-3 py-1 text-sm bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 规则统计 */}
      {rules.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">规则统计</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm font-medium text-slate-500">总规则数</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{rules.length}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-700">启用规则</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{rules.filter(r => r.active).length}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-700">分类规则</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{rules.filter(r => r.type === 'category').length}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm font-medium text-purple-700">推荐规则</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">{rules.filter(r => r.type === 'recommendation').length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoreRuleEditor;