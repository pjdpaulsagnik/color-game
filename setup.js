#!/usr/bin/env node

// Quick setup script for ZenHub PR Tracker
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setup() {
    console.log('🚀 ZenHub PR Tracker Setup\n');
    console.log('This script will help you configure your environment.\n');

    try {
        // Check if .env already exists
        const envPath = path.join(__dirname, '.env');
        if (fs.existsSync(envPath)) {
            const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
            if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
                console.log('Setup cancelled.');
                rl.close();
                return;
            }
        }

        console.log('📝 Please provide the following information:\n');

        // GitHub Configuration
        const githubToken = await question('GitHub Personal Access Token: ');
        const organization = await question('GitHub Organization/Username: ');

        // ZenHub Configuration
        console.log('\n🔧 ZenHub Configuration (optional):');
        const zenhubToken = await question('ZenHub API Token (or press Enter to skip): ');
        
        let workspaceId = '';
        if (zenhubToken) {
            console.log('\n💡 To get your workspace ID, run: node get-workspace-id.js ' + zenhubToken);
            workspaceId = await question('ZenHub Workspace ID (or press Enter to skip): ');
        }

        // Repository Configuration
        console.log('\n📁 Repository Configuration:');
        const repositories = await question('Repositories (comma-separated, e.g., repo1,repo2,repo3): ');

        // Webhook Configuration
        console.log('\n🔗 Webhook Configuration:');
        const webhookUrl = await question('Webhook URL (default: http://localhost:3000/webhook): ') || 'http://localhost:3000/webhook';
        const port = await question('Port (default: 3000): ') || '3000';

        // Create .env file
        const envContent = `# GitHub Configuration
GITHUB_TOKEN=${githubToken}
GITHUB_ORGANIZATION=${organization}

# ZenHub Configuration (GraphQL API)
ZENHUB_TOKEN=${zenhubToken}
ZENHUB_WORKSPACE_ID=${workspaceId}

# Webhook Configuration
WEBHOOK_URL=${webhookUrl}
PORT=${port}

# Optional: Debug mode
DEBUG=false
NODE_ENV=development
`;

        fs.writeFileSync(envPath, envContent);

        console.log('\n✅ Configuration saved to .env file!');
        console.log('\n📋 Next steps:');
        console.log('1. Install dependencies: npm install');
        console.log('2. Start the server: npm start');
        console.log('3. Open your browser: http://localhost:' + port);
        
        if (zenhubToken && !workspaceId) {
            console.log('\n💡 To get your ZenHub workspace ID:');
            console.log('   node get-workspace-id.js ' + zenhubToken);
        }

        console.log('\n🎉 Setup complete! Happy tracking!');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
    } finally {
        rl.close();
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    setup();
}

module.exports = setup;
