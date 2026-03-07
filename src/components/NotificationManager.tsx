import React, { useEffect, useRef } from 'react';
import { githubService, User } from '../services/githubService';
import axios from 'axios';

interface NotificationManagerProps {
  token: string | null;
  user: User | null;
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({ token, user }) => {
  const lastCheckedRef = useRef<string>(localStorage.getItem('last_notification_check') || new Date().toISOString());
  const processedNotificationsRef = useRef<Set<string>>(new Set(JSON.parse(localStorage.getItem('processed_notifications') || '[]')));

  useEffect(() => {
    if (!token || !user || !user.email) return;

    const checkNotifications = async () => {
      try {
        // Only proceed if notifications are enabled in settings
        const settings = JSON.parse(localStorage.getItem('notification_settings') || '{"issue_activity": true, "pr_merged": true, "issue_assigned": true}');
        
        const notifications = await githubService.getNotifications(token);
        let hasNew = false;

        for (const notification of notifications) {
          // Skip if already processed
          if (processedNotificationsRef.current.has(notification.id)) continue;
          
          // Skip if older than our last check (unless it's the first run)
          const updatedAt = new Date(notification.updated_at);
          const lastChecked = new Date(lastCheckedRef.current);
          if (updatedAt <= lastChecked && processedNotificationsRef.current.size > 0) continue;

          const reason = notification.reason;
          const type = notification.subject.type; // 'Issue' or 'PullRequest'
          const title = notification.subject.title;
          // Convert API URL to HTML URL
          const url = notification.subject.url
            .replace('api.github.com/repos', 'github.com')
            .replace('/pulls/', '/pull/')
            .replace('/issues/', '/issues/');
          const repoName = notification.repository.full_name;

          let notificationType = '';
          
          // 1. Someone works on an issue you watch/assigned to
          if (type === 'Issue' && settings.issue_activity) {
            if (reason === 'comment' || reason === 'state_change' || reason === 'mention' || reason === 'subscribed' || reason === 'assign') {
              notificationType = 'issue_activity';
            }
          }
          
          // 2. PR merge happened that you raised
          if (type === 'PullRequest' && settings.pr_merged) {
            // GitHub reason 'author' means you are the author
            // If the state changed, it might be a merge
            if (reason === 'author' || reason === 'state_change') {
              notificationType = 'pr_merged';
            }
          }

          // 3. Assigned to you
          if (reason === 'assign' && settings.issue_assigned) {
            notificationType = 'issue_assigned';
          }

          if (notificationType) {
            try {
              await axios.post('/api/notify/event', {
                email: user.email,
                type: notificationType,
                data: {
                  title,
                  url,
                  repoName
                }
              });
              processedNotificationsRef.current.add(notification.id);
              hasNew = true;
            } catch (err) {
              console.error('Failed to send email notification:', err);
            }
          }
        }
        
        if (hasNew || processedNotificationsRef.current.size > 100) {
          // Keep the set size reasonable
          const recentIds = Array.from(processedNotificationsRef.current).slice(-100);
          localStorage.setItem('processed_notifications', JSON.stringify(recentIds));
        }
        
        lastCheckedRef.current = new Date().toISOString();
        localStorage.setItem('last_notification_check', lastCheckedRef.current);
      } catch (error) {
        console.error('Failed to check notifications:', error);
      }
    };

    // Initial check after a short delay to let the app settle
    const initialTimeout = setTimeout(checkNotifications, 5000);

    // Poll every 2 minutes
    const interval = setInterval(checkNotifications, 2 * 60 * 1000);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [token, user]);

  return null;
};
