# GitFlow Manager

A comprehensive GitHub workflow tool to track commits, manage issues, and view documentation with Mermaid support.

## Features

- **Dashboard**: Overview of active projects, issues, pull requests, and vulnerabilities.
- **Repository Management**: Browse and select repositories from your GitHub account.
- **Commit Tracking**: View commit history with associated issue links.
- **Issue Management**: Create, filter, and search issues.
- **Sprint Management**: Manage GitHub milestones as sprints with burndown charts.
- **Pull Request Review**: View and manage pull requests.
- **Documentation**: View markdown documentation with Mermaid diagram support.
- **Security**: Dedicated vulnerabilities section using Dependabot alerts.
- **Theming**: Support for Light, Dark, Extra Dark, and Glass themes.
- **Notifications**: Optional email notifications for issue assignments via SMTP.

## Prerequisites

- Node.js (v18 or higher)
- GitHub OAuth App (for authentication)
- SMTP Server (optional, for email notifications)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd gitflow-manager
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory and add the following:
   ```env
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   APP_URL=http://localhost:3000
   
   # Optional SMTP Configuration
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your_smtp_user
   SMTP_PASS=your_smtp_password
   SMTP_SECURE=false
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`.

## Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Runs type checking.
- `npm run clean`: Removes the `dist` directory.

## Folder Structure

- `src/components`: Reusable UI components.
- `src/services`: API service layers (e.g., GitHub API).
- `src/context`: React Context providers (e.g., Theme).
- `src/lib`: Utility functions and helpers.
- `server.ts`: Express server with GitHub OAuth and API proxying.

## License

MIT
