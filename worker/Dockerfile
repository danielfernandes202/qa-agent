FROM mcr.microsoft.com/playwright:v1.60.0-jammy

# Create app directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Expose the port
EXPOSE 3001

# Start the worker
CMD ["node", "dist/server.js"]
