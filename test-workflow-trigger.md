# Test Workflow Trigger

This file is created to test the cross-branch sync workflow.

## What should happen:
1. Commit this file to zen-practice branch
2. Create PR to main
3. Merge PR to main
4. Workflow should create ZenHub card in "iOS to be UPDATED"

## Test commit message:
- Should trigger cross-branch sync detection
- Should create ZenHub issue for commit sync
- Should place card in correct pipeline

Let's test this workflow!
