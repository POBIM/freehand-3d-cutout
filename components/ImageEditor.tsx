import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Point, CutoutData } from '../types';
import { Button } from './UIComponents';
import { Scissors, RotateCcw, Undo2, Redo2, ZoomIn, Pencil, PenTool, MousePointer2 } from 'lucide-react';

interface ImageEditorProps {
  imageUrl: string;
  onFinish: (data: CutoutData) => void;
  onCancel: () => void;
}

type ToolType = 'freehand' | 'polygon' | 'move';

export const ImageEditor: React.FC<ImageEditorProps> = ({ imageUrl, onFinish, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const magnifierRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State
  const [points, setPoints] = useState<Point[]>([]);
  // History for Undo/Redo
  const [history, setHistory] = useState<Point[][]>([[]]);
  const [historyStep, setHistoryStep] = useState(0);

  const [tool, setTool] = useState<ToolType>('freehand');
  const [cursorPos, setCursorPos] = useState<Point | null>(null);
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, scale: 1, offsetX: 0, offsetY: 0 });
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  
  // Magnifier state
  const [magnifierState, setMagnifierState] = useState<{show: boolean, x: number, y: number} | null>(null);

  // Initialize image on load
  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      setImageElement(img);
    };
  }, [imageUrl]);

  // Handle Resize and Fit
  const fitImage = useCallback(() => {
    if (!imageElement || !containerRef.current) return;

    const container = containerRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    
    const iw = imageElement.width;
    const ih = imageElement.height;
    
    // Contain logic
    const scale = Math.min(cw / iw, ch / ih);
    const renderWidth = iw * scale;
    const renderHeight = ih * scale;
    const offsetX = (cw - renderWidth) / 2;
    const offsetY = (ch - renderHeight) / 2;

    setDimensions({ width: renderWidth, height: renderHeight, scale, offsetX, offsetY });
  }, [imageElement]);

  useEffect(() => {
    fitImage();
    window.addEventListener('resize', fitImage);
    return () => window.removeEventListener('resize', fitImage);
  }, [fitImage]);

  // Helpers
  const toScreen = (pt: Point) => ({
    x: dimensions.offsetX + pt.x * dimensions.width,
    y: dimensions.offsetY + pt.y * dimensions.height
  });

  const toNormalized = (x: number, y: number) => ({
    x: (x - dimensions.offsetX) / dimensions.width,
    y: (y - dimensions.offsetY) / dimensions.height
  });

  // History Management
  const saveHistory = (newPoints: Point[]) => {
      const newHistory = history.slice(0, historyStep + 1);
      newHistory.push(newPoints);
      setHistory(newHistory);
      setHistoryStep(newHistory.length - 1);
  };

  const handleUndo = () => {
      if (historyStep > 0) {
          const step = historyStep - 1;
          setHistoryStep(step);
          setPoints(history[step]);
      }
  };

  const handleRedo = () => {
      if (historyStep < history.length - 1) {
          const step = historyStep + 1;
          setHistoryStep(step);
          setPoints(history[step]);
      }
  };

  const handleClear = () => {
      setPoints([]);
      saveHistory([]);
  };

  // Main Draw Loop
  useEffect(() => {
    if (!canvasRef.current || !imageElement || dimensions.width === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current!;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Image
    ctx.drawImage(imageElement, dimensions.offsetX, dimensions.offsetY, dimensions.width, dimensions.height);

    // Draw Mask
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    
    if (points.length > 0) {
      // Create hole
      const first = toScreen(points[0]);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < points.length; i++) {
        const p = toScreen(points[i]);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fill('evenodd');

      // Draw Line
      ctx.strokeStyle = '#818cf8'; // Indigo 400
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < points.length; i++) {
        const p = toScreen(points[i]);
        ctx.lineTo(p.x, p.y);
      }
      // Close loop visually for freehand stroke or if many points
      if (!isDrawing && points.length > 2 && tool === 'freehand') {
          ctx.closePath();
      }
      ctx.stroke();
      
      // Reset shadow
      ctx.shadowBlur = 0;
      
      // Draw Points (Vertices)
      // Always show points in 'move' mode or 'polygon' mode
      // Show fewer points in freehand unless moving
      if (points.length < 100 || tool === 'polygon' || tool === 'move') {
          points.forEach((pt, i) => {
              const p = toScreen(pt);
              ctx.beginPath();
              // Highlight point if dragging
              const isDragging = i === draggingPointIndex;
              const radius = tool === 'move' ? (isDragging ? 8 : 5) : (tool === 'polygon' ? 4 : 3);
              
              ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
              
              if (tool === 'move') {
                  ctx.fillStyle = isDragging ? '#4ade80' : '#fff'; // Green if dragging
                  ctx.fill();
                  ctx.strokeStyle = '#000';
                  ctx.lineWidth = 1;
                  ctx.stroke();
              } else {
                  ctx.fillStyle = '#fff';
                  ctx.fill();
                  if (tool === 'polygon') {
                      ctx.strokeStyle = '#000';
                      ctx.lineWidth = 1;
                      ctx.stroke();
                  }
              }
          });
      }

      // Draw Rubber Band for Polygon Tool
      if (tool === 'polygon' && cursorPos) {
          const lastPt = points[points.length - 1];
          const last = toScreen(lastPt);
          const curr = toScreen(cursorPos);

          ctx.beginPath();
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.strokeStyle = '#a5b4fc';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
      }

    }
  }, [dimensions, points, imageElement, isDrawing, tool, cursorPos, draggingPointIndex]);

  // Update Magnifier
  useEffect(() => {
    if (!magnifierState || !magnifierState.show || !magnifierRef.current || !canvasRef.current) return;
    
    const magCanvas = magnifierRef.current;
    const ctx = magCanvas.getContext('2d');
    const mainCanvas = canvasRef.current;
    
    if (!ctx) return;
    
    const zoom = 2;
    const size = magCanvas.width; // Assume square
    const srcW = size / zoom;
    const srcH = size / zoom;
    
    // Center of lookup
    const sx = magnifierState.x - srcW / 2;
    const sy = magnifierState.y - srcH / 2;
    
    ctx.clearRect(0, 0, size, size);
    
    // Fill background
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0,0,size,size);
    
    // Draw source
    ctx.drawImage(mainCanvas, sx, sy, srcW, srcH, 0, 0, size, size);
    
    // Draw Crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const cx = size / 2;
    const cy = size / 2;
    const len = 10;
    ctx.moveTo(cx - len, cy); ctx.lineTo(cx + len, cy);
    ctx.moveTo(cx, cy - len); ctx.lineTo(cx, cy + len);
    ctx.stroke();
    
    // Border
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 4;
    ctx.strokeRect(0,0,size,size);

  }, [magnifierState, points, tool, cursorPos, draggingPointIndex]); 

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = containerRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const pt = toNormalized(x, y);
    const clamped = {
        x: Math.max(0, Math.min(1, pt.x)),
        y: Math.max(0, Math.min(1, pt.y))
    };

    if (tool === 'move') {
        // Find nearest point to click
        let foundIndex = -1;
        let minDist = 30; // 30px hit radius
        
        points.forEach((p, i) => {
            const screenP = toScreen(p);
            const dist = Math.hypot(screenP.x - x, screenP.y - y);
            if (dist < minDist) {
                minDist = dist;
                foundIndex = i;
            }
        });

        if (foundIndex !== -1) {
            setDraggingPointIndex(foundIndex);
            setMagnifierState({ show: true, x, y });
        }
    } else if (tool === 'freehand') {
        setIsDrawing(true);
        setPoints(prev => [...prev, clamped]);
        setMagnifierState({ show: true, x, y });
    } else if (tool === 'polygon') {
        // For polygon, click adds a point instantly
        const newPoints = [...points, clamped];
        setPoints(newPoints);
        saveHistory(newPoints);
        setMagnifierState({ show: true, x, y });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = containerRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const pt = toNormalized(x, y);
    const clamped = {
        x: Math.max(0, Math.min(1, pt.x)),
        y: Math.max(0, Math.min(1, pt.y))
    };

    setCursorPos(clamped);
    
    if (tool === 'move') {
        if (draggingPointIndex !== null) {
            const newPoints = [...points];
            newPoints[draggingPointIndex] = clamped;
            setPoints(newPoints);
            setMagnifierState({ show: true, x, y });
        }
    } else if (tool === 'freehand') {
        if (isDrawing) {
            // Simple distance filter
            setPoints(prev => {
                if (prev.length === 0) return [clamped];
                const last = prev[prev.length - 1];
                const dx = (clamped.x - last.x) * dimensions.width;
                const dy = (clamped.y - last.y) * dimensions.height;
                if (dx*dx + dy*dy > 10) { 
                    return [...prev, clamped];
                }
                return prev;
            });
            setMagnifierState({ show: true, x, y });
        }
    } else if (tool === 'polygon') {
        setMagnifierState({ show: true, x, y });
    }
  };

  const handlePointerUp = () => {
    if (tool === 'freehand' && isDrawing) {
        setIsDrawing(false);
        saveHistory(points); // Commit stroke to history
        setMagnifierState(null);
    } else if (tool === 'move' && draggingPointIndex !== null) {
        setDraggingPointIndex(null);
        saveHistory(points); // Commit move to history
        setMagnifierState(null);
    }
    
    if (tool === 'polygon') {
        // Polygon commits on Click (Down), but we hide magnifier on Up
         setMagnifierState(null);
    }
  };

  const handleFinish = () => {
    if (points.length < 3) {
      alert("Please draw a loop to crop.");
      return;
    }
    onFinish({
      points: points,
      textureUrl: imageUrl,
      aspectRatio: imageElement ? imageElement.width / imageElement.height : 1
    });
  };

  return (
    <div className="flex flex-col h-full w-full relative bg-black">
      
      {/* Tool Toggle Toolbar */}
      <div className="absolute top-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <div className="flex bg-zinc-900/90 backdrop-blur-xl p-1 rounded-full border border-zinc-800 shadow-xl pointer-events-auto gap-1">
              <button 
                  onClick={() => setTool('freehand')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${tool === 'freehand' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
              >
                  <Pencil className="w-4 h-4" />
                  <span className="hidden sm:inline">Freehand</span>
              </button>
              <button 
                   onClick={() => setTool('polygon')}
                   className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${tool === 'polygon' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
              >
                  <PenTool className="w-4 h-4" />
                  <span className="hidden sm:inline">Polygon</span>
              </button>
              <button 
                   onClick={() => setTool('move')}
                   className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${tool === 'move' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
              >
                  <MousePointer2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Move</span>
              </button>
          </div>
      </div>

      {/* Canvas Area */}
      <div 
        ref={containerRef} 
        className="flex-1 relative overflow-hidden touch-none select-none"
        style={{ cursor: tool === 'move' ? 'default' : 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
            handlePointerUp();
            setCursorPos(null);
        }}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />
        
        {/* Magnifier Widget */}
        {magnifierState?.show && (
            <div 
                className="absolute pointer-events-none rounded-full overflow-hidden border-2 border-white shadow-2xl z-50 bg-black"
                style={{
                    width: '120px',
                    height: '120px',
                    left: magnifierState.x - 60,
                    top: magnifierState.y - 140, // Offset above finger
                }}
            >
                <canvas ref={magnifierRef} width={120} height={120} className="w-full h-full" />
            </div>
        )}

        {points.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/80 text-white px-6 py-3 rounded-full backdrop-blur-md animate-pulse border border-white/10 shadow-xl flex items-center gap-3">
                    <ZoomIn className="w-5 h-5 text-indigo-400" />
                    <span className="font-medium">
                        {tool === 'move' ? 'Select a point to move' : 'Draw outline'}
                    </span>
                </div>
            </div>
        )}
      </div>

      {/* Bottom Floating Toolbar */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-4 px-6 pointer-events-none">
          <div className="flex items-center gap-2 bg-zinc-900/90 backdrop-blur-xl p-2 rounded-2xl border border-zinc-800 shadow-2xl pointer-events-auto">
                <Button variant="secondary" onClick={handleUndo} disabled={historyStep === 0} className="w-12 h-12 p-0 rounded-xl" title="Undo">
                    <Undo2 className="w-5 h-5" />
                </Button>
                <Button variant="secondary" onClick={handleRedo} disabled={historyStep === history.length - 1} className="w-12 h-12 p-0 rounded-xl" title="Redo">
                    <Redo2 className="w-5 h-5" />
                </Button>
                <Button variant="secondary" onClick={handleClear} disabled={points.length === 0} className="w-12 h-12 p-0 rounded-xl text-red-400 hover:text-red-300" title="Clear All">
                    <RotateCcw className="w-5 h-5" />
                </Button>
                <div className="w-px h-8 bg-zinc-700 mx-1"></div>
                <Button 
                    variant="primary" 
                    onClick={handleFinish} 
                    disabled={points.length < 3} 
                    className="h-12 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 border-0"
                >
                    <Scissors className="w-4 h-4 mr-2" />
                    Make 3D
                </Button>
          </div>
      </div>
    </div>
  );
};