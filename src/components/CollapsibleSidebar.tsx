import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CollapsibleSidebarProps {
  children: React.ReactNode;
  className?: string;
  initialCollapsed?: boolean;
}

const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({
  children,
  className = '',
  initialCollapsed = false
}) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  return (
    <div className={`flex h-full ${className}`}>
      {/* Sidebar */}
      <div 
        className={`
          h-full transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-0 overflow-hidden' : 'w-80'}
        `}
      >
        {children}
      </div>

      {/* Collapse/Expand Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`
          flex items-center justify-center
          w-6 h-full
          bg-gray-200 dark:bg-gray-700
          hover:bg-gray-300 dark:hover:bg-gray-600
          transition-colors duration-200
          z-10
        `}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        )}
      </button>
    </div>
  );
};

export default CollapsibleSidebar;