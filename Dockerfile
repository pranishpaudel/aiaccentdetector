# Use the official Node.js image based on Alpine
FROM node:18-alpine

# Install ffmpeg and other necessary tools
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /node-app

# Copy and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
