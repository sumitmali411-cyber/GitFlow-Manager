import React from 'react';
import { 
  User, 
  Github, 
  Bell, 
  CheckCircle2,
  AlertCircle,
  Moon,
  Sun,
  Zap,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { useTheme, Theme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { User as GitHubUser } from '../services/githubService';

interface SettingsProps {
  user: GitHubUser | null;
  onLogout: () => void;
  smtpStatus: { checked: boolean; configured: boolean; message: string };
  onVerifySmtp: () => void;
  onTestEmail: (email: string) => void;
  testEmail: string;
  setTestEmail: (email: string) => void;
  isTestingEmail: boolean;
}

export const Settings: React.FC<SettingsProps> = ({ 
  user, 
  onLogout,
  smtpStatus, 
  onVerifySmtp, 
  onTestEmail, 
  testEmail, 
  setTestEmail, 
  isTestingEmail 
}) => {
  const { theme, setTheme } = useTheme();
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    const handleStorage = () => setTick(t => t + 1);
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const themes: { id: Theme; icon: any; label: string; desc: string }[] = [
    { id: 'light', icon: Sun, label: 'Light', desc: 'Clean and bright interface' },
    { id: 'dark', icon: Moon, label: 'Dark', desc: 'Standard dark mode' },
    { id: 'extra-dark', icon: Zap, label: 'Extra Dark', desc: 'Pure black background' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-zinc-500">Manage your account preferences and integrations.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar Navigation */}
        <div className="space-y-1 sticky top-8 h-fit">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'appearance', label: 'Appearance', icon: Sun },
            { id: 'security', label: 'Security', icon: ShieldCheck },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'integrations', label: 'Integrations', icon: Zap },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                const element = document.getElementById(item.id);
                if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium text-app-text-dim hover:text-app-text hover:bg-app-card-hover transition-all"
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="md:col-span-2 space-y-8">
          {/* GitHub Profile */}
          <section id="profile" className="space-y-4 scroll-mt-8">
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
                className="w-32 h-32 rounded-full border-4 border-app-border shadow-2xl"
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-app-border">
            <div className="text-center p-4 rounded-xl bg-app-card/50 border border-app-border/50">
              <p className="text-2xl font-bold">{user?.public_repos || 0}</p>
              <p className="text-xs text-app-text-muted uppercase font-bold mt-1">Repos</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-app-card/50 border border-app-border/50">
              <p className="text-2xl font-bold">{user?.followers || 0}</p>
              <p className="text-xs text-app-text-muted uppercase font-bold mt-1">Followers</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-app-card/50 border border-app-border/50">
              <p className="text-2xl font-bold">{user?.following || 0}</p>
              <p className="text-xs text-app-text-muted uppercase font-bold mt-1">Following</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-app-card/50 border border-app-border/50">
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs text-app-text-muted uppercase font-bold mt-1">Orgs</p>
            </div>
          </div>
        </div>
      </section>

      {/* Theme Selector */}
      <section id="appearance" className="space-y-4 scroll-mt-8">
        <div className="flex items-center gap-2">
          <Sun size={20} className="text-brand" />
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
                  : "hover:border-app-border"
              )}
            >
              <div className={cn(
                "p-3 rounded-xl",
                theme === t.id ? "bg-brand text-white" : "bg-app-bg text-app-text-muted"
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
      <section id="security" className="space-y-4 scroll-mt-8">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-emerald-400" />
          <h2 className="text-xl font-bold">Security & Authentication</h2>
        </div>
        <div className="card-base p-8 space-y-6">
          <div className="flex items-center justify-between p-4 bg-app-card/50 rounded-2xl border border-app-border/50">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                user?.two_factor_authentication ? "bg-emerald-400/10 text-emerald-400" : "bg-amber-400/10 text-amber-400"
              )}>
                <Lock size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">GitHub Two-Factor Authentication</p>
                <p className="text-xs text-app-text-muted">
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
                <p className="text-xs text-app-text-dim leading-relaxed">
                  This application uses GitHub OAuth for authentication. When you log in, 2FA is handled directly by GitHub. 
                  We never see or store your 2FA codes, ensuring your credentials remain completely secure within GitHub's infrastructure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SMTP Notification Settings */}
      <section id="notifications" className="space-y-4 scroll-mt-8">
        <div className="flex items-center gap-2">
          <Bell size={20} className="text-brand" />
          <h2 className="text-xl font-bold">Notifications</h2>
        </div>
        <div className="card-base p-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-bold">SMTP Configuration</h3>
              <p className="text-sm text-app-text-dim">Enable email notifications for issue assignments.</p>
            </div>
            <div className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold",
              smtpStatus.configured ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"
            )}>
              {smtpStatus.configured ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {smtpStatus.configured ? 'Active' : 'Inactive'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-app-card/50 border border-app-border/50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-app-text-dim">Status</span>
              <span className="text-sm font-bold">{smtpStatus.message}</span>
            </div>
            <button 
              onClick={onVerifySmtp}
              className="text-xs text-brand font-bold hover:underline"
            >
              Refresh Status
            </button>
          </div>

          <div className="space-y-4 pt-4 border-t border-app-border">
            <h4 className="text-sm font-bold">Email Preferences</h4>
            <div className="space-y-3">
              {[
                { id: 'issue_activity', label: 'Issue Activity', desc: 'Notify when someone comments on or updates an issue you watch' },
                { id: 'pr_merged', label: 'PR Merged', desc: 'Notify when a Pull Request you authored is merged' },
                { id: 'issue_assigned', label: 'Issue Assigned', desc: 'Notify when you are assigned to a new issue' }
              ].map((pref) => {
                const settings = JSON.parse(localStorage.getItem('notification_settings') || '{"issue_activity": true, "pr_merged": true, "issue_assigned": true}');
                const isEnabled = settings[pref.id];
                
                return (
                  <div key={pref.id} className="flex items-center justify-between p-4 bg-app-card/30 rounded-xl border border-app-border/30">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold">{pref.label}</p>
                      <p className="text-xs text-app-text-dim">{pref.desc}</p>
                    </div>
                    <button
                      onClick={() => {
                        const newSettings = { ...settings, [pref.id]: !isEnabled };
                        localStorage.setItem('notification_settings', JSON.stringify(newSettings));
                        // Force re-render by updating a dummy state if needed, 
                        // but for now we'll just let it update on next render
                        window.dispatchEvent(new Event('storage'));
                      }}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        isEnabled ? "bg-brand" : "bg-app-card-hover"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                        isEnabled ? "right-1" : "left-1"
                      )} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {smtpStatus.configured && (
            <div className="space-y-4 pt-4 border-t border-app-border">
              <h4 className="text-sm font-bold">Test Configuration</h4>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter test email address"
                  className="flex-1 bg-app-bg border border-app-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
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
          <section id="integrations" className="card-base p-8 space-y-6 scroll-mt-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-zinc-900 rounded-xl text-zinc-400">
                <Github size={24} />
              </div>
              <div>
                <h3 className="font-bold">GitHub Account</h3>
                <p className="text-sm text-zinc-500">Connected as @{user?.login}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button 
                onClick={onLogout}
                className="text-sm text-red-500 font-bold hover:underline"
              >
                Disconnect Account
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
