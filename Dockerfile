# Build stage
FROM node:18-alpine AS builder
RUN npm install -g @expo/cli
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx expo export -p web

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]