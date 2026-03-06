import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { 
  Github, 
  LayoutDashboard, 
  FolderGit2, 
  Settings as SettingsIcon,
  LogOut,
  Moon,
  Sun,
  Zap
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
  activeView: 'repos' | 'dashboard' | 'settings';
  onViewChange: (view: 'repos' | 'dashboard' | 'settings') => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  user, 
  onLogout, 
  activeView, 
  onViewChange 
}) => {
  const { theme, setTheme } = useTheme();

  const themes = [
    { id: 'light', icon: Sun, label: 'Light' },
    { id: 'dark', icon: Moon, label: 'Dark' },
    { id: 'extra-dark', icon: Zap, label: 'Extra Dark' },
  ];

  return (
    <div className="min-h-screen flex flex-col sm:flex-row">
      {/* Sidebar */}
      <aside className="w-full sm:w-64 border-r flex flex-col sticky top-0 h-auto sm:h-screen z-40 transition-colors bg-app-bg border-app-border">
        <div className="p-6 flex items-center gap-3">
          <div className="p-2 bg-brand rounded-lg">
            <Github className="text-white" size={24} />
          </div>
          <span className="font-bold text-xl tracking-tight">GitFlow</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button
            onClick={() => onViewChange('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              activeView === 'dashboard' 
                ? "bg-brand text-white shadow-lg shadow-brand/20" 
                : "text-app-text-dim hover:text-app-text hover:bg-app-card-hover"
            )}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </button>

          <button
            onClick={() => onViewChange('repos')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              activeView === 'repos' 
                ? "bg-brand text-white shadow-lg shadow-brand/20" 
                : "text-app-text-dim hover:text-app-text hover:bg-app-card-hover"
            )}
          >
            <FolderGit2 size={20} />
            <span className="font-medium">Repositories</span>
          </button>

          <button
            onClick={() => onViewChange('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              activeView === 'settings' 
                ? "bg-brand text-white shadow-lg shadow-brand/20" 
                : "text-app-text-dim hover:text-app-text hover:bg-app-card-hover"
            )}
          >
            <SettingsIcon size={20} />
            <span className="font-medium">Settings</span>
          </button>
        </nav>

        <div className="p-4 border-t border-app-border space-y-4">
          {/* Theme Selector */}
          <div className="grid grid-cols-4 gap-2">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as any)}
                className={cn(
                  "p-2 rounded-lg flex items-center justify-center transition-all",
                  theme === t.id 
                    ? "bg-app-card-hover text-app-text" 
                    : "text-app-text-muted hover:text-app-text-dim hover:bg-app-card"
                )}
                title={t.label}
              >
                <t.icon size={16} />
              </button>
            ))}
          </div>

          {user && (
            <div className="flex items-center gap-3 p-2 rounded-xl bg-app-card/50 border border-app-border/50">
              <img 
                src={user.avatar_url} 
                alt={user.login} 
                className="w-10 h-10 rounded-full border border-app-border"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{user.name || user.login}</p>
                <p className="text-xs text-app-text-muted truncate">@{user.login}</p>
              </div>
              <button 
                onClick={onLogout}
                className="p-2 text-app-text-muted hover:text-red-400 transition-colors"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 sm:p-8 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
};
