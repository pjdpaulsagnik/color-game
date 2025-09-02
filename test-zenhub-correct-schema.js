require('dotenv').config();
const axios = require('axios');

class ZenHubCorrectSchemaTester {
  constructor() {
    this.zenhubToken = process.env.ZENHUB_TOKEN;
    this.workspaceId = process.env.ZENHUB_WORKSPACE_ID?.split('-').pop() || process.env.ZENHUB_WORKSPACE_ID;
    this.repositoryGhId = 396712143; // GitHub repository ID
  }

  async testCorrectSchema() {
    console.log('🧪 Testing ZenHub with Correct Schema...\n');
    
    console.log(`🔑 ZenHub Token: ${this.zenhubToken ? 'Present' : 'Missing'}`);
    console.log(`🏢 Workspace ID: ${this.workspaceId || 'Missing'}`);
    console.log(`📦 Repository GitHub ID: ${this.repositoryGhId}\n`);
    
    if (!this.zenhubToken || !this.workspaceId) {
      console.log('❌ Missing required credentials');
      return;
    }

    try {
      // Test 1: Check if we can access issues using issueByInfo
      console.log('1️⃣ Testing issueByInfo query...');
      await this.testIssueByInfo();
      
      // Test 2: Check workspace and pipelines
      console.log('\n2️⃣ Testing workspace access...');
      await this.testWorkspaceAccess();
      
      // Test 3: Try to create an issue using the correct mutation
      console.log('\n3️⃣ Testing issue creation...');
      await this.testCreateIssue();
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }

  async testIssueByInfo() {
    try {
      // Test with a known issue number (let's try 1)
      const query = `
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
            estimate {
              value
            }
            sprints(first: 10) {
              nodes {
                id
                name
              }
            }
            labels(first: 10) {
              nodes {
                id
                name
                color
              }
            }
          }
        }
      `;

      const variables = {
        repositoryGhId: this.repositoryGhId,
        issueNumber: 1, // Try issue #1
        workspaceId: this.workspaceId
      };

      const response = await axios.post('https://api.zenhub.com/public/graphql', {
        query: query,
        variables: variables
      }, {
        headers: {
          'Authorization': `Bearer ${this.zenhubToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.errors) {
        console.error('❌ issueByInfo query failed:', JSON.stringify(response.data.errors, null, 2));
        return;
      }

      const issue = response.data.data?.issueByInfo;
      if (issue) {
        console.log(`✅ Issue found: #${issue.number} - ${issue.title}`);
        console.log(`   Issue ID: ${issue.id}`);
        console.log(`   State: ${issue.state}`);
        console.log(`   Pipeline: ${issue.pipelineIssue?.pipeline?.name || 'None'}`);
        console.log(`   Estimate: ${issue.estimate?.value || 'None'}`);
        console.log(`   Labels: ${issue.labels.nodes.length}`);
        console.log(`   Sprints: ${issue.sprints.nodes.length}`);
      } else {
        console.log('❌ No issue found with number 1');
        console.log('   This might mean the repository has no issues yet');
      }
    } catch (error) {
      console.error('❌ issueByInfo test failed:', error.message);
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
        console.error('❌ Workspace access failed:', JSON.stringify(response.data.errors, null, 2));
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
      console.log('   Attempting to create a test issue...');
      
      const issueTitle = '[TEST] Cross-Branch Sync Test Issue';
      const issueBody = `**Test Issue for Cross-Branch Sync**

This is a test issue to verify ZenHub API functionality.

**Purpose:** Testing issue creation and pipeline assignment
**Status:** Test mode
**Action:** Verify this appears in ZenHub`;

      // Try the mutation format from the documentation
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
          repositoryGhId: this.repositoryGhId,
          title: issueTitle,
          body: issueBody,
          labels: ["Test", "Cross-Branch Sync"]
        }
      };

      console.log('   Variables:', JSON.stringify(variables, null, 2));

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
const tester = new ZenHubCorrectSchemaTester();
tester.testCorrectSchema().catch(console.error);
