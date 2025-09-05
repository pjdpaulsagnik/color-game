require('dotenv').config();
const axios = require('axios');

class ZenHubFinalTester {
  constructor() {
    this.zenhubToken = process.env.ZENHUB_TOKEN;
    this.workspaceId = process.env.ZENHUB_WORKSPACE_ID?.split('-').pop() || process.env.ZENHUB_WORKSPACE_ID;
    this.repositoryGhId = 396712143; // GitHub repository ID
    this.zenhubRepoId = 'Z2lkOi8vcmFwdG9yL1JlcG9zaXRvcnkvMTM0NjUxOTY4'; // ZenHub repository ID
  }

  async testFinal() {
    console.log('🧪 Final ZenHub Test with Correct Format...\n');
    
    console.log(`🔑 ZenHub Token: ${this.zenhubToken ? 'Present' : 'Missing'}`);
    console.log(`🏢 Workspace ID: ${this.workspaceId || 'Missing'}`);
    console.log(`📦 Repository GitHub ID: ${this.repositoryGhId}\n`);
    
    if (!this.zenhubToken || !this.workspaceId) {
      console.log('❌ Missing required credentials');
      return;
    }

    try {
      // Test issue creation with correct format
      console.log('1️⃣ Testing issue creation with correct repositoryId format...');
      await this.testCreateIssueCorrect();
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }

  async testCreateIssueCorrect() {
    try {
      console.log('   Creating test issue with correct format...');
      
      const issueTitle = '[FINAL TEST] Cross-Branch Sync Issue';
      const issueBody = `**Final Test Issue for Cross-Branch Sync**

This is the final test issue to verify ZenHub API functionality.

**Purpose:** Testing issue creation with correct repositoryId format
**Status:** Final test
**Action:** Verify this appears in ZenHub`;

      console.log(`   Using ZenHub Repository ID: ${this.zenhubRepoId}`);

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
          repositoryId: this.zenhubRepoId,
          title: issueTitle,
          body: issueBody,
          labels: ["Final Test", "Cross-Branch Sync"]
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
        console.log('\n2️⃣ Testing pipeline movement...');
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
        console.log('\n🎉 SUCCESS! The ZenHub API is now working correctly!');
        console.log('   This means the workflow should now create issues properly.');
      }
    } catch (error) {
      console.error('❌ Pipeline movement failed:', error.message);
    }
  }
}

// Run the final test
const tester = new ZenHubFinalTester();
tester.testFinal().catch(console.error);
