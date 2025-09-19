import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '' }) => {
  const sizeMap = {
    sm: { drop: 32, text: 20 },
    md: { drop: 40, text: 28 },
    lg: { drop: 48, text: 36 },
    xl: { drop: 64, text: 48 }
  };

  const dimensions = sizeMap[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Drop Icon */}
      <svg
        width={dimensions.drop}
        height={dimensions.drop}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-logo-icon"
      >
        <defs>
          <linearGradient id="dropGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9D4EDD" />
            <stop offset="50%" stopColor="#C77DFF" />
            <stop offset="100%" stopColor="#7B2CBF" />
          </linearGradient>
        </defs>

        {/* Drop shape */}
        <path
          d="M32 4C32 4 16 20 16 36C16 44.8366 23.1634 52 32 52C40.8366 52 48 44.8366 48 36C48 20 32 4 32 4Z"
          fill="url(#dropGradient)"
        />

        {/* Sparkle/Star in the center */}
        <path
          d="M32 28L34.5 33.5L40 36L34.5 38.5L32 44L29.5 38.5L24 36L29.5 33.5L32 28Z"
          fill="white"
          opacity="0.9"
        />
      </svg>

      {/* Text Logo */}
      {showText && (
        <span
          className="font-bold"
          style={{
            fontSize: `${dimensions.text}px`,
            background: 'linear-gradient(135deg, #9D4EDD 0%, #C77DFF 50%, #7B2CBF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          Drop
        </span>
      )}
    </div>
  );
};

export default Logo;