import React from 'react';
import { 
  User, 
  Github, 
  Shield, 
  Bell, 
  CheckCircle2,
  AlertCircle,
  Moon,
  Sun,
  Zap,
  Layers,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { useTheme, Theme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { User as GitHubUser } from '../services/githubService';

interface SettingsProps {
  user: GitHubUser | null;
  smtpStatus: { checked: boolean; configured: boolean; message: string };
  onVerifySmtp: () => void;
  onTestEmail: (email: string) => void;
  testEmail: string;
  setTestEmail: (email: string) => void;
  isTestingEmail: boolean;
}

export const Settings: React.FC<SettingsProps> = ({ 
  user, 
  smtpStatus, 
  onVerifySmtp, 
  onTestEmail, 
  testEmail, 
  setTestEmail, 
  isTestingEmail 
}) => {
  const { theme, setTheme } = useTheme();

  const themes: { id: Theme; icon: any; label: string; desc: string }[] = [
    { id: 'light', icon: Sun, label: 'Light', desc: 'Clean and bright interface' },
    { id: 'dark', icon: Moon, label: 'Dark', desc: 'Standard dark mode' },
    { id: 'extra-dark', icon: Zap, label: 'Extra Dark', desc: 'Pure black background' },
    { id: 'glass', icon: Layers, label: 'Glass', desc: 'Translucent glass effect' },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-zinc-500 mt-1">Manage your account and application preferences.</p>
      </header>

      {/* GitHub Profile */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <User size={20} className="text-brand" />
          <h2 className="text-xl font-bold">Public Profile</h2>
        </div>
        <div className="card-base p-8 space-y-8">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="relative group">
              <img 
                src={user?.avatar_url} 
                alt={user?.login} 
                className="w-32 h-32 rounded-full border-4 border-zinc-800 shadow-2xl"
                referrerPolicy="no-referrer"
              />
              <button className="absolute bottom-0 right-0 p-2 bg-brand text-white rounded-full shadow-lg hover:scale-110 transition-transform">
                <Github size={16} />
              </button>
            </div>
            <div className="flex-1 space-y-4 text-center sm:text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Full Name</label>
                  <p className="text-lg font-bold">{user?.name || 'Not specified'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Username</label>
                  <p className="text-lg font-bold">@{user?.login}</p>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Bio</label>
                <p className="text-zinc-400">{user?.bio || 'No bio provided.'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-zinc-800">
            <div className="text-center p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
              <p className="text-2xl font-bold">{user?.public_repos || 0}</p>
              <p className="text-xs text-zinc-500 uppercase font-bold mt-1">Repos</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
              <p className="text-2xl font-bold">{user?.followers || 0}</p>
              <p className="text-xs text-zinc-500 uppercase font-bold mt-1">Followers</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
              <p className="text-2xl font-bold">{user?.following || 0}</p>
              <p className="text-xs text-zinc-500 uppercase font-bold mt-1">Following</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs text-zinc-500 uppercase font-bold mt-1">Orgs</p>
            </div>
          </div>
        </div>
      </section>

      {/* Theme Selector */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers size={20} className="text-brand" />
          <h2 className="text-xl font-bold">Appearance</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                "card-base p-6 text-left flex items-start gap-4 transition-all",
                theme === t.id 
                  ? "border-brand ring-2 ring-brand/20 bg-brand/5" 
                  : "hover:border-zinc-700"
              )}
            >
              <div className={cn(
                "p-3 rounded-xl",
                theme === t.id ? "bg-brand text-white" : "bg-zinc-900 text-zinc-500"
              )}>
                <t.icon size={24} />
              </div>
              <div>
                <h3 className="font-bold">{t.label}</h3>
                <p className="text-sm text-zinc-500 mt-1">{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Security & Authentication */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-emerald-400" />
          <h2 className="text-xl font-bold">Security & Authentication</h2>
        </div>
        <div className="card-base p-8 space-y-6">
          <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                user?.two_factor_authentication ? "bg-emerald-400/10 text-emerald-400" : "bg-amber-400/10 text-amber-400"
              )}>
                <Lock size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">GitHub Two-Factor Authentication</p>
                <p className="text-xs text-zinc-500">
                  {user?.two_factor_authentication 
                    ? "Your account is protected by GitHub 2FA." 
                    : "2FA status could not be verified or is disabled on GitHub."}
                </p>
              </div>
            </div>
            {user?.two_factor_authentication && (
              <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 size={14} />
                Verified
              </div>
            )}
          </div>

          <div className="p-4 bg-blue-400/5 border border-blue-400/10 rounded-2xl">
            <div className="flex gap-3">
              <AlertCircle className="text-blue-400 shrink-0" size={18} />
              <div className="space-y-1">
                <p className="text-sm font-bold text-blue-400">How 2FA works here</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  This application uses GitHub OAuth for authentication. When you log in, 2FA is handled directly by GitHub. 
                  We never see or store your 2FA codes, ensuring your credentials remain completely secure within GitHub's infrastructure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SMTP Notification Settings */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Bell size={20} className="text-brand" />
          <h2 className="text-xl font-bold">Notifications</h2>
        </div>
        <div className="card-base p-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-bold">SMTP Configuration</h3>
              <p className="text-sm text-zinc-500">Enable email notifications for issue assignments.</p>
            </div>
            <div className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold",
              smtpStatus.configured ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"
            )}>
              {smtpStatus.configured ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {smtpStatus.configured ? 'Active' : 'Inactive'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-400">Status</span>
              <span className="text-sm font-bold">{smtpStatus.message}</span>
            </div>
            <button 
              onClick={onVerifySmtp}
              className="text-xs text-brand font-bold hover:underline"
            >
              Refresh Status
            </button>
          </div>

          {smtpStatus.configured && (
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <h4 className="text-sm font-bold">Test Configuration</h4>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter test email address"
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
                <button 
                  onClick={() => onTestEmail(testEmail)}
                  disabled={isTestingEmail || !testEmail}
                  className="bg-brand hover:bg-brand-hover text-white px-6 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                >
                  {isTestingEmail ? 'Sending...' : 'Send Test'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Connected Accounts */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-brand" />
          <h2 className="text-xl font-bold">Connected Accounts</h2>
        </div>
        <div className="card-base p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-900 rounded-xl text-zinc-400">
              <Github size={24} />
            </div>
            <div>
              <h3 className="font-bold">GitHub Account</h3>
              <p className="text-sm text-zinc-500">Connected as @{user?.login}</p>
            </div>
          </div>
          <button className="text-sm text-red-500 font-bold hover:underline">
            Disconnect
          </button>
        </div>
      </section>
    </div>
  );
};
