import React from 'react';
import { 
  Search, 
  Plus, 
  FolderGit2, 
  Star, 
  GitFork, 
  AlertCircle, 
  ChevronRight,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { Repo } from '../services/githubService';
import { format } from 'date-fns';

interface RepoListProps {
  repos: Repo[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRepoSelect: (repo: Repo) => void;
  loading: boolean;
  error: string | null;
}

export const RepoList: React.FC<RepoListProps> = ({ 
  repos, 
  searchQuery, 
  onSearchChange, 
  onRepoSelect, 
  loading, 
  error 
}) => {
  const filteredRepos = repos.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
          <p className="text-zinc-500">Select a repository to manage its workflow.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
            />
          </div>
          <button className="p-3 bg-brand text-white rounded-xl shadow-lg shadow-brand/20 hover:bg-brand-hover transition-all">
            <Plus size={20} />
          </button>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-red-400/10 border border-red-400/20 rounded-xl flex items-center gap-3 text-red-400">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-zinc-900/50 rounded-2xl animate-pulse border border-zinc-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRepos.map((repo, idx) => (
            <motion.div
              key={repo.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onRepoSelect(repo)}
              className="card-base p-6 flex flex-col justify-between group cursor-pointer"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-zinc-900 rounded-xl group-hover:bg-brand group-hover:text-white transition-all">
                    <FolderGit2 size={24} />
                  </div>
                  <ChevronRight size={18} className="text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
                
                <div className="space-y-1">
                  <h3 className="font-bold text-lg truncate group-hover:text-brand transition-colors">{repo.name}</h3>
                  <p className="text-sm text-zinc-500 line-clamp-2 h-10">{repo.description || 'No description provided.'}</p>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-4 text-xs text-zinc-500 font-medium">
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-amber-400" />
                  {repo.stargazers_count}
                </div>
                <div className="flex items-center gap-1">
                  <GitFork size={14} className="text-blue-400" />
                  {repo.forks_count}
                </div>
                <div className="flex items-center gap-1">
                  <AlertCircle size={14} className="text-red-400" />
                  {repo.open_issues_count}
                </div>
                <div className="flex-1 text-right flex items-center justify-end gap-1">
                  <Clock size={12} />
                  {format(new Date(repo.updated_at), 'MMM d')}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && filteredRepos.length === 0 && (
        <div className="text-center py-20 space-y-4">
          <div className="p-6 bg-zinc-900 rounded-full w-fit mx-auto text-zinc-500">
            <Search size={48} />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold">No repositories found</h3>
            <p className="text-zinc-500">Try adjusting your search query.</p>
          </div>
        </div>
      )}
    </div>
  );
};
