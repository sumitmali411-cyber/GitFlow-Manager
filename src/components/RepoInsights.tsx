import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Repo, Commit, Issue, Milestone } from '../services/githubService';

interface RepoInsightsProps {
  repo: Repo;
  commits: Commit[];
  issues: Issue[];
  milestones: Milestone[];
}

export const RepoInsights: React.FC<RepoInsightsProps> = ({ repo, commits, issues, milestones }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const prompt = `
        Analyze the following GitHub repository data and provide a concise summary (max 150 words).
        Include:
        1. A summary of recent activity based on the last 5 commits.
        2. Identification of any stale issues (issues older than 7 days with no recent updates).
        3. Priority suggestions for the current milestones.
        
        Repo: ${repo.full_name}
        Description: ${repo.description}
        
        Recent Commits:
        ${commits.slice(0, 5).map(c => `- ${c.commit.message} by ${c.author?.login}`).join('\n')}
        
        Open Issues:
        ${issues.filter(i => i.state === 'open').slice(0, 5).map(i => `- #${i.number}: ${i.title} (created ${i.created_at})`).join('\n')}
        
        Milestones:
        ${milestones.filter(m => m.state === 'open').map(m => `- ${m.title}: ${m.open_issues} open, ${m.closed_issues} closed, due ${m.due_on}`).join('\n')}
        
        Format the output as a clean markdown summary with sections.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: [{ parts: [{ text: prompt }] }],
      });

      setInsight(response.text || "Unable to generate insights at this time.");
    } catch (error) {
      console.error('Failed to generate insights:', error);
      setInsight("Failed to load AI insights. Please check your configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (commits.length > 0) {
      generateInsights();
    }
  }, [repo.full_name, commits.length]);

  return (
    <div className="card-base p-6 space-y-4 border-brand/20 bg-brand/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-brand">
          <Sparkles size={20} />
          <h2 className="font-bold">AI Repository Insights</h2>
        </div>
        {loading && <Loader2 size={16} className="animate-spin text-brand" />}
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-brand/10 rounded w-3/4" />
          <div className="h-4 bg-brand/10 rounded w-1/2" />
          <div className="h-4 bg-brand/10 rounded w-2/3" />
        </div>
      ) : insight ? (
        <div className="text-sm text-app-text-dim leading-relaxed prose prose-invert prose-sm max-w-none">
          {insight.split('\n').map((line, i) => (
            <p key={i} className={line.startsWith('#') ? 'font-bold text-app-text mt-2' : ''}>
              {line}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-app-text-muted italic">No insights available yet.</p>
      )}
    </div>
  );
};
