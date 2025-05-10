#!/bin/bash

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "Node.js is not installed. Please install Node.js to proceed."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null
then
    echo "Docker is not installed. Please install Docker to proceed."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null
then
    echo "Docker Compose is not installed. Please install Docker Compose to proceed."
    exit 1
fi

# Run docker-compose up with sudo
echo "Starting docker containers..."
sudo docker-compose up -d

# Install node modules
npm install

# Build the project
echo "Building the project..."
npm run build

# Start the project
echo "Starting the project..."
npm start
