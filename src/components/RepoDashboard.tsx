import React, { useState, useEffect } from 'react';
import { 
  GitCommit, 
  AlertCircle, 
  GitPullRequest, 
  BookOpen, 
  Target,
  ArrowLeft,
  Search,
  Plus,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { githubService, Repo, Commit, Issue, PullRequest, Milestone, Vulnerability } from '../services/githubService';

interface RepoDashboardProps {
  token: string;
  repo: Repo;
  onBack: () => void;
}

export const RepoDashboard: React.FC<RepoDashboardProps> = ({ token, repo, onBack }) => {
  const [activeTab, setActiveTab] = useState<'commits' | 'issues' | 'docs' | 'sprints' | 'pulls' | 'vulnerabilities'>('commits');
  const [commits, setCommits] = useState<Commit[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [pulls, setPulls] = useState<PullRequest[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRepoData = async () => {
      setLoading(true);
      try {
        const [
          fetchedCommits,
          fetchedIssues,
          fetchedPulls,
          fetchedMilestones,
          fetchedVulnerabilities
        ] = await Promise.all([
          githubService.getCommits(token, repo.full_name),
          githubService.getIssues(token, repo.full_name, { state: 'all' }),
          githubService.getPulls(token, repo.full_name, 'all'),
          githubService.getMilestones(token, repo.full_name),
          githubService.getVulnerabilities(token, repo.full_name)
        ]);

        setCommits(fetchedCommits);
        setIssues(fetchedIssues);
        setPulls(fetchedPulls);
        setMilestones(fetchedMilestones);
        setVulnerabilities(fetchedVulnerabilities);
      } catch (err) {
        console.error('Failed to fetch repo data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRepoData();
  }, [token, repo.full_name]);

  const tabs = [
    { id: 'commits', label: 'Commits', icon: GitCommit },
    { id: 'issues', label: 'Issues', icon: AlertCircle },
    { id: 'pulls', label: 'Pull Requests', icon: GitPullRequest },
    { id: 'sprints', label: 'Sprints', icon: Target },
    { id: 'vulnerabilities', label: 'Vulnerabilities', icon: ShieldAlert },
    { id: 'docs', label: 'Documentation', icon: BookOpen },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Repositories
        </button>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{repo.name}</h1>
            <p className="text-zinc-500">{repo.description || 'No description provided.'}</p>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href={`https://github.com/${repo.full_name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all"
            >
              <ExternalLink size={16} />
              View on GitHub
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-brand text-white shadow-lg shadow-brand/20" 
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'commits' && (
                <div className="space-y-4">
                  <div className="card-base divide-y divide-zinc-800/50">
                    {commits.map((commit) => (
                      <div key={commit.sha} className="p-6 hover:bg-zinc-900/30 transition-colors group">
                        <div className="flex items-start gap-4">
                          <img 
                            src={commit.author?.avatar_url} 
                            alt={commit.author?.login} 
                            className="w-10 h-10 rounded-full border border-zinc-800"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className="font-bold text-zinc-200 line-clamp-1">{commit.commit.message}</h3>
                              <span className="text-xs text-zinc-500 font-mono">{commit.sha.substring(0, 7)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 text-zinc-400">
                                <span className="font-bold text-zinc-300">{commit.author?.login}</span>
                                <span>•</span>
                                <span>{format(new Date(commit.commit.author.date), 'MMM d, yyyy')}</span>
                              </div>
                              <a 
                                href={commit.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-zinc-500 hover:text-brand transition-colors"
                              >
                                <ExternalLink size={16} />
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'issues' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input 
                        type="text" 
                        placeholder="Search issues..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                      />
                    </div>
                    <button className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded-xl font-medium transition-all">
                      <Plus size={18} />
                      New Issue
                    </button>
                  </div>
                  
                  <div className="card-base divide-y divide-zinc-800/50">
                    {issues.map((issue) => (
                      <div key={issue.id} className="p-6 hover:bg-zinc-900/30 transition-colors group">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "p-2 rounded-lg",
                            issue.state === 'open' ? "bg-emerald-400/10 text-emerald-400" : "bg-purple-400/10 text-purple-400"
                          )}>
                            <AlertCircle size={20} />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className="font-bold text-zinc-200 group-hover:text-brand transition-colors">{issue.title}</h3>
                              <span className="text-xs text-zinc-500 font-mono">#{issue.number}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {issue.labels.map((label) => (
                                <span 
                                  key={label.name}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                                  style={{ backgroundColor: `#${label.color}20`, color: `#${label.color}` }}
                                >
                                  {label.name}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center justify-between text-xs text-zinc-500">
                              <div className="flex items-center gap-2">
                                <img 
                                  src={issue.user.avatar_url} 
                                  alt={issue.user.login} 
                                  className="w-5 h-5 rounded-full"
                                  referrerPolicy="no-referrer"
                                />
                                <span>{issue.user.login} opened on {format(new Date(issue.created_at), 'MMM d')}</span>
                              </div>
                              {issue.comments > 0 && (
                                <div className="flex items-center gap-1">
                                  <Mail size={12} />
                                  {issue.comments}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'pulls' && (
                <div className="space-y-4">
                  <div className="card-base divide-y divide-zinc-800/50">
                    {pulls.map((pr) => (
                      <div key={pr.id} className="p-6 hover:bg-zinc-900/30 transition-colors group">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "p-2 rounded-lg",
                            pr.state === 'open' ? "bg-emerald-400/10 text-emerald-400" : "bg-purple-400/10 text-purple-400"
                          )}>
                            <GitPullRequest size={20} />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className="font-bold text-zinc-200 group-hover:text-brand transition-colors">{pr.title}</h3>
                              <span className="text-xs text-zinc-500 font-mono">#{pr.number}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-zinc-500">
                              <div className="flex items-center gap-2">
                                <img 
                                  src={pr.user.avatar_url} 
                                  alt={pr.user.login} 
                                  className="w-5 h-5 rounded-full"
                                  referrerPolicy="no-referrer"
                                />
                                <span>{pr.user.login} requested on {format(new Date(pr.created_at), 'MMM d')}</span>
                              </div>
                              {pr.merged_at && (
                                <div className="flex items-center gap-1 text-purple-400">
                                  <CheckCircle2 size={12} />
                                  Merged
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'sprints' && (
                <div className="grid grid-cols-1 gap-6">
                  {milestones.map((milestone) => (
                    <div key={milestone.id} className="card-base p-8 space-y-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-bold">{milestone.title}</h3>
                            <span className={cn(
                              "px-3 py-1 rounded-full text-xs font-bold uppercase",
                              milestone.state === 'open' ? "bg-emerald-400/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                            )}>
                              {milestone.state}
                            </span>
                          </div>
                          <p className="text-zinc-500">{milestone.description || 'No description provided.'}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="flex items-center gap-2 text-zinc-400 text-sm">
                            <Calendar size={16} />
                            <span>Due {milestone.due_on ? format(new Date(milestone.due_on), 'MMM d, yyyy') : 'No due date'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 text-center">
                          <p className="text-2xl font-bold">{milestone.open_issues + milestone.closed_issues}</p>
                          <p className="text-xs text-zinc-500 uppercase font-bold mt-1">Total Issues</p>
                        </div>
                        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 text-center">
                          <p className="text-2xl font-bold text-emerald-400">{milestone.closed_issues}</p>
                          <p className="text-xs text-zinc-500 uppercase font-bold mt-1">Completed</p>
                        </div>
                        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 text-center">
                          <p className="text-2xl font-bold text-amber-400">{milestone.open_issues}</p>
                          <p className="text-xs text-zinc-500 uppercase font-bold mt-1">Remaining</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-500 font-medium">Sprint Progress</span>
                          <span className="font-bold">{Math.round((milestone.closed_issues / (milestone.open_issues + milestone.closed_issues || 1)) * 100)}%</span>
                        </div>
                        <div className="h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                          <div 
                            className="h-full bg-brand transition-all duration-500" 
                            style={{ width: `${(milestone.closed_issues / (milestone.open_issues + milestone.closed_issues || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'vulnerabilities' && (
                <div className="space-y-4">
                  {vulnerabilities.length > 0 ? (
                    <div className="card-base divide-y divide-zinc-800/50">
                      {vulnerabilities.map((v) => (
                        <div key={v.id} className="p-6 hover:bg-zinc-900/30 transition-colors group cursor-pointer">
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "p-3 rounded-xl",
                              v.severity === 'critical' || v.severity === 'high' ? "bg-red-400/10 text-red-400" : "bg-amber-400/10 text-amber-400"
                            )}>
                              <ShieldAlert size={24} />
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <h3 className="font-bold text-zinc-200 group-hover:text-brand transition-colors">{v.summary}</h3>
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                  v.severity === 'critical' || v.severity === 'high' ? "bg-red-400/10 text-red-400" : "bg-amber-400/10 text-amber-400"
                                )}>
                                  {v.severity}
                                </span>
                              </div>
                              <p className="text-sm text-zinc-500 line-clamp-2">{v.description}</p>
                              <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
                                <span>Package: <span className="text-zinc-300">{v.package_name}</span></span>
                                <span>Range: <span className="text-zinc-300">{v.vulnerable_version_range}</span></span>
                                <span>Patched: <span className="text-zinc-300">{v.first_patched_version}</span></span>
                              </div>
                            </div>
                            <a 
                              href={v.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-zinc-500 hover:text-white transition-colors"
                            >
                              <ExternalLink size={18} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="card-base p-20 text-center space-y-4">
                      <div className="p-6 bg-emerald-400/10 text-emerald-400 rounded-full w-fit mx-auto">
                        <CheckCircle2 size={48} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold">No vulnerabilities found</h3>
                        <p className="text-zinc-500">Your project is secure. No Dependabot alerts found.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'docs' && (
                <div className="card-base p-20 text-center space-y-4">
                  <div className="p-6 bg-zinc-900 text-zinc-500 rounded-full w-fit mx-auto">
                    <BookOpen size={48} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold">Documentation</h3>
                    <p className="text-zinc-500">Browse and view markdown documentation files.</p>
                  </div>
                  <button className="text-brand font-bold hover:underline">
                    Browse Files
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
