import React, { useEffect, useRef } from 'react';
import { AudioEngine } from '../services/audioEngine';

interface OscVisualizerProps {
  engine: AudioEngine | null;
}

export const OscVisualizer: React.FC<OscVisualizerProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!engine || !canvasRef.current) return;

    let animationId: number;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const values = engine.analyser.getValue();
      const width = canvas.width;
      const height = canvas.height;

      ctx.fillStyle = '#0f0e17';
      ctx.fillRect(0, 0, width, height);

      // Draw Grid
      ctx.strokeStyle = '#2e2f3e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for(let x=0; x<width; x+=20) { ctx.moveTo(x,0); ctx.lineTo(x, height); }
      for(let y=0; y<height; y+=20) { ctx.moveTo(0,y); ctx.lineTo(width, y); }
      ctx.stroke();

      // Draw Wave
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#2cb67d';
      ctx.beginPath();

      // Tone.js Waveform returns Float32Array [-1, 1]
      for (let i = 0; i < values.length; i++) {
        const x = (i / values.length) * width;
        const y = ((values[i] as number) + 1) / 2 * height; // Map -1..1 to 0..height
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [engine]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={100} 
      className="w-full h-24 border-2 border-[#2cb67d] bg-[#0f0e17] mb-6 shadow-[0_0_10px_rgba(44,182,125,0.3)]"
    />
  );
};