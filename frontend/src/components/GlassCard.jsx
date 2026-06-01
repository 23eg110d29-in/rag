import React from 'react';

const GlassCard = ({ children, className = '', hoverEffect = false, ...props }) => {
  return (
    <div
      className={`glass-panel rounded-2xl p-6 shadow-xl ${
        hoverEffect ? 'glass-card-hover' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
