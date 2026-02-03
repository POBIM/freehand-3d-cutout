import React, { useMemo, useRef, useState, useEffect, Suspense, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Center, Environment, Stage, ContactShadows, Html, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { Camera, Download, X, Check, Loader2, Box } from 'lucide-react';
import { Button } from './UIComponents';
import { CutoutData } from '../types';

interface ExtrudedMeshProps {
  data: CutoutData;
  thickness: number;
  extrusionColor: string;
  bevelEnabled: boolean;
  bevelSize: number;
}

const ExtrudedMesh: React.FC<ExtrudedMeshProps> = ({ data, thickness, extrusionColor, bevelEnabled, bevelSize }) => {
  // Use core useLoader instead of drei's useTexture for better stability with esm.sh
  const texture = useLoader(THREE.TextureLoader, data.textureUrl);
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (texture) {
      // guard against texture being disposed or undefined
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
    }
  }, [texture]);
  
  // Create shape from points
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (!data.points || data.points.length < 3) return s;

    // Convert normalized points back to a relative size
    const scale = 5;
    const aspect = data.aspectRatio;

    // First point
    // Note: Canvas Y is top-down, Three.js Y is bottom-up. We flip Y.
    s.moveTo(
      (data.points[0].x - 0.5) * scale * aspect, 
      -(data.points[0].y - 0.5) * scale
    );

    // Rest of points
    for (let i = 1; i < data.points.length; i++) {
      s.lineTo(
        (data.points[i].x - 0.5) * scale * aspect, 
        -(data.points[i].y - 0.5) * scale
      );
    }
    s.closePath();
    return s;
  }, [data.points, data.aspectRatio]);

  const geometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: bevelEnabled,
      bevelSegments: bevelEnabled ? 8 : 0,
      steps: 1,
      bevelSize: bevelEnabled ? bevelSize : 0,
      bevelThickness: bevelEnabled ? bevelSize : 0
    });

    // Fix UV mapping for the front face
    const posAttribute = geo.attributes.position;
    const uvAttribute = geo.attributes.uv;
    
    if (posAttribute && uvAttribute) {
        const scale = 5;
        const aspect = data.aspectRatio;

        for (let i = 0; i < posAttribute.count; i++) {
          const x = posAttribute.getX(i);
          const y = posAttribute.getY(i);
          
          const u = (x / (scale * aspect)) + 0.5;
          const v = 1 - (-(y / scale) + 0.5);

          uvAttribute.setXY(i, u, v);
        }
        
        uvAttribute.needsUpdate = true;
    }
    
    return geo;
  }, [shape, thickness, data.aspectRatio, bevelEnabled, bevelSize]);

  return (
    <Center top>
        {/* Rotate -90deg on X axis to make the face point up (Y-axis) and object lay on XZ plane */}
        <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          {/* Material 0: Front/Back Face (The Image) */}
          <meshStandardMaterial 
            map={texture} 
            attach="material-0" 
            roughness={0.8} 
            metalness={0.1}
            envMapIntensity={0.8}
            side={THREE.DoubleSide}
            transparent={true} // Handle png transparency if any
            alphaTest={0.5}
          />
          {/* Material 1: Sides (Extrusion) */}
          <meshStandardMaterial 
            color={extrusionColor} 
            attach="material-1" 
            roughness={0.5} 
            metalness={0.2}
          />
        </mesh>
    </Center>
  );
};

const GLBExportHandler = ({
    trigger,
    onExport,
    onError
}: {
    trigger: number,
    onExport: (blob: Blob) => void,
    onError: (msg: string) => void
}) => {
    const { scene } = useThree();

    useEffect(() => {
        if (trigger > 0) {
            try {
                const exporter = new GLTFExporter();
                
                const exportScene = new THREE.Scene();
                
                scene.traverse((obj) => {
                    if (obj instanceof THREE.Mesh && obj.geometry?.type === 'ExtrudeGeometry') {
                        const clonedMesh = obj.clone();
                        clonedMesh.geometry = obj.geometry.clone();
                        
                        if (Array.isArray(obj.material)) {
                            clonedMesh.material = obj.material.map(m => m.clone());
                        } else {
                            clonedMesh.material = obj.material.clone();
                        }
                        
                        exportScene.add(clonedMesh);
                    }
                });

                const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
                exportScene.add(ambientLight);
                
                const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
                directionalLight.position.set(5, 10, 5);
                exportScene.add(directionalLight);

                exporter.parse(
                    exportScene,
                    (result) => {
                        const blob = new Blob([result as ArrayBuffer], { type: 'application/octet-stream' });
                        onExport(blob);
                    },
                    (error) => {
                        onError(`Export failed: ${error.message}`);
                    },
                    { binary: true }
                );
            } catch (err) {
                onError(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        }
    }, [trigger, scene, onExport, onError]);

    return null;
};

// Component to handle the screenshot logic inside the Canvas context
const ScreenshotHandler = ({ 
    trigger, 
    scale, 
    onCapture,
    onError
}: { 
    trigger: number, 
    scale: number, 
    onCapture: (url: string) => void,
    onError: (msg: string) => void
}) => {
    const { gl, scene, camera, size } = useThree();

    useEffect(() => {
        if (trigger > 0) {
            try {
                const maxDimension = Math.max(size.width, size.height) * scale;
                const webglMax = gl.capabilities.maxTextureSize;
                
                if (maxDimension > webglMax) {
                    onError(`Resolution too high. Max supported: ${webglMax}px. Try a lower scale.`);
                    return;
                }

                const originalPixelRatio = gl.getPixelRatio();
                const originalBackground = scene.background;
                
                const hiddenObjects: THREE.Object3D[] = [];
                scene.traverse((obj) => {
                    if (obj.name === 'ContactShadows' || 
                        (obj as THREE.Mesh).material?.type === 'ShadowMaterial' ||
                        obj.type === 'GridHelper') {
                        if (obj.visible) {
                            hiddenObjects.push(obj);
                            obj.visible = false;
                        }
                    }
                });
                
                gl.setPixelRatio(scale);
                scene.background = null;
                
                gl.setClearColor(0x000000, 0);
                gl.clear();
                gl.render(scene, camera);
                
                const dataUrl = gl.domElement.toDataURL('image/png', 1.0);
                
                gl.setPixelRatio(originalPixelRatio);
                scene.background = originalBackground;
                hiddenObjects.forEach(obj => { obj.visible = true; });
                
                gl.render(scene, camera);
                
                onCapture(dataUrl);
            } catch (err) {
                onError(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        }
    }, [trigger, scale, gl, scene, camera, size, onCapture, onError]);

    return null;
}

// Component to force update camera properties when props change
const CameraUpdater = ({ isIso, fov }: { isIso: boolean; fov: number }) => {
  const { camera } = useThree();

  useEffect(() => {
    if (!isIso && camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [camera, isIso, fov]);

  return null;
};

// Loading Spinner
function LoadingState() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 bg-black/80 p-4 rounded-xl backdrop-blur border border-zinc-800">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-xs font-mono text-zinc-300">{progress.toFixed(0)}%</span>
      </div>
    </Html>
  );
}

interface ExportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (scale: number) => void;
    error?: string | null;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, onConfirm, error }) => {
    const [selectedScale, setSelectedScale] = useState(2);

    if (!isOpen) return null;

    const options = [
        { scale: 1, label: 'Standard (1x)', desc: 'Screen resolution, fastest.' },
        { scale: 2, label: 'High (2x)', desc: 'Good for social media.' },
        { scale: 4, label: 'Ultra (4x)', desc: 'Print quality, large file.' },
        { scale: 8, label: 'Extreme (8x)', desc: 'Maximum detail, requires good GPU.' },
    ];

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl shadow-2xl w-full max-w-sm mx-4">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Download className="w-5 h-5 text-indigo-400" />
                        Export Image
                    </h3>
                    <button type="button" onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-3 mb-6">
                    <span className="text-sm font-medium text-zinc-400">Select Resolution</span>
                    <div className="grid gap-2">
                        {options.map((opt) => (
                            <button
                                type="button"
                                key={opt.scale}
                                onClick={() => setSelectedScale(opt.scale)}
                                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                                    selectedScale === opt.scale
                                    ? 'bg-indigo-500/10 border-indigo-500 text-white'
                                    : 'bg-zinc-800 border-zinc-800 text-zinc-300 hover:bg-zinc-750 hover:border-zinc-700'
                                }`}
                            >
                                <div>
                                    <div className="font-medium text-sm">{opt.label}</div>
                                    <div className="text-xs text-zinc-500">{opt.desc}</div>
                                </div>
                                {selectedScale === opt.scale && (
                                    <Check className="w-4 h-4 text-indigo-400" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button 
                        variant="primary" 
                        className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 border-0" 
                        onClick={() => onConfirm(selectedScale)}
                    >
                        Save Image
                    </Button>
                </div>
            </div>
        </div>
    );
};

interface ThreeViewerProps {
  cutoutData: CutoutData;
  thickness: number;
  extrusionColor: string;
  bevelEnabled: boolean;
  bevelSize: number;
  isIso: boolean;
  fov: number;
  lightIntensity: number;
  lightColor: string;
}

export const ThreeViewer: React.FC<ThreeViewerProps> = ({ 
    cutoutData, 
    thickness,
    extrusionColor,
    bevelEnabled,
    bevelSize,
    isIso,
    fov,
    lightIntensity,
    lightColor
}) => {
  const [captureTrigger, setCaptureTrigger] = useState(0);
  const [captureScale, setCaptureScale] = useState(1);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [pendingScale, setPendingScale] = useState<number | null>(null);
  
  const [glbExportTrigger, setGlbExportTrigger] = useState(0);
  const [isExportingGLB, setIsExportingGLB] = useState(false);

  useEffect(() => {
      if (pendingScale !== null && isProcessing) {
          setCaptureScale(pendingScale);
          const timer = setTimeout(() => {
              setCaptureTrigger(c => c + 1);
              setPendingScale(null);
          }, 150);
          return () => clearTimeout(timer);
      }
  }, [pendingScale, isProcessing]);

  const onCaptureComplete = (dataUrl: string) => {
      const link = document.createElement('a');
      link.download = `3d-cutout-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      setIsProcessing(false);
      setExportError(null);
  };

  const onCaptureError = (msg: string) => {
      setIsProcessing(false);
      setExportError(msg);
      setShowExportDialog(true);
  };

  const handleExportConfirm = (scale: number) => {
      setShowExportDialog(false);
      setExportError(null);
      setIsProcessing(true);
      setPendingScale(scale);
  };

  const handleExportGLB = () => {
      setIsExportingGLB(true);
      setGlbExportTrigger(c => c + 1);
  };

  const onGLBExportComplete = (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `3d-cutout-${Date.now()}.glb`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      setIsExportingGLB(false);
  };

  const onGLBExportError = (msg: string) => {
      setIsExportingGLB(false);
      alert(msg);
  };

  return (
    <div className="w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-zinc-900 to-black relative shadow-2xl border border-zinc-800 group">
      
      {/* Overlay Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
           <Button 
                variant="secondary" 
                className="h-9 text-xs bg-black/50 backdrop-blur border-zinc-700 hover:bg-black/70"
                onClick={handleExportGLB}
                disabled={isExportingGLB}
           >
                {isExportingGLB ? (
                    <span className="animate-pulse">Exporting...</span>
                ) : (
                    <>
                        <Box className="w-4 h-4 mr-2" />
                        Export GLB
                    </>
                )}
           </Button>
           <Button 
                variant="secondary" 
                className="h-9 text-xs bg-black/50 backdrop-blur border-zinc-700 hover:bg-black/70"
                onClick={() => setShowExportDialog(true)}
                disabled={isProcessing}
           >
                {isProcessing ? (
                    <span className="animate-pulse">Processing...</span>
                ) : (
                    <>
                        <Camera className="w-4 h-4 mr-2" />
                        HD Snapshot
                    </>
                )}
           </Button>
      </div>

      {/* Export Dialog */}
      <ExportDialog 
        isOpen={showExportDialog} 
        onClose={() => setShowExportDialog(false)} 
        onConfirm={handleExportConfirm}
        error={exportError}
      />

      <Canvas 
        shadows 
        // Logic for Orthographic vs Perspective Camera
        orthographic={isIso}
        camera={{ 
            position: [0, 8, 8], 
            // In Ortho mode, 'zoom' controls size. In Perspective, 'fov' controls view.
            zoom: isIso ? 60 : 1, 
            fov: fov 
        }} 
        gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
      >
        {/* Handle Camera Updates */}
        <CameraUpdater isIso={isIso} fov={fov} />

        {/* Dynamic Lights */}
        <ambientLight intensity={lightIntensity * 0.3} color={lightColor} /> 
        
        <spotLight 
            position={[10, 20, 10]} 
            angle={0.25} 
            penumbra={1} 
            intensity={lightIntensity} 
            color={lightColor}
            shadow-mapSize={2048} 
            castShadow 
        />
        
        {/* Fill light from opposite side */}
        <pointLight position={[-10, 5, -10]} intensity={lightIntensity * 0.2} color={lightColor} />

        <Environment preset="city" environmentIntensity={0.5} />
        
        {/* The Object - Wrapped in Suspense to prevent Stage/Texture access before ready */}
        <Suspense fallback={<LoadingState />}>
            <Stage intensity={0.1} environment="city" adjustCamera={false}>
                <ExtrudedMesh 
                    data={cutoutData} 
                    thickness={thickness} 
                    extrusionColor={extrusionColor}
                    bevelEnabled={bevelEnabled}
                    bevelSize={bevelSize}
                />
            </Stage>
        </Suspense>
        
        {/* Shadow Plane */}
        <ContactShadows 
            opacity={0.6} 
            scale={20} 
            blur={2} 
            far={4} 
            resolution={256} 
            color="#000000" 
        />

        {/* Controls */}
        <OrbitControls makeDefault autoRotate={false} minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} />
        
        <ScreenshotHandler 
            trigger={captureTrigger} 
            scale={captureScale}
            onCapture={onCaptureComplete}
            onError={onCaptureError}
        />
        
        <GLBExportHandler
            trigger={glbExportTrigger}
            onExport={onGLBExportComplete}
            onError={onGLBExportError}
        />
      </Canvas>
      
      <div className="absolute bottom-4 left-0 right-0 pointer-events-none flex justify-center opacity-50 group-hover:opacity-100 transition-opacity">
        <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-xs text-zinc-300 border border-white/10 flex items-center gap-4">
           <span>{isIso ? 'Isometric Mode' : 'Perspective Mode'}</span>
           <span className="w-1 h-1 bg-zinc-500 rounded-full"></span>
           <span>Left Click: Rotate</span>
           <span className="w-1 h-1 bg-zinc-500 rounded-full"></span>
           <span>Scroll: Zoom</span>
        </div>
      </div>
    </div>
  );
};