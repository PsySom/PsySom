
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AvatarConfig } from '../../types';

export const DEFAULT_ORB_CONFIG: AvatarConfig = {
  colors: {
    primary: '#6366f1',
    secondary: '#4338ca',
    glow: 'rgba(99, 102, 241, 0.4)',
    eyes: '#ffffff',
    particles: '#a5b4fc',
  },
  settings: {
    eyeSize: 4,
    eyeSpacing: 12,
    eyeHeight: 0,
    glowIntensity: 40,
    particleCount: 8,
    vibrationSpeed: 50,
  }
};

interface OrbAvatarProps {
  config?: AvatarConfig;
  size?: number;
  isSpeaking?: boolean;
  interactive?: boolean;
}

export const OrbAvatar: React.FC<OrbAvatarProps> = ({ 
  config, 
  size = 120, 
  isSpeaking = false,
  interactive = true 
}) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const orbConfig = useMemo(() => ({
    ...DEFAULT_ORB_CONFIG,
    ...config,
    colors: { ...DEFAULT_ORB_CONFIG.colors, ...config?.colors },
    settings: { ...DEFAULT_ORB_CONFIG.settings, ...config?.settings }
  }), [config]);

  // Particle Generation
  const particles = useMemo(() => {
    const count = orbConfig.settings.particleCount || 0;
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      size: 0.5 + Math.random() * 1.5,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4
    }));
  }, [orbConfig.settings.particleCount]);

  // Blinking logic
  useEffect(() => {
    let timeout: any;
    const blink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
      timeout = setTimeout(blink, 2000 + Math.random() * 4000);
    };
    timeout = setTimeout(blink, 3000);
    return () => clearTimeout(timeout);
  }, []);

  // Mouse tracking logic
  useEffect(() => {
    if (!interactive) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 20; 
      
      const factor = Math.min(distance / 200, 1);
      setMousePos({
        x: (dx / (distance || 1)) * maxDist * factor,
        y: (dy / (distance || 1)) * maxDist * factor
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [interactive]);

  const vibSpeed = (orbConfig.settings.vibrationSpeed / 100) * 0.2;
  const glowAlpha = orbConfig.settings.glowIntensity / 100;

  return (
    <div 
      ref={containerRef}
      className="relative flex items-center justify-center transition-all duration-300"
      style={{ 
        width: size, 
        height: size,
        animation: isSpeaking ? `shake ${0.2 - vibSpeed}s ease-in-out infinite` : 'none'
      }}
    >
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: ${glowAlpha * 0.6}; transform: scale(1); }
          50% { opacity: ${glowAlpha}; transform: scale(1.15); }
        }
        @keyframes shake {
          0%, 100% { transform: translate(0, 0) rotate(0); }
          25% { transform: translate(1.5px, -1.5px) rotate(1deg); }
          50% { transform: translate(-1.5px, 1.5px) rotate(-1deg); }
          75% { transform: translate(-1.5px, -1.5px) rotate(0.5deg); }
        }
        @keyframes float-particle {
          0% { transform: translate(0, 0); opacity: 0; }
          20% { opacity: 0.6; }
          80% { opacity: 0.6; }
          100% { transform: translate(${Math.random() * 20 - 10}px, ${Math.random() * 20 - 10}px); opacity: 0; }
        }
      `}</style>

      {/* Glow Aura */}
      <div 
        className="absolute inset-0 rounded-full animate-[glow-pulse_4s_ease-in-out_infinite] pointer-events-none"
        style={{ 
          backgroundColor: orbConfig.colors.glow || orbConfig.colors.primary,
          filter: 'blur(35px)',
          opacity: glowAlpha
        }}
      />

      {/* Primary SVG Body */}
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full relative z-10 animate-[breathe_5s_ease-in-out_infinite]"
      >
        <defs>
          <radialGradient id="orbGradient" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor={orbConfig.colors.primary} />
            <stop offset="100%" stopColor={orbConfig.colors.secondary} />
          </radialGradient>
          <radialGradient id="orbSurface" cx="30%" cy="30%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
          </filter>
        </defs>
        
        {/* Sphere Base */}
        <circle 
          cx="50" cy="50" r="46" 
          fill="url(#orbGradient)" 
          className="transition-colors duration-1000"
        />
        
        {/* Particle System */}
        <g filter="url(#goo)">
          {particles.map(p => (
            <circle
              key={p.id}
              cx={p.x}
              cy={p.y}
              r={p.size}
              fill={orbConfig.colors.particles}
              style={{
                animation: `float-particle ${p.duration}s ease-in-out ${p.delay}s infinite`
              }}
            />
          ))}
        </g>

        {/* Surface Shine (Lenticular effect) */}
        <circle cx="50" cy="50" r="46" fill="url(#orbSurface)" pointerEvents="none" />

        {/* Neural Optical Array (Eyes) */}
        <g transform={`translate(${mousePos.x * 0.4}, ${mousePos.y * 0.4})`}>
          {/* Left Eye */}
          <ellipse 
            cx={50 - orbConfig.settings.eyeSpacing} 
            cy={50 + orbConfig.settings.eyeHeight} 
            rx={orbConfig.settings.eyeSize} 
            ry={isBlinking ? 0.3 : orbConfig.settings.eyeSize * 1.5} 
            fill={orbConfig.colors.eyes}
            className="transition-all duration-150"
          />
          {/* Right Eye */}
          <ellipse 
            cx={50 + orbConfig.settings.eyeSpacing} 
            cy={50 + orbConfig.settings.eyeHeight} 
            rx={orbConfig.settings.eyeSize} 
            ry={isBlinking ? 0.3 : orbConfig.settings.eyeSize * 1.5} 
            fill={orbConfig.colors.eyes}
            className="transition-all duration-150"
          />
        </g>

        {/* Outer Rim Softness */}
        <circle cx="50" cy="50" r="46" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.1" />
      </svg>
    </div>
  );
};