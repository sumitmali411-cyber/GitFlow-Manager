import { Milestone } from '../services/githubService';

export const calculateRepoStatus = (milestones: Milestone[], openIssuesCount: number) => {
  if (milestones.length === 0) {
    if (openIssuesCount > 0) {
      return { 
        progress: 0, 
        status: { label: 'In Progress', color: 'text-blue-400', bg: 'bg-blue-400/10' } 
      };
    }
    return { 
      progress: 100, 
      status: { label: 'Healthy', color: 'text-emerald-400', bg: 'bg-emerald-400/10' } 
    };
  }

  const openMilestones = milestones.filter(m => m.state === 'open');
  if (openMilestones.length === 0) {
    return { 
      progress: 100, 
      status: { label: 'Completed', color: 'text-emerald-400', bg: 'bg-emerald-400/10' } 
    };
  }

  let totalOpen = 0;
  let totalClosed = 0;
  let isOverdue = false;
  const now = new Date();

  openMilestones.forEach(m => {
    totalOpen += m.open_issues;
    totalClosed += m.closed_issues;
    if (m.due_on && new Date(m.due_on) < now && m.open_issues > 0) {
      isOverdue = true;
    }
  });

  const total = totalOpen + totalClosed;
  const progress = total === 0 ? 0 : Math.round((totalClosed / total) * 100);

  if (isOverdue) {
    return { 
      progress, 
      status: { label: 'Delayed', color: 'text-red-400', bg: 'bg-red-400/10' } 
    };
  }
  if (progress > 0) {
    return { 
      progress, 
      status: { label: 'On Track', color: 'text-emerald-400', bg: 'bg-emerald-400/10' } 
    };
  }
  return { 
    progress, 
    status: { label: 'Planning', color: 'text-amber-400', bg: 'bg-amber-400/10' } 
  };
};
