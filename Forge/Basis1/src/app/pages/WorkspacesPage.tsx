import { useState } from "react";
import { User, Crown, Shield, Zap, Brain, Eye, Cpu, Sparkles } from "lucide-react";

interface CouncilMember {
  id: number;
  name: string;
  role: string;
  icon: any;
  status: "active" | "idle" | "offline";
  avatar: string;
}

export function WorkspacesPage() {
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [messages, setMessages] = useState<Array<{id: number, memberId: number, text: string, timestamp: Date}>>([
    { id: 1, memberId: 4, text: "Proposal Gamma is under review...", timestamp: new Date(Date.now() - 300000) },
    { id: 2, memberId: 1, text: "Analyzing neural data streams...", timestamp: new Date(Date.now() - 240000) },
    { id: 3, memberId: 2, text: "Security protocols confirmed.", timestamp: new Date(Date.now() - 120000) },
    { id: 4, memberId: 4, text: "Consensus status: 62% - Pending votes...", timestamp: new Date(Date.now() - 60000) },
  ]);
  const [inputMessage, setInputMessage] = useState("");

  const councilMembers: CouncilMember[] = [
    { id: 1, name: "Prime Architect", role: "System Lead", icon: Crown, status: "active", avatar: "PA" },
    { id: 2, name: "Security Chief", role: "Protection", icon: Shield, status: "active", avatar: "SC" },
    { id: 3, name: "Energy Director", role: "Resources", icon: Zap, status: "idle", avatar: "ED" },
    { id: 4, name: "Neural Core", role: "Intelligence", icon: Brain, status: "active", avatar: "NC" },
    { id: 5, name: "Vision Analyst", role: "Oversight", icon: Eye, status: "active", avatar: "VA" },
    { id: 6, name: "Logic Processor", role: "Computing", icon: Cpu, status: "idle", avatar: "LP" },
    { id: 7, name: "Innovation Lead", role: "Research", icon: Sparkles, status: "offline", avatar: "IL" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "#00ff88";
      case "idle": return "#ffaa00";
      case "offline": return "#666666";
      default: return "#666666";
    }
  };

  return (
    <div className="h-full bg-black relative overflow-hidden">
      {/* DRAMATIC VOLUMETRIC LIGHTING */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Light rays from table center */}
        {[...Array(16)].map((_, i) => {
          const angle = (i * 22.5) * (Math.PI / 180);
          const length = 800;
          const x = 50 + Math.cos(angle) * 20;
          const y = 50 + Math.sin(angle) * 20;
          return (
            <div
              key={`ray-${i}`}
              className="absolute left-1/2 top-1/2"
              style={{
                width: '2px',
                height: `${length}px`,
                background: `linear-gradient(180deg, rgba(255,107,61,0.3) 0%, rgba(255,107,61,0.1) 50%, transparent 100%)`,
                transform: `translate(-50%, -50%) rotate(${i * 22.5}deg)`,
                transformOrigin: 'center',
                animation: `rotateRay 30s linear infinite`,
                animationDelay: `${-i * 0.5}s`,
                filter: 'blur(1px)',
              }}
            />
          );
        })}

        {/* Massive central bloom */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] bg-[#ff6b3d] opacity-20 blur-[150px] rounded-full animate-pulse" 
          style={{ animationDuration: '4s' }}
        />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#ff6b3d] opacity-30 blur-[100px] rounded-full animate-pulse" 
          style={{ animationDuration: '3s' }}
        />
      </div>

      {/* Floating Energy Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(60)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              background: i % 3 === 0 ? '#ff6b3d' : i % 3 === 1 ? '#ff8c5d' : '#ffaa7d',
              boxShadow: `0 0 ${10 + Math.random() * 20}px currentColor`,
              animation: `float ${8 + Math.random() * 15}s infinite ease-in-out, pulse ${2 + Math.random() * 3}s infinite ease-in-out`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: 0.4 + Math.random() * 0.6,
            }}
          />
        ))}
      </div>

      {/* Council Room */}
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        {/* Epic Title */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center z-50">
          <div className="relative inline-block">
            {/* Glow behind text */}
            <div className="absolute inset-0 blur-2xl bg-[#ff6b3d] opacity-60" />
            
            <h1 className="relative text-6xl font-black tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b3d] via-[#ff8c5d] to-[#ff6b3d]"
              style={{
                WebkitTextStroke: '1px rgba(255, 107, 61, 0.5)',
                filter: 'drop-shadow(0 0 30px rgba(255, 107, 61, 0.8)) drop-shadow(0 0 60px rgba(255, 107, 61, 0.4))',
              }}
            >
              NEURAL COUNCIL
            </h1>
            
            {/* Animated scan line */}
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-[#ff6b3d] to-transparent animate-scanline" />
          </div>
        </div>

        {/* Main 3D Scene */}
        <div className="relative flex items-center justify-center w-full h-full" style={{ perspective: "3000px" }}>
          <div 
            className="relative"
            style={{
              width: "100%",
              height: "100%",
              transformStyle: "preserve-3d",
            }}
          >
            {/* MASSIVE 3D HOLOGRAPHIC TABLE */}
            <div className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2" 
              style={{ 
                transformStyle: "preserve-3d",
                transform: "translateX(-50%) translateY(-50%) translateZ(0px)"
              }}
            >
              <div 
                className="relative"
                style={{
                  width: "1600px",
                  height: "800px",
                  transform: "rotateX(75deg) translateZ(-150px)",
                  transformStyle: "preserve-3d",
                }}
              >
                {/* Ultra Detailed Table Surface */}
                <div className="absolute inset-0">
                  <svg viewBox="0 0 1600 800" className="w-full h-full">
                    <defs>
                      <radialGradient id="tableCenter">
                        <stop offset="0%" stopColor="#ff6b3d" stopOpacity="0.8" />
                        <stop offset="30%" stopColor="#ff6b3d" stopOpacity="0.4" />
                        <stop offset="60%" stopColor="#1a1a1a" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#0a0a0a" stopOpacity="1" />
                      </radialGradient>
                      <filter id="megaGlow">
                        <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                      <linearGradient id="edgeGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="50%" stopColor="#ff6b3d" stopOpacity="1" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                    
                    {/* Main massive holographic surface */}
                    <ellipse cx="800" cy="600" rx="650" ry="500" fill="url(#tableCenter)" stroke="#ff6b3d" strokeWidth="6" opacity="0.9" filter="url(#megaGlow)" />
                    
                    {/* Rotating ring animations */}
                    {[600, 550, 500, 450, 400, 350, 300, 250, 200, 150, 100].map((rx, i) => (
                      <ellipse 
                        key={`ring-${i}`}
                        cx="800" 
                        cy="600" 
                        rx={rx} 
                        ry={rx * 0.77} 
                        fill="none" 
                        stroke="#ff6b3d" 
                        strokeWidth={i < 3 ? "4" : i < 6 ? "2" : "1"} 
                        opacity={0.8 - i * 0.05}
                        filter={i < 5 ? "url(#megaGlow)" : "none"}
                      >
                        <animate attributeName="stroke-opacity" values={`${0.3 + i * 0.05};${0.8 - i * 0.05};${0.3 + i * 0.05}`} dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
                      </ellipse>
                    ))}
                    
                    {/* Ultra-detailed radial tech segments */}
                    {[...Array(64)].map((_, i) => {
                      const angle = (i * 5.625) * (Math.PI / 180);
                      const innerR = 100;
                      const outerR = 650;
                      const x1 = 800 + Math.cos(angle) * innerR;
                      const y1 = 600 + Math.sin(angle) * innerR * 0.77;
                      const x2 = 800 + Math.cos(angle) * outerR;
                      const y2 = 600 + Math.sin(angle) * outerR * 0.77;
                      const isMajor = i % 8 === 0;
                      return (
                        <line 
                          key={`segment-${i}`}
                          x1={x1} 
                          y1={y1} 
                          x2={x2} 
                          y2={y2} 
                          stroke="#ff6b3d" 
                          strokeWidth={isMajor ? "3" : "1"} 
                          opacity={isMajor ? 0.7 : 0.3}
                        >
                          {isMajor && (
                            <animate attributeName="opacity" values="0.3;0.9;0.3" dur={`${2 + (i % 4) * 0.5}s`} repeatCount="indefinite" />
                          )}
                        </line>
                      );
                    })}
                    
                    {/* Circuit node clusters */}
                    {[500, 400, 300, 200].map((radius, ringIdx) => (
                      <g key={`nodes-${ringIdx}`}>
                        {[...Array(32)].map((_, i) => {
                          const angle = (i * 11.25) * (Math.PI / 180);
                          const x = 800 + Math.cos(angle) * radius;
                          const y = 600 + Math.sin(angle) * radius * 0.77;
                          const size = 3 + ringIdx;
                          return (
                            <circle 
                              key={i}
                              cx={x} 
                              cy={y} 
                              r={size} 
                              fill="#ff6b3d" 
                              opacity={0.7}
                              filter="url(#megaGlow)"
                            >
                              <animate attributeName="r" values={`${size};${size + 2};${size}`} dur={`${2 + i * 0.1}s`} repeatCount="indefinite" />
                            </circle>
                          );
                        })}
                      </g>
                    ))}
                    
                    {/* Pulsing data streams */}
                    {[...Array(8)].map((_, i) => {
                      const y = 150 + i * 80;
                      return (
                        <g key={`stream-${i}`}>
                          <line x1="150" y1={y} x2="1450" y2={y} stroke="#ff6b3d" strokeWidth="2" opacity="0.4" strokeDasharray="10,10">
                            <animate attributeName="stroke-dashoffset" from="20" to="0" dur="2s" repeatCount="indefinite" />
                          </line>
                        </g>
                      );
                    })}
                    
                    {/* MASSIVE CENTER CORE */}
                    <circle cx="800" cy="600" r="120" fill="none" stroke="#ff6b3d" strokeWidth="8" opacity="0.9" filter="url(#megaGlow)">
                      <animate attributeName="r" values="120;130;120" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="800" cy="600" r="90" fill="rgba(255,107,61,0.3)" stroke="#ff6b3d" strokeWidth="4" opacity="0.8">
                      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="800" cy="600" r="60" fill="rgba(255,107,61,0.5)" opacity="0.6">
                      <animate attributeName="r" values="60;70;60" dur="2.5s" repeatCount="indefinite" />
                    </circle>
                    
                    {/* Tech corner frames */}
                    {[[200, 150], [1400, 150], [200, 650], [1400, 650]].map(([x, y], i) => (
                      <g key={`corner-${i}`}>
                        <path d={`M ${x-40},${y} L ${x},${y} L ${x},${y-40}`} stroke="#ff6b3d" strokeWidth="4" fill="none" opacity="0.8" filter="url(#megaGlow)" />
                        <path d={`M ${x-40},${y} L ${x},${y} L ${x},${y+40}`} stroke="#ff6b3d" strokeWidth="4" fill="none" opacity="0.8" filter="url(#megaGlow)" />
                      </g>
                    ))}
                  </svg>
                </div>

                {/* Massive glow effects on edges */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(255,107,61,0.1) 70%, rgba(255,107,61,0.2) 100%)',
                    boxShadow: `
                      inset 0 0 200px rgba(255, 107, 61, 0.3),
                      0 0 150px rgba(255, 107, 61, 0.5),
                      0 50px 200px rgba(0, 0, 0, 0.9)
                    `,
                  }}
                />
              </div>
            </div>

            {/* Council Members - PERFECT SEMICIRCLE */}
            {councilMembers.map((member, index) => {
              const Icon = member.icon;
              const isSelected = selectedMember === member.id;
              
              // Perfect semicircle placement
              const angle = (index / (councilMembers.length - 1)) * 160 - 80;
              const radius = 680;
              const x = Math.sin((angle * Math.PI) / 180) * radius;
              const y = -Math.cos((angle * Math.PI) / 180) * radius * 0.4 - 150;
              const statusColor = getStatusColor(member.status);

              return (
                <div
                  key={member.id}
                  className="absolute transition-all duration-700 ease-out cursor-pointer"
                  style={{
                    left: "50%",
                    top: "50%",
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${isSelected ? 1.2 : 1})`,
                    zIndex: isSelected ? 100 : 30,
                  }}
                  onClick={() => setSelectedMember(isSelected ? null : member.id)}
                >
                  {/* Hologram Card */}
                  <div className="relative group">
                    {/* Beam of light from card to table */}
                    {member.status === "active" && (
                      <div 
                        className="absolute left-1/2 top-full w-0.5 h-32 -translate-x-1/2 bg-gradient-to-b from-[#ff6b3d] to-transparent"
                        style={{
                          boxShadow: '0 0 20px rgba(255, 107, 61, 0.8)',
                          filter: 'blur(1px)',
                        }}
                      />
                    )}
                    
                    {/* Main card */}
                    <div 
                      className={`relative w-36 h-44 rounded-2xl overflow-hidden transition-all duration-700
                        ${isSelected 
                          ? 'bg-gradient-to-br from-[#2a1a15] to-[#1a0f0a]' 
                          : 'bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a]'
                        }
                      `}
                      style={{
                        border: `3px solid ${statusColor}`,
                        boxShadow: `
                          0 0 ${isSelected ? '80' : '40'}px ${statusColor},
                          0 0 ${isSelected ? '120' : '60'}px ${statusColor}80,
                          inset 0 0 ${isSelected ? '60' : '30'}px ${statusColor}20
                        `,
                      }}
                    >
                      {/* Animated scan effect */}
                      <div 
                        className="absolute inset-0 bg-gradient-to-b from-transparent via-white to-transparent opacity-20"
                        style={{
                          height: '100%',
                          animation: 'scan 3s linear infinite',
                        }}
                      />
                      
                      {/* Content */}
                      <div className="relative h-full flex flex-col items-center justify-center p-4">
                        {/* Status indicator */}
                        <div 
                          className="absolute top-3 left-3 w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: statusColor,
                            boxShadow: `0 0 15px ${statusColor}, 0 0 30px ${statusColor}`,
                            animation: member.status === "active" ? 'pulse 2s infinite' : 'none',
                          }}
                        />
                        
                        {/* Icon container */}
                        <div 
                          className="relative w-20 h-20 rounded-2xl flex items-center justify-center mb-3"
                          style={{
                            background: `radial-gradient(circle, ${statusColor}40 0%, ${statusColor}20 50%, transparent 100%)`,
                            boxShadow: `0 0 40px ${statusColor}60`,
                          }}
                        >
                          <Icon 
                            className="w-11 h-11"
                            style={{
                              color: statusColor,
                              filter: `drop-shadow(0 0 20px ${statusColor})`,
                            }}
                          />
                        </div>
                        
                        {/* Name */}
                        <h3 
                          className="text-xs font-bold text-center tracking-wide"
                          style={{
                            color: statusColor,
                            textShadow: `0 0 20px ${statusColor}`,
                          }}
                        >
                          {member.name.toUpperCase()}
                        </h3>
                        
                        {/* Tech line */}
                        <div 
                          className="w-20 h-px mt-2"
                          style={{
                            background: `linear-gradient(90deg, transparent, ${statusColor}, transparent)`,
                            boxShadow: `0 0 10px ${statusColor}`,
                          }}
                        />
                      </div>

                      {/* Corner brackets */}
                      {[[2, 2, 'top', 'left'], [2, 2, 'top', 'right'], [2, 2, 'bottom', 'left'], [2, 2, 'bottom', 'right']].map(([size, pos, v, h], i) => (
                        <div
                          key={i}
                          className="absolute w-4 h-4"
                          style={{
                            [v as string]: pos,
                            [h as string]: pos,
                            borderTop: v === 'top' ? `2px solid ${statusColor}` : 'none',
                            borderBottom: v === 'bottom' ? `2px solid ${statusColor}` : 'none',
                            borderLeft: h === 'left' ? `2px solid ${statusColor}` : 'none',
                            borderRight: h === 'right' ? `2px solid ${statusColor}` : 'none',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* COUNCIL MASTER - MAXIMUM AUTHORITY */}
            <div 
              className="absolute left-1/2 top-[85%] -translate-x-1/2 z-50"
            >
              <div className="relative">
                {/* Massive power beam */}
                <div 
                  className="absolute left-1/2 -top-40 w-1 h-40 -translate-x-1/2 bg-gradient-to-t from-[#ff6b3d] to-transparent"
                  style={{
                    boxShadow: '0 0 40px rgba(255, 107, 61, 1), 0 0 80px rgba(255, 107, 61, 0.6)',
                    filter: 'blur(2px)',
                  }}
                />
                
                {/* Main authority card */}
                <div 
                  className="relative w-52 h-60 rounded-3xl bg-gradient-to-br from-[#2a1510] via-[#1a0f0a] to-[#0a0505] overflow-hidden"
                  style={{
                    border: '4px solid #ff6b3d',
                    boxShadow: `
                      0 0 100px rgba(255, 107, 61, 0.9),
                      0 0 200px rgba(255, 107, 61, 0.6),
                      0 0 300px rgba(255, 107, 61, 0.3),
                      inset 0 0 80px rgba(255, 107, 61, 0.2)
                    `,
                  }}
                >
                  {/* Animated power pulse */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-b from-[#ff6b3d] via-transparent to-[#ff6b3d] opacity-30 animate-pulse"
                    style={{ animationDuration: '2s' }}
                  />
                  
                  {/* Content */}
                  <div className="relative h-full flex flex-col items-center justify-center">
                    {/* Laurel wreaths */}
                    <div className="absolute top-16 left-4 text-4xl opacity-80"
                      style={{ filter: 'drop-shadow(0 0 20px rgba(255, 107, 61, 0.8))' }}
                    >
                      🌿
                    </div>
                    <div className="absolute top-16 right-4 text-4xl opacity-80 scale-x-[-1]"
                      style={{ filter: 'drop-shadow(0 0 20px rgba(255, 107, 61, 0.8))' }}
                    >
                      🌿
                    </div>
                    
                    {/* Master icon */}
                    <div 
                      className="relative w-28 h-28 rounded-full flex items-center justify-center mb-4"
                      style={{
                        background: 'radial-gradient(circle, rgba(255,107,61,0.6) 0%, rgba(255,107,61,0.3) 50%, transparent 100%)',
                        boxShadow: '0 0 80px rgba(255, 107, 61, 0.9), inset 0 0 40px rgba(255, 107, 61, 0.4)',
                      }}
                    >
                      <User 
                        className="w-16 h-16 text-[#ff6b3d]"
                        style={{
                          filter: 'drop-shadow(0 0 30px rgba(255, 107, 61, 1)) drop-shadow(0 0 60px rgba(255, 107, 61, 0.8))',
                        }}
                      />
                    </div>
                    
                    {/* Title */}
                    <h2 
                      className="text-xl font-black tracking-[0.3em] mb-2"
                      style={{
                        color: '#ff6b3d',
                        textShadow: '0 0 30px rgba(255, 107, 61, 1), 0 0 60px rgba(255, 107, 61, 0.6)',
                      }}
                    >
                      COUNCIL MASTER
                    </h2>
                    
                    {/* Power bar */}
                    <div 
                      className="w-32 h-1 rounded-full mb-2"
                      style={{
                        background: 'linear-gradient(90deg, transparent, #ff6b3d, transparent)',
                        boxShadow: '0 0 20px rgba(255, 107, 61, 0.8)',
                      }}
                    />
                    
                    <p className="text-[10px] text-gray-400 tracking-widest">SUPREME AUTHORITY</p>
                  </div>

                  {/* Corner power brackets */}
                  {[[1, 1, 'top', 'left'], [1, 1, 'top', 'right'], [1, 1, 'bottom', 'left'], [1, 1, 'bottom', 'right']].map(([t, l, v, h], i) => (
                    <div
                      key={i}
                      className="absolute w-8 h-8"
                      style={{
                        [v as string]: t,
                        [h as string]: l,
                        borderTop: v === 'top' ? '3px solid #ff6b3d' : 'none',
                        borderBottom: v === 'bottom' ? '3px solid #ff6b3d' : 'none',
                        borderLeft: h === 'left' ? '3px solid #ff6b3d' : 'none',
                        borderRight: h === 'right' ? '3px solid #ff6b3d' : 'none',
                        boxShadow: '0 0 15px rgba(255, 107, 61, 0.8)',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* CENTRAL CHAT - INTEGRATED HOLOGRAM */}
            <div 
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40"
              style={{ width: "600px", height: "360px" }}
            >
              {/* Outer glow aura */}
              <div className="absolute -inset-8 bg-[#ff6b3d] opacity-20 blur-3xl rounded-3xl" />
              
              <div 
                className="relative h-full bg-black/90 backdrop-blur-2xl rounded-2xl overflow-hidden"
                style={{
                  border: '3px solid #ff6b3d',
                  boxShadow: `
                    0 0 80px rgba(255, 107, 61, 0.6),
                    0 0 120px rgba(255, 107, 61, 0.3),
                    inset 0 0 60px rgba(255, 107, 61, 0.1)
                  `,
                }}
              >
                {/* Header */}
                <div className="px-5 py-3 border-b-2 border-[#ff6b3d]/50 bg-gradient-to-b from-[#ff6b3d]/20 to-transparent">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full bg-[#ff6b3d] animate-pulse"
                        style={{ boxShadow: '0 0 20px rgba(255, 107, 61, 1)' }}
                      />
                      <span 
                        className="text-sm font-black tracking-widest text-[#ff6b3d]"
                        style={{ textShadow: '0 0 20px rgba(255, 107, 61, 0.8)' }}
                      >
                        ACTIVE COUNCIL SESSION
                      </span>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="h-[240px] overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => {
                    const member = councilMembers.find(m => m.id === msg.memberId);
                    if (!member) return null;
                    const Icon = member.icon;
                    const color = getStatusColor(member.status);
                    
                    return (
                      <div key={msg.id} className="flex gap-3 items-start">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background: `radial-gradient(circle, ${color}40, ${color}20)`,
                            border: `2px solid ${color}`,
                            boxShadow: `0 0 15px ${color}60`,
                          }}
                        >
                          <Icon className="w-4 h-4" style={{ color }} />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span 
                              className="text-xs font-bold"
                              style={{ 
                                color,
                                textShadow: `0 0 10px ${color}80`
                              }}
                            >
                              {member.name}
                            </span>
                            <span className="text-[9px] text-gray-600">
                              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Input */}
                <div className="px-4 py-3 border-t-2 border-[#ff6b3d]/50 bg-gradient-to-t from-[#ff6b3d]/10 to-transparent">
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (inputMessage.trim() && selectedMember) {
                        setMessages([...messages, {
                          id: messages.length + 1,
                          memberId: selectedMember,
                          text: inputMessage,
                          timestamp: new Date()
                        }]);
                        setInputMessage("");
                      }
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder={selectedMember ? "Transmit message..." : "Select council member"}
                      disabled={!selectedMember}
                      className="flex-1 bg-[#0a0a0a] border-2 border-[#ff6b3d]/40 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#ff6b3d] disabled:opacity-40"
                      style={{
                        boxShadow: 'inset 0 0 20px rgba(255, 107, 61, 0.1)',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!selectedMember || !inputMessage.trim()}
                      className="px-6 py-2 bg-[#ff6b3d] hover:bg-[#ff5a2d] text-white text-sm font-black rounded-lg transition-all disabled:opacity-40"
                      style={{
                        boxShadow: '0 0 30px rgba(255, 107, 61, 0.6)',
                      }}
                    >
                      SEND
                    </button>
                  </form>
                </div>

                {/* Corner tech brackets */}
                {[[0, 0], [0, 1], [1, 0], [1, 1]].map(([h, v], i) => (
                  <div
                    key={i}
                    className="absolute w-6 h-6 pointer-events-none"
                    style={{
                      [h ? 'right' : 'left']: 4,
                      [v ? 'bottom' : 'top']: 4,
                      borderTop: !v ? '3px solid #ff6b3d' : 'none',
                      borderBottom: v ? '3px solid #ff6b3d' : 'none',
                      borderLeft: !h ? '3px solid #ff6b3d' : 'none',
                      borderRight: h ? '3px solid #ff6b3d' : 'none',
                      boxShadow: '0 0 10px rgba(255, 107, 61, 0.8)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-30px) translateX(15px); }
          50% { transform: translateY(-60px) translateX(-15px); }
          75% { transform: translateY(-30px) translateX(10px); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(200%); }
        }
        
        @keyframes scanline {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes rotateRay {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        
        .animate-scanline {
          animation: scanline 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
