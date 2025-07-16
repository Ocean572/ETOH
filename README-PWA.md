# ETOH Tracker - Progressive Web App

Transform your alcohol tracking app into a production-ready PWA with a single command.

## 🚀 Quick Start

### Development
```bash
./start.sh
```

### Production
```bash
./start-prod.sh
```

## 📱 Access Your App

### Development
- **Expo DevTools**: http://localhost:8081
- **Web App**: http://localhost:19006

### Production  
- **Web App (PWA)**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## 📲 Install as PWA

### Desktop (Chrome/Edge)
1. Open http://localhost:3000
2. Look for install icon in address bar
3. Click "Install ETOH Tracker"

### iOS Safari  
1. Open http://localhost:3000
2. Tap Share button
3. Tap "Add to Home Screen"

### Android Chrome
1. Open http://localhost:3000  
2. Tap menu (3 dots)
3. Tap "Install app"

## 🔧 Configuration

### Environment Variables
Edit `.env` file for production:

```bash
# Required: Change these for production
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret-key
ANON_KEY=your-anon-key
SERVICE_ROLE_KEY=your-service-role-key

# URLs (adjust for your domain)
API_EXTERNAL_URL=https://your-domain.com
SUPABASE_PUBLIC_URL=https://your-domain.com  
SITE_URL=https://your-app-domain.com
```

### Nginx Reverse Proxy
Point your nginx to:
- **App**: http://localhost:3000
- **API**: http://localhost:54321

Example nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # App
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # API  
    location /api/ {
        proxy_pass http://localhost:54321/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│   React PWA     │────│    Kong      │────│ PostgreSQL  │
│  (Expo Web)     │    │   Gateway    │    │  Database   │
│  Port: 3000     │    │  Port: 54321 │    │ Port: 5432  │
└─────────────────┘    └──────────────┘    └─────────────┘
                              │
                    ┌──────────────────┐
                    │   Supabase       │
                    │   Services       │
                    │ (Auth, Storage,  │
                    │  Functions, etc) │
                    └──────────────────┘
```

## 🎯 PWA Features

✅ **Offline Support**: Service worker caching  
✅ **Install Prompt**: Add to home screen  
✅ **App-like Experience**: Full screen mode  
✅ **Fast Loading**: Optimized bundles  
✅ **Responsive**: Works on all screen sizes  
✅ **Secure**: HTTPS ready with proper headers  

## 🔒 Security Features

- Content Security Policy headers
- Secure authentication with JWT
- Row-level security policies  
- Private storage buckets
- Input validation and sanitization

## 📊 Monitoring

View logs:
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f expo-app
docker compose logs -f supabase-db
```

Health checks:
```bash
# App health
curl http://localhost:3000/health

# API health  
curl http://localhost:54321/health
```

## 🔄 Management Commands

```bash
# Start
docker compose up -d

# Stop
docker compose down

# Restart
docker compose restart

# Update
docker compose pull
docker compose up -d --build

# Reset database (WARNING: loses data)
docker compose down -v
docker compose up -d
```

## 🌐 Production Deployment

1. **Update environment variables** in `.env`
2. **Set up SSL** with Let's Encrypt
3. **Configure domain** in nginx  
4. **Enable backups** for PostgreSQL
5. **Monitor logs** and health endpoints

## 📱 PWA Capabilities

When installed, users get:
- Native app icon on home screen
- Full screen experience  
- Offline functionality
- Push notifications (if enabled)
- Fast app switching
- OS-level app management

## 🤝 Contributing

The app is containerized and ready for:
- Development environments
- CI/CD pipelines  
- Production hosting
- Multi-environment deployments

Perfect for teams wanting to self-host their alcohol tracking solution!