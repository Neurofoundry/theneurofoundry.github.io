/**
 * Neural Particles - Floating ember/neuron effect
 * Adds subtle animated particles in the background
 * Usage: Add <canvas id="neural-particles"></canvas> to your page
 *        Then include this script
 */

(function() {
  'use strict';
  
  const canvas = document.getElementById('neural-particles');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  let particles = [];
  let connections = [];
  let animationId;
  let mouseX = -1000;
  let mouseY = -1000;
  
  // Configuration
  const config = {
    particleCount: 50,
    particleMinSize: 1,
    particleMaxSize: 3,
    particleSpeed: 0.3,
    connectionDistance: 150,
    mouseInfluence: 100,
    colors: {
      particle: 'rgba(179, 71, 34, 0.7)',
      particleGlow: 'rgba(179, 71, 34, 0.34)',
      connection: 'rgba(179, 71, 34, 0.18)',
      connectionHighlight: 'rgba(238, 132, 80, 0.3)'
    }
  };
  
  // Particle class
  class Particle {
    constructor() {
      this.reset();
    }
    
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = config.particleMinSize + Math.random() * (config.particleMaxSize - config.particleMinSize);
      this.speedX = (Math.random() - 0.5) * config.particleSpeed;
      this.speedY = (Math.random() - 0.5) * config.particleSpeed;
      this.pulsePhase = Math.random() * Math.PI * 2;
      this.pulseSpeed = 0.02 + Math.random() * 0.02;
    }
    
    update() {
      // Move particle
      this.x += this.speedX;
      this.y += this.speedY;
      
      // Mouse influence
      const dx = mouseX - this.x;
      const dy = mouseY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < config.mouseInfluence) {
        const force = (config.mouseInfluence - dist) / config.mouseInfluence;
        this.x -= dx * force * 0.02;
        this.y -= dy * force * 0.02;
      }
      
      // Wrap around edges
      if (this.x < -20) this.x = canvas.width + 20;
      if (this.x > canvas.width + 20) this.x = -20;
      if (this.y < -20) this.y = canvas.height + 20;
      if (this.y > canvas.height + 20) this.y = -20;
      
      // Pulse animation
      this.pulsePhase += this.pulseSpeed;
    }
    
    draw() {
      const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;
      const size = this.size * pulse;
      
      // Glow
      ctx.beginPath();
      ctx.arc(this.x, this.y, size * 3, 0, Math.PI * 2);
      ctx.fillStyle = config.colors.particleGlow;
      ctx.fill();
      
      // Core
      ctx.beginPath();
      ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
      ctx.fillStyle = config.colors.particle;
      ctx.fill();
    }
  }
  
  // Initialize
  function init() {
    resize();
    particles = [];
    
    for (let i = 0; i < config.particleCount; i++) {
      particles.push(new Particle());
    }
    
    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', handleMouse);
    document.addEventListener('mouseleave', () => {
      mouseX = -1000;
      mouseY = -1000;
    });
    
    animate();
  }
  
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  function handleMouse(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }
  
  // Draw connections between nearby particles
  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < config.connectionDistance) {
          const opacity = 1 - (dist / config.connectionDistance);
          
          // Check if near mouse for highlight
          const midX = (particles[i].x + particles[j].x) / 2;
          const midY = (particles[i].y + particles[j].y) / 2;
          const mouseDistX = mouseX - midX;
          const mouseDistY = mouseY - midY;
          const mouseDist = Math.sqrt(mouseDistX * mouseDistX + mouseDistY * mouseDistY);
          
          if (mouseDist < config.mouseInfluence) {
            ctx.strokeStyle = config.colors.connectionHighlight;
            ctx.lineWidth = 1.5;
          } else {
            ctx.strokeStyle = `rgba(179, 71, 34, ${opacity * 0.18})`;
            ctx.lineWidth = 1;
          }
          
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update and draw particles
    particles.forEach(p => {
      p.update();
    });
    
    // Draw connections first (behind particles)
    drawConnections();
    
    // Draw particles
    particles.forEach(p => {
      p.draw();
    });
    
    animationId = requestAnimationFrame(animate);
  }
  
  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  });
})();
