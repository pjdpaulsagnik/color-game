# 🔄 Cross-Branch Synchronization Tracker

## **Overview**

The **Cross-Branch Synchronization Tracker** is an advanced feature that automatically monitors commits between your `main` and `practice` branches, ensuring they stay in sync. When commits are merged to `main` but not yet synced to `practice`, ZenHub cards are automatically created in the **"iOS to be UPDATED"** pipeline.

## **How It Works**

### **1. Automatic Detection**
- **Trigger**: When code is pushed to `main` branch
- **Action**: Checks if each commit exists in `practice` branch
- **Result**: Creates ZenHub card if commit is missing

### **2. Smart Tracking**
- **Pipeline**: "iOS to be UPDATED" 
- **Labels**: "Cross-Branch Sync", "iOS Update"
- **Status**: ⏳ Waiting to be merged to practice branch

### **3. Auto-Cleanup**
- **Trigger**: When commits are merged to `practice` branch
- **Action**: Removes corresponding ZenHub cards
- **Result**: Clean, up-to-date tracking

## **Pipeline Structure**

```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────┐
│   To Sync      │    │  iOS to be UPDATED   │    │    Done     │
│                 │    │                      │    │             │
│ • New PRs      │    │ • Commits waiting    │    │ • Merged    │
│ • Ready to     │    │   for practice sync  │    │   PRs       │
│   review       │    │ • Cross-branch       │    │   sync needed│
│                 │    │                      │    │   commits   │
└─────────────────┘    └──────────────────────┘    └─────────────┘
```

## **Setup Instructions**

### **Step 1: Create the iOS Pipeline**

```bash
# Run the pipeline creator script
npm run create-ios-pipeline
```

**Manual Creation (if script doesn't work):**
1. Go to your ZenHub workspace dashboard
2. Click "Pipeline Settings" or gear icon
3. Click "Add Pipeline"
4. Name: `iOS to be UPDATED`
5. Description: `Commits from main branch waiting to be synced to practice branch`
6. Color: Choose distinctive color (e.g., #ff6b6b)
7. Position: After "To Sync" pipeline

### **Step 2: Get Pipeline ID**

After creating the pipeline, run the script again to get the ID:
```bash
npm run create-ios-pipeline
```

### **Step 3: Update Workflow**

Update the pipeline ID in `.github/workflows/pr-tracker.yml`:
```javascript
getPipelineId(pipelineName) {
  const pipelineMap = {
    'To Sync': 'Z2lkOi8vcmFwdG9yL1BpcGVsaW5lLzM0OTE3MTM',
    'Doing': 'Z2lkOi8vcmFwdG9yL1BpcGVsaW5lLzM0OTE3MTQ',
    'iOS to be UPDATED': 'YOUR_ACTUAL_PIPELINE_ID_HERE' // Replace this
  };
  return pipelineMap[pipelineName] || 'Z2lkOi8vcmFwdG9yL1BpcGVsaW5lLzM0OTE3MTM';
}
```

## **Testing the Feature**

### **Test Cross-Branch Sync**
```bash
npm run test-cross-branch
```

This will:
- Check commits in both branches
- Find commits that need syncing
- Verify ZenHub access
- Simulate issue creation

### **Test with Real Commits**

1. **Push to main branch:**
   ```bash
   git checkout main
   git add .
   git commit -m "Add new feature for cross-branch sync"
   git push origin main
   ```

2. **Check ZenHub:**
   - Look for new card in "iOS to be UPDATED" pipeline
   - Card should show commit details and sync status

3. **Sync to practice branch:**
   ```bash
   git checkout practice
   git merge main
   git push origin practice
   ```

4. **Verify cleanup:**
   - Card should disappear from "iOS to be UPDATED"
   - Commit is now synced between branches

## **Workflow Events**

### **Push to Main Branch**
```yaml
on:
  push:
    branches: [main, master, develop, practice]
```

**What happens:**
1. Detects new commits in `main`
2. Checks if commits exist in `practice`
3. Creates ZenHub cards for missing commits
4. Places cards in "iOS to be UPDATED" pipeline

### **Push to Practice Branch**
```yaml
# Automatically triggered when practice branch is updated
```

**What happens:**
1. Detects new commits in `practice`
2. Compares with `main` branch commits
3. Removes ZenHub cards for synced commits
4. Keeps tracking clean and up-to-date

## **ZenHub Card Details**

### **Card Title Format**
```
[SYNC NEEDED] Your commit message here
```

### **Card Content**
```
**Commit:** abc1234
**Message:** Add new feature for cross-branch sync
**Author:** @username
**Branch:** main → practice
**Status:** ⏳ Waiting to be merged to practice branch
**Action Required:** Merge this commit to practice branch to sync changes.
```

### **Card Labels**
- 🏷️ **Cross-Branch Sync** (#ff6b6b)
- 🏷️ **iOS Update** (#4ecdc4)

## **Configuration**

### **Environment Variables**
```env
# Required for cross-branch sync
ZENHUB_TOKEN=your_zenhub_token
ZENHUB_WORKSPACE_ID=your_workspace_id
GITHUB_TOKEN=your_github_token
```

### **GitHub Secrets**
Make sure these are set in your repository:
- `ZENHUB_TOKEN`
- `ZENHUB_WORKSPACE_ID`
- `GITHUB_TOKEN`

## **Troubleshooting**

### **Cards Not Appearing**
1. Check if "iOS to be UPDATED" pipeline exists
2. Verify pipeline ID in workflow
3. Check GitHub Actions logs for errors
4. Ensure repository is connected to ZenHub workspace

### **Cards Not Disappearing**
1. Check if commits are actually synced
2. Verify practice branch has the commits
3. Check GitHub Actions logs for cleanup errors

### **Permission Issues**
1. Ensure ZenHub token has write access
2. Check if you're workspace admin
3. Verify repository permissions

## **Advanced Features**

### **Scheduled Cleanup**
The workflow runs every hour to:
- Check for stale sync issues
- Clean up resolved items
- Maintain accurate tracking

### **Manual Trigger**
```bash
# Manually trigger cross-branch sync check
# Go to GitHub Actions → PR Tracker Automation → Run workflow
```

### **Webhook Notifications**
- Real-time updates via webhook
- Track sync status changes
- Monitor cross-branch activities

## **Use Cases**

### **Development Teams**
- Keep `main` and `practice` branches synchronized
- Track which features need iOS updates
- Ensure no commits are missed

### **Release Management**
- Monitor cross-branch sync status
- Track deployment readiness
- Maintain release consistency

### **Quality Assurance**
- Verify all changes are propagated
- Track sync completion
- Maintain audit trail

## **Benefits**

✅ **Automated Tracking**: No manual monitoring needed  
✅ **Real-time Updates**: Instant visibility into sync status  
✅ **Clean Workflow**: Automatic cleanup of resolved items  
✅ **Cross-team Visibility**: Everyone sees what needs syncing  
✅ **Audit Trail**: Complete history of branch synchronization  

## **Next Steps**

1. **Create the iOS pipeline** in ZenHub
2. **Test the functionality** with sample commits
3. **Monitor the automation** in GitHub Actions
4. **Customize labels and colors** as needed
5. **Scale to other branches** if required

---

**🎯 Goal**: Ensure your `main` and `practice` branches are always in sync with automated tracking and cleanup!
