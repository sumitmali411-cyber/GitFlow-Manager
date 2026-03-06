import React, { useEffect, useState } from 'react';
import { 
  FolderGit2, 
  AlertCircle, 
  GitPullRequest, 
  CheckCircle2, 
  Clock,
  ShieldAlert,
  Plus,
  Zap,
  ExternalLink,
  Mail
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { githubService, Repo, Issue, PullRequest, Vulnerability } from '../services/githubService';
import { cn } from '../lib/utils';
import { calculateRepoStatus } from '../lib/repoUtils';
import { CreateRepoModal } from './CreateRepoModal';

interface RepoDetails {
  progress: number;
  status: {
    label: string;
    color: string;
    bg: string;
  };
  pullsCount: number;
}

interface DashboardProps {
  token: string;
  onRepoSelect: (repo: Repo) => void;
  onViewChange: (view: 'repos' | 'dashboard' | 'settings') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ token, onRepoSelect, onViewChange }) => {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [pulls, setPulls] = useState<PullRequest[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [repoDetails, setRepoDetails] = useState<Record<string, RepoDetails>>({});
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const fetchedRepos = await githubService.getRepos(token);
      setRepos(fetchedRepos);
      
      // Fetch data for the first few repos to populate activity
      const recentRepos = fetchedRepos.slice(0, 4);
      const allIssues: Issue[] = [];
      const allPulls: PullRequest[] = [];
      const allVulnerabilities: Vulnerability[] = [];
      const details: Record<string, RepoDetails> = {};

      for (const repo of recentRepos) {
        const [repoIssues, repoPulls, repoVulnerabilities, repoMilestones] = await Promise.all([
          githubService.getIssues(token, repo.full_name, { state: 'open', per_page: 5 }),
          githubService.getPulls(token, repo.full_name, 'open'),
          githubService.getVulnerabilities(token, repo.full_name),
          githubService.getMilestones(token, repo.full_name)
        ]);
        
        allIssues.push(...repoIssues);
        allPulls.push(...repoPulls);
        allVulnerabilities.push(...repoVulnerabilities);
        
        const { progress, status } = calculateRepoStatus(repoMilestones, repo.open_issues_count);
        details[repo.full_name] = {
          progress,
          status,
          pullsCount: repoPulls.length
        };
      }

      setRepoDetails(details);
      setIssues(allIssues.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setPulls(allPulls.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setVulnerabilities(allVulnerabilities);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const handleCreateRepo = async (data: { name: string; description: string; private: boolean }) => {
    await githubService.createRepo(token, data);
    await fetchDashboardData();
  };

  const stats = [
    { label: 'Active Projects', value: repos.length, icon: FolderGit2, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Open Issues', value: issues.length, icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Pending PRs', value: pulls.length, icon: GitPullRequest, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Vulnerabilities', value: vulnerabilities.length, icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-400/10' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-app-text-dim mt-1">Overview of your active projects and recent events.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg shadow-brand/20"
        >
          <Plus size={18} />
          New Project
        </button>
      </header>

      <CreateRepoModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateRepo}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="card-base p-6 space-y-4"
          >
            <div className={cn("p-3 rounded-xl w-fit", stat.bg)}>
              <stat.icon className={stat.color} size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-app-text-dim">{stat.label}</p>
              <p className="text-3xl font-bold mt-1">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Projects */}
        <div className="lg:col-span-2 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Active Projects</h2>
              <button 
                onClick={() => onViewChange('repos')}
                className="text-sm text-brand font-medium hover:underline"
              >
                View all
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {repos.slice(0, 4).map((repo) => (
                <div 
                  key={repo.id} 
                  onClick={() => onRepoSelect(repo)}
                  className="card-base p-6 cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg group-hover:text-brand transition-colors">{repo.name}</h3>
                      <p className="text-sm text-app-text-dim line-clamp-2">{repo.description || 'No description provided.'}</p>
                    </div>
                    <div className={cn(
                      "px-3 py-1 text-xs font-bold rounded-full",
                      repoDetails[repo.full_name]?.status.bg || 'bg-emerald-400/10',
                      repoDetails[repo.full_name]?.status.color || 'text-emerald-400'
                    )}>
                      {repoDetails[repo.full_name]?.status.label || 'On Track'}
                    </div>
                  </div>
                  
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between text-xs text-app-text-dim">
                      <span>Progress</span>
                      <span className="font-bold text-app-text">{repoDetails[repo.full_name]?.progress || 0}%</span>
                    </div>
                    <div className="h-2 bg-app-bg rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand transition-all duration-500" 
                        style={{ width: `${repoDetails[repo.full_name]?.progress || 0}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-app-text-dim">
                      <div className="flex items-center gap-1">
                        <AlertCircle size={14} />
                        {repo.open_issues_count} Issues
                      </div>
                      <div className="flex items-center gap-1">
                        <GitPullRequest size={14} />
                        {repoDetails[repo.full_name]?.pullsCount || 0} PRs
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        Updated {format(new Date(repo.updated_at), 'MMM d')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Tools & Integrations */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Tools & Integrations</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { name: 'GitHub Actions', status: 'Active', icon: Zap, color: 'text-emerald-400', url: 'https://github.com/features/actions' },
                { name: 'Dependabot', status: 'Enabled', icon: ShieldAlert, color: 'text-blue-400', url: 'https://github.com/features/security' },
                { name: 'Vercel', status: 'Connected', icon: ExternalLink, color: 'text-white', url: 'https://vercel.com' },
                { name: 'Slack', status: 'Configured', icon: Mail, color: 'text-purple-400', url: 'https://slack.com' },
              ].map((tool) => (
                <a 
                  key={tool.name} 
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-base p-4 text-center space-y-2 hover:border-brand transition-all group"
                >
                  <tool.icon className={cn("mx-auto group-hover:scale-110 transition-transform", tool.color)} size={20} />
                  <p className="text-xs font-bold">{tool.name}</p>
                  <p className="text-[10px] text-app-text-dim uppercase tracking-wider">{tool.status}</p>
                </a>
              ))}
            </div>
          </section>
        </div>

        {/* Recent Activity & Vulnerabilities */}
        <div className="space-y-8">
          {/* Recent Activity */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Recent Activity</h2>
            <div className="card-base divide-y divide-app-border/50">
              {[...issues.slice(0, 3), ...pulls.slice(0, 3)]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 6)
                .map((item) => {
                  const isPR = 'pull_request' in item || 'merged_at' in item;
                  return (
                    <div key={item.id} className="p-4 space-y-2 hover:bg-app-card-hover/30 transition-colors group cursor-pointer">
                      <div className="flex items-center gap-2">
                        {isPR ? (
                          <GitPullRequest size={14} className="text-purple-400 group-hover:scale-110 transition-transform" />
                        ) : (
                          <AlertCircle size={14} className="text-amber-400 group-hover:scale-110 transition-transform" />
                        )}
                        <span className="text-sm font-medium truncate group-hover:text-brand transition-colors">{item.title}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-app-text-dim">
                        <div className="flex items-center gap-2">
                          <span className="text-brand font-mono">#{item.number}</span>
                          <span>•</span>
                          <span className="font-medium">{item.user.login}</span>
                        </div>
                        <span className="font-mono">{format(new Date(item.created_at), 'MMM d, h:mm a')}</span>
                      </div>
                    </div>
                  );
                })}
              <button 
                onClick={() => onViewChange('repos')}
                className="w-full py-3 text-xs text-app-text-dim hover:text-app-text transition-colors font-bold uppercase tracking-widest"
              >
                View all activity
              </button>
            </div>
          </section>

          {/* Vulnerabilities */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Vulnerabilities</h2>
            <div className="card-base divide-y divide-app-border/50">
              {vulnerabilities.length > 0 ? (
                vulnerabilities.slice(0, 5).map((v) => (
                  <div key={v.id} className="p-4 space-y-2 hover:bg-app-card-hover/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={14} className={cn(
                        v.severity === 'critical' || v.severity === 'high' ? 'text-red-400' : 'text-amber-400'
                      )} />
                      <span className="text-sm font-medium truncate">{v.summary}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-app-text-dim">
                      <span className="uppercase font-bold">{v.severity}</span>
                      <span className="font-mono">{v.package_name}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center space-y-2">
                  <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
                  <p className="text-sm font-medium">No vulnerabilities found</p>
                  <p className="text-xs text-app-text-dim">Your projects are secure.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
