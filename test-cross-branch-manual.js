require('dotenv').config();
const { Octokit } = require('@octokit/rest');
const axios = require('axios');

class CrossBranchSyncTester {
  constructor() {
    this.github = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });
    this.zenhubToken = process.env.ZENHUB_TOKEN;
    this.organization = 'pjdpaulsagnik';
    this.repository = 'color-game';
  }

  async testCrossBranchSync() {
    console.log('🧪 Testing Cross-Branch Sync Logic...\n');
    
    try {
      // 1. Get recent commits from main branch
      console.log('1️⃣ Fetching recent commits from main branch...');
      const mainCommits = await this.getMainBranchCommits();
      console.log(`   Found ${mainCommits.length} commits in main branch\n`);
      
      // 2. Check each commit against practice branch
      console.log('2️⃣ Checking commits against practice branch...');
      for (const commit of mainCommits.slice(0, 5)) { // Check last 5 commits
        const existsInPractice = await this.commitExistsInBranch(commit.sha, 'practice');
        console.log(`   Commit ${commit.sha.substring(0, 7)}: ${existsInPractice ? '✅ EXISTS' : '❌ MISSING'} in practice branch`);
        
        if (!existsInPractice) {
          console.log(`   🔄 This commit needs syncing to practice branch!`);
          await this.testCreateCrossBranchSyncIssue(commit);
        }
      }
      
    } catch (error) {
      console.error('❌ Error testing cross-branch sync:', error.message);
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
      console.warn('Error fetching main branch commits:', error.message);
      return [];
    }
  }

  async commitExistsInBranch(commitSha, branchName) {
    try {
      const response = await this.github.rest.repos.getCommit({
        owner: this.organization,
        repo: this.repository,
        ref: `${branchName}:${commitSha}`
      });
      return true;
    } catch (error) {
      if (error.status === 404) {
        return false;
      }
      console.warn(`Warning checking commit ${commitSha.substring(0, 7)} in ${branchName}:`, error.message);
      return false;
    }
  }

  async testCreateCrossBranchSyncIssue(commit) {
    console.log(`\n🔄 Testing cross-branch sync issue creation for commit ${commit.sha.substring(0, 7)}`);
    console.log(`🔑 ZenHub Token: ${this.zenhubToken ? 'Present' : 'Missing'}`);
    console.log(`🏢 Workspace ID: ${process.env.ZENHUB_WORKSPACE_ID || 'Missing'}`);
    
    if (!this.zenhubToken) {
      console.log('❌ No ZenHub token, skipping test');
      return;
    }
    
    if (!process.env.ZENHUB_WORKSPACE_ID) {
      console.log('❌ No ZenHub workspace ID, skipping test');
      return;
    }

    try {
      const repositoryGhId = await this.getRepositoryGhId();
      console.log(`📦 Repository GitHub ID: ${repositoryGhId}`);
      
      if (repositoryGhId === 0) {
        console.log('❌ Could not fetch repository GitHub ID');
        return;
      }

      console.log('✅ All prerequisites met - ready to create ZenHub issue');
      console.log('   (This is a test - not actually creating the issue)');
      
    } catch (error) {
      console.error('❌ Error in test:', error.message);
    }
  }

  async getRepositoryGhId() {
    try {
      const response = await this.github.rest.repos.get({
        owner: this.organization,
        repo: this.repository
      });
      return response.data.id;
    } catch (error) {
      console.warn(`Error fetching GitHub repo ID:`, error.message);
      return 0;
    }
  }
}

// Run the test
const tester = new CrossBranchSyncTester();
tester.testCrossBranchSync().catch(console.error);
