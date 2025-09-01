#!/usr/bin/env node

// Test script with correct workspace ID
const axios = require('axios');

class CorrectWorkspaceTester {
    constructor() {
        this.zenhubToken = 'zh_b38a29d900f65c1d8d79388e07fd7f52d59a48e9a1868b083b70c81039a75592';
        this.workspaceId = 'mcc-workspace-68b5e4dd7bd773001775b072';
        this.graphqlEndpoint = 'https://api.zenhub.com/public/graphql';
    }

    async testWorkspaceAccess() {
        console.log('🧪 Testing ZenHub workspace access...\n');
        console.log(`Workspace ID: ${this.workspaceId}\n`);
        
        try {
            // Test 1: Check if we can access the workspace
            console.log('1. Testing workspace access...');
            const testQuery = `
                query {
                    viewer {
                        id
                    }
                }
            `;

            const response = await axios.post(this.graphqlEndpoint, {
                query: testQuery
            }, {
                headers: {
                    'Authorization': `Bearer ${this.zenhubToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.errors) {
                console.error('❌ ZenHub token error:', response.data.errors);
                return;
            }

            console.log('✅ ZenHub token is valid');
            console.log('   Viewer ID:', response.data.data?.viewer?.id || 'Unknown');

            // Test 2: Test workspace-specific query
            console.log('\n2. Testing workspace-specific access...');
            const workspaceQuery = `
                query getWorkspace($workspaceId: ID!) {
                    workspace(id: $workspaceId) {
                        id
                        name
                        pipelines {
                            nodes {
                                id
                                name
                            }
                        }
                    }
                }
            `;

            const workspaceResponse = await axios.post(this.graphqlEndpoint, {
                query: workspaceQuery,
                variables: { workspaceId: this.workspaceId }
            }, {
                headers: {
                    'Authorization': `Bearer ${this.zenhubToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (workspaceResponse.data.errors) {
                console.error('❌ Workspace access error:', workspaceResponse.data.errors);
                return;
            }

            const workspace = workspaceResponse.data.data?.workspace;
            if (workspace) {
                console.log('✅ Workspace access successful!');
                console.log(`   Workspace Name: ${workspace.name}`);
                console.log(`   Workspace ID: ${workspace.id}`);
                console.log('   Available Pipelines:');
                workspace.pipelines?.nodes?.forEach(pipeline => {
                    console.log(`     - ${pipeline.name} (${pipeline.id})`);
                });
            } else {
                console.log('❌ Could not access workspace');
            }

            console.log('\n🎉 Workspace test completed!');
            console.log('\n📋 Next steps:');
            console.log('   1. Add the secrets to GitHub repository settings');
            console.log('   2. Re-run the GitHub Actions workflow');
            console.log('   3. Check your ZenHub board for the new card');

        } catch (error) {
            console.error('❌ Test failed:', error.message);
            if (error.response) {
                console.error('Response:', error.response.data);
            }
        }
    }
}

// Run the test
const tester = new CorrectWorkspaceTester();
tester.testWorkspaceAccess().catch(console.error);
