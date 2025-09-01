#!/usr/bin/env node

// Manual test script to create a ZenHub issue for a specific PR
const axios = require('axios');

class ManualPRTester {
    constructor() {
        this.zenhubToken = 'zh_b38a29d900f65c1d8d79388e07fd7f52d59a48e9a1868b083b70c81039a75592';
        this.graphqlEndpoint = 'https://api.zenhub.com/public/graphql';
    }

    async testPRCreation(repoName, prNumber, githubToken, organization) {
        console.log(`🧪 Testing PR #${prNumber} creation in ${organization}/${repoName}\n`);
        
        try {
            // Step 1: Get PR data from GitHub
            console.log('1. Fetching PR data from GitHub...');
            const githubResponse = await axios.get(`https://api.github.com/repos/${organization}/${repoName}/pulls/${prNumber}`, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            const prData = githubResponse.data;
            console.log('✅ PR Data:', {
                title: prData.title,
                number: prData.number,
                author: prData.user.login,
                state: prData.state,
                url: prData.html_url
            });

            // Step 2: Get GitHub repository ID
            console.log('\n2. Getting GitHub repository ID...');
            const repoResponse = await axios.get(`https://api.github.com/repos/${organization}/${repoName}`, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            const repoId = repoResponse.data.id;
            console.log('✅ Repository ID:', repoId);

            // Step 3: Create ZenHub issue
            console.log('\n3. Creating ZenHub issue...');
            const createIssueMutation = `
                mutation createIssue($input: CreateIssueInput!) {
                    createIssue(input: $input) {
                        issue {
                            id
                            number
                            title
                        }
                    }
                }
            `;

            const variables = {
                input: {
                    repositoryGhId: repoId,
                    title: `[PR #${prNumber}] ${prData.title}`,
                    body: `**Pull Request:** #${prNumber}\n\n**Description:** ${prData.body || 'No description'}\n\n**Author:** @${prData.user.login}\n\n**Status:** ${prData.state}\n\n**Link:** ${prData.html_url}`,
                    estimate: { value: 1 },
                    labels: [{ name: 'Pull Request', color: '#0366d6' }]
                }
            };

            const response = await axios.post(this.graphqlEndpoint, {
                query: createIssueMutation,
                variables: variables
            }, {
                headers: {
                    'Authorization': `Bearer ${this.zenhubToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.errors) {
                console.error('❌ ZenHub errors:', response.data.errors);
                return;
            }

            const issue = response.data.data?.createIssue?.issue;
            if (issue) {
                console.log('✅ Created ZenHub issue:', {
                    id: issue.id,
                    number: issue.number,
                    title: issue.title
                });
                console.log('\n🎉 Check your ZenHub workspace - you should see the new card in "To Sync" pipeline!');
            } else {
                console.log('❌ Failed to create issue');
            }

        } catch (error) {
            console.error('❌ Test failed:', error.message);
            if (error.response) {
                console.error('Response:', error.response.data);
            }
        }
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 4) {
        console.log('❌ Usage: node test-pr-manual.js <repo_name> <pr_number> <github_token> <organization>');
        console.log('');
        console.log('Example:');
        console.log('  node test-pr-manual.js color-game 5 your_github_token your_username');
        process.exit(1);
    }

    const [repoName, prNumber, githubToken, organization] = args;
    const tester = new ManualPRTester();
    await tester.testPRCreation(repoName, prNumber, githubToken, organization);
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = ManualPRTester;
