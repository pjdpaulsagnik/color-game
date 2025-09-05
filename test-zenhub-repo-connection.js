require('dotenv').config();
const axios = require('axios');

class ZenHubRepoConnectionTester {
  constructor() {
    this.zenhubToken = process.env.ZENHUB_TOKEN;
    this.workspaceId = process.env.ZENHUB_WORKSPACE_ID?.split('-').pop() || process.env.ZENHUB_WORKSPACE_ID;
    this.repositoryGhId = 396712143; // GitHub repository ID
  }

  async testRepositoryConnection() {
    console.log('🧪 Testing ZenHub Repository Connection...\n');
    
    console.log(`🔑 ZenHub Token: ${this.zenhubToken ? 'Present' : 'Missing'}`);
    console.log(`🏢 Workspace ID: ${this.workspaceId || 'Missing'}`);
    console.log(`📦 Repository GitHub ID: ${this.repositoryGhId}\n`);
    
    if (!this.zenhubToken || !this.workspaceId) {
      console.log('❌ Missing required credentials');
      return;
    }

    try {
      // Test 1: Check if repository is connected to ZenHub
      console.log('1️⃣ Testing repository connection to ZenHub...');
      await this.testRepositoryConnection();
      
      // Test 2: Check workspace access and pipelines
      console.log('\n2️⃣ Testing workspace access...');
      await this.testWorkspaceAccess();
      
      // Test 3: Try to create a test issue using correct API format
      console.log('\n3️⃣ Testing issue creation with correct API...');
      await this.testCreateIssueCorrect();
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }

  async testRepositoryConnection() {
    try {
      // Check if repository exists in ZenHub
      const query = `
        query getRepositoryInfo($repositoryGhId: Int!) {
          repositoryByGhId(ghId: $repositoryGhId) {
            id
            ghId
            name
            workspacesConnection(first: 10) {
              nodes {
                id
                name
              }
            }
          }
        }
      `;

      const response = await axios.post('https://api.zenhub.com/public/graphql', {
        query: query,
        variables: { repositoryGhId: this.repositoryGhId }
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

      const repository = response.data.data?.repositoryByGhId;
      if (repository) {
        console.log(`✅ Repository found in ZenHub: ${repository.name}`);
        console.log(`   ZenHub Repository ID: ${repository.id}`);
        console.log(`   Connected to workspaces: ${repository.workspacesConnection.nodes.length}`);
        repository.workspacesConnection.nodes.forEach(workspace => {
          console.log(`   - ${workspace.name}: ${workspace.id}`);
        });
        
        // Check if our workspace is in the list
        const isConnected = repository.workspacesConnection.nodes.some(w => w.id === this.workspaceId);
        if (isConnected) {
          console.log(`✅ Repository is connected to our workspace!`);
        } else {
          console.log(`❌ Repository is NOT connected to our workspace!`);
          console.log(`   This is why issues aren't being created!`);
        }
      } else {
        console.log('❌ Repository not found in ZenHub');
        console.log('   The repository needs to be connected to ZenHub first');
      }
    } catch (error) {
      console.error('❌ Repository connection test failed:', error.message);
    }
  }

  async testWorkspaceAccess() {
    try {
      const query = `
        query getWorkspace($workspaceId: ID!) {
          workspace(id: $workspaceId) {
            id
            name
            pipelines {
              id
              name
            }
            repositoriesConnection(first: 10) {
              nodes {
                id
                ghId
                name
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
        console.log(`✅ Workspace access successful: ${workspace.name}`);
        console.log(`   Pipelines found: ${workspace.pipelines.length}`);
        workspace.pipelines.forEach(pipeline => {
          console.log(`   - ${pipeline.name}: ${pipeline.id}`);
        });
        
        console.log(`   Repositories in workspace: ${workspace.repositoriesConnection.nodes.length}`);
        workspace.repositoriesConnection.nodes.forEach(repo => {
          console.log(`   - ${repo.name} (GitHub ID: ${repo.ghId})`);
        });
        
        // Check if our repository is in this workspace
        const hasRepo = workspace.repositoriesConnection.nodes.some(r => r.ghId === this.repositoryGhId);
        if (hasRepo) {
          console.log(`✅ Our repository is in this workspace!`);
        } else {
          console.log(`❌ Our repository is NOT in this workspace!`);
        }
      }
    } catch (error) {
      console.error('❌ Workspace access failed:', error.message);
    }
  }

  async testCreateIssueCorrect() {
    try {
      // First, let's check if we can get existing issues for this repository
      console.log('   Checking existing issues...');
      const existingIssuesQuery = `
        query getRepositoryIssues($repositoryGhId: Int!, $workspaceId: ID!) {
          repositoryByGhId(ghId: $repositoryGhId) {
            issues(first: 5) {
              nodes {
                id
                number
                title
                pipelineIssue(workspaceId: $workspaceId) {
                  pipeline {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      `;

      const existingResponse = await axios.post('https://api.zenhub.com/public/graphql', {
        query: existingIssuesQuery,
        variables: { 
          repositoryGhId: this.repositoryGhId,
          workspaceId: this.workspaceId
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.zenhubToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (existingResponse.data.errors) {
        console.error('❌ Error fetching existing issues:', JSON.stringify(existingResponse.data.errors, null, 2));
        return;
      }

      const existingIssues = existingResponse.data.data?.repositoryByGhId?.issues?.nodes || [];
      console.log(`   Found ${existingIssues.length} existing issues`);
      existingIssues.forEach(issue => {
        console.log(`   - #${issue.number}: ${issue.title} (Pipeline: ${issue.pipelineIssue?.pipeline?.name || 'None'})`);
      });

      // Now try to create a test issue using the correct format from documentation
      console.log('\n   Creating test issue with correct API format...');
      
      const issueTitle = '[TEST] Cross-Branch Sync Test Issue';
      const issueBody = `**Test Issue for Cross-Branch Sync**

This is a test issue to verify ZenHub API functionality.

**Purpose:** Testing issue creation and pipeline assignment
**Status:** Test mode
**Action:** Verify this appears in ZenHub`;

      // Using the correct format from the documentation
      const createIssueMutation = `
        mutation createIssue($input: CreateIssueInput!) {
          createIssue(input: $input) {
            issue {
              id
              number
              title
              pipelineIssue(workspaceId: "${this.workspaceId}") {
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
          repositoryGhId: this.repositoryGhId, // Use repositoryGhId as per documentation
          title: issueTitle,
          body: issueBody,
          labels: ["Test", "Cross-Branch Sync"]
        }
      };

      const response = await axios.post('https://api.zenhub.com/public/graphql', {
        query: createIssueMutation,
        variables: variables
      }, {
        headers: {
          'Authorization': `Bearer ${this.zenhubToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.errors) {
        console.error('❌ Issue creation failed:', JSON.stringify(response.data.errors, null, 2));
        return;
      }

      const issue = response.data.data?.createIssue?.issue;
      if (issue) {
        console.log(`✅ Test issue created successfully!`);
        console.log(`   Issue ID: ${issue.id}`);
        console.log(`   Issue Number: ${issue.number}`);
        console.log(`   Pipeline: ${issue.pipelineIssue?.pipeline?.name || 'Unknown'}`);
        
        // Now try to move it to "iOS to be UPDATED" pipeline
        console.log('\n4️⃣ Testing pipeline movement...');
        await this.testMoveToPipeline(issue.id);
      }
    } catch (error) {
      console.error('❌ Issue creation failed:', error.message);
    }
  }

  async testMoveToPipeline(issueId) {
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
        WorkspaceId: this.workspaceId,
        MoveIssueInput: {
          pipelineId: 'Z2lkOi8vcmFwdG9yL1BpcGVsaW5lLzM0OTE3MTQ', // iOS to be UPDATED
          issueId: issueId,
          position: 0
        }
      };

      const response = await axios.post('https://api.zenhub.com/public/graphql', {
        query: moveMutation,
        variables: variables
      }, {
        headers: {
          'Authorization': `Bearer ${this.zenhubToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.errors) {
        console.error('❌ Pipeline movement failed:', JSON.stringify(response.data.errors, null, 2));
        return;
      }

      const movedIssue = response.data.data?.moveIssue?.issue;
      if (movedIssue) {
        console.log(`✅ Issue moved to pipeline successfully!`);
        console.log(`   New Pipeline: ${movedIssue.pipelineIssue?.pipeline?.name || 'Unknown'}`);
      }
    } catch (error) {
      console.error('❌ Pipeline movement failed:', error.message);
    }
  }
}

// Run the test
const tester = new ZenHubRepoConnectionTester();
tester.testRepositoryConnection().catch(console.error);
