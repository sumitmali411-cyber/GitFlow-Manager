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
import { CreateRepoModal } from './CreateRepoModal';

interface DashboardProps {
  token: string;
  onRepoSelect: (repo: Repo) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ token, onRepoSelect }) => {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [pulls, setPulls] = useState<PullRequest[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const fetchedRepos = await githubService.getRepos(token);
      setRepos(fetchedRepos);
      
      // Fetch data for the first few repos to populate activity
      const recentRepos = fetchedRepos.slice(0, 3);
      const allIssues: Issue[] = [];
      const allPulls: PullRequest[] = [];
      const allVulnerabilities: Vulnerability[] = [];

      for (const repo of recentRepos) {
        const [repoIssues, repoPulls, repoVulnerabilities] = await Promise.all([
          githubService.getIssues(token, repo.full_name, { state: 'open', per_page: 5 }),
          githubService.getPulls(token, repo.full_name, 'open'),
          githubService.getVulnerabilities(token, repo.full_name)
        ]);
        allIssues.push(...repoIssues);
        allPulls.push(...repoPulls);
        allVulnerabilities.push(...repoVulnerabilities);
      }

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
          <p className="text-zinc-500 mt-1">Overview of your active projects and recent events.</p>
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
              <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
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
              <button className="text-sm text-brand font-medium hover:underline">View all</button>
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
                      <p className="text-sm text-zinc-500 line-clamp-2">{repo.description || 'No description provided.'}</p>
                    </div>
                    <div className="px-3 py-1 bg-emerald-400/10 text-emerald-400 text-xs font-bold rounded-full">
                      On Track
                    </div>
                  </div>
                  
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>Progress</span>
                      <span className="font-bold text-zinc-300">68%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-brand w-[68%]" />
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <div className="flex items-center gap-1">
                        <AlertCircle size={14} />
                        {repo.open_issues_count} Issues
                      </div>
                      <div className="flex items-center gap-1">
                        <GitPullRequest size={14} />
                        3 PRs
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
                { name: 'GitHub Actions', status: 'Active', icon: Zap, color: 'text-emerald-400' },
                { name: 'Dependabot', status: 'Enabled', icon: ShieldAlert, color: 'text-blue-400' },
                { name: 'Vercel', status: 'Connected', icon: ExternalLink, color: 'text-white' },
                { name: 'Slack', status: 'Configured', icon: Mail, color: 'text-purple-400' },
              ].map((tool) => (
                <div key={tool.name} className="card-base p-4 text-center space-y-2">
                  <tool.icon className={cn("mx-auto", tool.color)} size={20} />
                  <p className="text-xs font-bold">{tool.name}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{tool.status}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Recent Activity & Vulnerabilities */}
        <div className="space-y-8">
          {/* Recent Activity */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Recent Activity</h2>
            <div className="card-base divide-y divide-zinc-800/50">
              {issues.slice(0, 5).map((issue) => (
                <div key={issue.id} className="p-4 space-y-2 hover:bg-zinc-900/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-amber-400" />
                    <span className="text-sm font-medium truncate">{issue.title}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <div className="flex items-center gap-2">
                      <span className="text-brand font-mono">#{issue.number}</span>
                      <span>•</span>
                      <span>{issue.user.login}</span>
                    </div>
                    <span>{format(new Date(issue.created_at), 'h:mm a')}</span>
                  </div>
                </div>
              ))}
              <button className="w-full py-3 text-xs text-zinc-500 hover:text-white transition-colors font-medium">
                View all activity
              </button>
            </div>
          </section>

          {/* Vulnerabilities */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Vulnerabilities</h2>
            <div className="card-base divide-y divide-zinc-800/50">
              {vulnerabilities.length > 0 ? (
                vulnerabilities.slice(0, 5).map((v) => (
                  <div key={v.id} className="p-4 space-y-2 hover:bg-zinc-900/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={14} className={cn(
                        v.severity === 'critical' || v.severity === 'high' ? 'text-red-400' : 'text-amber-400'
                      )} />
                      <span className="text-sm font-medium truncate">{v.summary}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span className="uppercase font-bold">{v.severity}</span>
                      <span className="font-mono">{v.package_name}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center space-y-2">
                  <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
                  <p className="text-sm font-medium">No vulnerabilities found</p>
                  <p className="text-xs text-zinc-500">Your projects are secure.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
