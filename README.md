# ZenHub Pull Request Tracker

A comprehensive pull request tracking dashboard that integrates with ZenHub and GitHub to provide real-time monitoring of pull requests, their merge status, and project pipeline information.

## 🚀 Features

- **Real-time Dashboard**: Track all pull requests across multiple repositories
- **ZenHub Integration**: Sync with ZenHub pipelines, estimates, sprints, and labels (GraphQL API)
- **Advanced Statistics**: View merge rates, average merge times, and project metrics
- **Webhook Support**: Real-time updates via GitHub webhooks
- **GitHub Actions**: Automated tracking and pipeline updates
- **Smart Filtering**: Filter by status, author, repository, and search functionality
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Merge Status Tracking**: Detailed tracking of merged vs. non-merged pull requests

## 📋 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp env.example .env
   # Edit .env with your tokens and configuration
   ```

3. **Start the Server**
   ```bash
   npm start
   ```

4. **Access Dashboard**
   Open `http://localhost:3000` in your browser

## 🔧 Configuration

### Required Setup

1. **GitHub Personal Access Token**
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Generate token with `repo`, `read:org`, and `read:user` scopes

2. **Repository Configuration**
   - Add your repositories in the dashboard settings
   - Format: `repo1,repo2,repo3`

### Optional Setup

1. **ZenHub Integration**
   - Get Personal API Key from ZenHub Dashboard (GraphQL API)
   - Use helper script to get workspace ID: `node get-workspace-id.js <your_token>`

2. **GitHub Actions**
   - Add repository secrets: `GITHUB_TOKEN`, `ZENHUB_TOKEN`, `ZENHUB_WORKSPACE_ID`, `TRACKER_WEBHOOK_URL`
   - The workflow will automatically track PR events

## 📊 Dashboard Features

### Statistics Overview
- **Total PRs**: Complete count of tracked pull requests
- **Merged**: Successfully merged pull requests with merge rate
- **Open**: Currently open pull requests
- **Closed**: Closed but not merged pull requests

### Advanced Filtering
- Filter by PR status (Open, Merged, Closed, Draft)
- Filter by author
- Filter by repository
- Search functionality across titles and descriptions

### Detailed PR Information
- PR number with direct GitHub links
- Author information with avatars
- Repository badges
- Status indicators with color coding
- ZenHub pipeline and estimate information
- Creation and update timestamps

## 🔄 GitHub Actions Integration

The included GitHub Action (`.github/workflows/pr-tracker.yml`) provides:

- **Automatic PR Tracking**: Monitors opened, closed, and merged PRs
- **Pipeline Updates**: Automatically updates ZenHub pipelines based on PR status
- **Webhook Notifications**: Sends real-time updates to your webhook server
- **Scheduled Updates**: Hourly checks for PR status changes
- **Manual Triggers**: On-demand tracking for specific repositories

## 🌐 API Endpoints

- `GET /api/prs` - Get filtered pull request data
- `GET /api/statistics` - Get project statistics
- `GET /api/filters` - Get available filter options
- `POST /webhook` - Receive GitHub/ZenHub webhook events

## 📱 Webhook Server

The webhook server (`webhook-server.js`) provides:

- Real-time event processing
- Data persistence in JSON format
- REST API for dashboard consumption
- Static file serving for the dashboard

## 🛠️ Development

### Local Development
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Production Deployment
```bash
NODE_ENV=production npm start
```

## 📚 Documentation

For detailed setup instructions, see [SETUP.md](SETUP.md)

## ⚠️ Important Notes

1. **ZenHub GraphQL API**: This implementation uses ZenHub's modern GraphQL API as recommended in their [official documentation](https://developers.zenhub.com/graphql-api-docs/getting-started/index.html).

2. **Rate Limits**: GitHub API has rate limits. Use appropriate tokens and consider implementing caching for large repositories.

3. **Security**: In production, use HTTPS, implement authentication, and validate webhook signatures.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the [SETUP.md](SETUP.md) troubleshooting section
2. Review GitHub issues
3. Create a new issue with detailed information

---

**Note**: This project uses ZenHub's modern GraphQL API to provide comprehensive pull request tracking with real-time pipeline updates, estimates, sprints, and labels integration.
