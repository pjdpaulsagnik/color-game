// Webhook server for real-time PR updates
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

class PRWebhookServer {
    constructor(port = 3000) {
        this.app = express();
        this.port = port;
        this.dataFile = path.join(__dirname, 'pr-data.json');
        this.setupMiddleware();
        this.setupRoutes();
        this.loadData();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        
        // Logging middleware
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });

        // Webhook endpoint for GitHub/ZenHub events
        this.app.post('/webhook', async (req, res) => {
            try {
                const eventData = req.body;
                console.log('Received webhook:', JSON.stringify(eventData, null, 2));
                
                await this.processWebhookEvent(eventData);
                
                res.status(200).json({ 
                    success: true, 
                    message: 'Webhook processed successfully',
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error processing webhook:', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // API endpoint to get PR data
        this.app.get('/api/prs', async (req, res) => {
            try {
                const data = await this.loadData();
                const { status, author, repo, search } = req.query;
                
                let filteredPRs = data.pullRequests || [];
                
                // Apply filters
                if (status && status !== 'all') {
                    filteredPRs = filteredPRs.filter(pr => this.getPRStatus(pr) === status);
                }
                
                if (author && author !== 'all') {
                    filteredPRs = filteredPRs.filter(pr => pr.author === author);
                }
                
                if (repo && repo !== 'all') {
                    filteredPRs = filteredPRs.filter(pr => pr.repository === repo);
                }
                
                if (search) {
                    const searchLower = search.toLowerCase();
                    filteredPRs = filteredPRs.filter(pr => 
                        pr.pr_title.toLowerCase().includes(searchLower) ||
                        pr.author.toLowerCase().includes(searchLower)
                    );
                }
                
                res.json({
                    success: true,
                    data: {
                        pullRequests: filteredPRs,
                        statistics: this.calculateStatistics(data.pullRequests || []),
                        lastUpdated: data.lastUpdated
                    }
                });
            } catch (error) {
                console.error('Error fetching PR data:', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // API endpoint to get statistics
        this.app.get('/api/statistics', async (req, res) => {
            try {
                const data = await this.loadData();
                const statistics = this.calculateStatistics(data.pullRequests || []);
                
                res.json({
                    success: true,
                    data: statistics
                });
            } catch (error) {
                console.error('Error fetching statistics:', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // API endpoint to get unique values for filters
        this.app.get('/api/filters', async (req, res) => {
            try {
                const data = await this.loadData();
                const prs = data.pullRequests || [];
                
                const authors = [...new Set(prs.map(pr => pr.author))].sort();
                const repositories = [...new Set(prs.map(pr => pr.repository))].sort();
                const statuses = [...new Set(prs.map(pr => this.getPRStatus(pr)))].sort();
                
                res.json({
                    success: true,
                    data: {
                        authors,
                        repositories,
                        statuses
                    }
                });
            } catch (error) {
                console.error('Error fetching filter data:', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Serve static files (for the dashboard)
        this.app.use(express.static(path.join(__dirname)));

        // Catch-all route for SPA
        this.app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'pr-tracker.html'));
        });
    }

    async processWebhookEvent(eventData) {
        const data = await this.loadData();
        
        if (!data.pullRequests) {
            data.pullRequests = [];
        }

        // Process different event types
        switch (eventData.event_type) {
            case 'pull_request':
                await this.processPullRequestEvent(eventData, data);
                break;
            case 'pull_request_review':
                await this.processPullRequestReviewEvent(eventData, data);
                break;
            case 'push':
                await this.processPushEvent(eventData, data);
                break;
            case 'scheduled_update':
                await this.processScheduledUpdate(eventData, data);
                break;
            default:
                console.log(`Unhandled event type: ${eventData.event_type}`);
        }

        data.lastUpdated = new Date().toISOString();
        await this.saveData(data);
    }

    async processPullRequestEvent(eventData, data) {
        const existingPRIndex = data.pullRequests.findIndex(
            pr => pr.pr_number === eventData.pr_number && pr.repository === eventData.repository
        );

        const prData = {
            pr_number: eventData.pr_number,
            pr_title: eventData.pr_title,
            pr_state: eventData.pr_state,
            pr_merged: eventData.pr_merged,
            author: eventData.author,
            repository: eventData.repository,
            organization: eventData.organization,
            created_at: eventData.created_at,
            updated_at: eventData.updated_at,
            merged_at: eventData.merged_at,
            html_url: eventData.html_url,
            zenhub_data: eventData.zenhub_data,
            last_event: eventData.action,
            last_event_time: eventData.timestamp
        };

        if (existingPRIndex >= 0) {
            // Update existing PR
            data.pullRequests[existingPRIndex] = {
                ...data.pullRequests[existingPRIndex],
                ...prData
            };
            console.log(`Updated PR #${eventData.pr_number} in ${eventData.repository}`);
        } else {
            // Add new PR
            data.pullRequests.push(prData);
            console.log(`Added new PR #${eventData.pr_number} in ${eventData.repository}`);
        }
    }

    async processPullRequestReviewEvent(eventData, data) {
        const prIndex = data.pullRequests.findIndex(
            pr => pr.pr_number === eventData.pr_number && pr.repository === eventData.repository
        );

        if (prIndex >= 0) {
            if (!data.pullRequests[prIndex].reviews) {
                data.pullRequests[prIndex].reviews = [];
            }

            data.pullRequests[prIndex].reviews.push({
                reviewer: eventData.reviewer,
                state: eventData.review_state,
                body: eventData.review_body,
                timestamp: eventData.timestamp
            });

            data.pullRequests[prIndex].last_review_time = eventData.timestamp;
            console.log(`Added review for PR #${eventData.pr_number}`);
        }
    }

    async processPushEvent(eventData, data) {
        const prIndex = data.pullRequests.findIndex(
            pr => pr.pr_number === eventData.pr_number && pr.repository === eventData.repository
        );

        if (prIndex >= 0) {
            if (!data.pullRequests[prIndex].commits) {
                data.pullRequests[prIndex].commits = [];
            }

            data.pullRequests[prIndex].commits.push({
                sha: eventData.commit_sha,
                message: eventData.commit_message,
                author: eventData.author,
                timestamp: eventData.timestamp
            });

            data.pullRequests[prIndex].last_commit_time = eventData.timestamp;
            console.log(`Added commit for PR #${eventData.pr_number}`);
        }
    }

    async processScheduledUpdate(eventData, data) {
        await this.processPullRequestEvent(eventData, data);
    }

    calculateStatistics(prs) {
        const total = prs.length;
        const merged = prs.filter(pr => pr.pr_merged).length;
        const open = prs.filter(pr => pr.pr_state === 'open').length;
        const closed = prs.filter(pr => pr.pr_state === 'closed' && !pr.pr_merged).length;

        // Calculate average time to merge
        const mergedPRs = prs.filter(pr => pr.pr_merged && pr.created_at && pr.merged_at);
        const avgMergeTime = mergedPRs.length > 0 
            ? mergedPRs.reduce((sum, pr) => {
                const created = new Date(pr.created_at);
                const merged = new Date(pr.merged_at);
                return sum + (merged - created);
              }, 0) / mergedPRs.length / (1000 * 60 * 60 * 24) // Convert to days
            : 0;

        // Calculate merge rate
        const mergeRate = total > 0 ? (merged / total) * 100 : 0;

        return {
            total,
            merged,
            open,
            closed,
            mergeRate: Math.round(mergeRate * 100) / 100,
            avgMergeTimeDays: Math.round(avgMergeTime * 100) / 100
        };
    }

    getPRStatus(pr) {
        if (pr.pr_merged) return 'Merged';
        if (pr.pr_state === 'open') return 'Open';
        return 'Closed';
    }

    async loadData() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return { pullRequests: [], lastUpdated: new Date().toISOString() };
            }
            throw error;
        }
    }

    async saveData(data) {
        await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2));
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`PR Webhook Server running on port ${this.port}`);
            console.log(`Dashboard available at: http://localhost:${this.port}`);
            console.log(`Webhook endpoint: http://localhost:${this.port}/webhook`);
            console.log(`API endpoint: http://localhost:${this.port}/api/prs`);
        });
    }
}

// Start the server if this file is run directly
if (require.main === module) {
    const port = process.env.PORT || 3000;
    const server = new PRWebhookServer(port);
    server.start();
}

module.exports = PRWebhookServer;
