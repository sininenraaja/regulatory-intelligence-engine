interface ImpactBadgeProps {
  level: 'high' | 'medium' | 'low' | 'none' | null;
  size?: 'sm' | 'md' | 'lg';
}

export function ImpactBadge({ level, size = 'md' }: ImpactBadgeProps) {
  const getColors = () => {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSize = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-4 py-2 text-base';
      default:
        return 'px-3 py-1.5 text-sm';
    }
  };

  const displayText = (level || 'none').toUpperCase();

  return (
    <span
      className={`inline-flex items-center font-semibold border rounded-full ${getColors()} ${getSize()}`}
    >
      {displayText}
    </span>
  );
}
