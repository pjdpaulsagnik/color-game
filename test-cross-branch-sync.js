const { Octokit } = require('@octokit/rest');
const axios = require('axios');
require('dotenv').config();

class CrossBranchSyncTester {
  constructor() {
    this.github = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });
    this.zenhubToken = process.env.ZENHUB_TOKEN;
    this.workspaceId = '68b5e4dd7bd773001775b072'; // Use correct format
    this.organization = process.env.GITHUB_ORGANIZATION || 'pjdpaulsagnik';
    this.repository = 'color-game';
    this.graphqlEndpoint = 'https://api.zenhub.com/public/graphql';
  }

  async testCrossBranchSync() {
    console.log('🔍 Cross-Branch Synchronization Tester');
    console.log('=====================================\n');

    if (!this.github.auth || !this.zenhubToken) {
      console.error('❌ Missing tokens. Please check your .env file.');
      return;
    }

    try {
      // Test 1: Check main branch commits
      console.log('📋 Test 1: Checking main branch commits...');
      const mainCommits = await this.getMainBranchCommits();
      console.log(`   Found ${mainCommits.length} commits in main branch`);
      
      if (mainCommits.length > 0) {
        const latestCommit = mainCommits[0];
        console.log(`   Latest commit: ${latestCommit.sha.substring(0, 7)} - ${latestCommit.commit.message.split('\n')[0]}`);
      }

      // Test 2: Check practice branch commits
      console.log('\n📋 Test 2: Checking practice branch commits...');
      const practiceCommits = await this.getPracticeBranchCommits();
      console.log(`   Found ${practiceCommits.length} commits in practice branch`);
      
      if (practiceCommits.length > 0) {
        const latestPracticeCommit = practiceCommits[0];
        console.log(`   Latest commit: ${latestPracticeCommit.sha.substring(0, 7)} - ${latestPracticeCommit.commit.message.split('\n')[0]}`);
      }

      // Test 3: Find commits that need syncing
      console.log('\n📋 Test 3: Finding commits that need syncing...');
      const commitsToSync = await this.findCommitsToSync(mainCommits, practiceCommits);
      
      if (commitsToSync.length > 0) {
        console.log(`   Found ${commitsToSync.length} commits that need syncing:`);
        commitsToSync.forEach(commit => {
          console.log(`     - ${commit.sha.substring(0, 7)}: ${commit.commit.message.split('\n')[0]}`);
        });
      } else {
        console.log('   ✅ All commits are synced between branches!');
      }

      // Test 4: Check ZenHub pipeline access
      console.log('\n📋 Test 4: Checking ZenHub pipeline access...');
      const hasAccess = await this.testZenHubAccess();
      if (hasAccess) {
        console.log('   ✅ ZenHub access confirmed');
      } else {
        console.log('   ❌ ZenHub access failed');
      }

      // Test 5: Simulate cross-branch sync issue creation
      if (commitsToSync.length > 0 && hasAccess) {
        console.log('\n📋 Test 5: Simulating cross-branch sync issue creation...');
        const testCommit = commitsToSync[0];
        await this.simulateCrossBranchSyncIssue(testCommit);
      }

      // Summary
      console.log('\n📊 Summary:');
      console.log(`   Main branch commits: ${mainCommits.length}`);
      console.log(`   Practice branch commits: ${practiceCommits.length}`);
      console.log(`   Commits needing sync: ${commitsToSync.length}`);
      console.log(`   ZenHub access: ${hasAccess ? '✅' : '❌'}`);

    } catch (error) {
      console.error('❌ Error during testing:', error.message);
    }
  }

  async getMainBranchCommits() {
    try {
      const response = await this.github.rest.repos.listCommits({
        owner: this.organization,
        repo: this.repository,
        sha: 'main',
        per_page: 10
      });
      return response.data;
    } catch (error) {
      console.warn('   ⚠️ Could not fetch main branch commits:', error.message);
      return [];
    }
  }

  async getPracticeBranchCommits() {
    try {
      const response = await this.github.rest.repos.listCommits({
        owner: this.organization,
        repo: this.repository,
        sha: 'practice',
        per_page: 10
      });
      return response.data;
    } catch (error) {
      console.warn('   ⚠️ Could not fetch practice branch commits:', error.message);
      return [];
    }
  }

  async findCommitsToSync(mainCommits, practiceCommits) {
    const practiceCommitShas = new Set(practiceCommits.map(c => c.sha));
    return mainCommits.filter(commit => !practiceCommitShas.has(commit.sha));
  }

  async testZenHubAccess() {
    try {
      const query = `
        query testWorkspaceAccess($workspaceId: ID!) {
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
          'Authorization': `Bearer ${this.zenhubToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.errors) {
        console.warn('   ⚠️ GraphQL errors:', response.data.errors);
        return false;
      }

      const workspace = response.data.data?.workspace;
      if (workspace) {
        console.log(`   Workspace: ${workspace.name}`);
        console.log(`   Pipelines: ${workspace.pipelines?.length || 0}`);
        return true;
      }

      return false;
    } catch (error) {
      console.warn('   ⚠️ ZenHub access test failed:', error.message);
      return false;
    }
  }

  async simulateCrossBranchSyncIssue(commit) {
    try {
      console.log(`   Simulating issue creation for commit ${commit.sha.substring(0, 7)}...`);
      
      // Check if iOS pipeline exists
      const iosPipeline = await this.findIOSPipeline();
      if (!iosPipeline) {
        console.log('   ⚠️ "iOS to be UPDATED" pipeline not found. Please create it first.');
        return;
      }

      console.log(`   ✅ Found "iOS to be UPDATED" pipeline: ${iosPipeline.id}`);
      console.log(`   📝 Would create issue: [SYNC NEEDED] ${commit.commit.message.split('\n')[0]}`);
      console.log(`   🎯 Would place in pipeline: ${iosPipeline.name}`);

    } catch (error) {
      console.warn('   ⚠️ Simulation failed:', error.message);
    }
  }

  async findIOSPipeline() {
    try {
      const query = `
        query getWorkspacePipelines($workspaceId: ID!) {
          workspace(id: $workspaceId) {
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
          'Authorization': `Bearer ${this.zenhubToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.errors) {
        return null;
      }

      const pipelines = response.data.data?.workspace?.pipelines || [];
      return pipelines.find(p => p.name === 'iOS to be UPDATED');
    } catch (error) {
      return null;
    }
  }
}

// Run the test
async function main() {
  const tester = new CrossBranchSyncTester();
  await tester.testCrossBranchSync();
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Create "iOS to be UPDATED" pipeline in ZenHub if it doesn\'t exist');
  console.log('2. Run: npm run create-ios-pipeline');
  console.log('3. Test with actual commits by pushing to main branch');
  console.log('4. Check if ZenHub cards are created automatically');
}

main().catch(console.error);
