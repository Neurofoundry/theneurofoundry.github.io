import { useState, useEffect, useRef, useCallback, type ChangeEvent, type CSSProperties } from 'react';
import { Upload, Zap, Sparkles, X } from 'lucide-react';

// Figma asset imports removed.
// Replace these paths with your preferred local assets (public folder recommended).
const anvilImg = '/assets/anvil.png';
const firePillarImg = '/assets/fire-pillar.png';
const forgeDetailImg = '/assets/forge-detail.png';
const forgeBgImg = '/assets/forge-bg.png';

interface Ember {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  drift: number;
  delay: number;
}

interface Spark {
  id: number;
  x: number;
  y: number;
  angle: number;
  deltaX: number;
  deltaY: number;
  distance: number;
  duration: number;
  rotation: number;
  delay: number;
}

export function ForgePage() {
  const [originImage, setOriginImage] = useState<string | null>(null);
  const [fusionImages, setFusionImages] = useState<(string | null)[]>([null, null, null]);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [embers, setEmbers] = useState<Ember[]>([]);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const emberIdRef = useRef(0);
  const sparkIdRef = useRef(0);
  const processingTimerRef = useRef<number | null>(null);

  // High-performance ember generation
  useEffect(() => {
    const generateEmbers = () => {
      const newEmbers: Ember[] = [];
      // Generate embers from the forge opening area
      for (let i = 0; i < 60; i++) {
        newEmbers.push({
          id: emberIdRef.current++,
          x: 35 + Math.random() * 30, // Center region
          y: 50 + Math.random() * 20, // Lower half
          size: 2 + Math.random() * 4,
          duration: 2.5 + Math.random() * 3.5,
          drift: (Math.random() - 0.5) * 80,
          delay: Math.random() * 6,
        });
      }
      setEmbers(newEmbers);
    };

    generateEmbers();
    const interval = setInterval(generateEmbers, 10000);
    return () => clearInterval(interval);
  }, []);

  // Anvil sparks generation
  useEffect(() => {
    const generateSparks = () => {
      const newSparks: Spark[] = [];
      // Generate sparks from bottom-right anvil area
      for (let i = 0; i < 25; i++) {
        const angle = -90 + (Math.random() - 0.5) * 70; // Spray upward and outward
        const distance = 60 + Math.random() * 120;
        const radians = (angle * Math.PI) / 180;
        newSparks.push({
          id: sparkIdRef.current++,
          x: 85, // Right side
          y: 80, // Bottom area
          angle,
          distance,
          deltaX: Math.cos(radians) * distance,
          deltaY: Math.sin(radians) * distance,
          duration: 0.8 + Math.random() * 0.8,
          rotation: (Math.random() - 0.5) * 720,
          delay: Math.random() * 4,
        });
      }
      setSparks(newSparks);
    };

    generateSparks();
    const interval = setInterval(generateSparks, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleOriginUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setOriginImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const handleFusionUpload = useCallback((index: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const uploadedImage = e.target?.result as string;
        setFusionImages((prev: Array<string | null>) => {
          const next = [...prev];
          next[index] = uploadedImage;
          return next;
        });
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleGenerate = useCallback(() => {
    setIsProcessing(true);
    if (processingTimerRef.current) {
      window.clearTimeout(processingTimerRef.current);
    }
    processingTimerRef.current = window.setTimeout(() => setIsProcessing(false), 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (processingTimerRef.current) {
        window.clearTimeout(processingTimerRef.current);
      }
    };
  }, []);

  const canGenerate = Boolean(originImage) && fusionImages.some((img: string | null) => img !== null) && Boolean(prompt.trim());

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Deep background - Layered ambient atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Primary glow */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1400px] h-[900px] bg-[#ff6b3d] opacity-20 blur-[250px] rounded-full animate-pulse"
          style={{ animationDuration: '8s' }}
        />
        {/* Secondary glow */}
        <div className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-[#ff4d1a] opacity-25 blur-[180px] rounded-full animate-pulse"
          style={{ animationDuration: '5s', animationDelay: '1s' }}
        />
        {/* Intense center hotspot */}
        <div className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#ffaa00] opacity-15 blur-[120px] rounded-full animate-pulse"
          style={{ animationDuration: '3s' }}
        />
      </div>

      {/* Forge background with Ken Burns effect */}
      <div 
        className="absolute inset-0 z-0 opacity-50"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(8,8,8,0.85), rgba(8,8,8,0.55)), url(${forgeBgImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: 'kenburns 25s ease-in-out infinite',
        }}
      />

      {/* Detailed forge overlay - THE MAIN ATTRACTION */}
      <div 
        className="absolute inset-0 z-[5]"
        style={{
          backgroundImage: `url(${forgeDetailImg})`,
          backgroundSize: '60% auto',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          filter: 'drop-shadow(0 0 80px rgba(255, 107, 61, 0.4))',
          maskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 75%)',
        }}
      />

      {/* Fire pillar - ANIMATED FLAMES */}
      <div 
        className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 z-[8] pointer-events-none"
        style={{
          width: '12%',
          height: '50%',
          backgroundImage: `url(${firePillarImg})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.85,
          filter: 'blur(0.5px) brightness(1.1)',
          animation: 'flameFlicker 0.3s ease-in-out infinite, flameWave 2s ease-in-out infinite',
          mixBlendMode: 'screen',
        }}
      />

      {/* Radial gradient overlay for depth */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 52%, rgba(255, 140, 50, 0.15) 0%, rgba(255, 100, 40, 0.08) 25%, rgba(0, 0, 0, 0.5) 60%, rgba(0, 0, 0, 0.8) 100%)',
        }}
      />

      {/* High-performance ember particles - FROM THE FORGE */}
      <div className="absolute inset-0 z-[25] pointer-events-none overflow-hidden">
        {embers.map((ember) => (
          <div
            key={ember.id}
            className="absolute rounded-full"
            style={{
              left: `${ember.x}%`,
              top: `${ember.y}%`,
              width: `${ember.size}px`,
              height: `${ember.size}px`,
              background: 'radial-gradient(circle, #ffaa00 0%, #ff7840 40%, #e0473c 70%, transparent 100%)',
              boxShadow: `0 0 ${ember.size * 4}px rgba(255, 170, 0, 0.9), 0 0 ${ember.size * 8}px rgba(255, 120, 80, 0.6), 0 0 ${ember.size * 12}px rgba(224, 71, 60, 0.3)`,
              animation: `emberRise ${ember.duration}s ease-out infinite`,
              animationDelay: `${ember.delay}s`,
              '--ember-drift': `${ember.drift}px`,
            } as CSSProperties}
          />
        ))}
      </div>

      {/* Anvil sparks - BOTTOM RIGHT */}
      <div className="absolute inset-0 z-[26] pointer-events-none overflow-hidden">
        {sparks.map((spark) => (
          <div
            key={spark.id}
            className="absolute"
            style={{
              left: `${spark.x}%`,
              top: `${spark.y}%`,
              width: '3px',
              height: '10px',
              background: 'linear-gradient(180deg, #ffffff 0%, #ffd700 20%, #ff8c00 60%, transparent 100%)',
              borderRadius: '2px',
              boxShadow: '0 0 8px #ffd700, 0 0 16px rgba(255, 215, 0, 0.6)',
              animation: `sparkFly ${spark.duration}s ease-out infinite`,
              animationDelay: `${spark.delay}s`,
              '--spark-angle': `${spark.angle}deg`,
              '--spark-distance': `${spark.distance}px`,
              '--spark-tx': `${spark.deltaX}px`,
              '--spark-ty': `${spark.deltaY}px`,
              '--spark-rotation': `${spark.rotation}deg`,
            } as CSSProperties}
          />
        ))}
      </div>

      {/* Anvil - BOTTOM RIGHT CORNER */}
      <div 
        className="absolute right-[8%] bottom-[8%] z-30 pointer-events-none"
        style={{
          width: '180px',
          height: 'auto',
        }}
      >
        <img 
          src={anvilImg} 
          alt="Anvil"
          className="w-full h-auto"
          style={{
            filter: 'drop-shadow(0 10px 30px rgba(0, 0, 0, 0.9)) drop-shadow(0 0 20px rgba(255, 107, 61, 0.3))',
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-[35] h-screen flex items-center justify-center p-8">
        {/* Central media viewer inside forge opening */}
        <div 
          className="absolute z-20"
          style={{
            left: '50%',
            top: '52%',
            transform: 'translate(-50%, calc(-50% - 60px))',
            width: '47.5%',
            aspectRatio: '16 / 9',
          }}
        >
          <div className="w-full h-full bg-black/95 rounded overflow-hidden relative"
            style={{
              boxShadow: 'inset 0 0 60px rgba(0, 0, 0, 0.98), inset 0 0 120px rgba(255, 107, 61, 0.15), 0 0 80px rgba(0, 0, 0, 0.9)',
              border: '2px solid rgba(255, 107, 61, 0.3)',
            }}
          >
            {isProcessing ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Holographic processing animation */}
                  <div 
                    className="w-32 h-40 bg-gradient-to-br from-[#ff8c5d]/20 to-[#ff6b3d]/30 rounded-lg border-2 border-[#ff6b3d]"
                    style={{
                      boxShadow: '0 0 60px rgba(255, 107, 61, 0.8), inset 0 0 40px rgba(255, 107, 61, 0.3)',
                      animation: 'holoExpand 2.5s ease-in-out infinite',
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent animate-scan" />
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,107,61,0.15)_0px,transparent_2px,transparent_4px)]" />
                    
                    {/* Processing text */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[#ff6b3d] text-xs font-black uppercase tracking-widest"
                        style={{ textShadow: '0 0 20px rgba(255, 107, 61, 0.8)' }}
                      >
                        Forging...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : originImage ? (
              <img src={originImage} alt="Forge content" className="w-full h-full object-contain" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-600">
                <div className="text-7xl opacity-40 animate-pulse" style={{ animationDuration: '2s' }}>🔥</div>
                <p className="text-sm font-medium tracking-wider">AWAITING SYNTHESIS...</p>
                <div className="flex gap-1 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-2 h-2 rounded-full bg-[#ff6b3d]/40"
                      style={{
                        animation: `pulse 1.5s ease-in-out infinite`,
                        animationDelay: `${i * 0.2}s`
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Viewing window glow effect */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, transparent 40%, rgba(255, 107, 61, 0.1) 100%)',
              }}
            />
          </div>
        </div>

        {/* Left panel - Origin */}
        <div className="absolute left-8 top-24 z-40 w-56">
          <div className="bg-[#0b0b0b] border-2 border-[#ff6b3d]/70 rounded-xl p-4 backdrop-blur-sm"
            style={{
              boxShadow: '0 0 50px rgba(255, 107, 61, 0.4), 0 20px 60px rgba(0, 0, 0, 0.95), inset 0 1px 0 rgba(255, 107, 61, 0.2), inset 0 0 30px rgba(255, 107, 61, 0.08)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#ff6b3d]/30">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff6b3d] to-[#e0473c] flex items-center justify-center text-sm font-black"
                style={{ boxShadow: '0 0 20px rgba(255, 107, 61, 0.8), 0 4px 12px rgba(0, 0, 0, 0.6)' }}
              >
                1
              </div>
              <h3 className="text-sm font-bold text-white">Origin Material</h3>
            </div>

            <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">Upload your base synthesis source</p>

            {/* Upload zone */}
            <label className={`block relative border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 overflow-hidden
              ${originImage ? 'border-[#ff6b3d] p-0' : 'border-[#ff6b3d]/40 p-6 hover:border-[#ff6b3d] hover:bg-[#ff6b3d]/10'}`}
              style={{
                boxShadow: originImage ? '0 0 20px rgba(255, 107, 61, 0.3)' : 'none'
              }}
            >
              <input type="file" accept="image/*" onChange={handleOriginUpload} className="hidden" />
              
              {originImage ? (
                <>
                  <img src={originImage} alt="Origin" className="w-full h-32 object-cover" />
                  <button
                    type="button"
                    onClick={() => setOriginImage(null)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/90 border border-[#ff6b3d]/70 flex items-center justify-center text-[#ff6b3d] hover:bg-[#ff6b3d]/30 transition-colors z-10"
                    style={{ boxShadow: '0 0 15px rgba(255, 107, 61, 0.8)' }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {/* Success indicator */}
                  <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                    style={{ boxShadow: '0 0 12px rgba(46, 213, 115, 0.9)' }}
                  >
                    <span className="text-[10px]">✓</span>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-[#ff6b3d]/20 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-[#ff6b3d]" />
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium">Click to upload</p>
                  <p className="text-[8px] text-gray-600 mt-1">PNG, JPG up to 10MB</p>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Right panels stack */}
        <div className="absolute right-8 top-24 z-40 flex flex-col gap-4 w-56">
          {/* Fusion Materials */}
          <div className="bg-[#0b0b0b] border-2 border-[#ff6b3d]/70 rounded-xl p-4 backdrop-blur-sm"
            style={{
              boxShadow: '0 0 50px rgba(255, 107, 61, 0.4), 0 20px 60px rgba(0, 0, 0, 0.95), inset 0 1px 0 rgba(255, 107, 61, 0.2), inset 0 0 30px rgba(255, 107, 61, 0.08)',
            }}
          >
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#ff6b3d]/30">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff6b3d] to-[#e0473c] flex items-center justify-center text-sm font-black"
                style={{ boxShadow: '0 0 20px rgba(255, 107, 61, 0.8), 0 4px 12px rgba(0, 0, 0, 0.6)' }}
              >
                2
              </div>
              <h3 className="text-sm font-bold text-white">Fusion Sources</h3>
            </div>

            <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">Add fusion elements (1-3)</p>

            <div className="grid grid-cols-3 gap-2">
              {fusionImages.map((img: string | null, index: number) => (
                <label
                  key={index}
                  className={`relative aspect-square border border-dashed rounded-lg cursor-pointer transition-all duration-300 overflow-hidden
                    ${img ? 'border-[#ff6b3d]' : 'border-[#ff6b3d]/40 hover:border-[#ff6b3d] hover:bg-[#ff6b3d]/10'}`}
                  style={{
                    boxShadow: img ? '0 0 15px rgba(255, 107, 61, 0.4)' : 'none'
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleFusionUpload(index, e)}
                    className="hidden"
                  />
                  
                  {img ? (
                    <>
                      <img src={img} alt={`Fusion ${index + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center"
                        style={{ boxShadow: '0 0 10px rgba(46, 213, 115, 0.9)' }}
                      >
                        <div className="text-[8px]">✓</div>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[#ff6b3d]/60">
                      <Zap className="w-4 h-4 mb-1" />
                      <span className="text-[7px] font-bold">{index + 1}</span>
                    </div>
                  )}
                </label>
              ))}
            </div>

            {/* Progress indicator */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-black/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#ff6b3d] to-[#ffaa00] transition-all duration-300"
                  style={{ 
                    width: `${(fusionImages.filter((img: string | null) => img !== null).length / 3) * 100}%`,
                    boxShadow: '0 0 10px rgba(255, 107, 61, 0.6)'
                  }}
                />
              </div>
              <span className="text-[9px] text-gray-500 font-medium">
                {fusionImages.filter((img: string | null) => img !== null).length}/3
              </span>
            </div>
          </div>

          {/* AI Synthesis */}
          <div className="bg-[#0b0b0b] border-2 border-[#ff6b3d]/70 rounded-xl p-4 backdrop-blur-sm"
            style={{
              boxShadow: '0 0 50px rgba(255, 107, 61, 0.4), 0 20px 60px rgba(0, 0, 0, 0.95), inset 0 1px 0 rgba(255, 107, 61, 0.2), inset 0 0 30px rgba(255, 107, 61, 0.08)',
            }}
          >
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#ff6b3d]/30">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff6b3d] to-[#e0473c] flex items-center justify-center text-sm font-black"
                style={{ boxShadow: '0 0 20px rgba(255, 107, 61, 0.8), 0 4px 12px rgba(0, 0, 0, 0.6)' }}
              >
                3
              </div>
              <h3 className="text-sm font-bold text-white">Neural Synthesis</h3>
            </div>

            <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">Describe transformation parameters</p>

            <textarea
              value={prompt}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
              placeholder="Enter synthesis parameters..."
              className="w-full h-24 px-3 py-2 bg-black/50 border border-[#ff6b3d]/40 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#ff6b3d] focus:shadow-[0_0_20px_rgba(255,107,61,0.3)] transition-all resize-none"
              style={{ boxShadow: 'inset 0 0 25px rgba(255, 107, 61, 0.08)' }}
            />

            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isProcessing}
              className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-[#ff6b3d] to-[#e0473c] text-white text-xs font-black rounded-lg uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              style={{
                boxShadow: canGenerate && !isProcessing 
                  ? '0 0 40px rgba(255, 107, 61, 0.6), 0 8px 25px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.2)' 
                  : 'none',
              }}
            >
              <span className="flex items-center justify-center gap-2">
                <Sparkles className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                {isProcessing ? 'FORGING...' : 'IGNITE FORGE'}
              </span>
            </button>
          </div>
        </div>

        {/* Top label */}
        <div className="absolute top-8 left-8 z-40">
          <div className="px-4 py-2 bg-black/70 border border-[#ff6b3d]/60 rounded-lg backdrop-blur-sm"
            style={{ boxShadow: '0 0 30px rgba(255, 107, 61, 0.4), inset 0 0 20px rgba(255, 107, 61, 0.1)' }}
          >
            <span className="text-[11px] font-black text-[#ff6b3d] uppercase tracking-[0.2em]"
              style={{ textShadow: '0 0 15px rgba(255, 107, 61, 1), 0 0 30px rgba(255, 107, 61, 0.5)' }}
            >
              Neural Synthesis Engine
            </span>
          </div>
        </div>

        {/* Temperature gauge - TOP RIGHT */}
        <div className="absolute top-8 right-8 z-40">
          <div className="px-3 py-2 bg-black/70 border border-[#ff6b3d]/60 rounded-lg backdrop-blur-sm flex items-center gap-2"
            style={{ boxShadow: '0 0 25px rgba(255, 107, 61, 0.3), inset 0 0 20px rgba(255, 107, 61, 0.1)' }}
          >
            <div className="text-[#ff6b3d]">🌡️</div>
            <div className="flex flex-col">
              <span className="text-[8px] text-gray-500 uppercase tracking-wider">Temp</span>
              <span className="text-xs font-black text-[#ffaa00]"
                style={{ textShadow: '0 0 10px rgba(255, 170, 0, 0.8)' }}
              >
                2400°C
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes kenburns {
          0%, 100% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.15) translate(-3%, 2%); }
        }

        @keyframes emberRise {
          0% {
            opacity: 0;
            transform: translateY(0) translateX(0) scale(1);
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 0.5;
          }
          100% {
            opacity: 0;
            transform: translateY(-220px) translateX(var(--ember-drift)) scale(0.3);
          }
        }

        @keyframes sparkFly {
          0% {
            opacity: 1;
            transform: translate(0, 0) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translate(var(--spark-tx), var(--spark-ty)) rotate(var(--spark-rotation));
          }
        }

        @keyframes holoExpand {
          0%, 100% {
            width: 8rem;
            height: 10rem;
            opacity: 0.8;
          }
          50% {
            width: 32rem;
            height: 20rem;
            opacity: 1;
          }
        }

        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(200%); }
        }

        @keyframes flameFlicker {
          0%, 100% { opacity: 0.85; transform: scaleY(1) scaleX(1); }
          50% { opacity: 0.95; transform: scaleY(1.05) scaleX(0.98); }
        }

        @keyframes flameWave {
          0%, 100% { transform: translateX(0) scaleX(1); }
          25% { transform: translateX(2px) scaleX(1.02); }
          75% { transform: translateX(-2px) scaleX(0.98); }
        }

        .animate-scan {
          animation: scan 3s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default ForgePage;
