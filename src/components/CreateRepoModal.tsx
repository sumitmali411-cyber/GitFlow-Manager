import React, { useState } from 'react';
import { X, FolderPlus, Shield, Globe, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface CreateRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; description: string; private: boolean }) => Promise<void>;
}

export const CreateRepoModal: React.FC<CreateRepoModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await onCreate({ name, description, private: isPrivate });
      onClose();
      setName('');
      setDescription('');
      setIsPrivate(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create repository');
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
                <div className="p-2 bg-brand/10 text-brand rounded-lg">
                  <FolderPlus size={20} />
                </div>
                <h2 className="text-xl font-bold">Create New Repository</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-app-card-hover rounded-full transition-colors text-app-text-muted hover:text-app-text"
              >
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
                <label className="text-sm font-bold text-app-text-muted uppercase tracking-wider">Repository Name</label>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. my-awesome-project"
                  className="w-full bg-app-card border border-app-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-app-text-muted uppercase tracking-wider">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this project about?"
                  className="w-full bg-app-card border border-app-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all min-h-[100px] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all text-center",
                    !isPrivate 
                      ? "bg-brand/5 border-brand text-brand" 
                      : "bg-app-card/50 border-app-border text-app-text-muted hover:border-app-border-hover"
                  )}
                >
                  <Globe size={24} />
                  <div className="space-y-1">
                    <p className="text-sm font-bold">Public</p>
                    <p className="text-[10px] opacity-70">Anyone can see this repo</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all text-center",
                    isPrivate 
                      ? "bg-brand/5 border-brand text-brand" 
                      : "bg-app-card/50 border-app-border text-app-text-muted hover:border-app-border-hover"
                  )}
                >
                  <Shield size={24} />
                  <div className="space-y-1">
                    <p className="text-sm font-bold">Private</p>
                    <p className="text-[10px] opacity-70">Only you can see this repo</p>
                  </div>
                </button>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 rounded-xl text-sm font-bold text-app-text-muted hover:bg-app-card-hover transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex-1 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Repository'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
