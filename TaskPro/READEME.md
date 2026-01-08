# TaskPro 🚀
A full-stack, modular productivity suite built with Vanilla JS and Supabase.

## ✨ Features
- **Dynamic Dashboard**: Real-time stats and progress tracking.
- **Task Management**: Full CRUD functionality with cloud sync.
- **Habit Tracker**: Daily streak logic and consistency monitoring.
- **Smart Notes**: Auto-saving text area with debounced Supabase updates.
- **Focus Tools**: Integrated Pomodoro Timer and Stopwatch.
- **Community**: Global leaderboard powered by habit streaks.
- **Data Privacy**: Row Level Security (RLS) ensures users only see their own data.

## 🛠️ Tech Stack
- **Frontend**: Vanilla JavaScript (ES6 Modules), HTML5, CSS3 (Custom Variables).
- **Backend**: Supabase (PostgreSQL, Auth, Real-time).
- **Architecture**: Modular "Feature-Folder" structure.

## 🚀 Setup
1. Clone the repository.
2. Create a Supabase project and run the SQL schema (provided in `database.sql`).
3. Add your `SUPABASE_URL` and `SUPABASE_KEY` to `supabase-config.js`.
4. Open `index.html` via a local server (like Live Server).