#!/bin/bash

# Shaji Pappan's GitHub Push Script

if [ -z "$1" ]; then
    COMMIT_MSG="Update Shaji Pappan Link Estractor"
else
    COMMIT_MSG="$1"
fi

echo "Staging changes..."
git add .

echo "Committing with message: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

echo "Pushing to GitHub..."
git push origin main
