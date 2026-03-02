import React, { useState, useEffect } from 'react';
import { 
  Github, 
  GitCommit, 
  GitBranch, 
  AlertCircle, 
  FileText, 
  ChevronRight, 
  ExternalLink, 
  Plus, 
  Search,
  CheckCircle2,
  Clock,
  User,
  LogOut,
  ArrowLeft,
  BookOpen,
  Layers,
  Flag,
  Calendar,
  ChevronDown,
  ChevronUp,
  Target,
  TrendingDown,
  Edit2,
  Settings,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, differenceInDays, addDays } from 'date-fns';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Mermaid } from './components/Mermaid';
import { cn } from './lib/utils';

// Types
interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  owner: { login: string; avatar_url: string };
}

interface Commit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
  };
  author: { avatar_url: string; login: string };
  html_url: string;
}

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  AreaChart,
  Area
} from 'recharts';

interface Milestone {
  id: number;
  number: number;
  title: string;
  description: string;
  state: 'open' | 'closed';
  due_on: string | null;
  created_at: string;
  open_issues: number;
  closed_issues: number;
}

interface Issue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  created_at: string;
  user: { login: string; avatar_url: string };
  labels: { name: string; color: string }[];
  milestone: Milestone | null;
  assignee?: { login: string; avatar_url: string };
  closed_at: string | null;
}

interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  user: { login: string; avatar_url: string };
  created_at: string;
  html_url: string;
  body: string;
}

interface PRComment {
  id: number;
  user: { login: string; avatar_url: string };
  body: string;
  created_at: string;
  path?: string;
  line?: number;
}

interface Branch {
  name: string;
  commit: { sha: string };
}

interface DocFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url: string | null;
}

const BurndownChart = ({ milestone, issues }: { milestone: Milestone, issues: Issue[] }) => {
  if (!issues || issues.length === 0) return null;

  const startDate = new Date(milestone.created_at);
  const endDate = milestone.due_on ? new Date(milestone.due_on) : new Date();
  
  // If due date is in the past and milestone is closed, use the latest closed_at date or due_on
  const actualEndDate = milestone.state === 'closed' ? endDate : (endDate > new Date() ? endDate : new Date());
  
  const days = differenceInDays(actualEndDate, startDate) + 1;
  const totalIssues = issues.length;
  
  const data = [];
  const idealDecrement = totalIssues / (days > 0 ? days : 1);

  for (let i = 0; i <= days; i++) {
    const currentDate = addDays(startDate, i);
    if (currentDate > new Date() && milestone.state === 'open') break;

    const remainingIssues = issues.filter(issue => {
      const createdDate = new Date(issue.created_at);
      const closedDate = issue.closed_at ? new Date(issue.closed_at) : null;
      
      // Issue exists if it was created on or before this date
      const exists = createdDate <= currentDate;
      // Issue is still open if it hasn't been closed yet, or was closed after this date
      const isOpen = !closedDate || closedDate > currentDate;
      
      return exists && isOpen;
    }).length;

    data.push({
      day: format(currentDate, 'MMM d'),
      remaining: remainingIssues,
      ideal: Math.max(0, totalIssues - (i * idealDecrement))
    });
  }

  return (
    <div className="h-[200px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRemaining" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis 
            dataKey="day" 
            stroke="#666" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
          />
          <YAxis 
            stroke="#666" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '12px' }}
            itemStyle={{ color: '#fff' }}
          />
          <Area 
            type="monotone" 
            dataKey="remaining" 
            stroke="#10b981" 
            fillOpacity={1} 
            fill="url(#colorRemaining)" 
            name="Remaining Issues"
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="ideal" 
            stroke="#666" 
            strokeDasharray="5 5" 
            dot={false} 
            name="Ideal Burndown"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('github_token'));
  const [user, setUser] = useState<any>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [view, setView] = useState<'repos' | 'dashboard'>('repos');
  const [activeTab, setActiveTab] = useState<'commits' | 'issues' | 'docs' | 'sprints' | 'pulls' | 'settings'>('commits');
  const [commits, setCommits] = useState<Commit[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [pulls, setPulls] = useState<PullRequest[]>([]);
  const [prComments, setPrComments] = useState<Record<number, PRComment[]>>({});
  const [expandedPrId, setExpandedPrId] = useState<number | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestoneIssues, setMilestoneIssues] = useState<Record<number, Issue[]>>({});
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<number | null>(null);
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [docPreviews, setDocPreviews] = useState<Record<string, string>>({});
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [issueSearchQuery, setIssueSearchQuery] = useState('');
  
  // Commit expansion
  const [expandedCommitSha, setExpandedCommitSha] = useState<string | null>(null);
  
  // Issue filters
  const [issueStateFilter, setIssueStateFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [issueSort, setIssueSort] = useState<'created' | 'updated' | 'comments'>('created');
  const [selectedMilestone, setSelectedMilestone] = useState<number | 'all'>('all');
  
  // Create Issue Modal
  const [isCreateIssueModalOpen, setIsCreateIssueModalOpen] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueBody, setNewIssueBody] = useState('');
  const [newIssueType, setNewIssueType] = useState<'task' | 'story' | 'bug' | 'improvement' | 'config'>('task');
  const [newIssuePriority, setNewIssuePriority] = useState<'low' | 'medium' | 'high' | 'urgent' | 'critical'>('medium');
  const [assigneeEmail, setAssigneeEmail] = useState('');
  const [newIssueMilestone, setNewIssueMilestone] = useState<number | null>(null);
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);

  // Create Branch Modal
  const [isCreateBranchModalOpen, setIsCreateBranchModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [baseBranchName, setBaseBranchName] = useState('main');
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);

  // Create Sprint (Milestone) Modal
  const [isCreateSprintModalOpen, setIsCreateSprintModalOpen] = useState(false);
  const [newSprintTitle, setNewSprintTitle] = useState('');
  const [newSprintDescription, setNewSprintDescription] = useState('');
  const [newSprintDueDate, setNewSprintDueDate] = useState('');
  const [isCreatingSprint, setIsCreatingSprint] = useState(false);

  // Sprint Goals Editing
  const [editingMilestoneId, setEditingMilestoneId] = useState<number | null>(null);
  const [editingGoals, setEditingGoals] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [isUpdatingMilestone, setIsUpdatingMilestone] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<{ checked: boolean; configured: boolean; message: string }>({
    checked: false,
    configured: false,
    message: 'Checking configuration...'
  });

  useEffect(() => {
    if (activeTab === 'settings' && token) {
      verifySmtp();
    }
  }, [activeTab, token]);

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

  useEffect(() => {
    if (token) {
      fetchUser();
      fetchRepos();
    }
  }, [token]);

  useEffect(() => {
    if (selectedRepo && token) {
      fetchRepoData();
    }
  }, [selectedRepo, activeTab]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/github/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error(err);
      handleLogout();
    }
  };

  const decodeBase64 = (str: string) => {
    try {
      const binaryString = atob(str);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    } catch (e) {
      console.error('Failed to decode base64', e);
      return atob(str);
    }
  };

  const fetchRepos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/github/user/repos?sort=updated&per_page=50', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRepos(Array.isArray(data) ? data : []);
      } else {
        setError(data.error || data.message || "Failed to fetch repositories");
      }
    } catch (err) {
      console.error(err);
      setError("Network error fetching repositories");
    } finally {
      setLoading(false);
    }
  };

  const fetchRepoData = async () => {
    if (!selectedRepo) return;
    setLoading(true);
    try {
      if (activeTab === 'commits') {
        const res = await fetch(`/api/github/repos/${selectedRepo.full_name}/commits`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCommits(await res.json());
      } else if (activeTab === 'issues') {
        const milestoneParam = selectedMilestone !== 'all' ? `&milestone=${selectedMilestone}` : '';
        const res = await fetch(`/api/github/repos/${selectedRepo.full_name}/issues?state=${issueStateFilter}&sort=${issueSort}&direction=desc${milestoneParam}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIssues(await res.json());
      } else if (activeTab === 'pulls') {
        const res = await fetch(`/api/github/repos/${selectedRepo.full_name}/pulls?state=all`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPulls(await res.json());
      } else if (activeTab === 'docs') {
        const res = await fetch(`/api/github/repos/${selectedRepo.full_name}/contents/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const docFiles = data.filter((f: any) => 
          f.name.toLowerCase().endsWith('.md') || 
          f.name.toLowerCase().includes('doc') ||
          f.type === 'dir'
        );
        setDocs(docFiles);
        
        // Fetch previews for the first few markdown files
        const mdFiles = docFiles.filter((f: any) => f.name.toLowerCase().endsWith('.md')).slice(0, 5);
        for (const file of mdFiles) {
          try {
            const fileRes = await fetch(`/api/github/repos/${selectedRepo.full_name}/contents/${file.path}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const fileData = await fileRes.json();
            if (fileData.content) {
              const content = decodeBase64(fileData.content);
              setDocPreviews(prev => ({ ...prev, [file.path]: content.substring(0, 120) + '...' }));
            }
          } catch (e) {
            console.error("Failed to fetch preview for", file.name);
          }
        }
      }
      
      // Always fetch branches for context
      const branchRes = await fetch(`/api/github/repos/${selectedRepo.full_name}/branches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranches(await branchRes.json());

      // Fetch milestones (Sprints)
      const milestoneRes = await fetch(`/api/github/repos/${selectedRepo.full_name}/milestones?state=all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMilestones(await milestoneRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const res = await fetch('/api/auth/url');
    const { url } = await res.json();
    const popup = window.open(url, 'github_oauth', 'width=600,height=700');
    
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
    setView('repos');
    setSelectedRepo(null);
  };

  const fetchDocContent = async (path: string) => {
    if (!selectedRepo) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/github/repos/${selectedRepo.full_name}/contents/${path}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.content) {
        setSelectedDoc(decodeBase64(data.content));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPRComments = async (prNumber: number) => {
    if (!selectedRepo) return;
    try {
      const res = await fetch(`/api/github/repos/${selectedRepo.full_name}/pulls/${prNumber}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPrComments(prev => ({ ...prev, [prNumber]: data }));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMilestoneIssues = async (milestoneNumber: number) => {
    if (!selectedRepo) return;
    try {
      const res = await fetch(`/api/github/repos/${selectedRepo.full_name}/issues?milestone=${milestoneNumber}&state=all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMilestoneIssues(prev => ({ ...prev, [milestoneNumber]: data }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo || !newIssueTitle) return;
    
    setIsCreatingIssue(true);
    try {
      const labels = [`type: ${newIssueType}`, `priority: ${newIssuePriority}`];
      const res = await fetch(`/api/github/repos/${selectedRepo.full_name}/issues`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newIssueTitle,
          body: `${newIssueBody}\n\n---\n**Assignee Email:** ${assigneeEmail || 'Not specified'}`,
          labels,
          milestone: newIssueMilestone
        })
      });
      
      if (res.ok) {
        const createdIssue = await res.json();
        
        // Send email notification if email is provided
        if (assigneeEmail) {
          try {
            const notifyRes = await fetch('/api/notify/assignment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: assigneeEmail,
                issueTitle: newIssueTitle,
                issueUrl: createdIssue.html_url,
                repoName: selectedRepo.full_name
              })
            });
            
            if (!notifyRes.ok) {
              const errorData = await notifyRes.json();
              console.warn('Email notification failed:', errorData);
              // We don't block the issue creation, but we should inform the user
              if (errorData.error === 'SMTP_NOT_CONFIGURED') {
                alert('Issue created, but email notification skipped: SMTP is not configured on the server.');
              } else {
                alert(`Issue created, but email notification failed: ${errorData.message || 'Unknown error'}`);
              }
            }
          } catch (notifyErr) {
            console.error('Failed to call notification endpoint:', notifyErr);
          }
        }

        setIsCreateIssueModalOpen(false);
        setNewIssueTitle('');
        setNewIssueBody('');
        setAssigneeEmail('');
        setNewIssueMilestone(null);
        // Refresh issues
        fetchRepoData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingIssue(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo || !newBranchName) return;

    setIsCreatingBranch(true);
    try {
      // 1. Get the SHA of the base branch
      const baseBranch = branches.find(b => b.name === baseBranchName) || branches[0];
      if (!baseBranch) throw new Error("Base branch not found");

      // 2. Create the new reference
      const res = await fetch(`/api/github/repos/${selectedRepo.full_name}/git/refs`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: `refs/heads/${newBranchName}`,
          sha: baseBranch.commit.sha
        })
      });

      if (res.ok) {
        setIsCreateBranchModalOpen(false);
        setNewBranchName('');
        fetchRepoData();
      } else {
        const error = await res.json();
        alert(`Error: ${error.message}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setIsCreatingBranch(false);
    }
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo || !newSprintTitle) return;

    setIsCreatingSprint(true);
    try {
      const res = await fetch(`/api/github/repos/${selectedRepo.full_name}/milestones`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newSprintTitle,
          description: newSprintDescription,
          due_on: newSprintDueDate ? new Date(newSprintDueDate).toISOString() : null
        })
      });

      if (res.ok) {
        setIsCreateSprintModalOpen(false);
        setNewSprintTitle('');
        setNewSprintDescription('');
        setNewSprintDueDate('');
        fetchRepoData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingSprint(false);
    }
  };

  const handleUpdateMilestone = async (milestoneNumber: number, title: string, description: string) => {
    if (!selectedRepo) return;
    setIsUpdatingMilestone(true);
    try {
      const res = await fetch(`/api/github/repos/${selectedRepo.full_name}/milestones/${milestoneNumber}`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          description
        })
      });

      if (res.ok) {
        setEditingMilestoneId(null);
        fetchRepoData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingMilestone(false);
    }
  };

  const handleUpdateIssueMilestone = async (issueNumber: number, milestoneNumber: number | null) => {
    if (!selectedRepo) return;
    try {
      const res = await fetch(`/api/github/repos/${selectedRepo.full_name}/issues/${issueNumber}`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          milestone: milestoneNumber
        })
      });

      if (res.ok) {
        fetchRepoData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const parseIssueNumbers = (message: string) => {
    const matches = message.match(/#(\d+)/g);
    return matches ? Array.from(new Set(matches.map(m => m.substring(1)))) : [];
  };

  const filteredRepos = repos.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDocs = docs.filter(doc => 
    doc.name.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
    doc.path.toLowerCase().includes(docSearchQuery.toLowerCase())
  );

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-white/10">
      {/* Navigation */}
      <nav className="border-bottom border-zinc-800 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => { setView('repos'); setSelectedRepo(null); }}
            >
              <Github size={24} />
              <span className="font-bold text-lg hidden sm:block">GitFlow</span>
            </div>
            {selectedRepo && (
              <>
                <ChevronRight size={16} className="text-zinc-600" />
                <div className="flex items-center gap-2 bg-zinc-800 px-3 py-1 rounded-full text-sm font-medium">
                  <BookOpen size={14} className="text-zinc-400" />
                  {selectedRepo.name}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-medium text-zinc-400">Logged in as</p>
                  <p className="text-sm font-bold">{user.login}</p>
                </div>
                <img 
                  src={user.avatar_url} 
                  alt={user.login} 
                  className="w-8 h-8 rounded-full border border-zinc-700"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          {view === 'repos' ? (
            <motion.div 
              key="repos"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold">Your Repositories</h2>
                  <p className="text-zinc-400">Select a project to manage its workflow</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search repositories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-xl text-red-400 text-sm mb-6">
                  <p className="font-bold mb-1">Error fetching repositories:</p>
                  <p>{error}</p>
                  <button 
                    onClick={fetchRepos}
                    className="mt-2 text-xs underline hover:text-red-300"
                  >
                    Try again
                  </button>
                </div>
              )}

              {loading && repos.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-40 bg-zinc-900/50 animate-pulse rounded-2xl border border-zinc-800" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRepos.map(repo => (
                    <motion.div 
                      key={repo.id}
                      whileHover={{ y: -4 }}
                      onClick={() => {
                        setSelectedRepo(repo);
                        setView('dashboard');
                        setActiveTab('commits');
                      }}
                      className="group p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-600 transition-all cursor-pointer relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-zinc-800 rounded-xl group-hover:bg-white group-hover:text-black transition-colors">
                          <Github size={24} />
                        </div>
                        <ExternalLink size={16} className="text-zinc-600 group-hover:text-zinc-400" />
                      </div>
                      <h3 className="font-bold text-lg mb-1 truncate">{repo.name}</h3>
                      <p className="text-zinc-500 text-sm line-clamp-2 mb-4 h-10">
                        {repo.description || "No description provided."}
                      </p>
                      <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                        <User size={12} />
                        {repo.owner.login}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Dashboard Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => { setView('repos'); setSelectedRepo(null); }}
                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      {selectedRepo?.name}
                      <span className="text-xs font-normal bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">Public</span>
                    </h2>
                    <p className="text-zinc-400 text-sm">{selectedRepo?.full_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                  {[
                    { id: 'commits', icon: GitCommit, label: 'Commits' },
                    { id: 'issues', icon: AlertCircle, label: 'Issues' },
                    { id: 'pulls', icon: GitBranch, label: 'PRs' },
                    { id: 'sprints', icon: Layers, label: 'Sprints' },
                    { id: 'docs', icon: FileText, label: 'Docs' },
                    { id: 'settings', icon: Settings, label: 'Settings' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setSelectedDoc(null);
                      }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        activeTab === tab.id 
                          ? "bg-zinc-800 text-white shadow-lg" 
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                      )}
                    >
                      <tab.icon size={16} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Area */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar Context */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Branches</h4>
                    <div className="space-y-2">
                      {branches.map(branch => (
                        <div key={branch.name} className="flex items-center justify-between group">
                          <div className="flex items-center gap-2 text-sm text-zinc-300">
                            <GitBranch size={14} className="text-zinc-500" />
                            <span className="truncate max-w-[120px]">{branch.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-400 transition-colors">
                            {branch.commit.sha.substring(0, 7)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Quick Actions</h4>
                    <button 
                      onClick={() => setIsCreateIssueModalOpen(true)}
                      className="w-full flex items-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 py-2 px-3 rounded-lg transition-colors"
                    >
                      <Plus size={14} />
                      New Task/Story
                    </button>
                    <button 
                      onClick={() => setIsCreateBranchModalOpen(true)}
                      className="w-full flex items-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 py-2 px-3 rounded-lg transition-colors"
                    >
                      <GitBranch size={14} />
                      Create Branch
                    </button>
                    <button 
                      onClick={() => setIsCreateSprintModalOpen(true)}
                      className="w-full flex items-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 py-2 px-3 rounded-lg transition-colors"
                    >
                      <Layers size={14} />
                      Plan Sprint
                    </button>
                  </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden min-h-[500px]">
                    {loading ? (
                      <div className="flex items-center justify-center h-[500px]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      </div>
                    ) : (
                      <div className="p-6">
                        {activeTab === 'commits' && (
                          <div className="space-y-6">
                            {commits.map((commit, idx) => (
                              <div key={commit.sha} className="flex gap-4 relative">
                                {idx !== commits.length - 1 && (
                                  <div className="absolute left-[19px] top-10 bottom-[-24px] w-px bg-zinc-800" />
                                )}
                                <div className="z-10 mt-1">
                                  <img 
                                    src={commit.author?.avatar_url || `https://ui-avatars.com/api/?name=${commit.commit.author.name}`} 
                                    className="w-10 h-10 rounded-full border-2 border-zinc-950 shadow-lg cursor-pointer hover:scale-105 transition-transform"
                                    referrerPolicy="no-referrer"
                                    onClick={() => setExpandedCommitSha(expandedCommitSha === commit.sha ? null : commit.sha)}
                                  />
                                </div>
                                <div className="flex-1 pb-6">
                                  <div 
                                    className="flex items-center justify-between mb-1 cursor-pointer group"
                                    onClick={() => setExpandedCommitSha(expandedCommitSha === commit.sha ? null : commit.sha)}
                                  >
                                    <h4 className="font-bold text-zinc-200 line-clamp-1 group-hover:text-white transition-colors">
                                      {commit.commit.message.split('\n')[0]}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                                        {commit.sha.substring(0, 7)}
                                      </span>
                                      {expandedCommitSha === commit.sha ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm text-zinc-500">
                                    <span className="font-medium text-zinc-400">{commit.author?.login || commit.commit.author.name}</span>
                                    <span>•</span>
                                    <div className="flex items-center gap-1">
                                      <Clock size={12} />
                                      {format(new Date(commit.commit.author.date), 'MMM d, yyyy HH:mm')}
                                    </div>
                                  </div>
                                  
                                  <AnimatePresence>
                                    {expandedCommitSha === commit.sha && (
                                      <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-4 overflow-hidden"
                                      >
                                        <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800 space-y-3">
                                          <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Full Message</p>
                                            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{commit.commit.message}</p>
                                          </div>
                                          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800/50">
                                            <div>
                                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Author Email</p>
                                              <p className="text-xs text-zinc-400">{commit.commit.author.email}</p>
                                            </div>
                                            <div>
                                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">SHA</p>
                                              <p className="text-xs text-zinc-400 font-mono">{commit.sha}</p>
                                            </div>
                                          </div>
                                          {parseIssueNumbers(commit.commit.message).length > 0 && (
                                            <div className="pt-2 border-t border-zinc-800/50">
                                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Associated Issues</p>
                                              <div className="flex flex-wrap gap-2">
                                                {parseIssueNumbers(commit.commit.message).map(num => (
                                                  <button 
                                                    key={num} 
                                                    onClick={() => {
                                                      setActiveTab('issues');
                                                      setIssueSearchQuery(`#${num}`);
                                                      setSelectedMilestone('all');
                                                    }}
                                                    className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                                                  >
                                                    <AlertCircle size={10} />
                                                    #{num}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          <a 
                                            href={commit.html_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors pt-2"
                                          >
                                            <ExternalLink size={12} />
                                            View on GitHub
                                          </a>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {activeTab === 'issues' && (
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-zinc-800/20 rounded-xl border border-zinc-800">
                              <div className="flex-1 min-w-[200px] relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                <input 
                                  type="text"
                                  value={issueSearchQuery}
                                  onChange={(e) => setIssueSearchQuery(e.target.value)}
                                  placeholder="Search issues by title or #number..."
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">State:</span>
                                <select 
                                  value={issueStateFilter}
                                  onChange={(e) => setIssueStateFilter(e.target.value as any)}
                                  className="bg-zinc-900 border border-zinc-800 rounded-lg text-xs py-1 px-2 focus:outline-none focus:ring-1 focus:ring-white/20"
                                >
                                  <option value="all">All</option>
                                  <option value="open">Open</option>
                                  <option value="closed">Closed</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Sprint:</span>
                                <select 
                                  value={selectedMilestone}
                                  onChange={(e) => setSelectedMilestone(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                  className="bg-zinc-900 border border-zinc-800 rounded-lg text-xs py-1 px-2 focus:outline-none focus:ring-1 focus:ring-white/20"
                                >
                                  <option value="all">All Sprints</option>
                                  {milestones.map(m => (
                                    <option key={m.id} value={m.number}>{m.title}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Sort:</span>
                                <select 
                                  value={issueSort}
                                  onChange={(e) => setIssueSort(e.target.value as any)}
                                  className="bg-zinc-900 border border-zinc-800 rounded-lg text-xs py-1 px-2 focus:outline-none focus:ring-1 focus:ring-white/20"
                                >
                                  <option value="created">Created</option>
                                  <option value="updated">Updated</option>
                                  <option value="comments">Comments</option>
                                </select>
                              </div>
                            </div>
                            {issues
                              .filter(issue => {
                                const query = issueSearchQuery.toLowerCase().trim();
                                if (!query) return true;
                                if (query.startsWith('#')) {
                                  return issue.number.toString() === query.substring(1);
                                }
                                return issue.title.toLowerCase().includes(query) || issue.number.toString().includes(query);
                              })
                              .map(issue => (
                              <div key={issue.id} className="p-4 bg-zinc-800/30 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all group">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex gap-3">
                                    {issue.state === 'open' ? (
                                      <AlertCircle className="text-emerald-500 mt-1 shrink-0" size={18} />
                                    ) : (
                                      <CheckCircle2 className="text-zinc-500 mt-1 shrink-0" size={18} />
                                    )}
                                    <div>
                                      <h4 className="font-bold text-zinc-200 group-hover:text-white transition-colors">
                                        {issue.title}
                                        <span className="ml-2 text-zinc-500 font-normal">#{issue.number}</span>
                                      </h4>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {issue.milestone && (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1">
                                            <Layers size={10} />
                                            {issue.milestone.title}
                                          </span>
                                        )}
                                        {issue.labels.map(label => {
                                          const isPriority = label.name.startsWith('priority:');
                                          const priorityColor = label.name.includes('high') ? 'text-red-400' : label.name.includes('medium') ? 'text-amber-400' : 'text-zinc-400';
                                          
                                          return (
                                            <span 
                                              key={label.name}
                                              className={cn(
                                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                                isPriority ? `${priorityColor} bg-zinc-900 border border-zinc-800` : ""
                                              )}
                                              style={!isPriority ? { backgroundColor: `#${label.color}33`, color: `#${label.color}`, border: `1px solid #${label.color}66` } : {}}
                                            >
                                              {label.name}
                                            </span>
                                          );
                                        })}
                                      </div>
                                      <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-bold text-zinc-600 uppercase">Sprint:</span>
                                          <select 
                                            value={issue.milestone?.number || ''}
                                            onChange={(e) => handleUpdateIssueMilestone(issue.number, e.target.value ? Number(e.target.value) : null)}
                                            className="bg-transparent border-none text-[10px] font-bold text-zinc-400 focus:ring-0 p-0 cursor-pointer hover:text-white transition-colors"
                                          >
                                            <option value="">None</option>
                                            {milestones.filter(m => m.state === 'open').map(m => (
                                              <option key={m.id} value={m.number}>{m.title}</option>
                                            ))}
                                          </select>
                                        </div>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                          <User size={12} />
                                          {issue.user.login}
                                        </span>
                                        <span>•</span>
                                        <span>Opened {format(new Date(issue.created_at), 'MMM d, yyyy')}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <button className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-500 hover:text-white transition-colors">
                                    <ChevronRight size={18} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {issues.length === 0 && (
                              <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                                <CheckCircle2 size={48} className="mb-4 opacity-20" />
                                <p>No issues found in this repository.</p>
                              </div>
                            )}
                          </div>
                        )}

                        {activeTab === 'sprints' && (
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-4">
                              {milestones.map(milestone => {
                                const total = milestone.open_issues + milestone.closed_issues;
                                const progress = total > 0 ? (milestone.closed_issues / total) * 100 : 0;
                                
                                return (
                                  <div key={milestone.id} className="p-6 bg-zinc-800/30 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                          <h4 className="font-bold text-zinc-200">{milestone.title}</h4>
                                          <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                            milestone.state === 'open' ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-500/10 text-zinc-500"
                                          )}>
                                            {milestone.state}
                                          </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 text-xs text-zinc-500 mb-4">
                                          <span className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            Due {milestone.due_on ? format(new Date(milestone.due_on), 'MMM d, yyyy') : 'No due date'}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <AlertCircle size={12} />
                                            {milestone.open_issues} Open / {milestone.closed_issues} Closed
                                          </span>
                                        </div>

                                        <div className="space-y-2">
                                          <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                            <span>Progress</span>
                                            <span>{Math.round(progress)}%</span>
                                          </div>
                                          <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                                            <motion.div 
                                              initial={{ width: 0 }}
                                              animate={{ width: `${progress}%` }}
                                              className="h-full bg-emerald-500"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="flex gap-2">
                                        <button 
                                          onClick={() => {
                                            if (expandedMilestoneId === milestone.id) {
                                              setExpandedMilestoneId(null);
                                            } else {
                                              setExpandedMilestoneId(milestone.id);
                                              fetchMilestoneIssues(milestone.number);
                                            }
                                          }}
                                          className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-500 hover:text-white transition-colors"
                                          title="View Burndown Chart"
                                        >
                                          {expandedMilestoneId === milestone.id ? <ChevronUp size={18} /> : <TrendingDown size={18} />}
                                        </button>
                                        <button 
                                          onClick={() => {
                                            setEditingMilestoneId(milestone.id);
                                            setEditingGoals(milestone.description || '');
                                            setEditingTitle(milestone.title);
                                          }}
                                          className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-500 hover:text-white transition-colors"
                                        >
                                          <Edit2 size={18} />
                                        </button>
                                      </div>
                                    </div>

                                    <AnimatePresence>
                                      {expandedMilestoneId === milestone.id && (
                                        <motion.div
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: 'auto' }}
                                          exit={{ opacity: 0, height: 0 }}
                                          className="mt-6 pt-6 border-t border-zinc-800"
                                        >
                                          <div className="space-y-4">
                                            <div>
                                              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <TrendingDown size={12} />
                                                Sprint Burndown
                                              </p>
                                              <BurndownChart 
                                                milestone={milestone} 
                                                issues={milestoneIssues[milestone.number] || []} 
                                              />
                                            </div>
                                            
                                            {editingMilestoneId === milestone.id ? (
                                              <div className="space-y-4 p-4 bg-zinc-950/50 rounded-xl border border-zinc-700">
                                                <div className="space-y-2">
                                                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Sprint Title</label>
                                                  <input 
                                                    type="text"
                                                    value={editingTitle}
                                                    onChange={(e) => setEditingTitle(e.target.value)}
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
                                                    placeholder="Sprint title"
                                                  />
                                                </div>
                                                <div className="space-y-2">
                                                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Sprint Goals / Description</label>
                                                  <textarea 
                                                    value={editingGoals}
                                                    onChange={(e) => setEditingGoals(e.target.value)}
                                                    rows={4}
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
                                                    placeholder="Enter sprint goals..."
                                                  />
                                                </div>
                                                <div className="flex gap-2">
                                                  <button 
                                                    onClick={() => handleUpdateMilestone(milestone.number, editingTitle, editingGoals)}
                                                    disabled={isUpdatingMilestone}
                                                    className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
                                                  >
                                                    {isUpdatingMilestone ? "Saving..." : "Save Changes"}
                                                  </button>
                                                  <button 
                                                    onClick={() => setEditingMilestoneId(null)}
                                                    className="px-3 py-1.5 bg-zinc-800 text-white text-xs font-bold rounded-lg hover:bg-zinc-700 transition-colors"
                                                  >
                                                    Cancel
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              milestone.description && (
                                                <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                                                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                    <Target size={12} />
                                                    Sprint Goals
                                                  </p>
                                                  <div className="text-sm text-zinc-300 prose prose-invert max-w-none">
                                                    <Markdown>{milestone.description}</Markdown>
                                                  </div>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>

                                    <div className="mt-4 pt-4 border-t border-zinc-800/50">
                                      <button 
                                        onClick={() => {
                                          setSelectedMilestone(milestone.number);
                                          setActiveTab('issues');
                                        }}
                                        className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                                      >
                                        View Issues <ChevronRight size={12} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                              {milestones.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                                  <Layers size={48} className="mb-4 opacity-20" />
                                  <p>No sprints planned yet.</p>
                                  <button 
                                    onClick={() => setIsCreateSprintModalOpen(true)}
                                    className="mt-4 text-sm text-white underline"
                                  >
                                    Create your first sprint
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {activeTab === 'pulls' && (
                          <div className="space-y-6">
                            {pulls.map(pr => (
                              <div key={pr.id} className="p-4 bg-zinc-800/30 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex gap-3">
                                    <div className="mt-1">
                                      <GitBranch className={cn(
                                        pr.state === 'open' ? "text-emerald-500" : "text-purple-500"
                                      )} size={18} />
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-zinc-200">
                                        {pr.title}
                                        <span className="ml-2 text-zinc-500 font-normal">#{pr.number}</span>
                                      </h4>
                                      <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                                        <span className="flex items-center gap-1">
                                          <User size={12} />
                                          {pr.user.login}
                                        </span>
                                        <span>•</span>
                                        <span>Opened {format(new Date(pr.created_at), 'MMM d, yyyy')}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      if (expandedPrId === pr.id) {
                                        setExpandedPrId(null);
                                      } else {
                                        setExpandedPrId(pr.id);
                                        fetchPRComments(pr.number);
                                      }
                                    }}
                                    className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-500 hover:text-white transition-colors"
                                  >
                                    {expandedPrId === pr.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                  </button>
                                </div>

                                <AnimatePresence>
                                  {expandedPrId === pr.id && (
                                    <motion.div 
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className="mt-4 overflow-hidden"
                                    >
                                      <div className="space-y-4 pt-4 border-t border-zinc-800">
                                        <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Description</p>
                                          <div className="text-sm text-zinc-300 prose prose-invert max-w-none">
                                            <Markdown>{pr.body || "No description provided."}</Markdown>
                                          </div>
                                        </div>

                                        <div className="space-y-3">
                                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                            <Search size={12} />
                                            Review Comments (Coderabbit)
                                          </p>
                                          {prComments[pr.number]?.length > 0 ? (
                                            <div className="space-y-3">
                                              {prComments[pr.number].map(comment => (
                                                <div key={comment.id} className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50 text-sm">
                                                  <div className="flex items-center gap-2 mb-2">
                                                    <img src={comment.user.avatar_url} className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
                                                    <span className="font-bold text-zinc-300">{comment.user.login}</span>
                                                    <span className="text-[10px] text-zinc-500">{format(new Date(comment.created_at), 'MMM d, HH:mm')}</span>
                                                  </div>
                                                  {comment.path && (
                                                    <div className="text-[10px] font-mono text-zinc-500 mb-1 bg-zinc-950 px-1.5 py-0.5 rounded inline-block">
                                                      {comment.path}:{comment.line}
                                                    </div>
                                                  )}
                                                  <div className="text-zinc-400 prose prose-invert max-w-none text-xs">
                                                    <Markdown>{comment.body}</Markdown>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-xs text-zinc-600 italic">No review comments found.</p>
                                          )}
                                        </div>

                                        <a 
                                          href={pr.html_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                                        >
                                          <ExternalLink size={12} />
                                          View Pull Request on GitHub
                                        </a>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            ))}
                            {pulls.length === 0 && (
                              <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                                <GitBranch size={48} className="mb-4 opacity-20" />
                                <p>No pull requests found.</p>
                              </div>
                            )}
                          </div>
                        )}

                        {activeTab === 'docs' && (
                          <div className="space-y-6">
                            {!selectedDoc ? (
                              <>
                                <div className="relative mb-6">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                  <input 
                                    type="text" 
                                    placeholder="Search documentation..."
                                    value={docSearchQuery}
                                    onChange={(e) => setDocSearchQuery(e.target.value)}
                                    className="bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 w-full focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm"
                                  />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {filteredDocs.map(file => (
                                    <div 
                                      key={file.path}
                                      onClick={() => file.type === 'file' && fetchDocContent(file.path)}
                                      className={cn(
                                        "p-4 bg-zinc-800/30 border border-zinc-800 rounded-xl hover:border-zinc-600 transition-all cursor-pointer flex flex-col gap-3 group",
                                        file.type === 'dir' && "opacity-60"
                                      )}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-zinc-800 rounded-lg group-hover:bg-zinc-700 transition-colors">
                                          {file.type === 'dir' ? <BookOpen size={18} /> : <FileText size={18} />}
                                        </div>
                                        <div className="flex-1 truncate">
                                          <p className="font-medium text-sm truncate">{file.name}</p>
                                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{file.type}</p>
                                        </div>
                                      </div>
                                      {file.name.toLowerCase().endsWith('.md') && docPreviews[file.path] && (
                                        <div className="text-[11px] text-zinc-500 line-clamp-2 bg-zinc-950/30 p-2 rounded-lg border border-zinc-800/50">
                                          {docPreviews[file.path]}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <div className="space-y-4">
                                <button 
                                  onClick={() => setSelectedDoc(null)}
                                  className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
                                >
                                  <ArrowLeft size={14} />
                                  Back to Documentation
                                </button>
                                <div className="prose prose-invert max-w-none bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800 overflow-x-auto">
                                  <Markdown 
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      code({ node, inline, className, children, ...props }: any) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        const content = String(children).replace(/\n$/, '');
                                        
                                        if (!inline && match && match[1] === 'mermaid') {
                                          return <Mermaid chart={content} />;
                                        }
                                        
                                        return (
                                          <code className={cn(className, "bg-zinc-800 px-1 rounded")} {...props}>
                                            {children}
                                          </code>
                                        );
                                      }
                                    }}
                                  >
                                    {selectedDoc}
                                  </Markdown>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {activeTab === 'settings' && (
                          <div className="space-y-8">
                            {user && (
                              <div className="space-y-4">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                  <User className="text-zinc-400" size={24} />
                                  GitHub Profile
                                </h3>
                                <div className="bg-zinc-800/30 border border-zinc-800 rounded-2xl p-6">
                                  <div className="flex items-center gap-6">
                                    <img 
                                      src={user.avatar_url} 
                                      alt={user.login}
                                      className="w-20 h-20 rounded-full border-4 border-zinc-900 shadow-xl"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="space-y-1">
                                      <h4 className="text-2xl font-bold text-white">{user.name || user.login}</h4>
                                      <p className="text-zinc-400 flex items-center gap-2">
                                        <Github size={16} />
                                        @{user.login}
                                      </p>
                                      <div className="flex gap-4 pt-2">
                                        <div className="text-center px-3 py-1 bg-zinc-900 rounded-lg border border-zinc-800">
                                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Public Repos</p>
                                          <p className="text-lg font-bold text-zinc-200">{user.public_repos}</p>
                                        </div>
                                        <div className="text-center px-3 py-1 bg-zinc-900 rounded-lg border border-zinc-800">
                                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Followers</p>
                                          <p className="text-lg font-bold text-zinc-200">{user.followers}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="space-y-4">
                              <h3 className="text-xl font-bold flex items-center gap-2">
                                <Mail className="text-zinc-400" size={24} />
                                Email Notifications
                              </h3>
                              <p className="text-zinc-400 text-sm max-w-2xl">
                                Configure email notifications to alert team members when they are assigned to new issues, tasks, or stories. 
                                This requires SMTP configuration on the server.
                              </p>
                              
                              <div className="bg-zinc-800/30 border border-zinc-800 rounded-2xl p-6 space-y-6">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-zinc-200">Configuration Status</h4>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className={cn(
                                      "w-2 h-2 rounded-full",
                                      !smtpStatus.checked ? "bg-zinc-600 animate-pulse" : 
                                      smtpStatus.configured ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-red-500"
                                    )} />
                                    <span className="text-xs text-zinc-400">{smtpStatus.message}</span>
                                  </div>
                                </div>

                                <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800 space-y-3">
                                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Setup Instructions</h4>
                                  <div className="text-xs text-zinc-400 space-y-2">
                                    <p>To enable emails, you must set the following environment variables in your platform settings:</p>
                                    <ul className="list-disc list-inside space-y-1 ml-2">
                                      <li><code className="text-zinc-200">SMTP_HOST</code>: Your SMTP server (e.g., smtp.gmail.com)</li>
                                      <li><code className="text-zinc-200">SMTP_PORT</code>: Port (usually 587 or 465)</li>
                                      <li><code className="text-zinc-200">SMTP_USER</code>: Your email address</li>
                                      <li><code className="text-zinc-200">SMTP_PASS</code>: Your app password or credentials</li>
                                      <li><code className="text-zinc-200">SMTP_SECURE</code>: "true" for port 465, "false" for 587</li>
                                    </ul>
                                    <p className="pt-2 text-zinc-500 italic">Note: If using Gmail, you must use an "App Password" rather than your regular account password.</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Create Issue Modal */}
      <AnimatePresence>
        {isCreateIssueModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateIssueModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-xl font-bold">Create New Issue</h3>
                <button 
                  onClick={() => setIsCreateIssueModalOpen(false)}
                  className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
                >
                  <LogOut size={18} className="rotate-180" />
                </button>
              </div>
              <form onSubmit={handleCreateIssue} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Title</label>
                  <input 
                    type="text" 
                    required
                    value={newIssueTitle}
                    onChange={(e) => setNewIssueTitle(e.target.value)}
                    placeholder="Issue title"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Type</label>
                    <select 
                      value={newIssueType}
                      onChange={(e) => setNewIssueType(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                      <option value="task">Task</option>
                      <option value="story">Story</option>
                      <option value="bug">Bug</option>
                      <option value="improvement">Improvement</option>
                      <option value="config">Config</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Priority</label>
                    <select 
                      value={newIssuePriority}
                      onChange={(e) => setNewIssuePriority(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Assignee Email (for notifications)</label>
                  <input 
                    type="email" 
                    value={assigneeEmail}
                    onChange={(e) => setAssigneeEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Assign to Sprint</label>
                  <select 
                    value={newIssueMilestone || ''}
                    onChange={(e) => setNewIssueMilestone(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    <option value="">No Sprint</option>
                    {milestones.filter(m => m.state === 'open').map(m => (
                      <option key={m.id} value={m.number}>{m.title}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Description</label>
                  <textarea 
                    rows={4}
                    value={newIssueBody}
                    onChange={(e) => setNewIssueBody(e.target.value)}
                    placeholder="Describe the task or story..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsCreateIssueModalOpen(false)}
                    className="flex-1 py-3 px-4 rounded-xl font-semibold text-zinc-400 hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isCreatingIssue}
                    className="flex-1 py-3 px-4 rounded-xl font-semibold bg-white text-black hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isCreatingIssue ? (
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        <Plus size={18} />
                        Create Issue
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Branch Modal */}
      <AnimatePresence>
        {isCreateBranchModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateBranchModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-xl font-bold">Create New Branch</h3>
                <button 
                  onClick={() => setIsCreateBranchModalOpen(false)}
                  className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
                >
                  <LogOut size={18} className="rotate-180" />
                </button>
              </div>
              <form onSubmit={handleCreateBranch} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Branch Name</label>
                  <input 
                    type="text" 
                    required
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="feature/new-task"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Base Branch</label>
                  <select 
                    value={baseBranchName}
                    onChange={(e) => setBaseBranchName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                  >
                    {branches.map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsCreateBranchModalOpen(false)}
                    className="flex-1 py-3 px-4 rounded-xl font-semibold text-zinc-400 hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isCreatingBranch}
                    className="flex-1 py-3 px-4 rounded-xl font-semibold bg-white text-black hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isCreatingBranch ? (
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        <GitBranch size={18} />
                        Create Branch
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Sprint Modal */}
      <AnimatePresence>
        {isCreateSprintModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateSprintModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-xl font-bold">Plan New Sprint</h3>
                <button 
                  onClick={() => setIsCreateSprintModalOpen(false)}
                  className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
                >
                  <LogOut size={18} className="rotate-180" />
                </button>
              </div>
              <form onSubmit={handleCreateSprint} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Sprint Title</label>
                  <input 
                    type="text" 
                    required
                    value={newSprintTitle}
                    onChange={(e) => setNewSprintTitle(e.target.value)}
                    placeholder="Sprint 1: Initial Setup"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Description</label>
                  <textarea 
                    rows={3}
                    value={newSprintDescription}
                    onChange={(e) => setNewSprintDescription(e.target.value)}
                    placeholder="What are the goals for this sprint?"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Due Date</label>
                  <input 
                    type="date" 
                    value={newSprintDueDate}
                    onChange={(e) => setNewSprintDueDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsCreateSprintModalOpen(false)}
                    className="flex-1 py-3 px-4 rounded-xl font-semibold text-zinc-400 hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isCreatingSprint}
                    className="flex-1 py-3 px-4 rounded-xl font-semibold bg-white text-black hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isCreatingSprint ? (
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        <Layers size={18} />
                        Plan Sprint
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
