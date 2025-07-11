# ETOH - Alcohol Tracking App

A React Native app built with Expo and Supabase for tracking alcohol consumption and reducing health risks.

## Features

- 📊 Track daily alcohol consumption
- 📈 View consumption history with interactive charts
- 🎯 Set and track daily drinking goals
- 🏥 Health risk assessment and education
- 👤 User profiles with motivation tracking
- 🔄 Data reset functionality

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

#### Option A: Local Development (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase instance
supabase start

# Apply database migrations
supabase db reset
```

#### Option B: Supabase Cloud
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key

### 3. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your Supabase credentials
# For local development, use:
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key

# For production, use your actual Supabase project URL and keys
```

### 4. Database Schema

The database will be automatically created when you run `supabase db reset`. The schema includes:

- **profiles** - User profile information
- **drink_entries** - Individual drink logs
- **user_goals** - Daily drinking goals
- **user_settings** - User preferences and limits
- **health_assessments** - Health risk calculations
- **social_contacts** - Accountability contacts

### 5. Run the App

```bash
# Start the development server
npm start

# Then:
# - Scan QR code with Expo Go (mobile)
# - Press 'w' to open in browser
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
```

## Architecture

### Frontend
- **React Native** with Expo
- **React Navigation** for navigation
- **Chart Kit** for data visualization
- **TypeScript** for type safety

### Backend
- **Supabase** for database and authentication
- **PostgreSQL** database with Row Level Security
- **Real-time subscriptions** for live updates

### Key Files
- `src/screens/` - Main app screens
- `src/services/` - API and business logic
- `src/components/` - Reusable UI components
- `supabase/migrations/` - Database schema migrations

## Health Information

The app provides evidence-based health information about alcohol consumption risks, including:
- Short-term effects and safety warnings
- Long-term health impacts (liver, cancer, etc.)
- Risk assessment based on consumption patterns
- Treatment information (naltrexone, Vivitrol)
- When to seek medical help

## Privacy & Security

- All health data is encrypted and stored securely
- Row Level Security ensures users only see their own data
- No sensitive information is tracked in version control
- Profile pictures and personal data remain private

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for educational and personal use. Please ensure any medical information remains accurate and evidence-based.