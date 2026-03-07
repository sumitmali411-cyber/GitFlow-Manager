import axios from 'axios';

const API_BASE = '/api/github';

export interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  owner: { login: string; avatar_url: string };
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
  language: string;
}

export interface User {
  login: string;
  avatar_url: string;
  name: string;
  bio: string;
  email: string | null;
  public_repos: number;
  followers: number;
  following: number;
  two_factor_authentication?: boolean;
}

export interface Commit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
  };
  author: { avatar_url: string; login: string };
  html_url: string;
}

export interface Milestone {
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

export interface Issue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  user: { login: string; avatar_url: string };
  labels: { name: string; color: string }[];
  milestone: Milestone | null;
  assignee?: { login: string; avatar_url: string };
  closed_at: string | null;
  comments: number;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  user: { login: string; avatar_url: string };
  created_at: string;
  html_url: string;
  body: string;
  merged_at: string | null;
}

export interface Vulnerability {
  id: number;
  state: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  description: string;
  package_name: string;
  vulnerable_version_range: string;
  first_patched_version: string;
  html_url: string;
}

const getHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const githubService = {
  getUser: async (token: string): Promise<User> => {
    const res = await axios.get(`${API_BASE}/user`, { headers: getHeaders(token) });
    return res.data;
  },

  getRepos: async (token: string): Promise<Repo[]> => {
    const res = await axios.get(`${API_BASE}/user/repos?sort=updated&per_page=50`, { headers: getHeaders(token) });
    return res.data;
  },

  getCommits: async (token: string, fullName: string): Promise<Commit[]> => {
    const res = await axios.get(`${API_BASE}/repos/${fullName}/commits`, { headers: getHeaders(token) });
    return res.data;
  },

  getIssues: async (token: string, fullName: string, params: any = {}): Promise<Issue[]> => {
    const query = new URLSearchParams(params).toString();
    const res = await axios.get(`${API_BASE}/repos/${fullName}/issues?${query}`, { headers: getHeaders(token) });
    return res.data;
  },

  getPulls: async (token: string, fullName: string, state: string = 'all'): Promise<PullRequest[]> => {
    const res = await axios.get(`${API_BASE}/repos/${fullName}/pulls?state=${state}`, { headers: getHeaders(token) });
    return res.data;
  },

  getMilestones: async (token: string, fullName: string): Promise<Milestone[]> => {
    const res = await axios.get(`${API_BASE}/repos/${fullName}/milestones?state=all`, { headers: getHeaders(token) });
    return res.data;
  },

  getContents: async (token: string, fullName: string, path: string = ''): Promise<any[]> => {
    const res = await axios.get(`${API_BASE}/repos/${fullName}/contents/${path}`, { headers: getHeaders(token) });
    return res.data;
  },

  getFileContent: async (token: string, fullName: string, path: string): Promise<string> => {
    const res = await axios.get(`${API_BASE}/repos/${fullName}/contents/${path}`, { headers: getHeaders(token) });
    if (res.data.content) {
      return decodeBase64(res.data.content);
    }
    return '';
  },

  getVulnerabilities: async (token: string, fullName: string): Promise<Vulnerability[]> => {
    try {
      // Dependabot alerts endpoint
      const res = await axios.get(`${API_BASE}/repos/${fullName}/dependabot/alerts`, { headers: getHeaders(token) });
      return res.data;
    } catch (e) {
      console.warn('Dependabot alerts not available or no permissions. Returning empty list.');
      return [];
    }
  },

  createIssue: async (token: string, fullName: string, data: any) => {
    const res = await axios.post(`${API_BASE}/repos/${fullName}/issues`, data, { headers: getHeaders(token) });
    return res.data;
  },

  updateMilestone: async (token: string, fullName: string, number: number, data: any) => {
    const res = await axios.patch(`${API_BASE}/repos/${fullName}/milestones/${number}`, data, { headers: getHeaders(token) });
    return res.data;
  },

  createMilestone: async (token: string, fullName: string, data: any) => {
    const res = await axios.post(`${API_BASE}/repos/${fullName}/milestones`, data, { headers: getHeaders(token) });
    return res.data;
  },

  createBranch: async (token: string, fullName: string, data: any) => {
    const res = await axios.post(`${API_BASE}/repos/${fullName}/git/refs`, data, { headers: getHeaders(token) });
    return res.data;
  },

  getBranches: async (token: string, fullName: string) => {
    const res = await axios.get(`${API_BASE}/repos/${fullName}/branches`, { headers: getHeaders(token) });
    return res.data;
  },

  createRepo: async (token: string, data: { name: string; description?: string; private?: boolean }) => {
    const res = await axios.post(`${API_BASE}/user/repos`, data, { headers: getHeaders(token) });
    return res.data;
  },
  
  getNotifications: async (token: string): Promise<any[]> => {
    const res = await axios.get(`${API_BASE}/notifications`, { headers: getHeaders(token) });
    return res.data;
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
