#!/bin/bash

echo "🔥 Starting Neurofoundry Authentication Server"
echo "=============================================="
echo ""
echo "Server will start on: http://localhost:3000"
echo "Test page will be at: http://localhost:3000/auth-test.html"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
node server/index.js
