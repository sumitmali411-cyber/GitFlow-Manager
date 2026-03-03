import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  stats = [
    { label: 'Open PRs', value: 12, icon: 'pr' },
    { label: 'Active Branches', value: 8, icon: 'branch' },
    { label: 'Commits Today', value: 34, icon: 'commit' },
    { label: 'Releases', value: 3, icon: 'tag' }
  ];

  recentBranches = [
    { name: 'feature/oauth-integration', status: 'active', updated: '2 hours ago' },
    { name: 'fix/session-timeout', status: 'review', updated: '4 hours ago' },
    { name: 'release/v2.1.0', status: 'merged', updated: '1 day ago' },
    { name: 'hotfix/rate-limit', status: 'active', updated: '3 days ago' }
  ];
}
