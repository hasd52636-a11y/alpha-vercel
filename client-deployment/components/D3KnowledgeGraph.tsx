import React, { useEffect, useRef, useState } from 'react'; 
import * as d3 from 'd3'; 

// 双中心知识图谱数据结构
// 重新生成的模拟数据，包含丰富的商家和用户数据
const initialData = { 
  nodes: [ 
    // 商家中心节点
    { id: "CENTER_COMPANY", label: "商家知识库", type: "company", size: 20, category: "中心", isCenter: true },
    
    // 商家知识库节点
    { id: "C1", label: "产品安装指南", type: "company", size: 12, category: "技术支持" }, 
    { id: "C2", label: "保修政策", type: "company", size: 10, category: "用户服务" }, 
    { id: "C3", label: "API文档", type: "company", size: 10, category: "技术支持" }, 
    { id: "C4", label: "故障排查", type: "company", size: 10, category: "技术支持" }, 
    { id: "C5", label: "安全规范", type: "company", size: 10, category: "技术支持" },
    { id: "C6", label: "物流政策", type: "company", size: 10, category: "用户服务" },
    { id: "C7", label: "退款流程", type: "company", size: 10, category: "用户服务" },
    { id: "C8", label: "产品规格", type: "company", size: 10, category: "技术支持" },
    { id: "C9", label: "使用教程", type: "company", size: 10, category: "技术支持" },
    
    // 用户中心节点
    { id: "CENTER_USER", label: "用户问题", type: "user", size: 20, category: "中心", isCenter: true },
    
    // 用户问题节点
    { id: "U1", label: "怎么安装？", type: "user", size: 8, category: "技术支持" }, 
    { id: "U2", label: "快递多久到？", type: "user", size: 8, category: "用户服务" }, 
    { id: "U3", label: "接口调不通", type: "user", size: 8, category: "技术支持" }, 
    { id: "U4", label: "系统报错", type: "user", size: 8, category: "技术支持" }, 
    { id: "U5", label: "如何保修", type: "user", size: 8, category: "用户服务" },
    { id: "U6", label: "想申请退款", type: "user", size: 8, category: "用户服务" },
    { id: "U7", label: "产品尺寸", type: "user", size: 8, category: "技术支持" },
    { id: "U8", label: "不会使用", type: "user", size: 8, category: "技术支持" },
    
    // 重合节点（两个知识库的交集）
    { id: "O1", label: "退换货流程", type: "overlap", score: 0.95, size: 15, category: "用户服务" }, 
    { id: "O2", label: "系统报错502", type: "overlap", score: 0.92, size: 15, category: "技术支持" }, 
    { id: "O3", label: "安装常见问题", type: "overlap", score: 0.88, size: 15, category: "技术支持" },
    { id: "O4", label: "物流配送问题", type: "overlap", score: 0.85, size: 15, category: "用户服务" },
    { id: "O5", label: "产品规格说明", type: "overlap", score: 0.90, size: 15, category: "技术支持" },
    { id: "O6", label: "使用常见问题", type: "overlap", score: 0.87, size: 15, category: "技术支持" },
  ], 
  links: [ 
    // 商家中心连接
    { source: "CENTER_COMPANY", target: "C1", strength: 1.0 },
    { source: "CENTER_COMPANY", target: "C2", strength: 1.0 },
    { source: "CENTER_COMPANY", target: "C3", strength: 1.0 },
    { source: "CENTER_COMPANY", target: "C4", strength: 1.0 },
    { source: "CENTER_COMPANY", target: "C5", strength: 1.0 },
    { source: "CENTER_COMPANY", target: "C6", strength: 1.0 },
    { source: "CENTER_COMPANY", target: "C7", strength: 1.0 },
    { source: "CENTER_COMPANY", target: "C8", strength: 1.0 },
    { source: "CENTER_COMPANY", target: "C9", strength: 1.0 },
    
    // 用户中心连接
    { source: "CENTER_USER", target: "U1", strength: 1.0 },
    { source: "CENTER_USER", target: "U2", strength: 1.0 },
    { source: "CENTER_USER", target: "U3", strength: 1.0 },
    { source: "CENTER_USER", target: "U4", strength: 1.0 },
    { source: "CENTER_USER", target: "U5", strength: 1.0 },
    { source: "CENTER_USER", target: "U6", strength: 1.0 },
    { source: "CENTER_USER", target: "U7", strength: 1.0 },
    { source: "CENTER_USER", target: "U8", strength: 1.0 },
    
    // 重合连接
    { source: "C1", target: "O3", strength: 0.88 },
    { source: "O3", target: "U1", strength: 0.88 },
    { source: "C2", target: "O1", strength: 0.95 },
    { source: "O1", target: "U5", strength: 0.95 },
    { source: "C3", target: "O2", strength: 0.92 },
    { source: "O2", target: "U4", strength: 0.92 },
    { source: "C6", target: "O4", strength: 0.85 },
    { source: "O4", target: "U2", strength: 0.85 },
    { source: "C7", target: "O1", strength: 0.9 },
    { source: "O1", target: "U6", strength: 0.9 },
    { source: "C8", target: "O5", strength: 0.9 },
    { source: "O5", target: "U7", strength: 0.9 },
    { source: "C9", target: "O6", strength: 0.87 },
    { source: "O6", target: "U8", strength: 0.87 },
    
    // 直接连接（非重合）
    { source: "C4", target: "U4", strength: 0.6 },
    { source: "C5", target: "U1", strength: 0.5 },
    { source: "C3", target: "U3", strength: 0.7 },
  ] 
};

const D3KnowledgeGraph: React.FC = () => { 
  const svgRef = useRef<SVGSVGElement>(null); 
  const [selectedNode, setSelectedNode] = useState<any>(null); 

  useEffect(() => { 
    if (!svgRef.current) return; 

    const width = svgRef.current.clientWidth; 
    const height = 600; 
    const svg = d3.select(svgRef.current); 
    
    svg.selectAll("*").remove(); // 清除旧画布 

    // --- 1. 定义滤镜和渐变 --- 
    const defs = svg.append("defs"); 

    // 荧光发光滤镜 
    const filter = defs.append("filter") 
      .attr("id", "glow") 
      .attr("x", "-50%") 
      .attr("y", "-50%") 
      .attr("width", "200%") 
      .attr("height", "200%"); 
    
    filter.append("feGaussianBlur") 
      .attr("stdDeviation", "4") 
      .attr("result", "coloredBlur"); 
    
    const feMerge = filter.append("feMerge"); 
    feMerge.append("feMergeNode").attr("in", "coloredBlur"); 
    feMerge.append("feMergeNode").attr("in", "SourceGraphic"); 

    // --- 2. 颜色配置 --- 
    const colors = { 
      company: "#00d2ff", // 荧光蓝 
      user: "#ffdb00",    // 亮黄 
      overlap: "#00ff88", // 极光绿 
      link: "rgba(255, 255, 255, 0.1)" 
    }; 

    // --- 3. 初始化力导向布局 --- 
    // 为节点设置初始位置，形成双中心布局
    initialData.nodes.forEach(node => {
      if (node.id === "CENTER_COMPANY") {
        // 商家中心在左侧
        node.x = width * 0.3;
        node.y = height / 2;
      } else if (node.id === "CENTER_USER") {
        // 用户中心在右侧
        node.x = width * 0.7;
        node.y = height / 2;
      } else if (node.type === "company") {
        // 商家节点围绕左侧中心
        const angle = Math.random() * Math.PI * 2;
        const distance = 150;
        node.x = width * 0.3 + Math.cos(angle) * distance;
        node.y = height / 2 + Math.sin(angle) * distance;
      } else if (node.type === "user") {
        // 用户节点围绕右侧中心
        const angle = Math.random() * Math.PI * 2;
        const distance = 150;
        node.x = width * 0.7 + Math.cos(angle) * distance;
        node.y = height / 2 + Math.sin(angle) * distance;
      } else if (node.type === "overlap") {
        // 重合节点在中间
        node.x = width / 2 + (Math.random() - 0.5) * 100;
        node.y = height / 2 + (Math.random() - 0.5) * 100;
      }
    });
    
    const simulation = d3.forceSimulation(initialData.nodes) 
      .force("link", d3.forceLink(initialData.links).id((d: any) => d.id).distance((d: any) => {
        // 中心节点连接更短
        if (d.source.isCenter || d.target.isCenter) return 80;
        // 重合连接中等长度
        if ((d.source.type === "overlap" || d.target.type === "overlap")) return 100;
        // 其他连接更长
        return 120;
      })) 
      .force("charge", d3.forceManyBody().strength((d: any) => {
        // 中心节点电荷更强
        return d.isCenter ? -300 : -150;
      })) 
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.05)) 
      .force("collision", d3.forceCollide().radius((d: any) => d.size + 15));
    
    // 加速稳定过程 - 减慢跳动速度
    simulation.alpha(0.2).alphaDecay(0.03).alphaTarget(0); 

    // --- 4. 绘制连线 --- 
    const link = svg.append("g") 
      .selectAll("line") 
      .data(initialData.links) 
      .join("line") 
      .attr("stroke", colors.link) 
      .attr("stroke-width", (d: any) => d.strength * 2 || 1) 
      .attr("stroke-dasharray", (d: any) => d.strength && d.strength > 0.5 ? "0" : "4 2"); // 弱关联用虚线 

    // --- 5. 绘制节点容器 --- 
    const node = svg.append("g") 
      .selectAll(".node") 
      .data(initialData.nodes) 
      .join("g") 
      .attr("class", "node") 
      .style("cursor", "pointer") 
      .call(drag(simulation)) 
      .on("click", (event: any, d: any) => { 
        handleNodeClick(d); 
        highlightNeighbors(d); 
      }); 

    // 节点圆圈 
    const nodeCircle = node.append("circle") 
      .attr("r", (d: any) => d.size) 
      .attr("fill", (d: any) => {
        // 明确区分两个中心节点的颜色
        if (d.isCenter) {
          // 商家中心：亮蓝色
          if (d.type === "company") return "#00f2ff";
          // 用户中心：亮黄色
          else return "#ffdb00";
        }
        // 普通节点使用对应颜色
        return colors[d.type];
      }) 
      .style("filter", (d: any) => {
        // 中心节点使用更强的发光效果
        return d.isCenter ? "url(#glow)" : "url(#glow)";
      }) 
      .style("cursor", "pointer")
      .style("transition", "all 0.3s ease"); 

    // 为中心节点添加特殊效果
    node.filter((d: any) => d.isCenter) 
      .append("circle") 
      .attr("r", (d: any) => d.size + 5) 
      .attr("fill", "none") 
      .attr("stroke", (d: any) => d.type === "company" ? "#00f2ff" : "#ffdb00") 
      .attr("stroke-width", 2) 
      .attr("stroke-dasharray", "5,5") 
      .style("animation", "pulse 2s infinite"); 

    // 节点文字 
    node.append("text") 
      .text((d: any) => d.label) 
      .attr("dy", (d: any) => d.isCenter ? 35 : 25) 
      .attr("text-anchor", "middle") 
      .attr("fill", (d: any) => {
        // 中心节点文字更亮
        return d.isCenter ? "#ffffff" : "rgba(255,255,255,0.8)";
      }) 
      .style("font-size", (d: any) => d.isCenter ? "14px" : "12px") 
      .style("font-weight", (d: any) => d.isCenter ? "bold" : "normal") 
      .style("pointer-events", "none");

    // 添加SVG动画定义
    defs.append("style") 
      .text(`
        @keyframes pulse {
          0% { stroke-opacity: 1; }
          50% { stroke-opacity: 0.5; }
          100% { stroke-opacity: 1; }
        }
      `); 

    // --- 6. 动画更新 --- 
    simulation.on("tick", () => { 
      link 
        .attr("x1", (d: any) => d.source.x) 
        .attr("y1", (d: any) => d.source.y) 
        .attr("x2", (d: any) => d.target.x) 
        .attr("y2", (d: any) => d.target.y); 

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`); 
    }); 

    // 高亮逻辑 
    function highlightNeighbors(d: any) { 
      const neighbors = new Set<string>(); 
      initialData.links.forEach((l: any) => { 
        if (l.source.id === d.id) neighbors.add(l.target.id); 
        if (l.target.id === d.id) neighbors.add(l.source.id); 
      }); 

      node.transition().duration(300) 
        .style("opacity", (n: any) => (n.id === d.id || neighbors.has(n.id) ? 1 : 0.15)); 
      link.transition().duration(300) 
        .style("stroke", (l: any) => (l.source.id === d.id || l.target.id === d.id ? colors[d.type] : colors.link)) 
        .style("opacity", (l: any) => (l.source.id === d.id || l.target.id === d.id ? 1 : 0.05)); 
    }

    // 背景点击重置 
    svg.on("click", (e: any) => { 
      if (e.target.tagName === "svg") { 
        node.transition().duration(300).style("opacity", 1); 
        link.transition().duration(300).style("opacity", 1); 
        setSelectedNode(null); 
      } 
    }); 

    // 拖拽函数 
    function drag(simulation: any) { 
      return d3.drag() 
        .on("start", (event: any) => { 
          if (!event.active) simulation.alphaTarget(0.3).restart(); 
          event.subject.fx = event.subject.x; 
          event.subject.fy = event.subject.y; 
        }) 
        .on("drag", (event: any) => { 
          event.subject.fx = event.x; 
          event.subject.fy = event.y; 
        }) 
        .on("end", (event: any) => { 
          if (!event.active) simulation.alphaTarget(0); 
          event.subject.fx = null; 
          event.subject.fy = null; 
        }); 
    } 

  }, []); 

  const [info, setInfo] = useState("点击节点查看知识详情");

  // 在点击节点时更新info状态
  const handleNodeClick = (d: any) => {
    setSelectedNode(d);
    setInfo(`已选中: ${d.label} | 类型: ${d.type === 'overlap' ? '完全覆盖' : d.type === 'company' ? '公司知识库' : '需补充'}`);
  };

  return ( 
    <div className="bg-[#020617] p-5 rounded-2xl"> 
      <div className="flex justify-between items-center mb-4"> 
        <div className="text-white"> 
          <h2 className="text-xl font-bold text-[#00ff88] mb-1">售后知识库覆盖度分析</h2> 
          <p className="text-xs opacity-60">基于向量相似度的自动化识别系统</p> 
        </div> 
        <div className="text-[#00ff88] font-bold">{info}</div> 
      </div> 
      
      <div className="relative border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden"> 
        <svg ref={svgRef} className="w-full h-[600px]" /> 
        
        {/* 左下角图例 */} 
        <div className="absolute bottom-5 left-5 bg-black/50 p-3 rounded-lg text-white text-xs"> 
          <div className="mb-2">
            <span className="text-[#00d2ff]">●</span> <span>公司知识库</span>
          </div>
          <div className="mb-2">
            <span className="text-[#ffdb00]">●</span> <span>用户提问</span>
          </div>
          <div className="mb-2">
            <span className="text-[#00ff88]">●</span> <span>成功覆盖</span>
          </div>
          <div className="mt-3 text-[#00ff88] text-xs">
            提示: 点击节点查看详情
          </div>
        </div> 
        
        {selectedNode && ( 
          <div className="absolute bottom-5 right-5 bg-black/80 p-4 border border-[#00d2ff] text-white rounded-lg"> 
            <h4 className="font-bold mb-2">节点详情</h4> 
            <p className="text-sm">名称: {selectedNode.label}</p> 
            <p className="text-sm">类型: {selectedNode.type === 'company' ? '公司知识库' : selectedNode.type === 'user' ? '用户提问' : '成功覆盖'}</p> 
            {selectedNode.score && (
              <p className="text-sm">相似度: {Math.round(selectedNode.score * 100)}%</p>
            )}
            <p className="text-sm">分类: {selectedNode.category}</p> 
            <p className="text-sm">大小: {selectedNode.size}</p> 
          </div> 
        )} 
      </div> 
    </div> 
  ); 
};

export default D3KnowledgeGraph;