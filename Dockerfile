# Use the official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy the rest of the source code
COPY . .

# Expose the port (make sure it matches the one used in your code)
EXPOSE 3000

# Start the app
CMD ["node", "index.js"]
