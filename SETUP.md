# ZenHub Pull Request Tracker - Setup Guide

This comprehensive pull request tracker integrates with ZenHub and GitHub to provide real-time tracking of pull requests, their merge status, and project pipeline information.

## Features

- 📊 **Real-time Dashboard**: Track all pull requests across multiple repositories
- 🔄 **ZenHub Integration**: Sync with ZenHub pipelines and estimates
- 📈 **Statistics**: View merge rates, average merge times, and project metrics
- 🔔 **Webhook Support**: Real-time updates via GitHub webhooks
- ⚡ **GitHub Actions**: Automated tracking and pipeline updates
- 🎯 **Filtering & Search**: Filter by status, author, repository, and more
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Node.js 16+ installed
- GitHub repository with pull requests
- ZenHub account (optional, for enhanced features)
- GitHub Personal Access Token
- ZenHub API Token (optional)

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd zenhub-pr-tracker
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
# GitHub Configuration
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_ORGANIZATION=your_organization_or_username

# ZenHub Configuration (Optional)
ZENHUB_TOKEN=your_zenhub_api_token

# Webhook Configuration
WEBHOOK_URL=http://localhost:3000/webhook
PORT=3000
```

### 3. Start the Server

```bash
npm start
```

The dashboard will be available at `http://localhost:3000`

## Detailed Setup

### GitHub Token Setup

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Click "Generate new token (classic)"
3. Select scopes:
   - `repo` (Full control of private repositories)
   - `read:org` (Read org and team membership)
   - `read:user` (Read user profile data)
4. Copy the generated token

### ZenHub Token Setup (Optional)

1. Go to your ZenHub Dashboard
2. Navigate to API Tokens section
3. Generate a new Personal API Key for the GraphQL API
4. Copy the token (it will only be shown once)

### ZenHub Workspace ID Setup

1. Use the helper script to find your workspace ID:
   ```bash
   node get-workspace-id.js zh_b38a29d900f65c1d8d79388e07fd7f52d59a48e9a1868b083b70c81039a75592
   ```
2. Copy the workspace ID from the output
3. Add it to your configuration

**Note**: This implementation uses ZenHub's modern GraphQL API as recommended in their [official documentation](https://developers.zenhub.com/graphql-api-docs/getting-started/index.html).

### Repository Configuration

In the dashboard settings, add your repositories in the format:
```
repo1,repo2,repo3
```

For example:
```
my-app,my-api,my-docs
```

## GitHub Actions Setup

### 1. Repository Secrets

Add these secrets to your GitHub repository:

- `GITHUB_TOKEN`: Your GitHub personal access token
- `ZENHUB_TOKEN`: Your ZenHub API token (optional)
- `ZENHUB_WORKSPACE_ID`: Your ZenHub workspace ID (optional)
- `TRACKER_WEBHOOK_URL`: URL to your webhook server

### 2. Workflow Configuration

The GitHub Action workflow (`.github/workflows/pr-tracker.yml`) will automatically:
- Track pull request events (opened, closed, merged)
- Update ZenHub pipelines based on PR status
- Send webhook notifications
- Run scheduled updates

### 3. Manual Triggers

You can manually trigger the workflow:
1. Go to Actions tab in your repository
2. Select "PR Tracker Automation"
3. Click "Run workflow"
4. Choose repository and options

## Webhook Configuration

### GitHub Webhooks

1. Go to your repository Settings → Webhooks
2. Click "Add webhook"
3. Set Payload URL to: `https://your-domain.com/webhook`
4. Select events:
   - Pull requests
   - Pull request reviews
   - Pushes
5. Set Content type to: `application/json`

### Webhook Server

The webhook server (`webhook-server.js`) provides:
- Real-time PR event processing
- Data persistence
- REST API endpoints
- Dashboard serving

## API Endpoints

### Get Pull Requests
```
GET /api/prs?status=open&author=username&repo=my-repo&search=feature
```

### Get Statistics
```
GET /api/statistics
```

### Get Filter Options
```
GET /api/filters
```

### Webhook Endpoint
```
POST /webhook
Content-Type: application/json

{
  "event_type": "pull_request",
  "action": "opened",
  "pr_number": 123,
  "pr_title": "Add new feature",
  "pr_state": "open",
  "author": "username",
  "repository": "my-repo",
  "organization": "my-org",
  "created_at": "2024-01-01T00:00:00Z",
  "html_url": "https://github.com/my-org/my-repo/pull/123",
  "zenhub_data": {
    "pipeline": {"name": "In Progress"},
    "estimate": {"value": 5}
  }
}
```

## Dashboard Features

### Statistics Cards
- **Total PRs**: Count of all tracked pull requests
- **Merged**: Successfully merged pull requests
- **Open**: Currently open pull requests
- **Closed**: Closed but not merged pull requests

### Filtering Options
- **Status Filter**: Open, Merged, Closed, Draft
- **Author Filter**: Filter by PR author
- **Repository Filter**: Filter by repository
- **Search**: Search in titles and descriptions

### PR Details
Click the info button on any PR to see:
- Basic information (author, dates, status)
- ZenHub data (pipeline, estimate, epic status)
- Full description
- Direct link to GitHub

## ZenHub Integration

### Pipeline Mapping

The system automatically maps PR states to ZenHub pipelines:

| PR State | ZenHub Pipeline |
|----------|----------------|
| Opened   | New Issues     |
| Merged   | Done           |
| Closed   | Closed         |

### Estimate Tracking

- Pull request estimates are displayed in the dashboard
- Estimates can be set in ZenHub and will appear in the tracker
- No estimate shows as "Not set"

## Troubleshooting

### Common Issues

1. **"No ZenHub data available"**
   - Check if ZenHub token is configured
   - Verify repository is connected to ZenHub
   - Note: ZenHub API is deprecated

2. **GitHub API rate limits**
   - Use a personal access token with appropriate scopes
   - Consider implementing caching for large repositories

3. **Webhook not receiving events**
   - Check webhook URL is accessible
   - Verify GitHub webhook configuration
   - Check server logs for errors

4. **Dashboard not loading**
   - Ensure all dependencies are installed (`npm install`)
   - Check browser console for JavaScript errors
   - Verify API endpoints are responding

### Logs and Debugging

Enable debug logging by setting:
```env
DEBUG=true
NODE_ENV=development
```

Check server logs for detailed error information.

## Production Deployment

### Environment Variables
```env
NODE_ENV=production
PORT=3000
GITHUB_TOKEN=your_production_token
ZENHUB_TOKEN=your_production_token
WEBHOOK_URL=https://your-domain.com/webhook
```

### Security Considerations
- Use HTTPS in production
- Implement authentication for the dashboard
- Validate webhook signatures
- Use environment variables for sensitive data
- Implement rate limiting

### Scaling
- Use a database instead of JSON file for large datasets
- Implement Redis for caching
- Use PM2 for process management
- Set up load balancing for high traffic

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review GitHub issues
3. Create a new issue with detailed information

## Changelog

### v1.0.0
- Initial release
- Basic PR tracking
- ZenHub integration
- GitHub Actions automation
- Webhook support
- Responsive dashboard
