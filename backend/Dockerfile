FROM node:18-alpine

# Security: Install security updates
RUN apk upgrade --no-cache

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with npm audit
RUN npm ci --only=production && npm audit fix --force || true

# Copy application code
COPY . .

# Create non-root user with limited privileges
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs -h /app -s /bin/sh

# Create uploads directory with secure permissions
RUN mkdir -p /app/uploads && \
    chown -R nodejs:nodejs /app && \
    chmod -R 755 /app && \
    chmod 750 /app/uploads

# Security: Remove unnecessary packages and clear cache
RUN apk del --purge && \
    rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

# Switch to non-root user
USER nodejs

# Security: Use specific port binding
EXPOSE 3001

# Security: Use node instead of npm for production
CMD ["node", "server.js"]