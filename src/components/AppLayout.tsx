import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  action?: ReactNode;
}

export function AppLayout({ children, title, showBack, action }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container max-w-2xl mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            {showBack && (
              <Button variant="ghost" size="icon" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            {isHome ? (
              <div className="flex items-center gap-2">
                <span className="text-xl">🐝</span>
                <h1 className="font-serif font-bold text-lg text-foreground">Hive Log</h1>
              </div>
            ) : (
              <h1 className="font-serif font-semibold text-lg text-foreground">{title}</h1>
            )}
          </div>
          {action}
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Bottom nav for home */}
      {isHome && (
        <div className="fixed bottom-6 right-6">
          <Button
            onClick={() => navigate('/new-hive')}
            className="w-14 h-14 rounded-full gradient-honey text-primary-foreground shadow-honey hover:scale-105 transition-transform"
            size="icon"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      )}
    </div>
  );
}
