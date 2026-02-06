import React, { useState, useEffect } from 'react';
import { Ticket, TicketMessage, ticketService } from '../services/ticketService';
import { Plus, Search, Trash2, Edit, CheckCircle, AlertCircle, Clock, User, MessageSquare } from 'lucide-react';

const TicketManager: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium' as Ticket['priority'],
    category: 'technical' as Ticket['category'],
    customerId: 'customer_1'
  });
  const [searchQuery, setSearchQuery] = useState('');

  // 加载工单列表
  useEffect(() => {
    const loadTickets = () => {
      setTickets(ticketService.getTickets());
    };

    loadTickets();
  }, []);

  // 创建新工单
  const handleCreateTicket = () => {
    if (!newTicket.title || !newTicket.description) return;

    const ticket = ticketService.createTicket(newTicket);
    setTickets([...tickets, ticket]);
    setIsCreatingTicket(false);
    setNewTicket({
      title: '',
      description: '',
      priority: 'medium',
      category: 'technical',
      customerId: 'customer_1'
    });
  };

  // 添加消息到工单
  const handleAddMessage = () => {
    if (!selectedTicket || !newMessage) return;

    ticketService.addTicketMessage(selectedTicket.id, {
      content: newMessage,
      sender: 'agent'
    });

    // 更新本地状态
    setTickets(ticketService.getTickets());
    setSelectedTicket(ticketService.getTicketById(selectedTicket.id));
    setNewMessage('');
  };

  // 更新工单状态
  const handleUpdateStatus = (ticketId: string, status: Ticket['status']) => {
    ticketService.updateTicketStatus(ticketId, status);
    setTickets(ticketService.getTickets());
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket(ticketService.getTicketById(ticketId));
    }
  };

  // 过滤工单
  const filteredTickets = tickets.filter(ticket => 
    ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a103d] to-[#2d1b69] p-6">
      <div className="max-w-7xl mx-auto">
        {/* 标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-4">工单管理系统</h1>
          <p className="text-slate-300">管理客户工单，提供及时的技术支持</p>
        </div>

        {/* 操作栏 */}
        <div className="glass-card p-6 rounded-[2rem] border border-slate-200 mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4 items-center flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="搜索工单..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>
            </div>
            <button
              onClick={() => setIsCreatingTicket(true)}
              className="px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors font-medium flex items-center gap-2"
            >
              <Plus size={18} />
              新建工单
            </button>
          </div>
        </div>

        {/* 新建工单表单 */}
        {isCreatingTicket && (
          <div className="glass-card p-8 rounded-[2rem] border border-slate-200 mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-6">新建工单</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">工单标题</label>
                <input
                  type="text"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  placeholder="请输入工单标题..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">工单描述</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  className="w-full h-32 px-4 py-3 border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  placeholder="请详细描述问题..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">优先级</label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as Ticket['priority'] })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  >
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                    <option value="urgent">紧急</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">类别</label>
                  <select
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value as Ticket['category'] })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  >
                    <option value="technical">技术</option>
                    <option value="billing">账单</option>
                    <option value="general">一般</option>
                    <option value="other">其他</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateTicket}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
                >
                  保存工单
                </button>
                <button
                  onClick={() => setIsCreatingTicket(false)}
                  className="px-6 py-3 bg-slate-500 text-white rounded-xl hover:bg-slate-600 transition-colors font-medium"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 工单列表 */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 rounded-[2rem] border border-slate-200 h-full">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <MessageSquare size={20} />
                工单列表 ({tickets.length})
              </h3>
              <div className="space-y-4">
                {filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTicket?.id === ticket.id ? 'bg-violet-50 border-violet-300' : 'bg-slate-50 border-slate-200 hover:border-violet-200'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-slate-800 truncate">{ticket.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(ticket.priority)}`}>
                        {getPriorityText(ticket.priority)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                      {ticket.description.substring(0, 100)}...
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <Clock size={14} />
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare size={14} />
                        <span>{ticket.messages.length} 消息</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
                        {getStatusText(ticket.status)}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700`}>
                        {getCategoryText(ticket.category)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 工单详情 */}
          {selectedTicket && (
            <div className="lg:col-span-2">
              <div className="glass-card p-6 rounded-[2rem] border border-slate-200 h-full">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <MessageSquare size={20} />
                      {selectedTicket.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(selectedTicket.priority)}`}>
                        {getPriorityText(selectedTicket.priority)}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(selectedTicket.status)}`}>
                        {getStatusText(selectedTicket.status)}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700`}>
                        {getCategoryText(selectedTicket.category)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateStatus(selectedTicket.id, 'in_progress')}
                      disabled={selectedTicket.status === 'in_progress' || selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'}
                      className="p-2 text-slate-500 hover:text-blue-500 transition-colors disabled:opacity-50"
                    >
                      <Clock size={18} />
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedTicket.id, 'resolved')}
                      disabled={selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'}
                      className="p-2 text-slate-500 hover:text-green-500 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle size={18} />
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedTicket.id, 'closed')}
                      disabled={selectedTicket.status === 'closed'}
                      className="p-2 text-slate-500 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* 工单描述 */}
                <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-2">工单描述</h4>
                  <p className="text-slate-600">{selectedTicket.description}</p>
                </div>

                {/* 消息列表 */}
                <div className="mb-6">
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <User size={18} />
                    对话历史
                  </h4>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {selectedTicket.messages.length > 0 ? (
                      selectedTicket.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-4 rounded-xl ${message.sender === 'customer' ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 border border-slate-200'}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-bold ${message.sender === 'customer' ? 'text-blue-600' : 'text-violet-600'}`}>
                              {message.sender === 'customer' ? '客户' : '客服'}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(message.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-slate-700">{message.content}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
                        <p>暂无对话记录</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 发送消息 */}
                <div className="mt-6">
                  <div className="flex gap-2">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="输入回复消息..."
                      className="flex-1 p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
                      rows={3}
                    />
                    <button
                      onClick={handleAddMessage}
                      disabled={!newMessage}
                      className="px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors font-medium disabled:opacity-50"
                    >
                      发送
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 辅助函数：获取优先级颜色
const getPriorityColor = (priority: Ticket['priority']) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
};

// 辅助函数：获取优先级文本
const getPriorityText = (priority: Ticket['priority']) => {
  switch (priority) {
    case 'urgent':
      return '紧急';
    case 'high':
      return '高';
    case 'medium':
      return '中';
    case 'low':
      return '低';
    default:
      return '未知';
  }
};

// 辅助函数：获取状态颜色
const getStatusColor = (status: Ticket['status']) => {
  switch (status) {
    case 'open':
      return 'bg-blue-100 text-blue-800';
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800';
    case 'resolved':
      return 'bg-green-100 text-green-800';
    case 'closed':
      return 'bg-slate-100 text-slate-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
};

// 辅助函数：获取状态文本
const getStatusText = (status: Ticket['status']) => {
  switch (status) {
    case 'open':
      return '待处理';
    case 'in_progress':
      return '处理中';
    case 'resolved':
      return '已解决';
    case 'closed':
      return '已关闭';
    default:
      return '未知';
  }
};

// 辅助函数：获取类别文本
const getCategoryText = (category: Ticket['category']) => {
  switch (category) {
    case 'technical':
      return '技术';
    case 'billing':
      return '账单';
    case 'general':
      return '一般';
    case 'other':
      return '其他';
    default:
      return '未知';
  }
};

export default TicketManager;