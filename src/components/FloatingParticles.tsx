import React from 'react';
import { motion } from 'motion/react';

interface FloatingParticlesProps {
  isDarkMode: boolean;
}

export default function FloatingParticles({ isDarkMode }: FloatingParticlesProps) {
  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 6 + 3,
    duration: Math.random() * 25 + 15,
    delay: Math.random() * 5,
  }));

  const floatingShapes = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: Math.random() * 90 + 5,
    y: Math.random() * 90 + 5,
    size: Math.random() * 120 + 80,
    duration: Math.random() * 30 + 20,
    delay: Math.random() * 10,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Enhanced Floating Particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            background: isDarkMode 
              ? `linear-gradient(45deg, #6366f1, #8b5cf6, #ec4899)` 
              : `linear-gradient(45deg, #8b5cf6, #ec4899, #06b6d4)`,
            opacity: isDarkMode ? 0.15 : 0.25,
            filter: 'blur(1px)',
            boxShadow: isDarkMode 
              ? '0 0 20px rgba(139, 92, 246, 0.3)' 
              : '0 0 15px rgba(139, 92, 246, 0.2)',
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, 20, 0],
            opacity: isDarkMode ? [0.15, 0.4, 0.15] : [0.25, 0.6, 0.25],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: particle.delay,
          }}
        />
      ))}

      {/* Large Floating 3D Shapes */}
      {floatingShapes.map((shape) => (
        <motion.div
          key={`shape-${shape.id}`}
          className="absolute rounded-full"
          style={{
            left: `${shape.x}%`,
            top: `${shape.y}%`,
            width: `${shape.size}px`,
            height: `${shape.size}px`,
            background: isDarkMode 
              ? `conic-gradient(from 0deg, #1e1b4b, #312e81, #3730a3, #4338ca, #1e1b4b)`
              : `conic-gradient(from 0deg, #8b5cf6, #ec4899, #06b6d4, #8b5cf6)`,
            opacity: isDarkMode ? 0.08 : 0.12,
            filter: 'blur(60px)',
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 15, 0],
            rotate: [0, 180, 360],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: shape.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: shape.delay,
          }}
        />
      ))}

      {/* Geometric Background Elements */}
      <motion.div
        className="absolute top-20 right-20"
        style={{
          width: '200px',
          height: '200px',
          background: isDarkMode 
            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05))' 
            : 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.1))',
          borderRadius: '50% 40% 60% 30%',
          filter: 'blur(40px)',
        }}
        animate={{
          rotate: [0, 360],
          borderRadius: ['50% 40% 60% 30%', '30% 60% 40% 50%', '50% 40% 60% 30%'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <motion.div
        className="absolute bottom-32 left-16"
        style={{
          width: '150px',
          height: '150px',
          background: isDarkMode 
            ? 'linear-gradient(45deg, rgba(236, 72, 153, 0.08), rgba(6, 182, 212, 0.05))' 
            : 'linear-gradient(45deg, rgba(236, 72, 153, 0.12), rgba(6, 182, 212, 0.08))',
          borderRadius: '60% 30% 50% 40%',
          filter: 'blur(35px)',
        }}
        animate={{
          rotate: [360, 0],
          borderRadius: ['60% 30% 50% 40%', '40% 50% 30% 60%', '60% 30% 50% 40%'],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}