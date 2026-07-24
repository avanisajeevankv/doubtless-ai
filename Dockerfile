# Use the official Node.js 18 alpine image as base
FROM node:18-alpine

# Create and set working directory
WORKDIR /usr/src/app

# Copy package configurations
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy application source code (excluding those in .dockerignore)
COPY . .

# Expose port 3000 (or the port defined by the environment variable PORT)
EXPOSE 3000

# Set environment production defaults
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["node", "server.js"]
