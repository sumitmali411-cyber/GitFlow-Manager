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
  Mail,
  TrendingUp,
  Loader2,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { calculateRepoStatus } from '../lib/repoUtils';
import { githubService, Repo, Commit, Issue, PullRequest, Milestone, Vulnerability } from '../services/githubService';
import { CreateIssueModal } from './CreateIssueModal';
import { MilestoneModal } from './MilestoneModal';
import { CreateBranchModal } from './CreateBranchModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

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
  const [readme, setReadme] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReadme, setLoadingReadme] = useState(false);
  const [issueSearch, setIssueSearch] = useState('');
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);

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

  const fetchReadme = async () => {
    setLoadingReadme(true);
    try {
      const content = await githubService.getFileContent(token, repo.full_name, 'README.md');
      setReadme(content);
    } catch (err) {
      console.error('Failed to fetch README:', err);
      setReadme('# README.md not found\n\nNo documentation available for this repository.');
    } finally {
      setLoadingReadme(false);
    }
  };

  useEffect(() => {
    fetchRepoData();
  }, [token, repo.full_name]);

  useEffect(() => {
    if (activeTab === 'docs' && !readme) {
      fetchReadme();
    }
  }, [activeTab]);

  const handleCreateIssue = async (data: { title: string; body: string }) => {
    await githubService.createIssue(token, repo.full_name, data);
    await fetchRepoData();
  };

  const handleMilestoneSubmit = async (data: { title: string; description: string; due_on?: string }) => {
    if (editingMilestone) {
      await githubService.updateMilestone(token, repo.full_name, editingMilestone.number, data);
    } else {
      await githubService.createMilestone(token, repo.full_name, data);
    }
    await fetchRepoData();
    setEditingMilestone(null);
  };

  const handleCreateBranch = async (name: string) => {
    await githubService.createBranch(token, repo.full_name, name);
    // Branches aren't shown in the main dashboard yet, but we could refresh if needed
  };

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
          className="flex items-center gap-2 text-sm text-app-text-dim hover:text-app-text transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Repositories
        </button>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{repo.name}</h1>
              {!loading && (
                <div className={cn(
                  "px-3 py-1 text-xs font-bold rounded-full",
                  calculateRepoStatus(milestones, repo.open_issues_count).status.bg,
                  calculateRepoStatus(milestones, repo.open_issues_count).status.color
                )}>
                  {calculateRepoStatus(milestones, repo.open_issues_count).status.label}
                </div>
              )}
            </div>
            <p className="text-app-text-dim">{repo.description || 'No description provided.'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsBranchModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand/10 text-brand rounded-xl text-sm font-medium hover:bg-brand/20 transition-all"
            >
              <Plus size={16} />
              New Branch
            </button>
            <a 
              href={`https://github.com/${repo.full_name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-app-card border border-app-border rounded-xl text-sm font-medium hover:bg-app-card-hover transition-all"
            >
              <ExternalLink size={16} />
              View on GitHub
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-app-card/50 border border-app-border/50 rounded-2xl overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-brand text-white shadow-lg shadow-brand/20" 
                  : "text-app-text-dim hover:text-app-text hover:bg-app-card-hover/50"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-[400px] space-y-8">
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
              <CreateIssueModal 
                isOpen={isIssueModalOpen} 
                onClose={() => setIsIssueModalOpen(false)} 
                onCreate={handleCreateIssue} 
              />
              <MilestoneModal 
                isOpen={isMilestoneModalOpen} 
                onClose={() => {
                  setIsMilestoneModalOpen(false);
                  setEditingMilestone(null);
                }} 
                onSubmit={handleMilestoneSubmit}
                milestone={editingMilestone}
              />
              <CreateBranchModal 
                isOpen={isBranchModalOpen} 
                onClose={() => setIsBranchModalOpen(false)} 
                onCreate={handleCreateBranch} 
              />
              {activeTab === 'commits' && (
                <div className="space-y-8">
                  {/* Commit Frequency Chart */}
                  <div className="card-base p-6 space-y-4">
                    <div className="flex items-center gap-2 text-app-text-dim">
                      <TrendingUp size={18} />
                      <h3 className="font-bold">Commit Frequency</h3>
                    </div>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={commits.slice(0, 14).reverse().reduce((acc: any[], c) => {
                          const date = format(new Date(c.commit.author.date), 'MMM d');
                          const existing = acc.find(a => a.date === date);
                          if (existing) existing.count++;
                          else acc.push({ date, count: 1 });
                          return acc;
                        }, [])}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                          <XAxis dataKey="date" stroke="#666" fontSize={10} />
                          <YAxis stroke="#666" fontSize={10} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="card-base divide-y divide-app-border/50">
                    {commits.map((commit) => (
                      <div key={commit.sha} className="p-6 hover:bg-app-card-hover/30 transition-colors group">
                        <div className="flex items-start gap-4">
                          <img 
                            src={commit.author?.avatar_url} 
                            alt={commit.author?.login} 
                            className="w-10 h-10 rounded-full border border-app-border"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className="font-bold text-app-text line-clamp-1">{commit.commit.message}</h3>
                              <span className="text-xs text-app-text-muted font-mono">{commit.sha.substring(0, 7)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 text-app-text-dim">
                                <span className="font-bold text-app-text">{commit.author?.login}</span>
                                <span>•</span>
                                <span>{format(new Date(commit.commit.author.date), 'MMM d, yyyy')}</span>
                              </div>
                              <a 
                                href={commit.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-app-text-muted hover:text-brand transition-colors"
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
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-app-text-muted" size={18} />
                      <input 
                        type="text" 
                        placeholder="Search issues..."
                        value={issueSearch}
                        onChange={(e) => setIssueSearch(e.target.value)}
                        className="w-full bg-app-card border-app-border rounded-xl pl-12 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                      />
                    </div>
                    <button 
                      onClick={() => setIsIssueModalOpen(true)}
                      className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded-xl font-medium transition-all shrink-0"
                    >
                      <Plus size={18} />
                      New Issue
                    </button>
                  </div>
                  
                  <div className="card-base divide-y divide-app-border/50">
                    {issues
                      .filter(i => i.title.toLowerCase().includes(issueSearch.toLowerCase()) || i.number.toString().includes(issueSearch))
                      .map((issue) => (
                      <div key={issue.id} className="p-6 hover:bg-app-card-hover/30 transition-colors group">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "p-2 rounded-lg",
                            issue.state === 'open' ? "bg-emerald-400/10 text-emerald-400" : "bg-purple-400/10 text-purple-400"
                          )}>
                            <AlertCircle size={20} />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className="font-bold text-app-text group-hover:text-brand transition-colors">{issue.title}</h3>
                              <span className="text-xs text-app-text-muted font-mono">#{issue.number}</span>
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
                            <div className="flex items-center justify-between text-xs text-app-text-dim">
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
                  <div className="card-base divide-y divide-app-border/50">
                    {pulls.map((pr) => (
                      <div key={pr.id} className="p-6 hover:bg-app-card-hover/30 transition-colors group">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "p-2 rounded-lg",
                            pr.state === 'open' ? "bg-emerald-400/10 text-emerald-400" : "bg-purple-400/10 text-purple-400"
                          )}>
                            <GitPullRequest size={20} />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className="font-bold text-app-text group-hover:text-brand transition-colors">{pr.title}</h3>
                              <span className="text-xs text-app-text-muted font-mono">#{pr.number}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-app-text-dim">
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
                <div className="space-y-8">
                  <div className="flex justify-end">
                    <button 
                      onClick={() => setIsMilestoneModalOpen(true)}
                      className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded-xl font-medium transition-all"
                    >
                      <Plus size={18} />
                      New Sprint
                    </button>
                  </div>

                  {/* Velocity Chart */}
                  {milestones.length > 0 && (
                    <div className="card-base p-6 space-y-4">
                      <div className="flex items-center gap-2 text-app-text-dim">
                        <TrendingUp size={18} />
                        <h3 className="font-bold">Sprint Velocity (Closed Issues)</h3>
                      </div>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={milestones.slice(0, 5).reverse()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="title" stroke="#666" fontSize={10} />
                            <YAxis stroke="#666" fontSize={10} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                              itemStyle={{ color: '#fff' }}
                            />
                            <Bar dataKey="closed_issues" radius={[4, 4, 0, 0]}>
                              {milestones.slice(0, 5).reverse().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.state === 'open' ? '#10b981' : '#6366f1'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-6">
                    {milestones.map((milestone) => (
                      <div key={milestone.id} className="card-base p-8 space-y-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="text-2xl font-bold">{milestone.title}</h3>
                              <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold uppercase",
                               milestone.state === 'open' ? "bg-emerald-400/10 text-emerald-400" : "bg-app-card text-app-text-muted"
                              )}>
                                {milestone.state}
                              </span>
                            </div>
                            <p className="text-app-text-dim">{milestone.description || 'No description provided.'}</p>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="text-right space-y-1">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => {
                                    setEditingMilestone(milestone);
                                    setIsMilestoneModalOpen(true);
                                  }}
                                  className="p-2 hover:bg-app-card-hover rounded-lg transition-colors text-app-text-muted hover:text-brand"
                                  title="Edit Sprint"
                                >
                                  <Pencil size={16} />
                                </button>
                              </div>
                              <div className="flex items-center gap-2 text-app-text-muted text-sm">
                                <Calendar size={16} />
                                <span>Due {milestone.due_on ? format(new Date(milestone.due_on), 'MMM d, yyyy') : 'No due date'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          <div className="p-4 rounded-xl bg-app-card/50 border border-app-border/50 text-center">
                            <p className="text-2xl font-bold">{milestone.open_issues + milestone.closed_issues}</p>
                            <p className="text-xs text-app-text-muted uppercase font-bold mt-1">Total Issues</p>
                          </div>
                          <div className="p-4 rounded-xl bg-app-card/50 border border-app-border/50 text-center">
                            <p className="text-2xl font-bold text-emerald-400">{milestone.closed_issues}</p>
                            <p className="text-xs text-app-text-muted uppercase font-bold mt-1">Completed</p>
                          </div>
                          <div className="p-4 rounded-xl bg-app-card/50 border border-app-border/50 text-center">
                            <p className="text-2xl font-bold text-amber-400">{milestone.open_issues}</p>
                            <p className="text-xs text-app-text-muted uppercase font-bold mt-1">Remaining</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-app-text-dim font-medium">Sprint Progress</span>
                            <span className="font-bold">{Math.round((milestone.closed_issues / (milestone.open_issues + milestone.closed_issues || 1)) * 100)}%</span>
                          </div>
                          <div className="h-3 bg-app-bg rounded-full overflow-hidden border border-app-border">
                            <div 
                              className="h-full bg-brand transition-all duration-500" 
                              style={{ width: `${(milestone.closed_issues / (milestone.open_issues + milestone.closed_issues || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

               {activeTab === 'vulnerabilities' && (
                <div className="space-y-4">
                  {vulnerabilities.length > 0 ? (
                    <div className="card-base divide-y divide-app-border/50">
                      {vulnerabilities.map((v) => (
                        <div key={v.id} className="p-6 hover:bg-app-card-hover/30 transition-colors group cursor-pointer">
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "p-3 rounded-xl",
                              v.severity === 'critical' || v.severity === 'high' ? "bg-red-400/10 text-red-400" : "bg-amber-400/10 text-amber-400"
                            )}>
                              <ShieldAlert size={24} />
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <h3 className="font-bold text-app-text group-hover:text-brand transition-colors">{v.summary}</h3>
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                  v.severity === 'critical' || v.severity === 'high' ? "bg-red-400/10 text-red-400" : "bg-amber-400/10 text-amber-400"
                                )}>
                                  {v.severity}
                                </span>
                              </div>
                              <p className="text-sm text-app-text-dim line-clamp-2">{v.description}</p>
                              <div className="flex items-center gap-4 text-xs font-mono text-app-text-dim">
                                <span>Package: <span className="text-app-text">{v.package_name}</span></span>
                                <span>Range: <span className="text-app-text">{v.vulnerable_version_range}</span></span>
                                <span>Patched: <span className="text-app-text">{v.first_patched_version}</span></span>
                              </div>
                            </div>
                            <a 
                              href={v.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-app-text-muted hover:text-app-text transition-colors"
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
                        <p className="text-app-text-dim">Your project is secure. No Dependabot alerts found.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'docs' && (
                <div className="card-base p-8 min-h-[600px]">
                  {loadingReadme ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 size={32} className="animate-spin text-brand" />
                    </div>
                  ) : (
                    <div className="prose prose-invert prose-emerald max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {readme || ''}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
