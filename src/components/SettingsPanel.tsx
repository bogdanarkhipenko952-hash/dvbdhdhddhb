import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsPanelProps {
  settings: {
    resolution: '720p' | '1080p' | '4k';
    fps: 30 | 60 | 120 | 240 | 1000;
    facingMode: 'user' | 'environment';
  };
  onChange: (settings: any) => void;
  onClose: () => void;
}

export function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  const resolutions = ['720p', '1080p', '4k'];
  const fpsOptions = [30, 60, 120, 240, 1000];

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#1c1c1e] rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-xl font-semibold">Camera Settings</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Resolution */}
          <div>
            <label className="text-white/70 text-sm font-medium mb-3 block uppercase tracking-wider">
              Resolution
            </label>
            <div className="flex bg-black/30 rounded-xl p-1">
              {resolutions.map(res => (
                <button
                  key={res}
                  onClick={() => onChange({ ...settings, resolution: res })}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                    settings.resolution === res 
                      ? "bg-[#2c2c2e] text-white shadow-sm" 
                      : "text-white/50 hover:text-white/80"
                  )}
                >
                  {res.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Frame Rate */}
          <div>
            <label className="text-white/70 text-sm font-medium mb-3 block uppercase tracking-wider">
              Frame Rate (FPS)
            </label>
            <div className="flex flex-wrap gap-2">
              {fpsOptions.map(fps => (
                <button
                  key={fps}
                  onClick={() => onChange({ ...settings, fps })}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-xl transition-all border",
                    settings.fps === fps 
                      ? "bg-yellow-500 text-black border-yellow-500" 
                      : "bg-black/30 text-white/70 border-white/10 hover:border-white/30"
                  )}
                >
                  {fps}
                </button>
              ))}
            </div>
            <p className="text-white/40 text-xs mt-2">
              Note: Higher frame rates require hardware support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
