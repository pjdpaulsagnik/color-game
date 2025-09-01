// ZenHub Pull Request Tracker
class PRTracker {
    constructor() {
        this.config = {
            zenhubToken: '',
            githubToken: '',
            organization: '',
            repositories: [],
            refreshInterval: 5,
            workspaceId: ''
        };
        this.pullRequests = [];
        this.filteredPRs = [];
        this.refreshTimer = null;
        this.init();
    }

    init() {
        this.loadConfig();
        this.setupEventListeners();
        this.startAutoRefresh();
        
        // Show config modal if no configuration exists
        if (!this.config.zenhubToken || !this.config.githubToken) {
            this.showConfig();
        } else {
            this.refreshData();
        }
    }

    setupEventListeners() {
        // Auto-save config on input change
        document.getElementById('zenhubToken').addEventListener('input', () => this.saveConfig());
        document.getElementById('workspaceId').addEventListener('input', () => this.saveConfig());
        document.getElementById('githubToken').addEventListener('input', () => this.saveConfig());
        document.getElementById('organization').addEventListener('input', () => this.saveConfig());
        document.getElementById('repositories').addEventListener('input', () => this.saveConfig());
        document.getElementById('refreshInterval').addEventListener('input', () => this.saveConfig());
    }

    loadConfig() {
        const savedConfig = localStorage.getItem('prTrackerConfig');
        if (savedConfig) {
            this.config = { ...this.config, ...JSON.parse(savedConfig) };
            this.populateConfigForm();
        }
    }

    saveConfig() {
        this.config.zenhubToken = document.getElementById('zenhubToken').value;
        this.config.workspaceId = document.getElementById('workspaceId').value;
        this.config.githubToken = document.getElementById('githubToken').value;
        this.config.organization = document.getElementById('organization').value;
        this.config.repositories = document.getElementById('repositories').value
            .split(',')
            .map(repo => repo.trim())
            .filter(repo => repo.length > 0);
        this.config.refreshInterval = parseInt(document.getElementById('refreshInterval').value) || 5;

        localStorage.setItem('prTrackerConfig', JSON.stringify(this.config));
        
        // Restart auto-refresh with new interval
        this.startAutoRefresh();
        
        // Show success message
        this.showAlert('Configuration saved successfully!', 'success');
    }

    populateConfigForm() {
        document.getElementById('zenhubToken').value = this.config.zenhubToken;
        document.getElementById('workspaceId').value = this.config.workspaceId;
        document.getElementById('githubToken').value = this.config.githubToken;
        document.getElementById('organization').value = this.config.organization;
        document.getElementById('repositories').value = this.config.repositories.join(', ');
        document.getElementById('refreshInterval').value = this.config.refreshInterval;
    }

    showConfig() {
        const modal = new bootstrap.Modal(document.getElementById('configModal'));
        modal.show();
    }

    async refreshData() {
        if (!this.config.zenhubToken || !this.config.githubToken || !this.config.organization) {
            this.showAlert('Please configure your API tokens and organization first.', 'warning');
            return;
        }

        this.showLoading(true);
        
        try {
            await this.fetchPullRequests();
            this.updateStatistics();
            this.renderPRTable();
            this.updateFilters();
            this.showAlert('Data refreshed successfully!', 'success');
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.showAlert(`Error refreshing data: ${error.message}`, 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    async fetchPullRequests() {
        const allPRs = [];
        
        for (const repo of this.config.repositories) {
            try {
                const prs = await this.fetchRepoPullRequests(repo);
                allPRs.push(...prs);
            } catch (error) {
                console.error(`Error fetching PRs for ${repo}:`, error);
            }
        }

        this.pullRequests = allPRs;
        this.filteredPRs = [...allPRs];
    }

    async fetchRepoPullRequests(repoName) {
        const githubAPI = `https://api.github.com/repos/${this.config.organization}/${repoName}/pulls?state=all&per_page=100`;
        
        const response = await fetch(githubAPI, {
            headers: {
                'Authorization': `token ${this.config.githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const prs = await response.json();
        
        // Enhance PRs with ZenHub data
        for (const pr of prs) {
            pr.repository = repoName;
            pr.zenhubData = await this.fetchZenHubData(repoName, pr.number);
        }

        return prs;
    }

    async fetchZenHubData(repoName, prNumber) {
        try {
            if (!this.config.zenhubToken) {
                return {
                    pipeline: { name: 'Unknown' },
                    estimate: { value: null },
                    is_epic: false,
                    error: 'No ZenHub token provided'
                };
            }

            // Use ZenHub GraphQL API
            const graphqlQuery = `
                query getIssueInfo($repositoryGhId: Int!, $issueNumber: Int!, $workspaceId: ID!) {
                    issueByInfo(repositoryGhId: $repositoryGhId, issueNumber: $issueNumber) {
                        id
                        repository {
                            id
                            ghId
                        }
                        number
                        title
                        body
                        state
                        estimate {
                            value
                        }
                        sprints (first: 10) {
                            nodes {
                                id
                                name
                            }
                        }
                        labels (first: 10) {
                            nodes {
                                id
                                name
                                color
                            }
                        }
                        pipelineIssue(workspaceId: $workspaceId) {
                            priority {
                                id
                                name
                                color
                            }
                            pipeline {
                                id
                                name
                            }
                        }
                    }
                }
            `;

            const variables = {
                repositoryGhId: await this.getRepositoryGhId(repoName),
                issueNumber: prNumber,
                workspaceId: this.config.workspaceId || await this.getDefaultWorkspaceId()
            };

            const response = await fetch('https://api.zenhub.com/public/graphql', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.zenhubToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: graphqlQuery,
                    variables: variables
                })
            });

            if (response.ok) {
                const result = await response.json();
                
                if (result.errors) {
                    console.warn(`ZenHub GraphQL errors for ${repoName}#${prNumber}:`, result.errors);
                    // If issue doesn't exist, try to create it
                    return await this.createZenHubIssueFromPR(repoName, prNumber);
                }

                const issue = result.data?.issueByInfo;
                if (issue) {
                    return {
                        pipeline: issue.pipelineIssue?.pipeline || { name: 'Unknown' },
                        estimate: issue.estimate || { value: null },
                        is_epic: false, // This would need to be determined from the issue type
                        sprints: issue.sprints?.nodes || [],
                        labels: issue.labels?.nodes || [],
                        priority: issue.pipelineIssue?.priority || null,
                        zenhub_id: issue.id
                    };
                }
            }

            // If we can't find the issue, try to create it
            return await this.createZenHubIssueFromPR(repoName, prNumber);
        } catch (error) {
            console.warn(`ZenHub GraphQL API error for ${repoName}#${prNumber}:`, error);
            return this.getDefaultZenHubData();
        }
    }

    async createZenHubIssueFromPR(repoName, prNumber) {
        try {
            console.log(`Creating ZenHub issue for PR #${prNumber} in ${repoName}`);
            
            // First, get the PR data from GitHub
            const githubResponse = await fetch(`https://api.github.com/repos/${this.config.organization}/${repoName}/pulls/${prNumber}`, {
                headers: {
                    'Authorization': `token ${this.config.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!githubResponse.ok) {
                console.warn(`Could not fetch PR #${prNumber} from GitHub`);
                return this.getDefaultZenHubData();
            }

            const prData = await githubResponse.json();
            
            // Create a ZenHub issue that represents this PR
            const createIssueMutation = `
                mutation createIssue($input: CreateIssueInput!) {
                    createIssue(input: $input) {
                        issue {
                            id
                            number
                            title
                            pipelineIssue(workspaceId: "${this.config.workspaceId || await this.getDefaultWorkspaceId()}") {
                                pipeline {
                                    id
                                    name
                                }
                            }
                        }
                    }
                }
            `;

            const variables = {
                input: {
                    repositoryGhId: await this.getRepositoryGhId(repoName),
                    title: `[PR #${prNumber}] ${prData.title}`,
                    body: `**Pull Request:** #${prNumber}\n\n**Description:** ${prData.body || 'No description'}\n\n**Author:** @${prData.user.login}\n\n**Status:** ${prData.state}\n\n**Link:** ${prData.html_url}`,
                    estimate: { value: 1 }, // Default estimate
                    labels: [{ name: 'Pull Request', color: '#0366d6' }]
                }
            };

            const response = await fetch('https://api.zenhub.com/public/graphql', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.zenhubToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: createIssueMutation,
                    variables: variables
                })
            });

            if (response.ok) {
                const result = await response.json();
                
                if (result.data?.createIssue?.issue) {
                    const issue = result.data.createIssue.issue;
                    console.log(`✅ Created ZenHub issue for PR #${prNumber}`);
                    
                    // Move the issue to the appropriate pipeline
                    await this.moveIssueToPipeline(issue.id, 'New Issues');
                    
                    return {
                        pipeline: { name: 'New Issues' },
                        estimate: { value: 1 },
                        is_epic: false,
                        sprints: [],
                        labels: [{ name: 'Pull Request', color: '#0366d6' }],
                        priority: null,
                        zenhub_id: issue.id,
                        created: true
                    };
                }
            }

            console.warn(`Failed to create ZenHub issue for PR #${prNumber}`);
            return this.getDefaultZenHubData();
        } catch (error) {
            console.warn(`Error creating ZenHub issue for PR #${prNumber}:`, error);
            return this.getDefaultZenHubData();
        }
    }

    async moveIssueToPipeline(issueId, pipelineName) {
        try {
            const moveMutation = `
                mutation moveIssue($MoveIssueInput: MoveIssueInput!, $WorkspaceId: ID!) {
                    moveIssue(input: $MoveIssueInput) {
                        issue {
                            id
                            pipelineIssue(workspaceId: $WorkspaceId) {
                                pipeline {
                                    id
                                    name
                                }
                            }
                        }
                    }
                }
            `;

            const variables = {
                WorkspaceId: this.config.workspaceId || await this.getDefaultWorkspaceId(),
                MoveIssueInput: {
                    issueId: issueId,
                    pipelineId: await this.getPipelineId(pipelineName),
                    position: 0
                }
            };

            await fetch('https://api.zenhub.com/public/graphql', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.zenhubToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: moveMutation,
                    variables: variables
                })
            });

            console.log(`Moved issue ${issueId} to ${pipelineName} pipeline`);
        } catch (error) {
            console.warn(`Error moving issue to pipeline:`, error);
        }
    }

    async getPipelineId(pipelineName) {
        // This would need to be mapped from pipeline names to ZenHub pipeline IDs
        // For now, return a placeholder that should work with most ZenHub setups
        const pipelineMap = {
            'New Issues': 'pipeline-new',
            'In Progress': 'pipeline-progress',
            'Review': 'pipeline-review',
            'Done': 'pipeline-done',
            'Closed': 'pipeline-closed'
        };
        
        return pipelineMap[pipelineName] || 'pipeline-new';
    }

    getDefaultZenHubData() {
        return {
            pipeline: { name: 'Unknown' },
            estimate: { value: null },
            is_epic: false,
            sprints: [],
            labels: [],
            priority: null
        };
    }

    async getRepositoryGhId(repoName) {
        try {
            // First, get the GitHub repository ID
            const githubResponse = await fetch(`https://api.github.com/repos/${this.config.organization}/${repoName}`, {
                headers: {
                    'Authorization': `token ${this.config.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (githubResponse.ok) {
                const repoData = await githubResponse.json();
                return repoData.id;
            }
        } catch (error) {
            console.warn(`Error fetching GitHub repo ID for ${repoName}:`, error);
        }
        
        // Fallback to a default ID if we can't fetch it
        return 0;
    }

    async getDefaultWorkspaceId() {
        try {
            // Try to get a default workspace ID by querying for any available workspace
            const query = `
                query {
                    viewer {
                        id
                    }
                }
            `;

            const response = await fetch('https://api.zenhub.com/public/graphql', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.zenhubToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.data?.viewer?.id) {
                    // Use the user ID as a fallback workspace ID
                    return result.data.viewer.id;
                }
            }
        } catch (error) {
            console.warn('Error getting default workspace ID:', error);
        }
        
        // Final fallback
        return 'default-workspace';
    }

    getRepoId(repoName) {
        // This would need to be mapped from repository names to ZenHub repository IDs
        // For now, return a placeholder
        return 'placeholder-repo-id';
    }

    updateStatistics() {
        const total = this.pullRequests.length;
        const merged = this.pullRequests.filter(pr => pr.merged_at).length;
        const open = this.pullRequests.filter(pr => pr.state === 'open').length;
        const closed = this.pullRequests.filter(pr => pr.state === 'closed' && !pr.merged_at).length;

        // Calculate additional metrics
        const mergeRate = total > 0 ? Math.round((merged / total) * 100) : 0;
        const avgMergeTime = this.calculateAverageMergeTime();

        document.getElementById('totalPRs').textContent = total;
        document.getElementById('mergedPRs').textContent = merged;
        document.getElementById('openPRs').textContent = open;
        document.getElementById('closedPRs').textContent = closed;

        // Update merge rate and average time in the UI
        this.updateAdvancedMetrics(mergeRate, avgMergeTime);
    }

    calculateAverageMergeTime() {
        const mergedPRs = this.pullRequests.filter(pr => pr.merged_at && pr.created_at);
        if (mergedPRs.length === 0) return 0;

        const totalTime = mergedPRs.reduce((sum, pr) => {
            const created = new Date(pr.created_at);
            const merged = new Date(pr.merged_at);
            return sum + (merged - created);
        }, 0);

        return Math.round(totalTime / mergedPRs.length / (1000 * 60 * 60 * 24)); // Convert to days
    }

    updateAdvancedMetrics(mergeRate, avgMergeTime) {
        // Add merge rate and average time to the statistics cards
        const mergedCard = document.querySelector('.card.bg-success');
        if (mergedCard && !mergedCard.querySelector('.merge-metrics')) {
            const metricsDiv = document.createElement('div');
            metricsDiv.className = 'merge-metrics mt-2';
            metricsDiv.innerHTML = `
                <small class="d-block">Merge Rate: ${mergeRate}%</small>
                <small class="d-block">Avg Time: ${avgMergeTime} days</small>
            `;
            mergedCard.querySelector('.card-body').appendChild(metricsDiv);
        }
    }

    renderPRTable() {
        const tbody = document.getElementById('prTableBody');
        tbody.innerHTML = '';

        this.filteredPRs.forEach(pr => {
            const row = this.createPRRow(pr);
            tbody.appendChild(row);
        });
    }

    createPRRow(pr) {
        const row = document.createElement('tr');
        
        const status = this.getPRStatus(pr);
        const statusClass = this.getStatusClass(status);
        const zenhubStatus = this.getZenHubStatus(pr);
        
        row.innerHTML = `
            <td>
                <a href="${pr.html_url}" target="_blank" class="pr-link">
                    #${pr.number}
                </a>
            </td>
            <td>
                <div class="fw-bold">${this.escapeHtml(pr.title)}</div>
                ${pr.body ? `<small class="text-muted">${this.escapeHtml(pr.body.substring(0, 100))}...</small>` : ''}
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <img src="${pr.user.avatar_url}" alt="${pr.user.login}" class="author-avatar">
                    <span>${pr.user.login}</span>
                </div>
            </td>
            <td>
                <span class="badge bg-secondary">${pr.repository}</span>
            </td>
            <td>
                <span class="status-badge ${statusClass}">${status}</span>
            </td>
            <td>
                <small>${this.formatDate(pr.created_at)}</small>
            </td>
            <td>
                <small>${this.formatDate(pr.updated_at)}</small>
            </td>
            <td>
                ${zenhubStatus}
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <a href="${pr.html_url}" target="_blank" class="btn btn-outline-primary btn-sm">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                    <button class="btn btn-outline-info btn-sm" onclick="tracker.showPRDetails(${pr.number})">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    getPRStatus(pr) {
        if (pr.merged_at) return 'Merged';
        if (pr.state === 'open') return 'Open';
        if (pr.draft) return 'Draft';
        return 'Closed';
    }

    getStatusClass(status) {
        const classes = {
            'Merged': 'status-merged',
            'Open': 'status-open',
            'Closed': 'status-closed',
            'Draft': 'status-draft'
        };
        return classes[status] || 'status-closed';
    }

    getZenHubStatus(pr) {
        if (!pr.zenhubData) return '<span class="text-muted">No data</span>';
        
        const pipeline = pr.zenhubData.pipeline?.name || 'Unknown';
        const estimate = pr.zenhubData.estimate?.value;
        const priority = pr.zenhubData.priority?.name;
        const sprints = pr.zenhubData.sprints || [];
        const labels = pr.zenhubData.labels || [];
        
        let status = `<span class="zenhub-status zenhub-pipeline">${pipeline}</span>`;
        
        if (estimate) {
            status += ` <span class="zenhub-status zenhub-estimate">${estimate} pts</span>`;
        }
        
        if (priority) {
            status += ` <span class="zenhub-status zenhub-priority" style="background-color: ${pr.zenhubData.priority.color || '#e3f2fd'}; color: #1565c0;">${priority}</span>`;
        }
        
        if (sprints.length > 0) {
            status += ` <span class="zenhub-status zenhub-sprint" style="background-color: #f3e5f5; color: #7b1fa2;">Sprint: ${sprints[0].name}</span>`;
        }
        
        if (labels.length > 0) {
            const labelNames = labels.slice(0, 2).map(label => label.name).join(', ');
            status += ` <span class="zenhub-status zenhub-labels" style="background-color: #e8f5e8; color: #2e7d32;">${labelNames}</span>`;
        }
        
        return status;
    }

    updateFilters() {
        const authors = [...new Set(this.pullRequests.map(pr => pr.user.login))].sort();
        const repos = [...new Set(this.pullRequests.map(pr => pr.repository))].sort();
        
        this.updateSelectOptions('authorFilter', authors);
        this.updateSelectOptions('repoFilter', repos);
    }

    updateSelectOptions(selectId, options) {
        const select = document.getElementById(selectId);
        const currentValue = select.value;
        
        // Keep the "All" option and clear others
        select.innerHTML = '<option value="all">All ' + selectId.replace('Filter', 's') + '</option>';
        
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });
        
        select.value = currentValue;
    }

    filterPRs() {
        const statusFilter = document.getElementById('statusFilter').value;
        const authorFilter = document.getElementById('authorFilter').value;
        const repoFilter = document.getElementById('repoFilter').value;
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();

        this.filteredPRs = this.pullRequests.filter(pr => {
            const status = this.getPRStatus(pr);
            const statusMatch = statusFilter === 'all' || status.toLowerCase() === statusFilter;
            const authorMatch = authorFilter === 'all' || pr.user.login === authorFilter;
            const repoMatch = repoFilter === 'all' || pr.repository === repoFilter;
            const searchMatch = searchTerm === '' || 
                pr.title.toLowerCase().includes(searchTerm) ||
                pr.user.login.toLowerCase().includes(searchTerm) ||
                pr.body?.toLowerCase().includes(searchTerm);

            return statusMatch && authorMatch && repoMatch && searchMatch;
        });

        this.renderPRTable();
    }

    showPRDetails(prNumber) {
        const pr = this.pullRequests.find(p => p.number === prNumber);
        if (!pr) return;

        // Create a detailed modal for PR information
        const modalHtml = `
            <div class="modal fade" id="prDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">PR #${pr.number}: ${this.escapeHtml(pr.title)}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Basic Information</h6>
                                    <p><strong>Author:</strong> ${pr.user.login}</p>
                                    <p><strong>Repository:</strong> ${pr.repository}</p>
                                    <p><strong>Status:</strong> <span class="status-badge ${this.getStatusClass(this.getPRStatus(pr))}">${this.getPRStatus(pr)}</span></p>
                                    <p><strong>Created:</strong> ${this.formatDate(pr.created_at)}</p>
                                    <p><strong>Updated:</strong> ${this.formatDate(pr.updated_at)}</p>
                                    ${pr.merged_at ? `<p><strong>Merged:</strong> ${this.formatDate(pr.merged_at)}</p>` : ''}
                                </div>
                                <div class="col-md-6">
                                    <h6>ZenHub Information</h6>
                                    ${pr.zenhubData ? `
                                        <p><strong>Pipeline:</strong> ${pr.zenhubData.pipeline?.name || 'Unknown'}</p>
                                        <p><strong>Estimate:</strong> ${pr.zenhubData.estimate?.value || 'Not set'}</p>
                                        <p><strong>Is Epic:</strong> ${pr.zenhubData.is_epic ? 'Yes' : 'No'}</p>
                                    ` : '<p class="text-muted">No ZenHub data available</p>'}
                                </div>
                            </div>
                            ${pr.body ? `
                                <hr>
                                <h6>Description</h6>
                                <div class="border p-3 bg-light">
                                    ${this.escapeHtml(pr.body)}
                                </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <a href="${pr.html_url}" target="_blank" class="btn btn-primary">
                                <i class="fas fa-external-link-alt"></i> View on GitHub
                            </a>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('prDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add new modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('prDetailsModal'));
        modal.show();
    }

    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        const intervalMs = this.config.refreshInterval * 60 * 1000;
        this.refreshTimer = setInterval(() => {
            this.refreshData();
        }, intervalMs);
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (show) {
            spinner.classList.remove('d-none');
        } else {
            spinner.classList.add('d-none');
        }
    }

    showAlert(message, type) {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show alert-custom alert-${type}-custom" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        // Remove existing alerts
        document.querySelectorAll('.alert').forEach(alert => alert.remove());

        // Add new alert
        const container = document.querySelector('.container-fluid');
        container.insertAdjacentHTML('afterbegin', alertHtml);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alert = document.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global functions for HTML onclick handlers
function refreshData() {
    tracker.refreshData();
}

function filterPRs() {
    tracker.filterPRs();
}

function showConfig() {
    tracker.showConfig();
}

function saveConfig() {
    tracker.saveConfig();
    const modal = bootstrap.Modal.getInstance(document.getElementById('configModal'));
    modal.hide();
}

// Initialize the tracker when the page loads
let tracker;
document.addEventListener('DOMContentLoaded', () => {
    tracker = new PRTracker();
});
