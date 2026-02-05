import { useState, useEffect, useRef } from 'react';
import { knowledgeGraph, KnowledgeNode } from '../services/knowledgeGraph';
import { Brain, ZoomIn, ZoomOut, RefreshCw, Trash2, Database, Info, Sparkles, Activity, Network } from 'lucide-react';

interface GraphNode {
  id: string;
  name: string;
  group: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  hover: boolean;
  velocity: { x: number; y: number; z: number };
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
  alpha: number;
}

const KnowledgeGraphView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [stats, setStats] = useState({ nodeCount: 0, edgeCount: 0, avgConnections: 0, topTags: [] });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [perspective, setPerspective] = useState(800);

  useEffect(() => {
    loadGraphData();
    startAnimation();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // 添加模拟数据
  const addMockData = () => {
    knowledgeGraph.clear();
    
    const mockNodes = [
      // 公司知识库节点
      {
        id: 'company_1',
        title: '产品安装指南',
        content: '详细的产品安装步骤和注意事项，包括开箱检查、安装准备、安装步骤、测试验证等完整流程。',
        type: 'text',
        source: 'company',
        tags: ['安装', '指南', '步骤', '教程']
      },
      {
        id: 'company_2',
        title: '常见故障排查',
        content: '产品使用过程中常见故障的解决方法，包括无法开机、连接失败、功能异常等问题的诊断和修复。',
        type: 'text',
        source: 'company',
        tags: ['故障', '排查', '解决', '技术支持']
      },
      {
        id: 'company_3',
        title: '产品功能介绍',
        content: '产品的主要功能和使用方法，详细介绍各个功能模块的操作方式和使用场景。',
        type: 'text',
        source: 'company',
        tags: ['功能', '介绍', '使用', '特性']
      },
      {
        id: 'company_4',
        title: '维护保养建议',
        content: '产品的日常维护和保养方法，包括清洁、存储、定期检查等维护措施。',
        type: 'text',
        source: 'company',
        tags: ['维护', '保养', '建议', '护理']
      },
      {
        id: 'company_5',
        title: '安全使用规范',
        content: '产品使用过程中的安全注意事项，包括用电安全、操作规范、应急处理等安全知识。',
        type: 'text',
        source: 'company',
        tags: ['安全', '规范', '注意事项', '防护']
      },
      // 用户问答知识库节点
      {
        id: 'user_1',
        title: '怎么安装产品？',
        content: '我收到产品后不知道如何正确安装，有详细的步骤吗？',
        type: 'text',
        source: 'user',
        tags: ['安装', '步骤', '指南']
      },
      {
        id: 'user_2',
        title: '产品无法开机怎么办？',
        content: '我的产品突然无法开机了，应该怎么排查问题？',
        type: 'text',
        source: 'user',
        tags: ['故障', '开机', '排查']
      },
      {
        id: 'user_3',
        title: '产品有哪些功能？',
        content: '我想了解这款产品的主要功能和使用方法。',
        type: 'text',
        source: 'user',
        tags: ['功能', '介绍', '使用']
      },
      // 重叠区域节点
      {
        id: 'overlap_1',
        title: '退换货政策',
        content: '产品退换货的详细政策和流程，包括退换货条件、期限、手续等信息。',
        type: 'text',
        source: 'overlap',
        tags: ['退换货', '政策', '流程', '服务']
      },
      {
        id: 'overlap_2',
        title: '保修服务',
        content: '产品的保修范围、期限、流程和注意事项。',
        type: 'text',
        source: 'overlap',
        tags: ['保修', '服务', '政策', '支持']
      }
    ];

    mockNodes.forEach(node => {
      knowledgeGraph.addNode(node);
    });

    loadGraphData();
  };

  // 清除所有数据
  const clearAllData = () => {
    knowledgeGraph.clear();
    loadGraphData();
    setSelectedNode(null);
    setHoveredNode(null);
  };

  const loadGraphData = () => {
    const graphData = knowledgeGraph.exportGraph();
    const allNodes = knowledgeGraph.getAllNodes();

    // 双色交织方案：根据source字段设置颜色（使用荧光色）
    const getNodeColor = (source: string) => {
      switch (source) {
        case 'company':
          return '#00f2ff'; // 荧光蓝 - 公司知识库
        case 'user':
          return '#ff007b'; // 荧光红 - 用户问答知识库
        case 'overlap':
          return '#7dff00'; // 荧光绿 - 重叠区域
        default:
          return '#8b5cf6'; // 默认紫色
      }
    };

    const graphNodes: GraphNode[] = allNodes.map((node, index) => {
      // 计算节点大小（自适应）
      const baseRadius = 18;
      const contentSize = node.content.length * 0.02;
      const tagSize = node.tags.length * 0.8;
      const relatedSize = node.relatedIds.length * 0.3;
      const radius = Math.min(baseRadius + contentSize + tagSize + relatedSize, 35); // 最大半径限制
      
      return {
        id: node.id,
        name: node.title.length > 15 ? node.title.substring(0, 15) + '...' : node.title,
        group: node.source || 'company',
        x: 200 + Math.cos((index / allNodes.length) * 2 * Math.PI) * 150,
        y: 200 + Math.sin((index / allNodes.length) * 2 * Math.PI) * 150,
        z: Math.sin((index / allNodes.length) * Math.PI) * 100,
        radius: radius,
        color: getNodeColor(node.source || 'company'),
        hover: false,
        velocity: {
          x: (Math.random() - 0.5) * 0.5,
          y: (Math.random() - 0.5) * 0.5,
          z: (Math.random() - 0.5) * 0.2
        }
      };
    });

    const graphLinks: GraphLink[] = graphData.links.map(link => ({
      source: link.source,
      target: link.target,
      value: link.value,
      alpha: Math.min(link.value * 2, 1)
    }));

    setNodes(graphNodes);
    setLinks(graphLinks);
    setStats(knowledgeGraph.getStats());
  };

  // 启动动画
  const startAnimation = () => {
    const animate = () => {
      setAnimationFrame(prev => (prev + 1) % 360);
      
      // 更新节点位置（力导向模拟）
      if (!isDragging && draggedNode === null) {
        setNodes(prevNodes => {
          const updatedNodes = [...prevNodes];
          
          // 1. 中心引力
          const centerX = 0;
          const centerY = 0;
          const centerForce = 0.001;
          
          updatedNodes.forEach(node => {
            const dx = centerX - node.x;
            const dy = centerY - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0) {
              node.velocity.x += (dx / distance) * centerForce * distance;
              node.velocity.y += (dy / distance) * centerForce * distance;
            }
          });
          
          // 2. 节点间斥力
          const chargeForce = -100;
          const minDistance = 50;
          
          for (let i = 0; i < updatedNodes.length; i++) {
            for (let j = i + 1; j < updatedNodes.length; j++) {
              const node1 = updatedNodes[i];
              const node2 = updatedNodes[j];
              
              const dx = node1.x - node2.x;
              const dy = node1.y - node2.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance > 0 && distance < minDistance) {
                const force = (chargeForce * 100) / (distance * distance);
                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;
                
                node1.velocity.x += fx * 0.01;
                node1.velocity.y += fy * 0.01;
                node2.velocity.x -= fx * 0.01;
                node2.velocity.y -= fy * 0.01;
              }
            }
          }
          
          // 3. 连线引力
          links.forEach(link => {
            const sourceNode = updatedNodes.find(n => n.id === link.source);
            const targetNode = updatedNodes.find(n => n.id === link.target);
            
            if (sourceNode && targetNode) {
              const dx = targetNode.x - sourceNode.x;
              const dy = targetNode.y - sourceNode.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const desiredDistance = 100;
              const linkForce = 0.01;
              
              if (distance > 0) {
                const force = (distance - desiredDistance) * linkForce;
                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;
                
                sourceNode.velocity.x += fx * 0.01;
                sourceNode.velocity.y += fy * 0.01;
                targetNode.velocity.x -= fx * 0.01;
                targetNode.velocity.y -= fy * 0.01;
              }
            }
          });
          
          // 4. 速度阻尼
          const damping = 0.95;
          updatedNodes.forEach(node => {
            node.velocity.x *= damping;
            node.velocity.y *= damping;
            node.velocity.z *= damping;
            
            // 更新位置
            node.x += node.velocity.x;
            node.y += node.velocity.y;
            node.z += node.velocity.z;
            
            // 边界检测
            const boundary = 300;
            node.x = Math.max(-boundary, Math.min(boundary, node.x));
            node.y = Math.max(-boundary, Math.min(boundary, node.y));
            node.z = Math.max(-200, Math.min(200, node.z));
          });
          
          return updatedNodes;
        });
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
  };

  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 绘制背景渐变
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#f3e8ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2 + offset.x, height / 2 + offset.y);
    ctx.scale(zoom, zoom);

    // 按Z轴排序节点（3D效果）
    const sortedNodes = [...nodes].sort((a, b) => b.z - a.z);

    // 绘制连线
    links.forEach((link, index) => {
      const source = nodes.find(n => n.id === link.source);
      const target = nodes.find(n => n.id === link.target);
      if (source && target) {
        // 3D投影
        const sourceZ = 1 / (perspective - source.z) * 500;
        const targetZ = 1 / (perspective - target.z) * 500;
        const projectedSourceX = source.x * sourceZ;
        const projectedSourceY = source.y * sourceZ;
        const projectedTargetX = target.x * targetZ;
        const projectedTargetY = target.y * targetZ;

        // 计算关联强度
        const connectionStrength = link.value;
        const alpha = Math.min(connectionStrength * 1.2, 1);
        
        // 连线动画效果
        const progress = (animationFrame + index * 15) % 360;
        const animationFactor = 0.5 + Math.sin(progress * Math.PI / 180) * 0.5;
        
        // 1. 绘制连线光晕（增强视觉效果）
        ctx.beginPath();
        ctx.moveTo(projectedSourceX, projectedSourceY);
        ctx.lineTo(projectedTargetX, projectedTargetY);
        ctx.strokeStyle = `rgba(139, 92, 246, ${alpha * 0.4 * animationFactor})`;
        ctx.lineWidth = Math.max(connectionStrength * 8, 4) * (sourceZ + targetZ) / 2;
        ctx.stroke();
        
        // 2. 绘制连线渐变效果
        const gradient = ctx.createLinearGradient(
          projectedSourceX, projectedSourceY, 
          projectedTargetX, projectedTargetY
        );
        gradient.addColorStop(0, `${source.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, `${target.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);
        
        // 3. 绘制主连线
        ctx.beginPath();
        ctx.moveTo(projectedSourceX, projectedSourceY);
        ctx.lineTo(projectedTargetX, projectedTargetY);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = Math.max(connectionStrength * 4, 2) * (sourceZ + targetZ) / 2;
        ctx.stroke();
        
        // 4. 绘制连线流动效果
        const flowProgress = (animationFrame + index * 20) % 100;
        const flowX = projectedSourceX + (projectedTargetX - projectedSourceX) * (flowProgress / 100);
        const flowY = projectedSourceY + (projectedTargetY - projectedSourceY) * (flowProgress / 100);
        ctx.beginPath();
        ctx.arc(flowX, flowY, Math.max(connectionStrength * 3, 1.5) * (sourceZ + targetZ) / 2, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8 * animationFactor})`;
        ctx.fill();
        
        // 5. 绘制箭头（更明显）
        const angle = Math.atan2(projectedTargetY - projectedSourceY, projectedTargetX - projectedSourceX);
        const arrowLength = Math.max(connectionStrength * 15, 10) * targetZ;
        const arrowWidth = arrowLength * 0.6;
        
        ctx.beginPath();
        ctx.moveTo(projectedTargetX, projectedTargetY);
        ctx.lineTo(
          projectedTargetX - arrowLength * Math.cos(angle - Math.PI / 8),
          projectedTargetY - arrowLength * Math.sin(angle - Math.PI / 8)
        );
        ctx.lineTo(
          projectedTargetX - arrowWidth * Math.cos(angle),
          projectedTargetY - arrowWidth * Math.sin(angle)
        );
        ctx.lineTo(
          projectedTargetX - arrowLength * Math.cos(angle + Math.PI / 8),
          projectedTargetY - arrowLength * Math.sin(angle + Math.PI / 8)
        );
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // 6. 绘制箭头光晕
        ctx.beginPath();
        ctx.arc(projectedTargetX, projectedTargetY, arrowLength * 0.5, 0, 2 * Math.PI);
        const arrowGlowGradient = ctx.createRadialGradient(
          projectedTargetX, projectedTargetY, 0, 
          projectedTargetX, projectedTargetY, arrowLength * 0.5
        );
        arrowGlowGradient.addColorStop(0, `${target.color}40`);
        arrowGlowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = arrowGlowGradient;
        ctx.fill();
      }
    });

    // 绘制节点
    sortedNodes.forEach(node => {
      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoveredNode === node.id;
      const isDragged = draggedNode === node.id;
      
      // 3D投影
      const z = 1 / (perspective - node.z) * 500;
      const projectedX = node.x * z;
      const projectedY = node.y * z;
      
      // 节点大小随Z轴变化
      const baseRadius = isSelected ? node.radius + 8 : isHovered ? node.radius + 4 : node.radius;
      const nodeRadius = baseRadius * z;
      
      // 绘制节点光晕
      ctx.beginPath();
      ctx.arc(projectedX, projectedY, nodeRadius + 10 * z, 0, 2 * Math.PI);
      const glowGradient = ctx.createRadialGradient(projectedX, projectedY, 0, projectedX, projectedY, nodeRadius + 10 * z);
      glowGradient.addColorStop(0, `${node.color}40`);
      glowGradient.addColorStop(0.5, `${node.color}20`);
      glowGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGradient;
      ctx.fill();
      
      // 绘制节点主体（3D气泡效果）
      ctx.beginPath();
      ctx.arc(projectedX, projectedY, nodeRadius, 0, 2 * Math.PI);
      const nodeGradient = ctx.createRadialGradient(
        projectedX - nodeRadius/3, 
        projectedY - nodeRadius/3, 
        0, 
        projectedX, 
        projectedY, 
        nodeRadius
      );
      nodeGradient.addColorStop(0, node.color);
      nodeGradient.addColorStop(0.7, node.color + '80');
      nodeGradient.addColorStop(1, node.color + '40');
      ctx.fillStyle = nodeGradient;
      ctx.fill();
      
      // 绘制节点边框
      ctx.strokeStyle = isSelected ? '#ffffff' : '#e0e7ff';
      ctx.lineWidth = (isSelected ? 3 : 2) * z;
      ctx.stroke();
      
      // 绘制节点发光效果
      if (isSelected || isHovered || isDragged) {
        ctx.beginPath();
        ctx.arc(projectedX, projectedY, nodeRadius, 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(255, 255, 255, ${isSelected || isDragged ? 0.8 : 0.5})`;
        ctx.lineWidth = 4 * z;
        ctx.stroke();
      }

      // 绘制高光效果（3D气泡感）
      ctx.beginPath();
      ctx.arc(
        projectedX - nodeRadius/2, 
        projectedY - nodeRadius/2, 
        nodeRadius/4, 
        0, 
        2 * Math.PI
      );
      ctx.fillStyle = `rgba(255, 255, 255, ${isSelected ? 0.6 : 0.4})`;
      ctx.fill();

      // 节点标签
      const fontSize = Math.max(12 * z, 9); // 最小字体大小
      ctx.font = `${fontSize}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      
      // 计算文本宽度
      const textWidth = ctx.measureText(node.name).width;
      const textHeight = fontSize * 1.2;
      
      // 绘制标签背景（更清晰）
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
      ctx.lineWidth = 1 * z;
      const labelX = projectedX;
      const labelY = projectedY + nodeRadius + textHeight / 2 + 8 * z;
      ctx.beginPath();
      ctx.roundRect(
        labelX - textWidth/2 - 10 * z, 
        labelY - textHeight/2 - 4 * z, 
        textWidth + 20 * z, 
        textHeight + 8 * z, 
        8 * z
      );
      ctx.fill();
      ctx.stroke();
      
      // 绘制标签文本（更清晰）
      ctx.fillStyle = '#1e293b';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowBlur = 2 * z;
      ctx.fillText(node.name, labelX, labelY);
      ctx.shadowBlur = 0;
    });

    ctx.restore();
  };

  useEffect(() => {
    drawGraph();
  }, [nodes, links, selectedNode, zoom, offset, animationFrame, hoveredNode]);

  const handleZoomIn = () => setZoom(Math.min(zoom * 1.2, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom / 1.2, 0.3));
  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleNodeClick = (node: GraphNode) => {
    const fullNode = knowledgeGraph.getNode(node.id);
    setSelectedNode(fullNode || null);
  };

  const getNodeAtPosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / (rect.width / canvas.width);
    const mouseY = (e.clientY - rect.top) / (rect.height / canvas.height);

    // 转换为图谱坐标
    const graphX = (mouseX - canvas.width / 2 - offset.x) / zoom;
    const graphY = (mouseY - canvas.height / 2 - offset.y) / zoom;

    // 检查是否点击到节点
    for (const node of nodes) {
      const z = 1 / (perspective - node.z) * 500;
      const projectedX = node.x * z;
      const projectedY = node.y * z;
      const distance = Math.sqrt((projectedX - graphX) ** 2 + (projectedY - graphY) ** 2);
      const nodeRadius = node.radius * z;
      if (distance < nodeRadius) {
        return node;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const clickedNode = getNodeAtPosition(e);
    if (clickedNode) {
      // 开始拖动单个节点
      setIsDragging(true);
      setDraggedNode(clickedNode.id);
      setDragStart({ x: e.clientX, y: e.clientY });
      handleNodeClick(clickedNode);
    } else {
      // 拖动整个图谱
      setIsDragging(true);
      setDraggedNode(null);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && draggedNode) {
      // 拖动单个节点
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / (rect.width / canvas.width);
      const mouseY = (e.clientY - rect.top) / (rect.height / canvas.height);

      // 转换为图谱坐标
      const graphX = (mouseX - canvas.width / 2 - offset.x) / zoom;
      const graphY = (mouseY - canvas.height / 2 - offset.y) / zoom;

      // 更新节点位置
      setNodes(prevNodes => prevNodes.map(node => {
        if (node.id === draggedNode) {
          // 简单的反投影（假设Z轴不变）
          const z = 1 / (perspective - node.z) * 500;
          return {
            ...node,
            x: graphX / z,
            y: graphY / z,
            velocity: {
              x: (graphX / z - node.x) * 0.1,
              y: (graphY / z - node.y) * 0.1,
              z: 0
            }
          };
        }
        return node;
      }));
    } else if (isDragging) {
      // 拖动整个图谱
      setOffset({ 
        x: e.clientX - dragStart.x, 
        y: e.clientY - dragStart.y 
      });
    } else {
      // 检测悬停节点
      const hoverNode = getNodeAtPosition(e);
      if (hoverNode) {
        setHoveredNode(hoverNode.id);
      } else {
        setHoveredNode(null);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedNode(null);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setDraggedNode(null);
    setHoveredNode(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(Math.max(0.3, Math.min(3, zoom * delta)));
  };

  return (
    <div className="glass-card p-8 rounded-[3rem]">
      <div className="flex flex-col gap-6">
        {/* 头部区域 */}
        <div className="flex flex-col gap-4">
          {/* 标题和操作按钮 */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl text-white shadow-lg">
                <Brain size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  知识图谱可视化
                  <Sparkles size={18} className="text-purple-500 animate-pulse" />
                </h2>
                <p className="text-sm text-slate-500">交互式知识关联网络展示</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* 数据操作按钮 */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={addMockData}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all transform hover:scale-105"
                >
                  <Database size={18} />
                  <span className="font-medium">添加模拟数据</span>
                </button>
                <button 
                  onClick={clearAllData}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:shadow-lg transition-all transform hover:scale-105"
                >
                  <Trash2 size={18} />
                  <span className="font-medium">清零数据</span>
                </button>
              </div>

              {/* 缩放控制 */}
              <div className="flex items-center gap-2 bg-white p-1 rounded-lg shadow">
                <button 
                  onClick={handleZoomIn} 
                  className="p-2 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <ZoomIn size={18} className="text-purple-600" />
                </button>
                <button 
                  onClick={handleZoomOut} 
                  className="p-2 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <ZoomOut size={18} className="text-purple-600" />
                </button>
                <button 
                  onClick={handleReset} 
                  className="p-2 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <RefreshCw size={18} className="text-purple-600" />
                </button>
              </div>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="px-4 py-2 bg-purple-100 rounded-full flex items-center gap-2">
              <Network size={16} className="text-purple-600" />
              <span className="font-medium text-purple-800">节点: {stats.nodeCount}</span>
            </div>
            <div className="px-4 py-2 bg-blue-100 rounded-full flex items-center gap-2">
              <Activity size={16} className="text-blue-600" />
              <span className="font-medium text-blue-800">连线: {stats.edgeCount}</span>
            </div>
            <div className="px-4 py-2 bg-green-100 rounded-full flex items-center gap-2">
              <Sparkles size={16} className="text-green-600" />
              <span className="font-medium text-green-800">平均连接: {stats.avgConnections}</span>
            </div>
          </div>
        </div>

        {/* 图谱说明 */}
        <div className="p-5 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-purple-200 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600 flex-shrink-0">
              <Info size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-blue-800 mb-2">图谱使用说明</h3>
              <p className="text-sm text-blue-700 mb-3">
                知识图谱展示了知识点之间的关联关系，帮助您快速了解知识体系的结构和连接强度。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-blue-600">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span><strong>节点</strong>：代表独立的知识点</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-purple-500"></div>
                  <span><strong>连线</strong>：表示知识点关联强度</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-pink-500 animate-pulse"></div>
                  <span><strong>颜色</strong>：不同颜色代表不同知识类别</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-white border-2 border-purple-500"></div>
                  <span><strong>点击节点</strong>：查看详细信息</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span><strong>鼠标拖拽</strong>：移动整个图谱</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span><strong>滚轮缩放</strong>：放大缩小图谱</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 图谱画布 */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl opacity-50"></div>
          <canvas
            ref={canvasRef}
            width={1000}
            height={600}
            className="w-full h-[600px] relative z-10 rounded-2xl border border-purple-200 shadow-lg cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onWheel={handleWheel}
          />

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Brain size={40} className="text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">暂无知识数据</h3>
                <p className="text-slate-500 mb-6">请点击上方「添加模拟数据」按钮，开始探索知识图谱</p>
                <button 
                  onClick={addMockData}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg transition-all transform hover:scale-105"
                >
                  添加模拟数据
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 选中节点详情 */}
        {selectedNode && (
          <div className="mt-6 p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <Brain size={32} />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl text-purple-800 mb-2">{selectedNode.title}</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                    类型: {selectedNode.type}
                  </span>
                  {selectedNode.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-purple-700 mb-3 leading-relaxed">
                  {selectedNode.content}
                </p>
                <div className="flex items-center justify-between text-xs text-purple-500">
                  <span>关联知识: {selectedNode.relatedIds.length} 个</span>
                  <span>创建时间: {new Date(selectedNode.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 标签云 */}
        {stats.topTags && stats.topTags.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-purple-500" />
              热门知识标签
            </h3>
            <div className="flex flex-wrap gap-3">
              {(stats.topTags || []).slice(0, 10).map((tag, index) => (
                <span
                  key={tag.tag}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-medium"
                  style={{ 
                    opacity: 0.6 + (index * 0.05),
                    transform: `scale(${0.8 + index * 0.03})`,
                    boxShadow: `0 4px 12px ${tag.tag === '安装' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(236, 72, 153, 0.3)'}`
                  }}
                >
                  {tag.tag} <span className="bg-white text-purple-600 px-2 py-0.5 rounded-full text-xs ml-1">{tag.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeGraphView;
