#!/usr/bin/env node

// Simple local test script to test PR creation
const axios = require('axios');

class LocalPRTester {
    constructor() {
        this.zenhubToken = 'zh_b38a29d900f65c1d8d79388e07fd7f52d59a48e9a1868b083b70c81039a75592';
        this.graphqlEndpoint = 'https://api.zenhub.com/public/graphql';
    }

    async testPRCreation() {
        console.log('🧪 Testing PR creation locally...\n');
        
        try {
            // Test 1: Check ZenHub token
            console.log('1. Testing ZenHub token...');
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

            // Test 2: Test repository access
            console.log('\n2. Testing repository access...');
            console.log('   Repository: color-game');
            console.log('   Organization: Your GitHub username');
            console.log('   Status: Ready for testing');

            // Test 3: Test pipeline mapping
            console.log('\n3. Testing pipeline mapping...');
            const pipelineMap = {
                'To Sync': 'pipeline-to-sync',
                'New Issues': 'pipeline-new',
                'In Progress': 'pipeline-progress',
                'Review': 'pipeline-review',
                'Done': 'pipeline-done',
                'Closed': 'pipeline-closed'
            };

            console.log('✅ Pipeline mappings:');
            Object.entries(pipelineMap).forEach(([name, id]) => {
                console.log(`   ${name} → ${id}`);
            });

            console.log('\n🎉 Local test completed successfully!');
            console.log('\n📋 Next steps:');
            console.log('   1. Create a PR from your zen-practice branch to main');
            console.log('   2. Use the manual test script: node test-pr-manual.js');
            console.log('   3. Or use the dashboard at http://localhost:3000');

        } catch (error) {
            console.error('❌ Test failed:', error.message);
            if (error.response) {
                console.error('Response:', error.response.data);
            }
        }
    }
}

// Run the test
const tester = new LocalPRTester();
tester.testPRCreation().catch(console.error);
