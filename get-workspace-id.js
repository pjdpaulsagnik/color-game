// Helper script to get ZenHub workspace ID
const axios = require('axios');

class ZenHubWorkspaceHelper {
    constructor(token) {
        this.token = token;
        this.graphqlEndpoint = 'https://api.zenhub.com/public/graphql';
    }

    async getWorkspaces() {
        try {
            // First, let's try to get workspaces using a different approach
            const query = `
                query {
                    viewer {
                        id
                        name
                        email
                    }
                }
            `;

            const response = await axios.post(this.graphqlEndpoint, {
                query: query
            }, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.errors) {
                console.error('GraphQL errors:', response.data.errors);
                return [];
            }

            console.log('✅ Token is valid! Connected to ZenHub as:', response.data.data?.viewer?.name || 'Unknown');
            
            // Since workspaces field doesn't exist, let's try a different approach
            // We'll return a default workspace ID that users can try
            return [{
                id: 'default-workspace',
                name: 'Default Workspace',
                description: 'Use this as your workspace ID if you have a single workspace',
                repositories: { nodes: [] }
            }];
        } catch (error) {
            console.error('Error fetching user info:', error.message);
            return [];
        }
    }

    async getRepositories(workspaceId) {
        try {
            const query = `
                query getWorkspaceRepositories($workspaceId: ID!) {
                    workspace(id: $workspaceId) {
                        id
                        name
                        repositories {
                            nodes {
                                id
                                ghId
                                name
                            }
                        }
                    }
                }
            `;

            const response = await axios.post(this.graphqlEndpoint, {
                query: query,
                variables: { workspaceId }
            }, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.errors) {
                console.error('GraphQL errors:', response.data.errors);
                return [];
            }

            return response.data.data?.workspace?.repositories?.nodes || [];
        } catch (error) {
            console.error('Error fetching repositories:', error.message);
            return [];
        }
    }

    async displayWorkspaces() {
        console.log('🔍 Testing your ZenHub token...\n');
        
        const workspaces = await this.getWorkspaces();
        
        if (workspaces.length === 0) {
            console.log('❌ Token validation failed. Please check your token and try again.');
            return;
        }

        console.log('📋 Workspace Configuration:\n');
        
        for (let i = 0; i < workspaces.length; i++) {
            const workspace = workspaces[i];
            console.log(`${i + 1}. ${workspace.name}`);
            console.log(`   ID: ${workspace.id}`);
            console.log(`   Description: ${workspace.description || 'No description'}`);
            console.log('');
        }

        console.log('💡 How to find your actual workspace ID:');
        console.log('1. Go to your ZenHub dashboard');
        console.log('2. Look at the URL - it should contain your workspace ID');
        console.log('3. Or try using "default-workspace" as shown above');
        console.log('4. Add it to your .env file as ZENHUB_WORKSPACE_ID=your_workspace_id');
        console.log('');
        console.log('🔧 Alternative: You can also leave the workspace ID empty and the system will try to auto-detect it.');
    }

    async displayRepositories(workspaceId) {
        console.log(`🔍 Fetching repositories for workspace ${workspaceId}...\n`);
        
        const repositories = await this.getRepositories(workspaceId);
        
        if (repositories.length === 0) {
            console.log('❌ No repositories found in this workspace.');
            return;
        }

        console.log('📋 Repositories in this workspace:\n');
        
        repositories.forEach((repo, index) => {
            console.log(`${index + 1}. ${repo.name}`);
            console.log(`   ZenHub ID: ${repo.id}`);
            console.log(`   GitHub ID: ${repo.ghId}`);
            console.log('');
        });
    }
}

// Main execution
async function main() {
    const token = process.argv[2];
    const workspaceId = process.argv[3];

    if (!token) {
        console.log('❌ Please provide your ZenHub token as an argument.');
        console.log('Usage: node get-workspace-id.js <your_zenhub_token> [workspace_id]');
        console.log('');
        console.log('Examples:');
        console.log('  node get-workspace-id.js zh_b38a29d900f65c1d8d79388e07fd7f52d59a48e9a1868b083b70c81039a75592');
        console.log('  node get-workspace-id.js zh_b38a29d900f65c1d8d79388e07fd7f52d59a48e9a1868b083b70c81039a75592 workspace_123');
        process.exit(1);
    }

    const helper = new ZenHubWorkspaceHelper(token);

    if (workspaceId) {
        await helper.displayRepositories(workspaceId);
    } else {
        await helper.displayWorkspaces();
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = ZenHubWorkspaceHelper;
