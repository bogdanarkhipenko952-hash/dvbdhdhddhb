import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera as CameraIcon, Settings, RefreshCcw, Video, Square, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ZoomDial } from './ZoomDial';
import { SettingsPanel } from './SettingsPanel';

type Resolution = '720p' | '1080p' | '4k';
type Fps = 30 | 60 | 120 | 240 | 1000;

interface CameraSettings {
  resolution: Resolution;
  fps: Fps;
  facingMode: 'user' | 'environment';
}

const RESOLUTION_MAP = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '4k': { width: 3840, height: 2160 },
};

export function Camera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [settings, setSettings] = useState<CameraSettings>({
    resolution: '1080p',
    fps: 60,
    facingMode: 'user',
  });
  const [showSettings, setShowSettings] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(10);
  const [minZoom, setMinZoom] = useState(0.5);
  const [hasNativeZoom, setHasNativeZoom] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("navigator.mediaDevices API is not available.");
      setError("API камеры недоступен. Пожалуйста, откройте приложение в новой вкладке (кнопка в правом верхнем углу) или используйте современный браузер.");
      return;
    }

    const res = RESOLUTION_MAP[settings.resolution];
    
    // Define a sequence of constraints to try, from most ideal to most basic
    const constraintAttempts: MediaStreamConstraints[] = [
      // 1. Ideal: Specific resolution, fps, and audio
      {
        video: {
          facingMode: settings.facingMode,
          width: { ideal: res.width },
          height: { ideal: res.height },
          frameRate: { ideal: settings.fps },
        },
        audio: true,
      },
      // 2. Basic video + audio (let browser decide resolution/fps)
      {
        video: { facingMode: settings.facingMode },
        audio: true,
      },
      // 3. Basic video ONLY (in case microphone is blocked but camera is allowed)
      {
        video: { facingMode: settings.facingMode },
        audio: false,
      },
      // 4. ANY video (ignore facingMode, just get any camera)
      {
        video: true,
        audio: false,
      }
    ];

    let stream: MediaStream | null = null;
    let lastError: any = null;

    for (const constraints of constraintAttempts) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        break; // Success! Exit the loop.
      } catch (err: any) {
        console.warn("Camera attempt failed with constraints:", constraints, err);
        lastError = err;
      }
    }

    if (!stream) {
      console.error("All camera initialization attempts failed.", lastError);
      let errorMessage = "Не удалось получить доступ к камере. ";
      
      if (lastError) {
        if (lastError.name === 'NotAllowedError' || lastError.message?.toLowerCase().includes('permission')) {
          errorMessage += "Доступ запрещен. Пожалуйста, разрешите доступ в настройках браузера.";
        } else if (lastError.name === 'NotFoundError') {
          errorMessage += "Камера не найдена на вашем устройстве.";
        } else if (lastError.name === 'NotReadableError') {
          errorMessage += "Камера уже используется другим приложением.";
        } else {
          errorMessage += `(${lastError.name || 'Ошибка'}: ${lastError.message || 'Неизвестная ошибка'})`;
        }
      }
      
      setError(errorMessage);
      return;
    }

    try {
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Check for native zoom support
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities: any = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
      
      if (capabilities.zoom) {
        setHasNativeZoom(true);
        setMinZoom(capabilities.zoom.min || 0.5);
        setMaxZoom(capabilities.zoom.max || 10);
        // Reset zoom to 1x when switching cameras
        setZoom(1);
      } else {
        setHasNativeZoom(false);
        setMinZoom(0.5);
        setMaxZoom(10);
        setZoom(1);
      }
      setError(null);
    } catch (err: any) {
      console.error("Error setting up camera stream:", err);
      setError(err.message || "Ошибка настройки видеопотока");
    }
  }, [settings]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  useEffect(() => {
    if (hasNativeZoom && streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack && videoTrack.applyConstraints) {
        videoTrack.applyConstraints({
          advanced: [{ zoom }]
        } as any).catch(err => console.error("Error applying zoom:", err));
      }
    }
  }, [zoom, hasNativeZoom]);

  const toggleRecording = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      if (!streamRef.current) return;
      
      chunksRef.current = [];
      try {
        const options = { mimeType: 'video/webm;codecs=vp9,opus' };
        const mediaRecorder = new MediaRecorder(streamRef.current, options);
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `recording-${Date.now()}.webm`;
          a.click();
          URL.revokeObjectURL(url);
        };
        
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Error starting recording:", err);
        setError("Could not start recording. Format might not be supported.");
      }
    }
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // If no native zoom, we might need to crop the canvas for digital zoom
    // But user asked for lossless zoom, so we rely on native if possible.
    // If digital zoom is used, we draw the zoomed portion.
    if (!hasNativeZoom && zoom > 1) {
      const w = canvas.width / zoom;
      const h = canvas.height / zoom;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;
      ctx.drawImage(videoRef.current, x, y, w, h, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    }
    
    const url = canvas.toDataURL('image/jpeg', 0.95);
    const a = document.createElement('a');
    a.href = url;
    a.download = `photo-${Date.now()}.jpg`;
    a.click();
  };

  const toggleCamera = () => {
    setSettings(s => ({
      ...s,
      facingMode: s.facingMode === 'user' ? 'environment' : 'user'
    }));
  };

  // Digital zoom style if native zoom is not supported
  const videoStyle = !hasNativeZoom ? { transform: `scale(${zoom})` } : {};

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col">
      {/* Viewfinder */}
      <div className="relative flex-1 w-full overflow-hidden bg-black flex items-center justify-center">
        {error ? (
          <div className="text-white text-center p-6 max-w-md bg-black/80 rounded-2xl backdrop-blur-md border border-white/10">
            <p className="text-red-500 mb-3 font-semibold text-lg">Ошибка доступа к камере</p>
            <p className="text-sm opacity-90 mb-4">{error}</p>
            <p className="text-xs opacity-70 mb-6 bg-white/5 p-3 rounded-lg">
              Пожалуйста, нажмите на значок камеры (или замок) в адресной строке браузера, чтобы разрешить доступ к камере и микрофону. <br/><br/>
              <strong>Важно:</strong> Если вы находитесь в режиме предпросмотра, возможно, вам потребуется открыть приложение в новой вкладке (кнопка в правом верхнем углу).
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.open(window.location.href, '_blank')}
                className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-full hover:bg-yellow-400 transition-colors shadow-lg"
              >
                Открыть в новой вкладке (Рекомендуется)
              </button>
              <button 
                onClick={startCamera}
                className="px-6 py-2.5 bg-white/10 text-white font-medium rounded-full hover:bg-white/20 transition-colors"
              >
                Попробовать снова здесь
              </button>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transition-transform duration-200 ease-out"
            style={videoStyle}
          />
        )}
        
        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-sm font-medium tracking-wider">REC</span>
          </div>
        )}
      </div>

      {/* Controls Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between pb-10 pt-12 px-6">
        {/* Top Bar */}
        <div className="flex justify-between items-start pointer-events-auto">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-3 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 transition-colors"
          >
            <Settings className="w-6 h-6" />
          </button>
          
          <div className="flex flex-col items-end gap-2">
            <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-mono">
              {settings.resolution} • {settings.fps}FPS
            </div>
            {!hasNativeZoom && (
              <div className="px-2 py-1 rounded bg-yellow-500/80 text-black text-[10px] font-bold uppercase tracking-wider">
                Digital Zoom
              </div>
            )}
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="flex flex-col items-center gap-6 pointer-events-auto">
          {/* Quick Zoom Buttons */}
          <div className="flex gap-3 mb-2">
            {[0.5, 1, 2, 5].map(z => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  zoom === z ? "bg-yellow-500 text-black" : "bg-black/50 text-white border border-white/20 backdrop-blur-md"
                )}
              >
                {z}x
              </button>
            ))}
          </div>

          {/* Zoom Dial */}
          <ZoomDial 
            zoom={zoom} 
            minZoom={minZoom} 
            maxZoom={maxZoom} 
            onChange={setZoom} 
          />

          {/* Action Buttons */}
          <div className="flex items-center justify-between w-full max-w-xs px-4">
            <button 
              onClick={takePhoto}
              className="p-4 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors"
            >
              <ImageIcon className="w-6 h-6" />
            </button>

            {/* Shutter Button */}
            <button 
              onClick={toggleRecording}
              className="relative w-20 h-20 flex items-center justify-center group"
            >
              <div className={cn(
                "absolute inset-0 rounded-full border-[3px] transition-colors duration-300",
                isRecording ? "border-red-500" : "border-white"
              )} />
              <div className={cn(
                "transition-all duration-300 flex items-center justify-center",
                isRecording 
                  ? "w-8 h-8 bg-red-500 rounded-sm" 
                  : "w-[68px] h-[68px] bg-white rounded-full group-active:scale-95"
              )} />
            </button>

            <button 
              onClick={toggleCamera}
              className="p-4 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors"
            >
              <RefreshCcw className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel 
          settings={settings}
          onChange={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
