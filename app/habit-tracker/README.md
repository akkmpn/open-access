# 🔥 Habit Tracker - Streak & Sync

A modern, real-time habit tracking Progressive Web App (PWA) with cross-device synchronization, built with vanilla JavaScript and Supabase.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- ✅ **Real-time Sync** - Instant synchronization across all your devices
- 🔥 **Streak Tracking** - Build consistent habits with visual streak counters
- 📱 **PWA Support** - Install on mobile and desktop, works offline
- 📊 **Analytics Dashboard** - Track progress with beautiful charts
- 🏷️ **Categories** - Organize habits (Health, Productivity, Fitness, etc.)
- ⏰ **Smart Reminders** - Push notifications for daily check-ins
- 📅 **Visual Calendar** - See your habit history at a glance
- 🎨 **Beautiful UI** - Modern, responsive design
- 🔐 **Secure Auth** - Email/password + Google social login
- 🌙 **Dark Mode** - Easy on the eyes

## 🚀 Quick Start

### Prerequisites

- Node.js (optional, for local development server)
- Supabase account (free tier available)
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/habit-tracker.git
   cd habit-tracker
   ```

2. **Set up Supabase**
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Copy your project URL and anon key
   - Run the SQL schema from `schema.sql` in Supabase SQL Editor

3. **Configure environment**
   - Copy `.env.example` to `.env`
   - Add your Supabase credentials:
     ```
     SUPABASE_URL=your_project_url
     SUPABASE_ANON_KEY=your_anon_key
     ```

4. **Update configuration**
   - Open `app.js`
   - Replace the placeholder Supabase credentials with your own:
     ```javascript
     const SUPABASE_URL = "YOUR_SUPABASE_URL";
     const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
     ```

5. **Set up Google OAuth (Optional)**
   - In Supabase Dashboard, go to Authentication > Providers
   - Enable Google provider
   - Add your Google OAuth credentials
   - Add your app URL to authorized redirect URLs

6. **Run locally**
   ```bash
   # Option 1: Python
   python -m http.server 8000

   # Option 2: Node.js
   npx http-server -p 8000

   # Option 3: VS Code Live Server
   # Right-click index.html > Open with Live Server
   ```

7. **Open in browser**
   ```
   http://localhost:8000
   ```

## 📱 Installing as PWA

### Mobile (iOS/Android)
1. Open the app in Safari (iOS) or Chrome (Android)
2. Tap the share button
3. Select "Add to Home Screen"
4. Launch from your home screen like a native app

### Desktop (Chrome/Edge)
1. Open the app in Chrome or Edge
2. Click the install icon in the address bar
3. Click "Install"

## 🗄️ Database Schema

```sql
-- Habits table
habits (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  name TEXT,
  category TEXT,
  color TEXT,
  icon TEXT,
  streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_completed TIMESTAMPTZ,
  reminder_time TEXT,
  created_at TIMESTAMPTZ
)

-- Habit completions (for history tracking)
habit_completions (
  id UUID PRIMARY KEY,
  habit_id UUID REFERENCES habits,
  user_id UUID REFERENCES auth.users,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
```

## 🏗️ Project Structure

```
habit-tracker/
├── index.html              # Main HTML file
├── app.js                  # Application logic
├── styles.css              # Styling
├── sw.js                   # Service Worker (offline support)
├── manifest.json           # PWA manifest
├── schema.sql              # Database schema
├── README.md               # Documentation
├── .env.example            # Environment variables template
└── icons/                  # App icons
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    └── icon-512x512.png
```

## 💻 Usage

### Creating a Habit

1. Click the "+" button
2. Enter habit name (e.g., "Morning Meditation")
3. Select a category (Health, Productivity, Fitness, etc.)
4. Choose an icon and color
5. Optionally set a reminder time
6. Click "Create Habit"

### Checking In

1. Click the "Check In" button on any habit
2. Your streak increments automatically
3. Changes sync across all devices instantly

### Viewing Analytics

1. Navigate to the "Analytics" tab
2. See your:
   - Total habits tracked
   - Current active streaks
   - Completion rate
   - Weekly progress chart
   - Category distribution

### Managing Habits

- **Edit**: Click the habit card, then the edit icon
- **Delete**: Swipe left (mobile) or click the delete icon
- **Archive**: Mark completed habits as archived

## 🔧 Configuration

### Notification Reminders

Enable browser notifications:
1. Go to Settings
2. Click "Enable Notifications"
3. Allow notifications when prompted
4. Set reminder times for each habit

### Customization

Edit `styles.css` to customize:
- Color scheme
- Fonts
- Layout
- Animations

## 🌐 Deployment

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

### Deploy to Netlify
```bash
npm install -g netlify-cli
netlify deploy
```

### Deploy to GitHub Pages
1. Push to GitHub
2. Go to Settings > Pages
3. Select main branch
4. Your app is live!

## 🔐 Security

- All data is encrypted in transit (HTTPS)
- Supabase handles authentication securely
- Row Level Security (RLS) enabled
- No sensitive data stored locally

## 🐛 Troubleshooting

### App not syncing?
- Check internet connection
- Verify Supabase credentials
- Check browser console for errors

### Notifications not working?
- Enable notifications in browser settings
- Check site permissions
- Try re-enabling in app settings

### Service worker issues?
- Clear browser cache
- Unregister old service workers in DevTools
- Hard refresh (Ctrl+Shift+R)

## 📈 Roadmap

- [ ] Social features (share streaks)
- [ ] Habit templates
- [ ] Advanced statistics
- [ ] Export data to CSV
- [ ] Multiple reminders per habit
- [ ] Habit groups/routines
- [ ] Gamification (badges, levels)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) - Backend and real-time database
- [Chart.js](https://www.chartjs.org/) - Beautiful charts
- Icons from [Flaticon](https://www.flaticon.com)

## 📧 Support

For support, email support@habittracker.com or open an issue on GitHub.

## 🔗 Links

- [Live Demo](https://your-demo-url.com)
- [Documentation](https://docs.habittracker.com)
- [Report Bug](https://github.com/yourusername/habit-tracker/issues)
- [Request Feature](https://github.com/yourusername/habit-tracker/issues)

---

Made with ❤️ by [Your Name]
