#!/usr/bin/env node

// Test script with correct workspace ID
const axios = require('axios');

class CorrectWorkspaceTester {
    constructor() {
        this.zenhubToken = 'zh_b38a29d900f65c1d8d79388e07fd7f52d59a48e9a1868b083b70c81039a75592';
        this.workspaceId = 'mcc-workspace-68b5e4dd7bd773001775b072';
        this.graphqlEndpoint = 'https://api.zenhub.com/public/graphql';
        
        // Try different workspace ID formats
        this.workspaceIdVariants = [
            'mcc-workspace-68b5e4dd7bd773001775b072',
            'mcc-workspace-68b5e4dd7bd773001775b072',
            '68b5e4dd7bd773001775b072',
            'mcc-workspace'
        ];
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

            // Test 2: Try different workspace ID formats
            console.log('\n2. Testing different workspace ID formats...');
            
            const pipelinesQuery = `
                query getPipelines($workspaceId: ID!) {
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

            let workspaceFound = false;
            
            for (const workspaceId of this.workspaceIdVariants) {
                console.log(`   Trying workspace ID: ${workspaceId}`);
                
                try {
                    const pipelinesResponse = await axios.post(this.graphqlEndpoint, {
                        query: pipelinesQuery,
                        variables: { workspaceId: workspaceId }
                    }, {
                        headers: {
                            'Authorization': `Bearer ${this.zenhubToken}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (pipelinesResponse.data.errors) {
                        console.log(`     ❌ Failed: ${pipelinesResponse.data.errors[0].message}`);
                    } else {
                        const workspace = pipelinesResponse.data.data?.workspace;
                        if (workspace) {
                            console.log(`     ✅ SUCCESS! Found workspace: ${workspace.name}`);
                            console.log(`     Workspace ID: ${workspace.id}`);
                            console.log('     Available Pipelines:');
                            workspace.pipelines?.forEach(pipeline => {
                                console.log(`       - ${pipeline.name} (${pipeline.id})`);
                            });
                            workspaceFound = true;
                            break;
                        }
                    }
                } catch (error) {
                    console.log(`     ❌ Error: ${error.message}`);
                }
            }
            
            if (!workspaceFound) {
                console.log('\n❌ Could not find workspace with any of the tested IDs');
                console.log('   You may need to check the correct workspace ID format');
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
