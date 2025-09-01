#!/usr/bin/env node

// Test script to simulate PR creation and ZenHub issue creation
const axios = require('axios');

class PRCreationTester {
    constructor() {
        this.zenhubToken = 'zh_b38a29d900f65c1d8d79388e07fd7f52d59a48e9a1868b083b70c81039a75592';
        this.graphqlEndpoint = 'https://api.zenhub.com/public/graphql';
    }

    async testPRCreation() {
        console.log('🧪 Testing PR to ZenHub Issue Creation\n');
        
        try {
            // Test 1: Check if we can connect to ZenHub
            console.log('1. Testing ZenHub connection...');
            const userQuery = `
                query {
                    viewer {
                        id
                        name
                        email
                    }
                }
            `;

            const response = await axios.post(this.graphqlEndpoint, {
                query: userQuery
            }, {
                headers: {
                    'Authorization': `Bearer ${this.zenhubToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.errors) {
                console.error('❌ ZenHub connection failed:', response.data.errors);
                return;
            }

            console.log('✅ Connected to ZenHub as:', response.data.data?.viewer?.name || 'Unknown');
            console.log('   User ID:', response.data.data?.viewer?.id);

            // Test 2: Try to get available pipelines
            console.log('\n2. Testing pipeline access...');
            await this.testPipelineAccess();

            // Test 3: Simulate creating an issue for a PR
            console.log('\n3. Testing issue creation...');
            await this.testIssueCreation();

        } catch (error) {
            console.error('❌ Test failed:', error.message);
        }
    }

    async testPipelineAccess() {
        try {
            // This is a simplified test - in reality, you'd need to know your workspace ID
            console.log('   Note: Pipeline access requires a valid workspace ID');
            console.log('   You can find this in your ZenHub dashboard URL');
            console.log('   For now, we\'ll use a default workspace ID');
        } catch (error) {
            console.warn('   Pipeline test skipped:', error.message);
        }
    }

    async testIssueCreation() {
        try {
            console.log('   Simulating PR #123 creation...');
            
            // This would normally create an issue, but we'll just show the structure
            const mockPRData = {
                number: 123,
                title: 'Test PR: Add new feature',
                body: 'This is a test pull request to verify ZenHub integration',
                user: { login: 'testuser' },
                html_url: 'https://github.com/test/repo/pull/123',
                state: 'open'
            };

            console.log('   PR Data:', {
                title: mockPRData.title,
                number: mockPRData.number,
                author: mockPRData.user.login
            });

            console.log('   ✅ This would create a ZenHub issue with:');
            console.log('      - Title: [PR #123] Test PR: Add new feature');
            console.log('      - Pipeline: New Issues');
            console.log('      - Label: Pull Request');
            console.log('      - Estimate: 1 point');

        } catch (error) {
            console.warn('   Issue creation test failed:', error.message);
        }
    }

    async showInstructions() {
        console.log('\n📋 How to Test the Full Workflow:\n');
        console.log('1. Make sure your .env file has:');
        console.log('   - GITHUB_TOKEN=your_github_token');
        console.log('   - GITHUB_ORGANIZATION=your_username_or_org');
        console.log('   - ZENHUB_TOKEN=zh_b38a29d900f65c1d8d79388e07fd7f52d59a48e9a1868b083b70c81039a75592');
        console.log('   - ZENHUB_WORKSPACE_ID=your_workspace_id (or leave empty)');
        console.log('');
        console.log('2. Start the server: npm start');
        console.log('');
        console.log('3. Create a test repository and push some code:');
        console.log('   git init test-repo');
        console.log('   git add .');
        console.log('   git commit -m "Initial commit"');
        console.log('   git branch practice');
        console.log('   git checkout practice');
        console.log('   # Make some changes');
        console.log('   git add .');
        console.log('   git commit -m "Add new feature"');
        console.log('   git push origin practice');
        console.log('');
        console.log('4. Create a pull request from practice → main');
        console.log('');
        console.log('5. Check your ZenHub workspace - you should see a new card!');
        console.log('');
        console.log('6. Monitor the server logs to see the creation process');
    }
}

// Main execution
async function main() {
    const tester = new PRCreationTester();
    await tester.testPRCreation();
    await tester.showInstructions();
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = PRCreationTester;
