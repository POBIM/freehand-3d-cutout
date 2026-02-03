import React, { useState, useRef } from 'react';
import { Upload, Box, ChevronLeft, Lightbulb, Camera, Aperture, Palette, PaintBucket, Save, FolderOpen } from 'lucide-react';
import { ImageEditor } from './components/ImageEditor';
import { ThreeViewer } from './components/ThreeViewer';
import { Button, Slider } from './components/UIComponents';
import { CutoutData, AppMode, ProjectData } from './types';

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.UPLOAD);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [cutoutData, setCutoutData] = useState<CutoutData | null>(null);
  
  // 3D Settings State
  const [thickness, setThickness] = useState<number>(0.5);
  const [extrusionColor, setExtrusionColor] = useState<string>('#e4e4e7'); // Default light gray
  const [bevelEnabled, setBevelEnabled] = useState<boolean>(true);
  const [bevelSize, setBevelSize] = useState<number>(0.05);
  
  const [isIso, setIsIso] = useState<boolean>(false); // Perspective vs Orthographic
  const [fov, setFov] = useState<number>(45); // Field of View
  const [lightIntensity, setLightIntensity] = useState<number>(1.5);
  const [lightColor, setLightColor] = useState<string>('#ffffff');

  const projectInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProject = () => {
    if (!cutoutData) return;
    
    const project: ProjectData = {
      version: 1,
      cutoutData,
      settings: {
        thickness,
        extrusionColor,
        bevelEnabled,
        bevelSize,
        isIso,
        fov,
        lightIntensity,
        lightColor,
      },
    };
    
    const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `3d-cutout-project-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const project = JSON.parse(event.target?.result as string) as ProjectData;
        
        setCutoutData(project.cutoutData);
        setImageSrc(project.cutoutData.textureUrl);
        setThickness(project.settings.thickness);
        setExtrusionColor(project.settings.extrusionColor);
        setBevelEnabled(project.settings.bevelEnabled);
        setBevelSize(project.settings.bevelSize);
        setIsIso(project.settings.isIso);
        setFov(project.settings.fov);
        setLightIntensity(project.settings.lightIntensity);
        setLightColor(project.settings.lightColor);
        setMode(AppMode.VIEW_3D);
      } catch {
        alert('Invalid project file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
          setMode(AppMode.DRAW);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropFinish = (data: CutoutData) => {
    setCutoutData(data);
    setMode(AppMode.VIEW_3D);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Header */}
      <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Box className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight hidden sm:block">Freehand 3D Cutout</h1>
          <h1 className="font-bold text-lg tracking-tight sm:hidden">3D Cutout</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {mode === AppMode.VIEW_3D && cutoutData && (
            <Button 
              variant="secondary" 
              onClick={handleSaveProject}
              className="text-xs px-3 h-8"
            >
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
          )}
          {mode !== AppMode.UPLOAD && (
            <Button 
              variant="ghost" 
              onClick={() => {
                  setMode(AppMode.UPLOAD);
                  setCutoutData(null);
                  setImageSrc(null);
              }}
              className="text-xs px-2 h-8"
            >
              Start Over
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* VIEW 1: UPLOAD */}
        {mode === AppMode.UPLOAD && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
            <div className="max-w-md w-full text-center space-y-8">
              <div className="space-y-2">
                <h2 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Turn Photos into 3D
                </h2>
                <p className="text-zinc-400">
                  Upload an image, draw a shape, and extrude it instantly.
                </p>
              </div>

              <div className="relative group cursor-pointer">
                <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full group-hover:bg-indigo-500/30 transition-all duration-500" />
                <label className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-zinc-700 rounded-3xl bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-indigo-500/50 transition-all cursor-pointer overflow-hidden">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="w-16 h-16 mb-4 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-8 h-8 text-zinc-400 group-hover:text-indigo-400" />
                    </div>
                    <p className="mb-2 text-sm text-zinc-300 font-medium">Click to upload image</p>
                    <p className="text-xs text-zinc-500">PNG, JPG or WEBP</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
              </div>

              <div className="flex items-center gap-4 text-zinc-500">
                <div className="flex-1 h-px bg-zinc-800"></div>
                <span className="text-xs">or</span>
                <div className="flex-1 h-px bg-zinc-800"></div>
              </div>

              <button
                type="button"
                onClick={() => projectInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-zinc-700 rounded-xl bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-zinc-600 transition-all text-zinc-300"
              >
                <FolderOpen className="w-5 h-5" />
                <span className="font-medium">Open Saved Project</span>
              </button>
              <input
                ref={projectInputRef}
                type="file"
                className="hidden"
                accept=".json"
                onChange={handleLoadProject}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: EDITOR - FULL SCREEN */}
        {mode === AppMode.DRAW && imageSrc && (
           <div className="absolute inset-0 z-10 bg-zinc-950 animate-in fade-in duration-300">
              <ImageEditor 
                  imageUrl={imageSrc} 
                  onFinish={handleCropFinish} 
                  onCancel={() => setMode(AppMode.UPLOAD)} 
              />
           </div>
        )}

        {/* VIEW 3: 3D VIEWER */}
        {mode === AppMode.VIEW_3D && cutoutData && (
            <div className="flex-1 flex flex-col h-full animate-in fade-in zoom-in duration-500 p-4">
                <div className="max-w-7xl w-full h-full mx-auto flex flex-col lg:flex-row gap-6">
                    
                    {/* Controls Sidebar */}
                    <div className="w-full lg:w-80 flex flex-col gap-6 order-2 lg:order-1 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="flex items-center gap-2 mb-2 text-zinc-400">
                             <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-white" onClick={() => setMode(AppMode.DRAW)}>
                                <ChevronLeft className="w-4 h-4" /> Back to Edit
                             </Button>
                        </div>
                        
                        {/* Geometry Section */}
                        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-6">
                            <div className="space-y-1 border-b border-zinc-800 pb-2">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Box className="w-4 h-4 text-indigo-400" />
                                    Geometry
                                </h3>
                            </div>
                            <Slider 
                                label="Thickness (Depth)" 
                                value={thickness} 
                                min={0.1} 
                                max={3} 
                                step={0.1} 
                                onChange={setThickness} 
                            />
                            
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-zinc-400 flex items-center gap-2">
                                    <PaintBucket className="w-3 h-3" />
                                    Side Color
                                </span>
                                <div className="flex items-center gap-2 bg-zinc-800 p-1 rounded-lg border border-zinc-700">
                                     <input 
                                        type="color" 
                                        value={extrusionColor}
                                        onChange={(e) => setExtrusionColor(e.target.value)}
                                        className="w-8 h-6 bg-transparent cursor-pointer border-none outline-none p-0"
                                     />
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-zinc-400 flex items-center gap-2">
                                    <Aperture className="w-3 h-3" />
                                    Edge Style
                                </span>
                                <div className="flex gap-2 p-1 bg-zinc-800 rounded-lg">
                                    <button 
                                        type="button"
                                        onClick={() => setBevelEnabled(false)}
                                        className={`text-xs font-medium px-3 py-1 rounded-md transition-all ${!bevelEnabled ? 'bg-zinc-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                        Sharp
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setBevelEnabled(true)}
                                        className={`text-xs font-medium px-3 py-1 rounded-md transition-all ${bevelEnabled ? 'bg-zinc-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                        Rounded
                                    </button>
                                </div>
                            </div>
                            
                            {bevelEnabled && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <Slider 
                                        label="Roundness" 
                                        value={bevelSize} 
                                        min={0.01} 
                                        max={0.3} 
                                        step={0.01} 
                                        onChange={setBevelSize} 
                                    />
                                </div>
                            )}
                        </div>

                        {/* Camera Section */}
                        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-6">
                            <div className="space-y-1 border-b border-zinc-800 pb-2">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Camera className="w-4 h-4 text-green-400" />
                                    Camera
                                </h3>
                            </div>
                            
                            {/* Mode Toggle */}
                            <div className="flex gap-2 p-1 bg-zinc-800 rounded-lg">
                                <button 
                                    type="button"
                                    onClick={() => setIsIso(false)}
                                    className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${!isIso ? 'bg-zinc-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
                                >
                                    Perspective
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setIsIso(true)}
                                    className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${isIso ? 'bg-zinc-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
                                >
                                    Isometric
                                </button>
                            </div>

                            {/* FOV Slider (Only for Perspective) */}
                            {!isIso && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <Slider 
                                        label="Field of View (Zoom/Depth)" 
                                        value={fov} 
                                        min={10} 
                                        max={90} 
                                        step={1} 
                                        onChange={setFov} 
                                    />
                                    <div className="flex justify-between text-[10px] text-zinc-500 mt-1 px-1">
                                        <span>Telephoto</span>
                                        <span>Wide</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Lighting Section */}
                        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-6">
                            <div className="space-y-1 border-b border-zinc-800 pb-2">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                                    Lighting
                                </h3>
                            </div>

                            <Slider 
                                label="Brightness" 
                                value={lightIntensity} 
                                min={0} 
                                max={4} 
                                step={0.1} 
                                onChange={setLightIntensity} 
                            />

                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-zinc-400 flex items-center gap-2">
                                    <Palette className="w-3 h-3" />
                                    Light Color
                                </span>
                                <div className="flex items-center gap-2 bg-zinc-800 p-1 rounded-lg border border-zinc-700">
                                     <input 
                                        type="color" 
                                        value={lightColor}
                                        onChange={(e) => setLightColor(e.target.value)}
                                        className="w-8 h-6 bg-transparent cursor-pointer border-none outline-none p-0"
                                     />
                                     <span className="text-[10px] font-mono text-zinc-400 w-14">{lightColor}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Viewport */}
                    <div className="flex-1 h-[500px] lg:h-auto order-1 lg:order-2 rounded-xl overflow-hidden shadow-2xl border border-zinc-800">
                        <ThreeViewer 
                            cutoutData={cutoutData} 
                            thickness={thickness} 
                            extrusionColor={extrusionColor}
                            bevelEnabled={bevelEnabled}
                            bevelSize={bevelSize}
                            isIso={isIso}
                            fov={fov}
                            lightIntensity={lightIntensity}
                            lightColor={lightColor}
                        />
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}

export default App;