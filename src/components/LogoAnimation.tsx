import React, { useEffect, useRef, useState } from 'react';

class Particle {
  ix: number;
  iy: number;
  tx: number;
  ty: number;
  x: number;
  y: number;
  size: number;
  targetColor: string;
  randomSeed: number;
  delay: number;
  isWanderer: boolean;

  constructor(tx: number, ty: number, color: string, canvasWidth: number, canvasHeight: number, isWanderer: boolean = false) {
    this.randomSeed = Math.random();
    // Add random offsets to break the grid alignment
    this.tx = tx + (Math.random() - 0.5) * 12;
    this.ty = ty + (Math.random() - 0.5) * 12;
    this.targetColor = color;
    this.delay = Math.random() * 2; // 0 to 2 seconds delay
    // Vary sizes more drastically for a chaotic look, make them smaller overall
    this.size = Math.random() * 1.5 + 0.2;
    this.isWanderer = isWanderer;
    this.ix = 0;
    this.iy = 0;
    this.x = 0;
    this.y = 0;
    this.reset(canvasWidth, canvasHeight);
  }

  reset(canvasWidth: number, canvasHeight: number) {
    this.ix = (Math.random() - 0.5) * canvasWidth * 1.5;
    this.iy = (Math.random() - 0.5) * canvasHeight * 1.5;
    this.x = this.ix;
    this.y = this.iy;
  }

  getDriftPos(time: number) {
    const driftAmount = this.isWanderer ? 600 : 150;
    const speed = this.isWanderer ? 0.15 : 0.5;
    const x = this.ix + Math.sin(time * speed + this.randomSeed * Math.PI * 2) * driftAmount;
    const y = this.iy + Math.cos(time * (speed * 1.3) + this.randomSeed * Math.PI * 2) * driftAmount;
    return { x, y };
  }

  update(ct: number, centerX: number, centerY: number) {
    const phase1Start = 2 + this.delay;
    const phase1Duration = 2.5;
    const phase1End = phase1Start + phase1Duration;

    let scale = 1;
    let alpha = 1;
    let color = this.targetColor;

    if (this.isWanderer || ct < phase1Start) {
      const pos = this.getDriftPos(ct);
      this.x = centerX + pos.x;
      this.y = centerY + pos.y;
      scale = 1 + this.randomSeed * 2;
      alpha = 0.3 + this.randomSeed * 0.4;
    } else if (ct < phase1End) {
      const progress = (ct - phase1Start) / phase1Duration;
      const easeIn = progress * progress * progress;
      
      const startPos = this.getDriftPos(phase1Start);
      const startX = centerX + startPos.x;
      const startY = centerY + startPos.y;
      
      const targetX = centerX + this.tx;
      const targetY = centerY + this.ty;

      this.x = startX + (targetX - startX) * easeIn;
      this.y = startY + (targetY - startY) * easeIn;
      
      const startScale = 1 + this.randomSeed * 2;
      scale = startScale + (1 - startScale) * easeIn;
      
      color = this.targetColor;
      alpha = (0.3 + this.randomSeed * 0.4) + (1 - (0.3 + this.randomSeed * 0.4)) * easeIn;
    } else {
      // Add a slight continuous float when settled to keep it chaotic and alive
      const floatX = Math.sin(ct * 1.5 + this.randomSeed * Math.PI * 2) * 3;
      const floatY = Math.cos(ct * 2.0 + this.randomSeed * Math.PI * 2) * 3;
      this.x = centerX + this.tx + floatX;
      this.y = centerY + this.ty + floatY;
      scale = 1;
      color = this.targetColor;
      alpha = 1;
    }

    return { scale, color, alpha };
  }

  draw(ctx: CanvasRenderingContext2D, ct: number, centerX: number, centerY: number) {
    const { scale, color, alpha } = this.update(ct, centerX, centerY);
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    
    if (!this.isWanderer && ct > 2 + this.delay + 2.5) {
       ctx.shadowColor = color;
       ctx.shadowBlur = 4;
    }

    ctx.translate(this.x, this.y);
    ctx.fillRect(-this.size * scale / 2, -this.size * scale / 2, this.size * scale, this.size * scale);
    ctx.restore();
  }
}

const createMCanvas = (withShadow: boolean) => {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 600;
  const ctx = canvas.getContext('2d', { willReadFrequently: !withShadow });
  if (!ctx) return canvas;
  
  if (withShadow) {
    ctx.shadowColor = 'rgba(109, 181, 120, 0.4)';
    ctx.shadowBlur = 35;
  }

  const gradient = ctx.createLinearGradient(120, 480, 480, 120);
  gradient.addColorStop(0, '#78909C');
  gradient.addColorStop(1, '#6DB578');

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 63;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(150, 450);
  ctx.lineTo(150, 210);
  ctx.lineTo(300, 360);
  ctx.lineTo(450, 210);
  ctx.lineTo(450, 390);
  ctx.quadraticCurveTo(450, 510, 570, 420);
  ctx.stroke();

  ctx.fillStyle = '#78909C';
  const pSize = 21;
  const drawPixel = (x: number, y: number) => ctx.fillRect(x, y, pSize, pSize);
  
  drawPixel(90, 225); drawPixel(112, 255); drawPixel(75, 300); drawPixel(120, 330);
  drawPixel(97, 375); drawPixel(127, 420); drawPixel(82, 465);
  drawPixel(180, 480); drawPixel(210, 510);
  
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
    
    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const targetCanvas = createMCanvas(false);

      const targetCtx = targetCanvas.getContext('2d');
      if (!targetCtx) return;

      const imageData = targetCtx.getImageData(0, 0, 600, 600);
      const data = imageData.data;
      const targets = [];
      
      // 1. M particles (denser sampling for more particles)
      for (let y = 0; y < 600; y += 6) {
        for (let x = 0; x < 600; x += 6) {
          const i = (y * 600 + x) * 4;
          if (data[i + 3] > 100) {
            // 15% chance an M particle is a wanderer (so it looks like it failed to join)
            const isWanderer = Math.random() > 0.85;
            targets.push({
              x: x - 300,
              y: y - 300,
              color: `rgba(${data[i]}, ${data[i+1]}, ${data[i+2]}, ${data[i+3]/255})`,
              isWanderer
            });
          }
        }
      }
      
      // 2. Pure wanderers (ambient particles that just float around)
      for (let i = 0; i < 400; i++) {
        targets.push({
          x: (Math.random() - 0.5) * canvas.width,
          y: (Math.random() - 0.5) * canvas.height,
          color: `rgba(120, 144, 156, ${Math.random() * 0.5 + 0.2})`,
          isWanderer: true
        });
      }
      
      particles = targets.map(t => new Particle(t.x, t.y, t.color, canvas.width, canvas.height, t.isWanderer));
    };

    init();
    window.addEventListener('resize', init);

    let startTime = performance.now();
    let lastCt = 0;
    let textShown = false;

    const render = (time: number) => {
      const t = (time - startTime) / 1000;
      const duration = 14;
      const ct = t % duration;

      if (ct < lastCt) {
        particles.forEach(p => p.reset(canvas.width, canvas.height));
      }
      lastCt = ct;

      if (ct < 2) {
        if (textShown) { textShown = false; setShowText(false); }
      } else if (ct > 6.5 && ct < 12) {
        if (!textShown) { textShown = true; setShowText(true); }
      } else if (ct >= 12) {
        if (textShown) { textShown = false; setShowText(false); }
      }

      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      if (ct >= 12) {
        ctx.globalAlpha = 1 - (ct - 12) / 2;
      }

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2 - 50;

      particles.forEach(p => {
        p.draw(ctx, ct, centerX, centerY);
      });

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
          <p className="text-[#6DB578] tracking-[0.2em] text-xs uppercase font-medium text-center whitespace-nowrap">
            8 Billion in the world, but right now, we only care about 1.
          </p>
          <div className="h-[1px] w-8 bg-[#78909C]/50"></div>
        </div>
      </div>
    </div>
  );
}
