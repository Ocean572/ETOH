# ETOH Tracker - First-Time Setup Guide

A comprehensive alcohol tracking Progressive Web App with Docker Compose deployment.

## 🚀 Quick Start

**For the impatient:** Just run this command and everything will be set up automatically:

```bash
docker compose up --build -d
```

Then open [http://localhost:19006](http://localhost:19006) in your browser.

## 📋 Prerequisites

- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 2.0 or higher)
- **8GB RAM minimum** (recommended: 16GB)
- **Ports available**: 19006, 8000, 5432, 3000

## 🔧 Environment Setup

### Option 1: Use Existing .env File
The repository includes a pre-configured `.env` file with working defaults.

### Option 2: Create Custom .env File
Create a `.env` file in the project root with these variables:

```env
# App Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-domain.com/supabase
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-jwt-token
EXPO_PUBLIC_SUPABASE_SERVICE_KEY=your-service-jwt-token

# Security
JWT_SECRET=your-super-secret-jwt-secret-key
POSTGRES_PASSWORD=your-secure-postgres-password
```

## 🛠 Installation Methods

### Method 1: Automatic Setup (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SUD_alcohol
   ```

2. **Run the setup script**
   ```bash
   ./setup-first-time.sh
   ```

3. **Access the application**
   - Main App: http://localhost:19006
   - API Gateway: http://localhost:8000

### Method 2: Manual Setup

1. **Create the Docker network**
   ```bash
   docker network create secure-app-network
   ```

2. **Build and start services**
   ```bash
   docker compose up --build -d
   ```

3. **Wait for services to be ready** (about 2-3 minutes)

4. **Verify setup**
   ```bash
   docker compose ps
   ```

## 🏗 Architecture Overview

The application consists of these services:

- **App Container**: React Native Expo PWA (Port 19006)
- **Kong Gateway**: API routing and authentication (Port 8000)
- **Supabase Auth**: User authentication service
- **PostgREST**: Automatic REST API for PostgreSQL
- **PostgreSQL**: Database with automatic schema setup
- **Supabase Storage**: File storage for profile pictures
- **Supabase Realtime**: WebSocket subscriptions

## 🔐 Security Features

- **Row Level Security (RLS)**: Users can only access their own data
- **JWT Authentication**: Secure token-based authentication
- **CORS Protection**: Configured for production use
- **Encrypted Database**: All sensitive data encrypted at rest

## 🗃 Database Auto-Setup

The database is automatically configured with:

- ✅ **All Tables**: Users, drinks, goals, friends, etc.
- ✅ **Row Level Security**: Proper data isolation
- ✅ **Indexes**: Optimized for performance
- ✅ **Triggers**: Auto-updating timestamps
- ✅ **Storage Buckets**: Profile picture storage
- ✅ **Realtime**: Live data subscriptions

## 🌐 Production Configuration

For production deployment:

1. **Update .env file** with your domain:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-domain.com/supabase
   ```

2. **Configure nginx** (if using external proxy):
   ```nginx
   location /supabase/ {
       proxy_pass http://your-server:8000/supabase/;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
   }
   ```

3. **Set up SSL certificates** for HTTPS

## 🧪 Testing the Setup

### Verify Database Connection
```bash
docker compose exec db psql -U postgres -d postgres -c "SELECT COUNT(*) FROM profiles;"
```

### Test API Endpoints
```bash
# Test auth endpoint
curl http://localhost:8000/supabase/auth/v1/health

# Test REST API
curl http://localhost:8000/supabase/rest/v1/profiles
```

### Check App Status
```bash
curl http://localhost:19006/health
```

## 🔍 Troubleshooting

### Services Won't Start
```bash
# Check logs
docker compose logs

# Restart specific service
docker compose restart <service-name>

# Full reset
docker compose down -v
docker compose up --build -d
```

### Database Issues
```bash
# Check database health
docker compose exec db pg_isready -U postgres -d postgres

# View database logs
docker compose logs db

# Connect to database
docker compose exec db psql -U postgres -d postgres
```

### App Connection Issues
```bash
# Check Kong gateway
curl http://localhost:8000

# Check app container
docker compose logs app

# Rebuild app
docker compose build app
docker compose up -d app
```

### Common Port Conflicts
If ports are already in use:
- Change `19006:80` to `19007:80` in docker-compose.yml
- Change `8000:8000` to `8001:8000` in docker-compose.yml

## 📊 Development vs Production

### Development Mode
- Uses `docker-compose.yml`
- Includes debug logging
- Hot reloading enabled
- PostgREST port exposed for debugging

### Production Mode
- All services optimized for performance
- Minimal logging
- Security headers enabled
- No debug ports exposed

## 🚨 Important Notes

1. **First-time setup takes 5-10 minutes** - Docker needs to download images
2. **Database initialization happens automatically** - No manual setup required
3. **All passwords are in .env file** - Keep it secure!
4. **RLS is enabled by default** - Users can only see their own data
5. **JWT tokens are pre-configured** - Ready to use out of the box

## 🤝 Support

If you encounter issues:

1. Check the logs: `docker compose logs`
2. Ensure all ports are available
3. Verify Docker has enough resources
4. Try a clean restart: `docker compose down -v && docker compose up --build -d`

## 🎯 What's Included

- ✅ **Complete PWA setup** with offline support
- ✅ **User authentication** with email/password
- ✅ **Drink tracking** with charts and analytics
- ✅ **Social features** with friends and goals
- ✅ **Health metrics** with risk assessments
- ✅ **Profile management** with picture uploads
- ✅ **Data export** capabilities
- ✅ **Mobile-responsive** design
- ✅ **Production-ready** deployment

**Just run `docker compose up --build -d` and start tracking! 🍺**