export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'technical' | 'billing' | 'general' | 'other';
  createdAt: Date;
  updatedAt: Date;
  assignee?: string;
  customerId: string;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  content: string;
  sender: 'customer' | 'agent';
  createdAt: Date;
  attachments?: string[];
}

export class TicketService {
  private STORAGE_KEY = 'smartguide_tickets';
  private tickets: Ticket[] = [];

  constructor() {
    this.loadTickets();
    if (this.tickets.length === 0) {
      this.initializeSampleData();
    }
  }

  private loadTickets() {
    try {
      const storedTickets = localStorage.getItem(this.STORAGE_KEY);
      if (storedTickets) {
        this.tickets = JSON.parse(storedTickets).map((ticket: any) => ({
          ...ticket,
          createdAt: new Date(ticket.createdAt),
          updatedAt: new Date(ticket.updatedAt),
          messages: ticket.messages.map((message: any) => ({
            ...message,
            createdAt: new Date(message.createdAt)
          }))
        }));
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
      this.tickets = [];
    }
  }

  private saveTickets() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.tickets));
    } catch (error) {
      console.error('Error saving tickets:', error);
    }
  }

  private initializeSampleData() {
    this.tickets = [
      {
        id: 'ticket_1',
        title: '产品安装问题',
        description: '客户反映产品安装困难，需要视频教程',
        status: 'open',
        priority: 'medium',
        category: 'technical',
        createdAt: new Date(),
        updatedAt: new Date(),
        customerId: 'customer_1',
        messages: []
      }
    ];
    this.saveTickets();
  }

  createTicket(ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages'>): Ticket {
    const ticket: Ticket = {
      ...ticketData,
      id: `ticket_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: []
    };

    this.tickets.push(ticket);
    this.saveTickets();
    return ticket;
  }

  getTickets(): Ticket[] {
    return this.tickets;
  }

  getTicketById(id: string): Ticket | null {
    return this.tickets.find(ticket => ticket.id === id) || null;
  }

  updateTicketStatus(id: string, status: Ticket['status']): Ticket | null {
    const ticket = this.getTicketById(id);
    if (ticket) {
      ticket.status = status;
      ticket.updatedAt = new Date();
      this.saveTickets();
      return ticket;
    }
    return null;
  }

  addTicketMessage(ticketId: string, message: Omit<TicketMessage, 'id' | 'createdAt'>): TicketMessage | null {
    const ticket = this.getTicketById(ticketId);
    if (ticket) {
      const newMessage: TicketMessage = {
        ...message,
        id: `message_${Date.now()}`,
        createdAt: new Date()
      };
      ticket.messages.push(newMessage);
      ticket.updatedAt = new Date();
      this.saveTickets();
      return newMessage;
    }
    return null;
  }

  extractTicketInfo(conversation: string[]): Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages' | 'customerId'> {
    const fullConversation = conversation.join(' ');
    
    const title = fullConversation.substring(0, 50);
    
    const priorityKeywords = {
      urgent: ['urgent', '紧急', 'critical', '严重'],
      high: ['high', '高', 'important', '重要'],
      medium: ['medium', '中', 'normal', '一般'],
      low: ['low', '低', 'minor', '轻微']
    };
    
    let priority: Ticket['priority'] = 'medium';
    for (const [prio, keywords] of Object.entries(priorityKeywords)) {
      if (keywords.some(keyword => fullConversation.toLowerCase().includes(keyword))) {
        priority = prio as Ticket['priority'];
        break;
      }
    }
    
    const categoryKeywords = {
      technical: ['technical', '技术', 'install', '安装', 'error', '错误'],
      billing: ['billing', '账单', 'payment', '付款', 'price', '价格'],
      general: ['general', '一般', 'question', '问题', 'info', '信息'],
      other: ['other', '其他']
    };
    
    let category: Ticket['category'] = 'general';
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => fullConversation.toLowerCase().includes(keyword))) {
        category = cat as Ticket['category'];
        break;
      }
    }
    
    return {
      title: title.trim() + '...',
      description: fullConversation,
      status: 'open',
      priority,
      category
    };
  }
}

export const ticketService = new TicketService();