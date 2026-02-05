import React, { useState, useEffect, useCallback } from 'react';
import { ToolFormat, TOOL_IMPORT_EXAMPLE } from '../types/toolTypes';
import { toolManager } from '../services/toolManager';
import { logger } from '../utils/logger';

interface ToolManagerPanelProps {
  onToolsChange?: () => void;
}

export const ToolManagerPanel: React.FC<ToolManagerPanelProps> = ({ onToolsChange }) => {
  const [activeTab, setActiveTab] = useState<'builtin' | 'import' | 'settings'>('builtin');
  const [tools, setTools] = useState<Array<{ id: string; name: string; description: string; category: string; enabled: boolean; format?: string }>>([]);
  const [importFormat, setImportFormat] = useState<ToolFormat>('openai');
  const [importData, setImportData] = useState('');
  const [importResult, setImportResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState<Record<ToolFormat, boolean>>({
    openai: true,
    langchain: false,
    anthropic: false,
    mcp: false,
    custom: false
  });

  const loadTools = useCallback(() => {
    const allTools = toolManager.getAllTools();
    setTools(allTools);
  }, []);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  const handleImport = async () => {
    if (!importData.trim()) {
      setImportResult({ success: false, message: '请输入工具定义JSON' });
      return;
    }

    try {
      const parsedData = JSON.parse(importData);
      const result = await toolManager.importTool(parsedData, importFormat);
      
      if (result.success) {
        setImportResult({ success: true, message: `成功导入工具: ${result.tool?.parsedDefinition.function.name}` });
        setImportData('');
        loadTools();
        onToolsChange?.();
      } else {
        setImportResult({ success: false, message: result.error });
      }
    } catch (error) {
      setImportResult({ success: false, message: 'JSON解析失败，请检查格式' });
    }
  };

  const handleToggleTool = (toolId: string, enabled: boolean) => {
    toolManager.toggleTool(toolId, enabled);
    loadTools();
    onToolsChange?.();
  };

  const handleDeleteTool = (toolId: string) => {
    if (toolManager.deleteTool(toolId)) {
      loadTools();
      onToolsChange?.();
    }
  };

  const handleExampleClick = (format: ToolFormat) => {
    setImportData(JSON.stringify(TOOL_IMPORT_EXAMPLE[format], null, 2));
    setShowExamples(prev => ({ ...prev, [format]: true }));
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      search: '#3b82f6',
      database: '#8b5cf6',
      api: '#10b981',
      file: '#f59e0b',
      analytics: '#ef4444',
      communication: '#06b6d4',
      utility: '#6b7280',
      custom: '#ec4899'
    };
    return colors[category] || '#6b7280';
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '900px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h2 style={{ marginBottom: '20px', color: '#1f2937' }}>🛠️ 工具管理系统</h2>

      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '10px'
      }}>
        {(['builtin', 'import', 'settings'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              backgroundColor: activeTab === tab ? '#3b82f6' : '#e5e7eb',
              color: activeTab === tab ? 'white' : '#374151',
              transition: 'all 0.2s'
            }}
          >
            {tab === 'builtin' ? '📦 内置工具' : tab === 'import' ? '⬆️ 导入工具' : '⚙️ 工具配置'}
          </button>
        ))}
      </div>

      {activeTab === 'builtin' && (
        <div>
          <h3 style={{ marginBottom: '15px' }}>内置工具列表</h3>
          <div style={{
            display: 'grid',
            gap: '12px',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))'
          }}>
            {tools.filter(t => !t.format).map(tool => (
              <div
                key={tool.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  backgroundColor: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', color: '#1f2937' }}>{tool.name}</h4>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: 'white',
                      backgroundColor: getCategoryColor(tool.category)
                    }}>
                      {tool.category}
                    </span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="checkbox"
                      checked={tool.enabled}
                      onChange={(e) => handleToggleTool(tool.id, e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>启用</span>
                  </label>
                </div>
                <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '14px' }}>{tool.description}</p>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>ID: {tool.id}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'import' && (
        <div>
          <h3 style={{ marginBottom: '15px' }}>导入外部工具</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>选择格式:</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {(['openai', 'langchain', 'anthropic', 'mcp', 'custom'] as ToolFormat[]).map(format => (
                <button
                  key={format}
                  onClick={() => setImportFormat(format)}
                  style={{
                    padding: '8px 16px',
                    border: '2px solid',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: importFormat === format ? '#eff6ff' : 'white',
                    borderColor: importFormat === format ? '#3b82f6' : '#d1d5db',
                    color: importFormat === format ? '#3b82f6' : '#374151',
                    fontWeight: '500'
                  }}
                >
                  {format === 'openai' ? '🤖 OpenAI' : 
                   format === 'langchain' ? '🔗 LangChain' : 
                   format === 'anthropic' ? '🧠 Claude' : 
                   format === 'mcp' ? '🔌 MCP' : '📝 Custom'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontWeight: '600' }}>工具定义 (JSON):</label>
              <button
                onClick={() => handleExampleClick(importFormat)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: 'white',
                  fontSize: '14px',
                  color: '#3b82f6'
                }}
              >
                📋 粘贴示例
              </button>
            </div>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder={`请粘贴${importFormat}格式的工具定义JSON...`}
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          <button
            onClick={handleImport}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: '#3b82f6',
              color: 'white',
              fontWeight: '600',
              marginRight: '10px'
            }}
          >
            ⬆️ 导入工具
          </button>

          {importResult && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              borderRadius: '6px',
              backgroundColor: importResult.success ? '#dcfce7' : '#fee2e2',
              color: importResult.success ? '#166534' : '#dc2626'
            }}>
              {importResult.message}
            </div>
          )}

          {tools.filter(t => t.format).length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <h4 style={{ marginBottom: '15px' }}>已导入的工具:</h4>
              <div style={{ display: 'grid', gap: '12px' }}>
                {tools.filter(t => t.format).map(tool => (
                  <div
                    key={tool.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '16px',
                      backgroundColor: 'white'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <h5 style={{ margin: '0 0 4px 0' }}>{tool.name}</h5>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: 'white',
                          backgroundColor: getCategoryColor(tool.category),
                          marginRight: '8px'
                        }}>
                          {tool.category}
                        </span>
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                          格式: {tool.format?.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="checkbox"
                            checked={tool.enabled}
                            onChange={(e) => handleToggleTool(tool.id, e.target.checked)}
                          />
                          <span style={{ fontSize: '12px' }}>启用</span>
                        </label>
                        <button
                          onClick={() => handleDeleteTool(tool.id)}
                          style={{
                            padding: '4px 8px',
                            border: '1px solid #ef4444',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            backgroundColor: 'white',
                            color: '#ef4444',
                            fontSize: '12px'
                          }}
                        >
                          🗑️ 删除
                        </button>
                      </div>
                    </div>
                    <p style={{ margin: '8px 0', color: '#6b7280', fontSize: '14px' }}>{tool.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div>
          <h3 style={{ marginBottom: '15px' }}>工具配置</h3>
          <div style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <h4 style={{ marginBottom: '15px' }}>支持的导入格式说明</h4>
            
            <div style={{ marginBottom: '20px' }}>
              <h5 style={{ color: '#3b82f6', marginBottom: '8px' }}>🤖 OpenAI Tool Schema</h5>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
                OpenAI官方定义的函数调用格式，兼容所有OpenAI API兼容的模型
              </p>
              <code style={{
                display: 'block',
                padding: '12px',
                backgroundColor: '#1f2937',
                color: '#10b981',
                borderRadius: '6px',
                fontSize: '12px',
                overflow: 'auto'
              }}>
                {JSON.stringify(TOOL_IMPORT_EXAMPLE.openai, null, 2)}
              </code>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h5 style={{ color: '#8b5cf6', marginBottom: '8px' }}>🔗 LangChain Tool Format</h5>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
                LangChain框架的工具定义格式
              </p>
              <code style={{
                display: 'block',
                padding: '12px',
                backgroundColor: '#1f2937',
                color: '#10b981',
                borderRadius: '6px',
                fontSize: '12px',
                overflow: 'auto'
              }}>
                {JSON.stringify(TOOL_IMPORT_EXAMPLE.langchain, null, 2)}
              </code>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h5 style={{ color: '#ec4899', marginBottom: '8px' }}>📝 Custom Format</h5>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
                自定义工具格式，支持endpoint和executor
              </p>
              <code style={{
                display: 'block',
                padding: '12px',
                backgroundColor: '#1f2937',
                color: '#10b981',
                borderRadius: '6px',
                fontSize: '12px',
                overflow: 'auto'
              }}>
                {JSON.stringify(TOOL_IMPORT_EXAMPLE.custom, null, 2)}
              </code>
            </div>

            <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#fef3c7', borderRadius: '6px' }}>
              <h6 style={{ margin: '0 0 8px 0', color: '#92400e' }}>💡 使用提示</h6>
              <ul style={{ margin: '0', paddingLeft: '20px', color: '#92400e', fontSize: '14px' }}>
                <li>导入的工具会自动转换为OpenAI格式供AI调用</li>
                <li>自定义格式支持HTTP API和JavaScript函数两种执行方式</li>
                <li>建议先启用工具测试，确认功能正常后再用于生产</li>
                <li>定期检查导入工具的安全性，避免执行恶意代码</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolManagerPanel;
