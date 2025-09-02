require('dotenv').config();
const axios = require('axios');

class ZenHubDirectTester {
  constructor() {
    this.zenhubToken = process.env.ZENHUB_TOKEN;
    // Extract just the hash part from the workspace ID
    this.workspaceId = process.env.ZENHUB_WORKSPACE_ID?.split('-').pop() || process.env.ZENHUB_WORKSPACE_ID;
    this.repositoryGhId = 396712143; // From our previous test
  }

  async testZenHubConnection() {
    console.log('🧪 Testing ZenHub API Directly...\n');
    
    console.log(`🔑 ZenHub Token: ${this.zenhubToken ? 'Present' : 'Missing'}`);
    console.log(`🏢 Workspace ID: ${this.workspaceId || 'Missing'}`);
    console.log(`📦 Repository GitHub ID: ${this.repositoryGhId}\n`);
    
    if (!this.zenhubToken || !this.workspaceId) {
      console.log('❌ Missing required credentials');
      return;
    }

    try {
      // Test 1: Check workspace access
      console.log('1️⃣ Testing workspace access...');
      await this.testWorkspaceAccess();
      
      // Test 2: Create a test issue
      console.log('\n2️⃣ Testing issue creation...');
      await this.testCreateIssue();
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
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
      }
    } catch (error) {
      console.error('❌ Workspace access failed:', error.message);
    }
  }

  async testCreateIssue() {
    try {
      const issueTitle = '[TEST] Cross-Branch Sync Test Issue';
      const issueBody = `**Test Issue for Cross-Branch Sync**

This is a test issue to verify ZenHub API functionality.

**Purpose:** Testing issue creation and pipeline assignment
**Status:** Test mode
**Action:** Verify this appears in ZenHub`;

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

      // Convert GitHub repository ID to Base64 format
      const repositoryId = Buffer.from(`0:${this.repositoryGhId}`).toString('base64');
      
      const variables = {
        input: {
          repositoryId: repositoryId,
          title: issueTitle,
          body: issueBody,
          labels: ["Test", "Cross-Branch Sync"]
        }
      };

      console.log('   Creating test issue...');
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
        console.log('\n3️⃣ Testing pipeline movement...');
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
const tester = new ZenHubDirectTester();
tester.testZenHubConnection().catch(console.error);
