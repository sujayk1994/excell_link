#!/bin/bash

# push.sh - Commit and push changes to GitHub with a single command

if [ -z "$1" ]; then
    echo "Usage: ./push.sh \"commit message\""
    exit 1
fi

COMMIT_MESSAGE=$1

echo "Adding changes..."
git add .

echo "Committing changes: $COMMIT_MESSAGE"
git commit -m "$COMMIT_MESSAGE"

echo "Pushing to GitHub..."
git push origin main
