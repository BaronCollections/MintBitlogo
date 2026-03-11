import React, { useEffect, useRef, useState } from 'react';

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  targetColor: string;
  size: number;
  baseColor: string;

  constructor(targetX: number, targetY: number, targetColor: string, canvasWidth: number, canvasHeight: number) {
    this.targetX = targetX;
    this.targetY = targetY;
    this.targetColor = targetColor;
    this.baseColor = '#78909C';
    this.size = Math.random() * 2.5 + 1;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.reset(canvasWidth, canvasHeight);
  }

  reset(canvasWidth: number, canvasHeight: number) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * -canvasHeight - 100;
    this.vx = 0;
    this.vy = Math.random() * 4 + 2;
  }

  update(phase: number, centerX: number, centerY: number, progress: number, canvasWidth: number, canvasHeight: number) {
    if (phase === 0) {
      // Rain
      this.y += this.vy;
      if (this.y > canvasHeight) {
        this.y = Math.random() * -100;
        this.x = Math.random() * canvasWidth;
      }
    } else if (phase === 1) {
      // Vortex
      const dx = centerX - this.x;
      const dy = centerY - this.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist > 0) {
        const dirX = dx / dist;
        const dirY = dy / dist;
        const tanX = -dirY;
        const tanY = dirX;

        const gravity = 0.5 + progress * 2.0;
        
        if (dist > 60) {
          this.vx += dirX * gravity;
          this.vy += dirY * gravity;
        } else {
          this.vx -= dirX * 0.5;
          this.vy -= dirY * 0.5;
        }

        this.vx += tanX * 2.0;
        this.vy += tanY * 2.0;
      }

      this.vx *= 0.92;
      this.vy *= 0.92;

      this.x += this.vx;
      this.y += this.vy;
    } else if (phase === 2) {
      // Form M
      const absTargetX = centerX + this.targetX;
      const absTargetY = centerY + this.targetY;
      
      const dx = absTargetX - this.x;
      const dy = absTargetY - this.y;
      
      const spring = 0.02 + progress * 0.15;
      this.vx += dx * spring;
      this.vy += dy * spring;
      
      this.vx *= 0.82;
      this.vy *= 0.82;
      
      this.x += this.vx;
      this.y += this.vy;
    }
  }

  draw(ctx: CanvasRenderingContext2D, phase: number) {
    if (phase >= 2) {
      ctx.fillStyle = this.targetColor;
    } else {
      ctx.fillStyle = this.baseColor;
    }
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}

const createMCanvas = (withShadow: boolean) => {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d', { willReadFrequently: !withShadow });
  if (!ctx) return canvas;
  
  if (withShadow) {
    ctx.shadowColor = 'rgba(109, 181, 120, 0.4)';
    ctx.shadowBlur = 25;
  }

  const gradient = ctx.createLinearGradient(80, 320, 320, 80);
  gradient.addColorStop(0, '#78909C');
  gradient.addColorStop(1, '#6DB578');

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 42;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(100, 300);
  ctx.lineTo(100, 140);
  ctx.lineTo(200, 240);
  ctx.lineTo(300, 140);
  ctx.lineTo(300, 260);
  ctx.quadraticCurveTo(300, 340, 380, 280);
  ctx.stroke();

  ctx.fillStyle = '#78909C';
  const pSize = 14;
  const drawPixel = (x: number, y: number) => ctx.fillRect(x, y, pSize, pSize);
  
  drawPixel(60, 150); drawPixel(75, 170); drawPixel(50, 200); drawPixel(80, 220);
  drawPixel(65, 250); drawPixel(85, 280); drawPixel(55, 310);
  drawPixel(120, 320); drawPixel(140, 340);
  
  return canvas;
};

export default function LogoAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    let renderCanvas: HTMLCanvasElement;
    
    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const targetCanvas = createMCanvas(false);
      renderCanvas = createMCanvas(true);

      const targetCtx = targetCanvas.getContext('2d');
      if (!targetCtx) return;

      const imageData = targetCtx.getImageData(0, 0, 400, 400);
      const data = imageData.data;
      const targets = [];
      for (let y = 0; y < 400; y += 4) {
        for (let x = 0; x < 400; x += 4) {
          const i = (y * 400 + x) * 4;
          if (data[i + 3] > 100) {
            targets.push({
              x: x - 200,
              y: y - 200,
              color: `rgba(${data[i]}, ${data[i+1]}, ${data[i+2]}, ${data[i+3]/255})`
            });
          }
        }
      }
      
      particles = targets.map(t => new Particle(t.x, t.y, t.color, canvas.width, canvas.height));
    };

    init();
    window.addEventListener('resize', init);

    let startTime = performance.now();
    let lastCt = 0;
    let textShown = false;

    const render = (time: number) => {
      const t = (time - startTime) / 1000;
      const duration = 12;
      const ct = t % duration;

      if (ct < lastCt) {
        particles.forEach(p => p.reset(canvas.width, canvas.height));
      }
      lastCt = ct;

      let phase = 0;
      let phaseProgress = 0;

      if (ct < 2) {
        phase = 0;
        phaseProgress = ct / 2;
        if (textShown) { textShown = false; setShowText(false); }
      } else if (ct < 4) {
        phase = 1;
        phaseProgress = (ct - 2) / 2;
      } else if (ct < 6) {
        phase = 2;
        phaseProgress = (ct - 4) / 2;
      } else if (ct < 7) {
        phase = 3;
        phaseProgress = (ct - 6) / 1;
        if (!textShown && ct > 6.5) { textShown = true; setShowText(true); }
      } else if (ct < 8) {
        phase = 4;
        phaseProgress = (ct - 7) / 1;
      } else if (ct < 11) {
        phase = 5;
        phaseProgress = 1;
      } else {
        phase = 6;
        phaseProgress = (ct - 11) / 1;
        if (textShown && ct > 11.5) { textShown = false; setShowText(false); }
      }

      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      if (phase === 6) {
        ctx.globalAlpha = 1 - phaseProgress;
      }

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2 - 50;

      if (phase < 3) {
        particles.forEach(p => {
          p.update(phase, centerX, centerY, phaseProgress, canvas.width, canvas.height);
          p.draw(ctx, phase);
        });
      } else if (phase === 3) {
        ctx.globalAlpha = 1 - phaseProgress;
        particles.forEach(p => {
          p.update(2, centerX, centerY, 1, canvas.width, canvas.height);
          p.draw(ctx, 2);
        });
        
        ctx.globalAlpha = phaseProgress;
        ctx.drawImage(renderCanvas, centerX - 200, centerY - 200);
        ctx.globalAlpha = 1;
      } else if (phase >= 4) {
        ctx.drawImage(renderCanvas, centerX - 200, centerY - 200);
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', init);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden flex flex-col items-center justify-center font-sans">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      
      <div 
        className={`absolute bottom-24 flex flex-col items-center transition-all duration-1000 transform ${
          showText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <h1 
          className="text-5xl font-bold tracking-[0.2em] text-white mb-3" 
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          MintBit
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-[1px] w-8 bg-[#78909C]/50"></div>
          <p className="text-[#6DB578] tracking-[0.3em] text-xs uppercase font-medium">
            The Generative M
          </p>
          <div className="h-[1px] w-8 bg-[#78909C]/50"></div>
        </div>
      </div>
    </div>
  );
}
