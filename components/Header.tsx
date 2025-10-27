
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="py-4 px-6 bg-black/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-20">
      <h1 className="text-2xl md:text-3xl font-bold text-center text-white tracking-widest" style={{ textShadow: '0 0 8px #ffffff, 0 0 16px #ffffff' }}>
        J.A.R.V.I.S
      </h1>
    </header>
  );
};

export default Header;