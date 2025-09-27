import React from 'react';
import { ArrowLeft, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface NavigationProps {
  title?: string;
  showBack?: boolean;
  showHome?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  title,
  showBack = true,
  showHome = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    navigate(-1);
  };

  const handleHome = () => {
    navigate('/');
  };

  const isHomePage = location.pathname === '/';

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          {showBack && !isHomePage && (
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {showHome && !isHomePage && (
            <Button variant="ghost" size="sm" onClick={handleHome}>
              <Home className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {title && (
          <h1 className="text-lg font-semibold text-center flex-1">
            {title}
          </h1>
        )}
        
        <div className="w-10" /> {/* Spacer for centering */}
      </div>
    </div>
  );
};