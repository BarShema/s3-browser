'use client';

interface BreadcrumbProps {
  currentPath: string;
  onPathClick: (path: string) => void;
}

export function Breadcrumb({ currentPath, onPathClick }: BreadcrumbProps) {
  const pathSegments = currentPath.split('/').filter(Boolean);
  
  const handlePathClick = (index: number) => {
    const newPath = pathSegments.slice(0, index + 1).join('/');
    onPathClick(newPath);
  };

  return (
    <div className="flex items-center space-x-2 p-4 border-b bg-gray-50">
      <button
        onClick={() => onPathClick('')}
        className="text-blue-600 hover:text-blue-800 font-medium"
      >
        Root
      </button>
      
      {pathSegments.map((segment, index) => (
        <div key={index} className="flex items-center space-x-2">
          <span className="text-gray-400">/</span>
          <button
            onClick={() => handlePathClick(index)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {segment}
          </button>
        </div>
      ))}
      
      {currentPath && (
        <div className="flex items-center space-x-2">
          <span className="text-gray-400">/</span>
          <span className="text-gray-600 font-medium">Current</span>
        </div>
      )}
    </div>
  );
}
