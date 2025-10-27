import React from 'react';

const JarvisCore: React.FC = () => {
  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      {/* Outer rings */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute border border-cyan-400/30 rounded-full"
          style={{
            width: `${(i + 1) * 20 + 20}%`,
            height: `${(i + 1) * 20 + 20}%`,
            animation: `spin ${5 + i * 2}s linear infinite ${i % 2 === 0 ? 'reverse' : ''}`,
            opacity: 1 - i * 0.15,
          }}
        />
      ))}
      
      {/* Inner core */}
      <div className="absolute w-1/4 h-1/4 bg-cyan-400 rounded-full blur-xl animate-pulse" />
      <div className="absolute w-1/5 h-1/5 bg-white rounded-full shadow-lg shadow-white" />
      
      {/* Scan line effect - This will use the global styles */}
      <div className="absolute w-full h-full rounded-full animate-scan-line-container" style={{ maskImage: 'radial-gradient(circle, white, transparent 70%)'}}>
        <div className="w-full h-1 bg-cyan-200 animate-scan-line" />
      </div>

    </div>
  );
};

export default JarvisCore;
