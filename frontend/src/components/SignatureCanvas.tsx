"use client";

import { useRef, useEffect, useState } from "react";

interface SignatureCanvasProps {
  onSave: (signature: string) => void;
  initialSignature?: string;
  width?: number;
  height?: number;
}

export default function SignatureCanvas({
  onSave,
  initialSignature,
  width = 400,
  height = 200
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!initialSignature);
  const [canvasWidth, setCanvasWidth] = useState(width);

  const updateCanvasSize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get container width - the parent div with padding
    const container = canvas.parentElement; // The div with border and padding
    const containerWidth = container ? container.clientWidth - 16 : width; // Subtract padding (8px * 2)
    const actualWidth = Math.max(containerWidth, width);
    setCanvasWidth(actualWidth);
    
    // Set canvas display size
    canvas.style.width = "100%";
    canvas.style.height = `${height}px`;
    
    // Set canvas actual size (for high DPI displays)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = actualWidth * dpr;
    canvas.height = height * dpr;
    
    // Scale context to handle device pixel ratio
    ctx.scale(dpr, dpr);

    // Set drawing style - use black for visibility on white background
    ctx.strokeStyle = "#000000";
    ctx.fillStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    // Fill with white background
    ctx.fillRect(0, 0, actualWidth, height);

    // Load initial signature if provided
    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, actualWidth, height);
        setHasSignature(true);
      };
      img.src = initialSignature;
    }
  };

  useEffect(() => {
    updateCanvasSize();

    // Handle window resize
    const handleResize = () => {
      updateCanvasSize();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [initialSignature, width, height]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and fill with white background
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, height);
    ctx.strokeStyle = "#000000"; // Reset stroke color
    setHasSignature(false);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const signature = canvas.toDataURL("image/png");
    onSave(signature);
  };

  return (
    <div className="space-y-3 w-full">
      <div className="rounded-lg border-2 border-slate-400/50 bg-white p-2 w-full">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="cursor-crosshair touch-none rounded border border-slate-300 w-full"
          style={{ 
            width: "100%", 
            height: `${height}px`,
            maxWidth: "100%",
            display: "block"
          }}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={clear}
          className="flex-1 rounded-lg border border-red-400/50 bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-300 transition hover:border-red-400 hover:bg-red-500/30"
        >
          Limpar
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!hasSignature}
          className="flex-1 rounded-lg border border-emerald-400/50 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Salvar Assinatura
        </button>
      </div>
    </div>
  );
}

