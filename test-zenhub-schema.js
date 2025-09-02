require('dotenv').config();
const axios = require('axios');

class ZenHubSchemaExplorer {
  constructor() {
    this.zenhubToken = process.env.ZENHUB_TOKEN;
    this.workspaceId = process.env.ZENHUB_WORKSPACE_ID?.split('-').pop() || process.env.ZENHUB_WORKSPACE_ID;
  }

  async exploreSchema() {
    console.log('🔍 Exploring ZenHub GraphQL Schema...\n');
    
    if (!this.zenhubToken) {
      console.log('❌ No ZenHub token provided');
      return;
    }

    try {
      // Test 1: Check what's available at the root level
      console.log('1️⃣ Testing root query fields...');
      await this.testRootQuery();
      
      // Test 2: Check workspace access
      console.log('\n2️⃣ Testing workspace access...');
      await this.testWorkspaceAccess();
      
      // Test 3: Try to introspect the schema
      console.log('\n3️⃣ Attempting schema introspection...');
      await this.introspectSchema();
      
    } catch (error) {
      console.error('❌ Schema exploration failed:', error.message);
    }
  }

  async testRootQuery() {
    try {
      // Try different possible root fields
      const possibleQueries = [
        'viewer',
        'workspace',
        'repository',
        'issue',
        'node'
      ];

      for (const queryField of possibleQueries) {
        try {
          const query = `
            query test${queryField.charAt(0).toUpperCase() + queryField.slice(1)} {
              ${queryField} {
                __typename
              }
            }
          `;

          const response = await axios.post('https://api.zenhub.com/public/graphql', {
            query: query
          }, {
            headers: {
              'Authorization': `Bearer ${this.zenhubToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.data.errors) {
            console.log(`   ❌ ${queryField}: ${response.data.errors[0].message}`);
          } else {
            console.log(`   ✅ ${queryField}: Available`);
          }
        } catch (error) {
          console.log(`   ❌ ${queryField}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('❌ Root query test failed:', error.message);
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

  async introspectSchema() {
    try {
      // Try to get schema information
      const query = `
        query IntrospectionQuery {
          __schema {
            queryType {
              name
              fields {
                name
                type {
                  name
                }
              }
            }
          }
        }
      `;

      const response = await axios.post('https://api.zenhub.com/public/graphql', {
        query: query
      }, {
        headers: {
          'Authorization': `Bearer ${this.zenhubToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.errors) {
        console.log('❌ Schema introspection not allowed');
        console.log('   This is common for production APIs');
        return;
      }

      const schema = response.data.data?.__schema;
      if (schema) {
        console.log(`✅ Schema introspection successful`);
        console.log(`   Query type: ${schema.queryType.name}`);
        console.log(`   Available root fields: ${schema.queryType.fields.length}`);
        schema.queryType.fields.slice(0, 10).forEach(field => {
          console.log(`   - ${field.name}: ${field.type.name}`);
        });
      }
    } catch (error) {
      console.log('❌ Schema introspection failed:', error.message);
    }
  }
}

// Run the schema explorer
const explorer = new ZenHubSchemaExplorer();
explorer.exploreSchema().catch(console.error);
