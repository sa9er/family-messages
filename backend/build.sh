#!/bin/bash
# Clean build script for backend only
rm -rf node_modules
npm install
rm -rf dist
npx tsc --skipLibCheck
