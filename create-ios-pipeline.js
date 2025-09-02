const axios = require('axios');
require('dotenv').config();

class ZenHubPipelineCreator {
  constructor() {
    this.token = process.env.ZENHUB_TOKEN;
    this.workspaceId = process.env.ZENHUB_WORKSPACE_ID || '68b5e4dd7bd773001775b072';
    this.graphqlEndpoint = 'https://api.zenhub.com/public/graphql';
  }

  async createIOSPipeline() {
    if (!this.token) {
      console.error('❌ No ZenHub token found. Please set ZENHUB_TOKEN in your .env file.');
      return;
    }

    console.log('🚀 Creating "iOS to be UPDATED" pipeline in ZenHub...');
    console.log(`📍 Workspace ID: ${this.workspaceId}`);

    try {
      // First, let's check what pipelines already exist
      const existingPipelines = await this.getExistingPipelines();
      console.log('\n📋 Existing Pipelines:');
      existingPipelines.forEach(pipeline => {
        console.log(`  - ${pipeline.name} (ID: ${pipeline.id})`);
      });

      // Check if iOS pipeline already exists
      const iosPipeline = existingPipelines.find(p => p.name === 'iOS to be UPDATED');
      if (iosPipeline) {
        console.log('\n✅ "iOS to be UPDATED" pipeline already exists!');
        console.log(`   ID: ${iosPipeline.id}`);
        console.log('\n📝 Update your workflow with this pipeline ID:');
        console.log(`   'iOS to be UPDATED': '${iosPipeline.id}'`);
        return;
      }

      // Create the new pipeline
      console.log('\n🔨 Creating new "iOS to be UPDATED" pipeline...');
      
      // Note: Pipeline creation via GraphQL API might require admin permissions
      // For now, we'll provide instructions to create it manually
      console.log('\n📋 To create the "iOS to be UPDATED" pipeline:');
      console.log('1. Go to your ZenHub workspace dashboard');
      console.log('2. Click on "Pipeline Settings" or the gear icon');
      console.log('3. Click "Add Pipeline"');
      console.log('4. Name it: "iOS to be UPDATED"');
      console.log('5. Description: "Commits from main branch waiting to be synced to practice branch"');
      console.log('6. Color: Choose a distinctive color (e.g., #ff6b6b)');
      console.log('7. Position: After "To Sync" pipeline');
      console.log('8. Save the pipeline');
      console.log('\n9. After creation, run this script again to get the pipeline ID');

    } catch (error) {
      console.error('❌ Error:', error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
    }
  }

  async getExistingPipelines() {
    try {
      const query = `
        query getWorkspacePipelines($workspaceId: ID!) {
          workspace(id: $workspaceId) {
            id
            name
            pipelines {
              id
              name
              color
            }
          }
        }
      `;

      const response = await axios.post(this.graphqlEndpoint, {
        query: query,
        variables: {
          workspaceId: this.workspaceId
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.errors) {
        console.warn('⚠️ GraphQL errors:', response.data.errors);
        return [];
      }

      const workspace = response.data.data?.workspace;
      return workspace?.pipelines || [];
    } catch (error) {
      console.warn('⚠️ Could not fetch existing pipelines:', error.message);
      return [];
    }
  }

  async testPipelineAccess() {
    console.log('\n🧪 Testing pipeline access...');
    
    try {
      const query = `
        query testWorkspaceAccess($workspaceId: ID!) {
          workspace(id: $workspaceId) {
            id
            name
            repositories {
              nodes {
                id
                name
                ghId
              }
            }
          }
        }
      `;

      const response = await axios.post(this.graphqlEndpoint, {
        query: query,
        variables: {
          workspaceId: this.workspaceId
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.errors) {
        console.warn('⚠️ GraphQL errors:', response.data.errors);
        return false;
      }

      const workspace = response.data.data?.workspace;
      if (workspace) {
        console.log(`✅ Successfully accessed workspace: ${workspace.name}`);
        console.log(`   Repositories: ${workspace.repositories?.nodes?.length || 0}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error testing pipeline access:', error.message);
      return false;
    }
  }
}

// Run the script
async function main() {
  const creator = new ZenHubPipelineCreator();
  
  console.log('🔍 ZenHub iOS Pipeline Creator');
  console.log('================================\n');

  // Test access first
  const hasAccess = await creator.testPipelineAccess();
  if (!hasAccess) {
    console.log('\n❌ Cannot access workspace. Please check your token and workspace ID.');
    return;
  }

  // Create the pipeline
  await creator.createIOSPipeline();
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Create the "iOS to be UPDATED" pipeline in ZenHub dashboard');
  console.log('2. Run this script again to get the pipeline ID');
  console.log('3. Update your workflow with the new pipeline ID');
  console.log('4. Test the cross-branch sync functionality');
}

main().catch(console.error);
