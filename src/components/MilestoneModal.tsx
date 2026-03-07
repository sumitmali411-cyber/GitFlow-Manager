import React, { useState, useEffect } from 'react';
import { X, Target, Loader2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Milestone } from '../services/githubService';

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; due_on?: string }) => Promise<void>;
  milestone?: Milestone | null;
}

export const MilestoneModal: React.FC<MilestoneModalProps> = ({ isOpen, onClose, onSubmit, milestone }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueOn, setDueOn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (milestone) {
      setTitle(milestone.title);
      setDescription(milestone.description || '');
      setDueOn(milestone.due_on ? milestone.due_on.split('T')[0] : '');
    } else {
      setTitle('');
      setDescription('');
      setDueOn('');
    }
  }, [milestone, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await onSubmit({ 
        title, 
        description, 
        due_on: dueOn ? new Date(dueOn).toISOString() : undefined 
      });
      onClose();
      if (!milestone) {
        setTitle('');
        setDescription('');
        setDueOn('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${milestone ? 'update' : 'create'} milestone`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="card-base w-full max-w-lg overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-app-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-400/10 text-purple-400 rounded-lg">
                  <Target size={20} />
                </div>
                <h2 className="text-xl font-bold">{milestone ? 'Edit Sprint' : 'New Sprint'}</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-app-card-hover rounded-full transition-colors text-app-text-muted hover:text-app-text">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-bold text-app-text-muted uppercase tracking-wider">Title</label>
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Sprint name (e.g. Q1 Release)"
                  className="w-full bg-app-card border border-app-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-app-text-muted uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What are the goals for this sprint?"
                  className="w-full bg-app-card border border-app-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all min-h-[100px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-app-text-muted uppercase tracking-wider">Due Date (Optional)</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-app-text-muted" size={18} />
                  <input
                    type="date"
                    value={dueOn}
                    onChange={(e) => setDueOn(e.target.value)}
                    className="w-full bg-app-card border border-app-border rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 px-6 py-3 rounded-xl text-sm font-bold text-app-text-muted hover:bg-app-card-hover transition-all">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="flex-1 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : milestone ? 'Update Sprint' : 'Create Sprint'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
