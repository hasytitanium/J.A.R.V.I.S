
import React from 'react';

interface LoadingIndicatorProps {
  emoji: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ emoji }) => {
  return (
    <div className="flex items-center space-x-3 p-4">
      <div className="text-3xl animate-pulse">
        {emoji}
      </div>
      <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-white rounded-full animate-[pulse_1s_ease-in-out_infinite]"></div>
          <div className="w-2 h-2 bg-white rounded-full animate-[pulse_1s_ease-in-out_0.2s_infinite]"></div>
          <div className="w-2 h-2 bg-white rounded-full animate-[pulse_1s_ease-in-out_0.4s_infinite]"></div>
      </div>
    </div>
  );
};

export default LoadingIndicator;