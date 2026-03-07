import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { RepoList } from './components/RepoList';
import { RepoDashboard } from './components/RepoDashboard';
import { Settings } from './components/Settings';
import { NotificationManager } from './components/NotificationManager';
import { githubService, Repo, User } from './services/githubService';
import { Github } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('github_token'));
  const [user, setUser] = useState<User | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [view, setView] = useState<'repos' | 'dashboard' | 'settings'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [smtpStatus, setSmtpStatus] = useState({
    checked: false,
    configured: false,
    message: 'Checking configuration...'
  });
  const [testEmail, setTestEmail] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  useEffect(() => {
    if (token) {
      fetchUser();
      fetchRepos();
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const data = await githubService.getUser(token!);
      setUser(data);
    } catch (err) {
      console.error(err);
      handleLogout();
    }
  };

  const fetchRepos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await githubService.getRepos(token!);
      setRepos(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch repositories");
    } finally {
      setLoading(false);
    }
  };

  const verifySmtp = async () => {
    try {
      const res = await fetch('/api/notify/verify');
      const data = await res.json();
      setSmtpStatus({
        checked: true,
        configured: data.configured,
        message: data.message || (data.configured ? 'SMTP Service is active' : 'SMTP is not configured')
      });
    } catch (err) {
      setSmtpStatus({
        checked: true,
        configured: false,
        message: 'Failed to verify SMTP configuration'
      });
    }
  };

  const handleTestEmail = async (email: string) => {
    setIsTestingEmail(true);
    try {
      const res = await fetch('/api/notify/assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          issueTitle: 'Test Notification',
          issueUrl: '#',
          repoName: 'GitFlow Manager'
        })
      });
      const data = await res.json();
      alert(data.success ? 'Test email sent successfully!' : `Failed to send test email: ${data.message}`);
    } catch (err) {
      alert('Failed to send test email');
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleLogin = async () => {
    const res = await fetch('/api/auth/url');
    const { url } = await res.json();
    window.open(url, 'github_oauth', 'width=600,height=700');
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const newToken = event.data.token;
        setToken(newToken);
        localStorage.setItem('github_token', newToken);
        window.removeEventListener('message', handleMessage);
      }
    };
    window.addEventListener('message', handleMessage);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('github_token');
    setView('dashboard');
    setSelectedRepo(null);
  };

  const handleCreateRepo = async (data: { name: string; description: string; private: boolean }) => {
    await githubService.createRepo(token!, data);
    await fetchRepos();
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="flex justify-center">
            <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl">
              <Github size={64} className="text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">GitFlow Manager</h1>
            <p className="text-zinc-400">Streamline your GitHub workflow. Track commits, manage issues, and view documentation in one place.</p>
          </div>
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-4 px-6 rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98]"
          >
            <Github size={20} />
            Connect GitHub Account
          </button>
          <p className="text-xs text-zinc-500">
            Requires 'repo' and 'user' scopes to manage your projects.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Layout 
        user={user} 
        onLogout={handleLogout} 
        activeView={view} 
        onViewChange={(v) => { setView(v); setSelectedRepo(null); }}
      >
        <NotificationManager token={token} user={user} />
        <AnimatePresence mode="wait">
          {selectedRepo ? (
            <motion.div
              key="repo-dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <RepoDashboard 
                token={token} 
                repo={selectedRepo} 
                onBack={() => setSelectedRepo(null)} 
              />
            </motion.div>
          ) : (
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {view === 'dashboard' && (
                <Dashboard 
                  token={token} 
                  onRepoSelect={(repo) => setSelectedRepo(repo)} 
                  onViewChange={(v) => { setView(v); setSelectedRepo(null); }}
                />
              )}
              {view === 'repos' && (
                <RepoList 
                  repos={repos} 
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onRepoSelect={(repo) => setSelectedRepo(repo)}
                  onCreateRepo={handleCreateRepo}
                  loading={loading}
                  error={error}
                />
              )}
              {view === 'settings' && (
                <Settings 
                  user={user}
                  smtpStatus={smtpStatus}
                  onVerifySmtp={verifySmtp}
                  onTestEmail={handleTestEmail}
                  testEmail={testEmail}
                  setTestEmail={setTestEmail}
                  isTestingEmail={isTestingEmail}
                  onLogout={handleLogout}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Layout>
    </ThemeProvider>
  );
}
