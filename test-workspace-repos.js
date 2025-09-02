require('dotenv').config();
const axios = require('axios');

class WorkspaceRepoChecker {
  constructor() {
    this.zenhubToken = process.env.ZENHUB_TOKEN;
    this.workspaceId = process.env.ZENHUB_WORKSPACE_ID?.split('-').pop() || process.env.ZENHUB_WORKSPACE_ID;
  }

  async checkWorkspaceRepos() {
    console.log('🔍 Checking ZenHub Workspace Repositories...\n');
    
    console.log(`🔑 ZenHub Token: ${this.zenhubToken ? 'Present' : 'Missing'}`);
    console.log(`🏢 Workspace ID: ${this.workspaceId || 'Missing'}\n`);
    
    if (!this.zenhubToken || !this.workspaceId) {
      console.log('❌ Missing required credentials');
      return;
    }

    try {
      // Check what repositories are in this workspace
      console.log('1️⃣ Checking repositories in workspace...');
      await this.checkWorkspaceRepositories();
      
    } catch (error) {
      console.error('❌ Check failed:', error.message);
    }
  }

  async checkWorkspaceRepositories() {
    try {
      const query = `
        query getWorkspaceRepos($workspaceId: ID!) {
          workspace(id: $workspaceId) {
            id
            name
            repositoriesConnection(first: 50) {
              nodes {
                id
                ghId
                name
                isPrivate
                isArchived
              }
            }
          }
        }
      `;

      const response = await axios.post('https://api.zenhub.com/public/graphql', {
        query: query,
        variables: { workspaceId: this.workspaceId }
      }, {
        headers: {
          'Authorization': `Bearer ${this.zenhubToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.errors) {
        console.error('❌ GraphQL errors:', JSON.stringify(response.data.errors, null, 2));
        return;
      }

      const workspace = response.data.data?.workspace;
      if (workspace) {
        console.log(`✅ Workspace: ${workspace.name}`);
        console.log(`   Repositories found: ${workspace.repositoriesConnection.nodes.length}\n`);
        
        workspace.repositoriesConnection.nodes.forEach((repo, index) => {
          console.log(`${index + 1}. ${repo.name}`);
          console.log(`   GitHub ID: ${repo.ghId}`);
          console.log(`   ZenHub ID: ${repo.id}`);
          console.log(`   Private: ${repo.isPrivate ? 'Yes' : 'No'}`);
          console.log(`   Archived: ${repo.isArchived ? 'Yes' : 'No'}`);
          console.log('');
        });

        // Check if our target repository is in the list
        const targetRepo = workspace.repositoriesConnection.nodes.find(r => r.ghId === 396712143);
        if (targetRepo) {
          console.log(`🎯 Target repository FOUND: ${targetRepo.name}`);
          console.log(`   ZenHub Repository ID: ${targetRepo.id}`);
          console.log(`   This should work for API calls!`);
        } else {
          console.log(`❌ Target repository NOT FOUND in workspace`);
          console.log(`   GitHub ID 396712143 is not connected to this workspace`);
        }
      }
    } catch (error) {
      console.error('❌ Repository check failed:', error.message);
    }
  }
}

// Run the check
const checker = new WorkspaceRepoChecker();
checker.checkWorkspaceRepos().catch(console.error);
