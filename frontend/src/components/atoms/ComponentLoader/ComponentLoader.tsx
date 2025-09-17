import React from 'react';

interface ComponentLoaderProps {
  height?: string;
}

const ComponentLoader: React.FC<ComponentLoaderProps> = ({ height = '200px' }) => {
  return (
    <div
      className="flex items-center justify-center animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg"
      style={{ height }}
      aria-label="Loading component..."
      role="status"
    >
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

export default ComponentLoader;