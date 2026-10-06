import React from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Lock, Home } from 'lucide-react';

interface BrowserChromeProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
}

export const BrowserChrome: React.FC<BrowserChromeProps> = ({ currentPath, onNavigate, onRefresh }) => {
  const fullUrl = `http://localhost:5173${currentPath === '/' ? '' : currentPath}`;

  return (
    <div className="bg-[#090d16] border-b border-white/5 px-4 py-2 flex items-center justify-between text-xs text-gray-400 select-none">
      <div className="flex items-center space-x-2">
        {/* Window controls */}
        <div className="flex items-center space-x-1.5 mr-2">
          <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
          <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block"></span>
          <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block"></span>
        </div>

        {/* Navigation arrows */}
        <div className="flex items-center space-x-1 text-gray-500">
          <button 
            type="button" 
            onClick={() => onNavigate('/')}
            title="Back to Dashboard"
            className="p-1 hover:text-cyan-400 hover:bg-white/5 rounded transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button" 
            disabled 
            className="p-1 opacity-40 cursor-not-allowed"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button" 
            onClick={onRefresh}
            title="Refresh application"
            className="p-1 hover:text-cyan-400 hover:bg-white/5 rounded transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            title="Home"
            className="p-1 hover:text-cyan-400 hover:bg-white/5 rounded transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* URL Omnibox */}
      <div className="flex-1 max-w-xl mx-4">
        <div className="flex items-center bg-[#101622] border border-white/10 rounded-full px-3 py-1 font-mono text-[11px] text-gray-300">
          <Lock className="w-3 h-3 text-cyan-400 mr-2 flex-shrink-0" />
          <span className="text-gray-500">http://</span>
          <span className="text-gray-300">localhost:5173</span>
          <span className="text-cyan-400 font-semibold">{currentPath === '/' ? '' : currentPath}</span>
          <span className="ml-auto text-[10px] text-emerald-400/80 uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/20">
            Secure Node
          </span>
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex items-center space-x-2 text-[11px]">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
        <span className="font-mono text-cyan-400 font-medium">VPMS-OS 2.4</span>
      </div>
    </div>
  );
};
