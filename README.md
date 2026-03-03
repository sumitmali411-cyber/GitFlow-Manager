# GitFlow Manager — Angular

A GitHub workflow management dashboard built with **Angular 17** (standalone components).

## Features

- Dashboard with branch & PR overview
- GitHub OAuth integration (backend required)
- GitFlow branch strategy visualization

## Prerequisites

- Node.js 18+
- npm 9+

## Getting Started

```bash
npm install
npm start          # dev server → http://localhost:4200
npm run build      # production build → dist/
npm test           # unit tests via Karma
```

## Project Structure

```
src/
├── app/
│   ├── app.component.*       # Root shell component
│   ├── app.config.ts         # Application providers
│   ├── app.routes.ts         # Route definitions
│   └── dashboard/            # Dashboard feature module
├── index.html
├── main.ts
└── styles.css
```

## Branch Variants

| Branch | Docker | Kubernetes |
|--------|--------|------------|
| `claude/angular-no-docker-FyDkT`  | No | No |
| `claude/angular-docker-FyDkT`     | Yes | No |
| `claude/angular-docker-k8s-FyDkT` | Yes | Yes |
