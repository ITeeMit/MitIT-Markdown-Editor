import React from 'react';
import { PROJECT_COLORS } from '@/types';

interface ProjectColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

const ProjectColorPicker: React.FC<ProjectColorPickerProps> = ({
  value,
  onChange,
  className = '',
}) => (
  <div className={`flex flex-wrap gap-1.5 ${className}`}>
    {PROJECT_COLORS.map((color) => (
      <button
        key={color}
        type="button"
        title={color}
        onClick={() => onChange(color)}
        className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
          value === color
            ? 'border-gray-900 dark:border-white scale-110'
            : 'border-transparent'
        }`}
        style={{ backgroundColor: color }}
      />
    ))}
  </div>
);

export default ProjectColorPicker;
