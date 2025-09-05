const axios = require('axios');
require('dotenv').config();

class PipelineLister {
  constructor() {
    this.token = process.env.ZENHUB_TOKEN;
    this.workspaceId = '68b5e4dd7bd773001775b072'; // Use the correct format
    this.graphqlEndpoint = 'https://api.zenhub.com/public/graphql';
  }

  async listAllPipelines() {
    if (!this.token) {
      console.error('❌ No ZenHub token found. Please set ZENHUB_TOKEN in your .env file.');
      return;
    }

    console.log('🔍 Listing All ZenHub Pipelines');
    console.log('================================\n');
    console.log(`📍 Workspace ID: ${this.workspaceId}`);

    try {
      const query = `
        query getWorkspacePipelines($workspaceId: ID!) {
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
        console.error('❌ GraphQL errors:', response.data.errors);
        return;
      }

      const workspace = response.data.data?.workspace;
      if (!workspace) {
        console.error('❌ No workspace found');
        return;
      }

      console.log(`✅ Workspace: ${workspace.name}`);
      console.log(`📊 Total Pipelines: ${workspace.pipelines?.length || 0}\n`);

      if (workspace.pipelines && workspace.pipelines.length > 0) {
        console.log('📋 Pipeline Details:');
        console.log('====================');
        
        workspace.pipelines.forEach((pipeline, index) => {
          console.log(`\n${index + 1}. ${pipeline.name}`);
          console.log(`   ID: ${pipeline.id}`);
        });

        console.log('\n📝 Pipeline ID Mapping for Workflow:');
        console.log('=====================================');
        console.log('const pipelineMap = {');
        workspace.pipelines.forEach(pipeline => {
          console.log(`  '${pipeline.name}': '${pipeline.id}',`);
        });
        console.log('};');
      } else {
        console.log('❌ No pipelines found in this workspace');
      }

    } catch (error) {
      console.error('❌ Error:', error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
    }
  }
}

// Run the script
async function main() {
  const lister = new PipelineLister();
  await lister.listAllPipelines();
}

main().catch(console.error);
