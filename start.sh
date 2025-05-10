#!/bin/bash

# Run docker-compose up with sudo
echo "Starting docker containers..."
sudo docker-compose up -d

# Build the project
echo "Building the project..."
npm run build

# Start the project
echo "Starting the project..."
npm start
