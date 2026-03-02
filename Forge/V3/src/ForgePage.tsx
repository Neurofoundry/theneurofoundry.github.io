import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from 'react';

const furnaceBack = '/assets/furnacebg.png';
const furnaceFront = '/assets/furnace.png';
const forgeBg = '/assets/forge-bg.png';
const forgeDetail = '/assets/forge-detail.png';
const firePillar = '/assets/fire-pillar.png';
const fg1Img = '/assets/fg1.png';

interface Ember {
  id: number;
  left: string;
  top: string;
  size: string;
  glow: string;
  delay: string;
  duration: string;
  drift: string;
}

export function ForgePage() {
  const [originModel, setOriginModel] = useState('sdxl');
  const [fusionMode, setFusionMode] = useState<'fusion' | 'fractal'>('fusion');
  const [originImage, setOriginImage] = useState<string | null>(null);
  const [subjectImage, setSubjectImage] = useState<string | null>(null);
  const [sceneImage, setSceneImage] = useState<string | null>(null);
  const [styleImage, setStyleImage] = useState<string | null>(null);
  const [stylePreset, setStylePreset] = useState('Cinematic');
  const [positivePrompt, setPositivePrompt] = useState('A fantasy creature in its habitat');
  const [scenePrompt, setScenePrompt] = useState('A mystical forest with glow');
  const [negativePrompt, setNegativePrompt] = useState('A majestic dragon soaring over a mystical forest at dawn.');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [seed, setSeed] = useState(12345);
  const [guidance, setGuidance] = useState(7.5);
  const [steps, setSteps] = useState(25);
  const [fusionStatus, setFusionStatus] = useState('Waiting for subject + scene.');
  const [forgeStatus, setForgeStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fx, setFx] = useState({
    shellMotion: true,
    ambientGlow: true,
    bgImage: true,
    furnaceBack: true,
    detailLayer: true,
    firePillar: true,
    furnaceOverlay: true,
    embers: true,
    centerBlend: true,
    designOverlay: true,
    viewerEdgeGlow: true,
    mediaFrameGlow: true,
    processingGlow: true,
    displacement: true,
    pulseFlame: true,
  });
  const timerRef = useRef<number | null>(null);
  const [showFurnaceFront, setShowFurnaceFront] = useState(true);

  const embers = useMemo<Ember[]>(
    () => Array.from({ length: 96 }).map((_, i) => ({
      id: i,
      left: `${28 + Math.random() * 44}%`,
      top: `${50 + Math.random() * 20}%`,
      size: `${2 + Math.random() * 4}px`,
      glow: `${8 + Math.random() * 18}px`,
      delay: `${Math.random() * 2.2}s`,
      duration: `${1.4 + Math.random() * 1.3}s`,
      drift: `${-55 + Math.random() * 110}px`,
    })),
    [],
  );

  const mediaImage = originImage || subjectImage || sceneImage || styleImage;
  const crafts = useMemo(() => Array.from({ length: 16 }), []);

  useEffect(
    () => () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    },
    [],
  );

  const readFile = (file: File, setter: (value: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        setter(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOriginUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file, (value) => {
      setOriginImage(value);
      setForgeStatus('Origin loaded. Ready to forge.');
      setFusionStatus('Fusion disabled. Origin image loaded.');
    });
  };

  const handleFusionUpload = (slot: 'subject' | 'scene' | 'style', e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    readFile(file, (value) => {
      setOriginImage(null);
      if (slot === 'subject') setSubjectImage(value);
      if (slot === 'scene') setSceneImage(value);
      if (slot === 'style') setStyleImage(value);
      if (slot !== 'style' && ((slot === 'subject' && sceneImage) || (slot === 'scene' && subjectImage))) {
        setFusionStatus('Inputs ready. Press Generate Image.');
      }
    });
  };

  const runFakeProcess = (message: string) => {
    setIsProcessing(true);
    setForgeStatus(message);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setIsProcessing(false);
      setForgeStatus('Render complete.');
    }, 2200);
  };

  const handleGenerateFusion = () => {
    if (!subjectImage || !sceneImage) {
      setFusionStatus('Need subject + scene before generation.');
      return;
    }
    setFusionStatus(fusionMode === 'fractal' ? 'Running fractal fusion pass...' : 'Running fusion pass...');
    runFakeProcess('Forging fusion...');
    window.setTimeout(() => {
      setFusionStatus('Fusion ready.');
    }, 2200);
  };

  const handleResynthesize = () => {
    runFakeProcess('Resynthesizing prompts...');
  };

  const handleForge = () => {
    runFakeProcess('Rendering...');
  };

  return (
    <div className="forge-page">
      <div className="page-background" />

      <header className="topbar">
        <div className="nav">
          <a href="#" className="brand" onClick={(e) => e.preventDefault()}>
            <div className="brand-icon">N</div>
            <span>NEUROFOUNDRY</span>
          </a>
          <div className="links">
            <a href="#" className="navlink" onClick={(e) => e.preventDefault()}>Home</a>
            <a href="#" className="navlink" onClick={(e) => e.preventDefault()}>Forge</a>
            <a href="#" className="navlink" onClick={(e) => e.preventDefault()}>Technology</a>
          </div>
        </div>
      </header>

      <div className="effects-toggle-box">
        <div style={{ fontWeight: 800, marginBottom: 4 }}>FX Toggles</div>
        {(Object.keys(fx) as Array<keyof typeof fx>).map((key) => (
          <label key={key} className="fx-row">
            <input
              type="checkbox"
              checked={fx[key]}
              onChange={(e) => setFx((prev) => ({ ...prev, [key]: e.target.checked }))}
            />
            <span>{key}</span>
          </label>
        ))}
      </div>

      <div className="effects-toggle-box effects-toggle-box-left">
        <div style={{ fontWeight: 800, marginBottom: 4 }}>Media Orange Elements</div>
        {(
          [
            'mediaFrameGlow',
            'viewerEdgeGlow',
            'ambientGlow',
            'centerBlend',
            'furnaceOverlay',
            'processingGlow',
            'pulseFlame',
          ] as Array<keyof typeof fx>
        ).map((key) => (
          <label key={`left-${key}`} className="fx-row">
            <input
              type="checkbox"
              checked={fx[key]}
              onChange={(e) => setFx((prev) => ({ ...prev, [key]: e.target.checked }))}
            />
            <span>{key}</span>
          </label>
        ))}
      </div>

      <div className="forge-container">
        <div className={`forge-motion-shell ${fx.shellMotion ? '' : 'fx-off-shell-motion'}`} aria-hidden="true">
          <div className="forge-glow-layer">
            <div className={`glow glow-primary ${fx.ambientGlow ? '' : 'fx-hidden'}`} />
            <div className={`glow glow-secondary ${fx.ambientGlow ? '' : 'fx-hidden'}`} />
            <div className={`glow glow-core ${fx.ambientGlow ? '' : 'fx-hidden'}`} />
          </div>

          <div className={`forge-bg-image ${fx.bgImage ? '' : 'fx-hidden'}`} style={{ backgroundImage: `url(${forgeBg})` }} />
          <div className={`furnace-back ${fx.furnaceBack ? '' : 'fx-hidden'}`} style={{ backgroundImage: `url(${furnaceBack})` }} />
          <div className={`forge-detail-layer ${fx.detailLayer ? '' : 'fx-hidden'}`} style={{ backgroundImage: `url(${forgeDetail})` }} />
          <div className={`fire-pillar ${fx.firePillar ? '' : 'fx-hidden'}`} style={{ backgroundImage: `url(${firePillar})` }} />

          <div className={`media-viewer ${fx.mediaFrameGlow ? '' : 'no-frame-glow'} ${fx.displacement ? 'displacement' : ''} ${fx.pulseFlame ? 'pulseflame' : ''} ${isProcessing && fx.processingGlow ? 'processing' : ''}`}>
            <div className={`viewer-edge-glow ${fx.viewerEdgeGlow ? '' : 'fx-hidden'}`} aria-hidden="true" />
            <div className="media-container">
              <div className="media-content">
                {mediaImage && <img src={mediaImage} alt="Render" />}
              </div>
            </div>
          </div>

          <div className={`furnace-front ${showFurnaceFront ? '' : 'is-hidden'}`} style={{ backgroundImage: `url(${furnaceFront})` }} />

          <div className={`furnace-overlay ${fx.furnaceOverlay ? '' : 'fx-hidden'}`} />

          <div className={`ember-container ${fx.embers ? '' : 'fx-hidden'}`}>
            {embers.map((ember) => (
              <div
                key={ember.id}
                className="ember"
                style={
                  {
                    left: ember.left,
                    top: ember.top,
                    width: ember.size,
                    height: ember.size,
                    boxShadow: `0 0 ${ember.glow} rgba(255, 176, 80, 0.95), 0 0 calc(${ember.glow} * 1.8) rgba(255, 123, 70, 0.7)`,
                    animationDelay: ember.delay,
                    animationDuration: ember.duration,
                    '--drift': ember.drift,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          <div className={`center-blend-layer ${fx.centerBlend ? '' : 'fx-hidden'}`} />
          <div className={`design-overlay ${fx.designOverlay ? '' : 'fx-hidden'}`} style={{ backgroundImage: `url(${fg1Img})` }} />
        </div>

        <div className="workspace">
          <div className="panels-container">
            <div className="furnace-header">
              <div className="header-label">Forge Preview</div>
            </div>

            <div className="panels-row">
              <div className="left-panels">
                <div className="panel">
                  <div className="panel-header">
                    <div className="step-number">1</div>
                    <div className="panel-title panel-title-row">
                      <span>Origin</span>
                      <select value={originModel} className="origin-select" onChange={(e) => setOriginModel(e.target.value)}>
                        <option value="sdxl">SDXL</option>
                        <option value="phoenix">Phoenix</option>
                        <option value="flux">Flux</option>
                        <option value="dreamshaper">Dreamshaper</option>
                      </select>
                    </div>
                  </div>
                  <p className="panel-description">The seed. Drop your starting frame here.</p>
                  <label className="upload-zone">
                    <div className="upload-icon">+</div>
                    <input type="file" accept="image/*" onChange={handleOriginUpload} />
                  </label>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <div className="step-number">2</div>
                    <div className="panel-title">Fusion</div>
                  </div>
                  <p className="panel-description">Blend elements. Subject + Scene + Style = Origin.</p>
                  <div className="fusion-tabs">
                    <button className={`fusion-tab ${fusionMode === 'fusion' ? 'active' : ''}`} onClick={() => setFusionMode('fusion')}>Fusion</button>
                    <button className={`fusion-tab ${fusionMode === 'fractal' ? 'active' : ''}`} onClick={() => setFusionMode('fractal')}>Fractal</button>
                  </div>
                  <div className="fusion-grid">
                    <label className={`fusion-item ${subjectImage ? 'has-image' : ''}`} style={subjectImage ? { backgroundImage: `url(${subjectImage})` } : undefined}>
                      <div className="fusion-label">Subject</div>
                      <div className="fusion-hint">Drop or click</div>
                      <input type="file" accept="image/*" onChange={(e) => handleFusionUpload('subject', e)} />
                    </label>
                    <label className={`fusion-item ${sceneImage ? 'has-image' : ''}`} style={sceneImage ? { backgroundImage: `url(${sceneImage})` } : undefined}>
                      <div className="fusion-label">Scene</div>
                      <div className="fusion-hint">Drop or click</div>
                      <input type="file" accept="image/*" onChange={(e) => handleFusionUpload('scene', e)} />
                    </label>
                    <label className={`fusion-item ${styleImage ? 'has-image' : ''}`} style={styleImage ? { backgroundImage: `url(${styleImage})` } : undefined}>
                      <div className="fusion-label">Style</div>
                      <div className="fusion-hint">Optional</div>
                      <input type="file" accept="image/*" onChange={(e) => handleFusionUpload('style', e)} />
                    </label>
                  </div>
                  <div className="fusion-status">{fusionStatus}</div>
                  <button className="generate-btn" onClick={handleGenerateFusion}>Generate Image</button>
                </div>
              </div>

              <div className="panel right-panel">
                <div className="panel-header">
                  <div className="step-number">3</div>
                  <div className="panel-title">Assemble</div>
                </div>
                <p className="panel-description">Define the vision. Style, context, and motion - woven into one.</p>

                <div className="input-group">
                  <label className="input-label">Style</label>
                  <select className="input-select" value={stylePreset} onChange={(e) => setStylePreset(e.target.value)}>
                    <option>Cinematic</option>
                    <option>Documentary</option>
                    <option>Artistic</option>
                    <option>Dramatic</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Positive Prompt</label>
                  <textarea className="input-field" value={positivePrompt} onChange={(e) => setPositivePrompt(e.target.value)} />
                </div>

                <div className="input-group">
                  <label className="input-label">Scene Prompt</label>
                  <textarea className="input-field" value={scenePrompt} onChange={(e) => setScenePrompt(e.target.value)} />
                </div>

                <div className="input-group">
                  <label className="input-label">Negative Prompt</label>
                  <textarea className="input-field" value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} />
                </div>

                <button className="advanced-toggle" onClick={() => setAdvancedOpen((v) => !v)}>Advanced Controls</button>

                <div className={`advanced-panel ${advancedOpen ? 'open' : ''}`}>
                  <div className="input-group">
                    <label className="input-label">Seed</label>
                    <div className="slider-row">
                      <input type="range" min={1} max={999999} value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
                      <span className="slider-value">{seed}</span>
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Guidance</label>
                    <div className="slider-row">
                      <input type="range" min={1} max={20} step={0.1} value={guidance} onChange={(e) => setGuidance(Number(e.target.value))} />
                      <span className="slider-value">{guidance}</span>
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Steps</label>
                    <div className="slider-row">
                      <input type="range" min={8} max={80} value={steps} onChange={(e) => setSteps(Number(e.target.value))} />
                      <span className="slider-value">{steps}</span>
                    </div>
                  </div>
                </div>

                <div className="action-buttons">
                  <button className="ai-generate-btn" onClick={handleResynthesize}>Resynthesize</button>
                  <button className="render-btn" onClick={handleForge}>FORGE IT</button>
                </div>
              </div>
            </div>
          </div>

          <div className="bottom-controls">
            <div className="recent-crafts">
              <div className="recent-title">Recent Crafts</div>
              <div className="craft-items">
                {crafts.map((_, idx) => (
                  <div key={idx} className="craft-item" />
                ))}
              </div>
              <div className="forge-status">{forgeStatus}</div>
            </div>
          </div>
        </div>
      </div>

      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
        <filter id="forgeDisplacement" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.035" numOctaves="2" seed="7" result="noise">
            <animate attributeName="baseFrequency" dur="2.6s" values="0.012 0.035;0.02 0.05;0.012 0.035" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G">
            <animate attributeName="scale" dur="2.2s" values="8;16;8" repeatCount="indefinite" />
          </feDisplacementMap>
        </filter>
      </svg>

      <style>{`
        .forge-page {
          min-height: 100vh;
          background: #0a0a0a;
          color: #e6e9ee;
          overflow: hidden;
          font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .page-background { position: fixed; inset: 0; z-index: -1; background: #0a0a0a; }
        .topbar { position: fixed; top: 0; left: 0; right: 0; z-index: 2000; background: rgba(11, 12, 14, 0.95); border-bottom: 2px solid #e0473c; height: 64px; }
        .effects-toggle-box { position: fixed; top: 74px; right: 16px; z-index: 3000; display: flex; flex-direction: column; gap: 4px; padding: 8px 10px; border-radius: 8px; background: rgba(8, 8, 10, 0.82); border: 1px solid rgba(255, 122, 88, 0.45); font-size: 11px; color: #ffd8be; max-height: 70vh; overflow: auto; }
        .effects-toggle-box-left { left: 16px; right: auto; }
        .fx-row { display: flex; gap: 6px; align-items: center; font-size: 10px; }
        .nav { display: flex; align-items: center; justify-content: space-between; max-width: 1600px; margin: 0 auto; height: 100%; padding: 0 18px; }
        .brand { display: flex; align-items: center; gap: 12px; color: #e6e9ee; text-decoration: none; font-weight: 700; }
        .brand-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #ff7b6e 0%, #e0473c 100%); }
        .links { display: flex; align-items: center; gap: 18px; }
        .navlink { color: #ccc; text-decoration: none; font-size: 14px; }
        .forge-container { width: 100%; height: calc(100vh - 64px); margin-top: 64px; position: relative; overflow: hidden; }
        .forge-motion-shell { position: absolute; inset: 0; transform-origin: 50% 54%; animation: forge-rock 12s ease-in-out infinite; will-change: transform; }
        .forge-glow-layer { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
        .glow { position: absolute; border-radius: 999px; filter: blur(120px); animation: pulseGlow ease-in-out infinite; }
        .glow-primary { left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(85vw, 1300px); height: min(65vh, 850px); background: rgba(255, 107, 61, 0.2); animation-duration: 8s; }
        .glow-secondary { left: 50%; top: 55%; transform: translate(-50%, -50%); width: min(65vw, 900px); height: min(48vh, 600px); background: rgba(255, 77, 26, 0.22); animation-duration: 5.4s; animation-delay: 0.8s; }
        .glow-core { left: 50%; top: 52%; transform: translate(-50%, -50%); width: min(44vw, 580px); height: min(34vh, 390px); background: rgba(255, 170, 0, 0.2); filter: blur(90px); animation-duration: 3.2s; }
        .forge-bg-image { position: absolute; inset: 0; z-index: 1; background-size: cover; background-position: center; opacity: 0.45; animation: kenburns-loop 23s ease-in-out infinite; }
        .furnace-back { position: absolute; inset: 0; z-index: 0; background-size: cover; background-position: calc(50% - 2%) center; background-repeat: no-repeat; opacity: 0.28; animation: kenburns-loop 12s ease-in-out infinite, furnace-sway 18s ease-in-out infinite; }
        .forge-detail-layer { position: absolute; inset: 0; z-index: 830; background-size: 80% auto; background-position: center 52%; background-repeat: no-repeat; pointer-events: none; opacity: 0.74; filter: drop-shadow(0 0 56px rgba(255, 107, 61, 0.28)); animation: detail-pulse 34s ease-in-out infinite; }
        .fire-pillar { position: absolute; left: 50%; top: 52%; transform: translate(-50%, -50%); z-index: 855; width: 12%; height: 50%; background-size: contain; background-position: center; background-repeat: no-repeat; opacity: 0.84; filter: blur(0.5px) brightness(1.08); mix-blend-mode: screen; pointer-events: none; animation: flame-flicker 0.34s ease-in-out infinite, flame-wave 2.1s ease-in-out infinite; }
        .furnace-overlay { position: absolute; inset: 0; z-index: 845; background: radial-gradient(circle at 50% 52%, rgba(255, 140, 50, 0.08) 0%, rgba(255, 100, 40, 0.04) 25%, rgba(0, 0, 0, 0.38) 60%, rgba(0, 0, 0, 0.8) 100%); pointer-events: none; }
        .ember-container { position: absolute; inset: 0; z-index: 875; pointer-events: none; }
        .center-blend-layer { position: absolute; inset: 0; z-index: 880; pointer-events: none; background: radial-gradient(ellipse at 50% 52%, rgba(255, 130, 70, 0.12) 0%, rgba(255, 130, 70, 0.08) 16%, rgba(30, 14, 10, 0.26) 38%, rgba(0, 0, 0, 0) 56%); mix-blend-mode: screen; }
        .design-overlay { position: absolute; inset: 0; z-index: 890; pointer-events: none; background-size: 100% 100%; background-position: center; opacity: 1; mix-blend-mode: normal; }
        .ember { position: absolute; border-radius: 50%; background: radial-gradient(circle, #ffd27a 0%, #ff9d4d 42%, #ff6f4a 70%, rgba(255, 111, 74, 0.15) 100%); opacity: 0; animation: rise infinite; }
        .workspace { position: relative; z-index: 1100; width: 100%; height: 100%; }
        .panels-container { position: absolute; inset: 0; z-index: 1100; padding: 30px; pointer-events: none; }
        .furnace-header { display: flex; justify-content: space-between; margin-bottom: 40px; pointer-events: all; }
        .header-label { font-size: 11px; font-weight: 700; color: #ffcd9e; text-transform: uppercase; letter-spacing: 1.6px; padding: 7px 13px; background: linear-gradient(120deg, rgba(20, 12, 10, 0.85), rgba(10, 8, 8, 0.85)); border-radius: 6px; border: 1px solid rgba(255, 127, 94, 0.5); box-shadow: 0 0 24px rgba(224, 71, 60, 0.35), inset 0 1px 0 rgba(255, 180, 150, 0.26); text-shadow: 0 0 10px rgba(255, 164, 120, 0.5); }
        .panels-row { position: absolute; top: 92px; left: 0; right: 0; height: calc(100% - 108px); padding: 0 20px; display: flex; justify-content: space-between; pointer-events: none; }
        .left-panels { display: flex; flex-direction: column; gap: 15px; }
        .panel { width: 220px; max-height: 65%; overflow-y: auto; border-radius: 12px; padding: 16px; background: linear-gradient(160deg, rgba(18, 12, 10, 0.96), rgba(10, 8, 8, 0.94)); border: 1px solid rgba(255, 115, 82, 0.72); box-shadow: 0 16px 48px rgba(0, 0, 0, 0.78), 0 0 26px rgba(224, 71, 60, 0.28), inset 0 1px 0 rgba(255, 171, 140, 0.22), inset 0 0 0 1px rgba(255, 160, 130, 0.08); backdrop-filter: blur(8px) saturate(1.05); pointer-events: all; }
        .right-panel {
          width: 240px;
          height: calc(100% - 12px);
          max-height: calc(100% - 12px);
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .right-panel::-webkit-scrollbar { width: 0; height: 0; display: none; }
        .panel-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid rgba(255, 125, 94, 0.28); }
        .step-number { width: 28px; height: 28px; border-radius: 999px; background: linear-gradient(135deg, #e0473c, #ff7b6e); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; box-shadow: 0 0 16px rgba(255, 119, 84, 0.5); }
        .panel-title { font-size: 13px; font-weight: 700; color: #ffe0c9; text-shadow: 0 0 12px rgba(255, 132, 95, 0.32); }
        .panel-title-row { display: flex; justify-content: space-between; align-items: center; width: 100%; }
        .panel-description { font-size: 10px; color: #b9a79a; margin-bottom: 12px; line-height: 1.4; }
        .origin-select, .input-select, .input-field { width: 100%; padding: 6px 8px; border-radius: 6px; border: 1px solid rgba(255, 126, 96, 0.4); background: linear-gradient(180deg, rgba(16, 12, 11, 0.85), rgba(9, 8, 8, 0.8)); color: #ffe7d6; font-size: 10px; box-shadow: inset 0 0 14px rgba(255, 117, 80, 0.08); }
        .origin-select { min-width: 96px; padding: 4px 6px; }
        .upload-zone { border: 2px dashed rgba(255, 128, 92, 0.44); border-radius: 8px; padding: 25px 12px; text-align: center; background: linear-gradient(180deg, rgba(224, 71, 60, 0.08), rgba(224, 71, 60, 0.04)); cursor: pointer; display: block; box-shadow: inset 0 0 18px rgba(255, 124, 87, 0.14); }
        .upload-zone input { display: none; }
        .upload-icon { width: 36px; height: 36px; margin: 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: rgba(224, 71, 60, 0.22); color: #ffd8be; box-shadow: 0 0 12px rgba(255, 123, 86, 0.35); }
        .fusion-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px; }
        .fusion-tab { border: 1px solid rgba(224, 71, 60, 0.35); background: rgba(224, 71, 60, 0.08); color: #c9d0d8; border-radius: 6px; padding: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; cursor: pointer; }
        .fusion-tab.active { color: #fff; border-color: #e0473c; background: rgba(224, 71, 60, 0.25); }
        .fusion-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
        .fusion-item { border: 1px dashed rgba(255, 126, 96, 0.35); border-radius: 8px; aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; position: relative; overflow: hidden; background: rgba(224, 71, 60, 0.06); }
        .fusion-item input { display: none; }
        .fusion-item.has-image { background-size: cover; background-position: center; }
        .fusion-label { font-size: 8px; font-weight: 600; text-transform: uppercase; }
        .fusion-hint { font-size: 7px; color: #7b8088; text-transform: uppercase; margin-top: 4px; }
        .fusion-status { margin-top: 8px; font-size: 9px; color: #9aa3ad; min-height: 12px; }
        .generate-btn, .ai-generate-btn, .render-btn { width: 100%; border: none; border-radius: 8px; color: #fff; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; cursor: pointer; box-shadow: 0 6px 20px rgba(224, 71, 60, 0.28); }
        .generate-btn, .ai-generate-btn { margin-top: 10px; padding: 9px; background: linear-gradient(135deg, rgba(235, 88, 74, 0.92), rgba(200, 59, 49, 0.88)); }
        .render-btn { margin-top: 12px; padding: 11px; font-size: 11px; font-weight: 800; background: linear-gradient(135deg, #ff6e58 0%, #ff9364 100%); box-shadow: 0 0 24px rgba(255, 117, 82, 0.45), 0 8px 24px rgba(0, 0, 0, 0.4); }
        .advanced-toggle { width: 100%; margin-top: 10px; padding: 6px 8px; border-radius: 4px; border: 1px solid rgba(224, 71, 60, 0.35); background: rgba(0, 0, 0, 0.45); color: #ffb199; font-size: 9px; font-weight: 700; text-transform: uppercase; }
        .advanced-panel { margin-top: 10px; border: 1px solid rgba(224, 71, 60, 0.25); border-radius: 6px; padding: 8px; background: rgba(0, 0, 0, 0.35); display: none; }
        .advanced-panel.open { display: block; }
        .slider-row { display: grid; grid-template-columns: 1fr auto; gap: 6px; align-items: center; }
        .slider-value { min-width: 38px; font-size: 9px; text-align: right; color: #c9d0d8; }
        .input-group { margin-bottom: 10px; }
        .input-label { font-size: 8px; font-weight: 700; color: #ffd8c0; text-transform: uppercase; margin-bottom: 3px; display: block; letter-spacing: 0.4px; }
        .input-select:focus, .input-field:focus, .origin-select:focus { outline: none; border-color: rgba(255, 150, 112, 0.8); box-shadow: 0 0 0 1px rgba(255, 150, 112, 0.5), 0 0 20px rgba(255, 112, 74, 0.28), inset 0 0 16px rgba(255, 112, 74, 0.14); }
        .input-field { min-height: 35px; resize: vertical; }
        .media-viewer { position: absolute; top: 48%; left: 50%; transform: translate(-50%, -50%); width: 42%; aspect-ratio: 16 / 9; background: rgba(0, 0, 0, 0.95); border: 1px solid rgba(255, 134, 96, 0.38); z-index: 920; overflow: visible; box-shadow: inset 0 0 120px rgba(255, 120, 74, 0.24), inset 0 0 180px rgba(255, 140, 64, 0.15), 0 0 160px rgba(0, 0, 0, 0.8), 0 0 24px rgba(255, 118, 78, 0.25); filter: drop-shadow(0 18px 45px rgba(0,0,0,0.9)); }
        .media-viewer.no-frame-glow { border: 1px solid rgba(120, 130, 145, 0.35); box-shadow: none; filter: none; }
        /* Previous attempt preserved as requested: PulseFlame */
        .media-viewer.pulseflame::before { content: ''; position: absolute; inset: 0; border-radius: 2px; pointer-events: none; border: 2px solid rgba(255, 136, 92, 0.42); box-shadow: 0 0 24px rgba(255, 128, 84, 0.55), 0 0 48px rgba(255, 115, 72, 0.4); animation: media-aura-pulse 1.8s ease-in-out infinite; z-index: 6; }
        /* New attempt: Displacement */
        .media-viewer.displacement { filter: url(#forgeDisplacement) drop-shadow(0 18px 45px rgba(0,0,0,0.9)); }
        .media-viewer.processing { box-shadow: inset 0 0 120px rgba(255, 120, 74, 0.24), inset 0 0 180px rgba(255, 140, 64, 0.15), 0 0 160px rgba(0, 0, 0, 0.8); }
        .media-container, .media-content { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
        .media-content img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .viewer-edge-glow {
          position: absolute;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          background: radial-gradient(circle at 50% 50%, rgba(255, 125, 88, 0.65) 0%, rgba(255, 89, 54, 0.35) 30%, rgba(255, 73, 40, 0.1) 60%, rgba(0, 0, 0, 0) 80%);
          mix-blend-mode: screen;
          opacity: 0.85;
          filter: blur(2px);
          border-radius: 14px;
        }
        .bottom-controls { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 1100; }
        .recent-crafts { background: linear-gradient(135deg, rgba(20, 15, 13, 0.95), rgba(15, 10, 8, 0.98)); border: 1px solid rgba(224, 71, 60, 0.4); border-radius: 8px; padding: 10px; }
        .recent-title { font-size: 9px; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; }
        .craft-items { display: grid; grid-template-columns: repeat(16, 1fr); gap: 8px; }
        .craft-item { width: 55px; height: 55px; border-radius: 4px; border: 1px solid rgba(224, 71, 60, 0.3); background: rgba(224, 71, 60, 0.1); }
        .forge-status { margin-top: 10px; font-size: 10px; color: #9aa3ad; }
        .fx-hidden { display: none !important; }
        .fx-off-shell-motion { animation: none !important; transform: none !important; }
        @keyframes rise {
          0% { opacity: 0; transform: translateY(0) translateX(0) scale(1); }
          12% { opacity: 1; }
          70% { opacity: 0.95; }
          100% { opacity: 0; transform: translateY(-340px) translateX(var(--drift, 0)) scale(0.25); }
        }
        @keyframes kenburns-loop {
          0%, 100% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.08) translate(-1%, 1%); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.78; }
          50% { opacity: 1; }
        }
        @keyframes forge-rock {
          0%, 100% { transform: perspective(1800px) translateY(0px) scale(1) rotateX(0deg); }
          25% { transform: perspective(1800px) translateY(-2px) scale(1.008) rotateX(0.8deg); }
          50% { transform: perspective(1800px) translateY(1px) scale(0.996) rotateX(-0.5deg); }
          75% { transform: perspective(1800px) translateY(-1px) scale(1.006) rotateX(0.6deg); }
        }
        @keyframes furnace-sway {
          0%, 100% { transform: scale(1) translateY(0px); }
          50% { transform: scale(1.02) translateY(-6px); }
        }
        @keyframes detail-pulse {
          0%, 100% { opacity: 0.72; }
          50% { opacity: 0.84; transform: translateY(-3px); }
        }
        @keyframes flame-flicker {
          0%, 100% { opacity: 0.84; transform: translate(-50%, -50%) scaleY(1) scaleX(1); }
          50% { opacity: 0.95; transform: translate(-50%, -50%) scaleY(1.05) scaleX(0.98); }
        }
        @keyframes flame-wave {
          0%, 100% { transform: translate(-50%, -50%) translateX(0) scaleX(1); }
          25% { transform: translate(-50%, -50%) translateX(2px) scaleX(1.02); }
          75% { transform: translate(-50%, -50%) translateX(-2px) scaleX(0.98); }
        }
        @keyframes media-aura-pulse {
          0%, 100% { opacity: 0.72; transform: translateY(2px) scale(1); }
          50% { opacity: 1; transform: translateY(2px) scale(1.01); }
        }
      `}</style>
    </div>
  );
}

export default ForgePage;
