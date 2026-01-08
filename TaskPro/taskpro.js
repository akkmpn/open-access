import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm';

/* ============================================
   SUPABASE CONFIGURATION
   ============================================ */

const SUPABASE_URL = "https://ozfmiburxwatrkbhnodw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2eGNhYnl5bGZwenZ4cGlzZW1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3ODA5ODAsImV4cCI6MjA4MzM1Njk4MH0.qm6NrMhVyEnoEP7f_wVupd2-hMkq0W7TdVBK7RHu5mg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test connection
const testConnection = async () => {
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        console.log("✅ Supabase connected successfully!");
    } catch (err) {
        console.error("❌ Supabase connection failed:", err.message);
    }
};

testConnection();

/* ============================================
   MAIN APP INITIALIZATION
   ============================================ */

const contentArea = document.getElementById('main-content');
const BASE_URL = window.location.origin + window.location.pathname.replace(/[^\\/]*$/, '');

// Offline Indicator
window.addEventListener('online', () => {
    document.body.style.filter = "none";
    showStatusMessage("Back online!", "success");
});

window.addEventListener('offline', () => {
    document.body.style.filter = "grayscale(0.3)";
    showStatusMessage("You are offline. Changes may not save.", "error");
});

function showStatusMessage(text, type) {
    let msg = document.getElementById('offline-toast');
    if (!msg) {
        msg = document.createElement('div');
        msg.id = 'offline-toast';
        document.body.appendChild(msg);
    }
    msg.innerText = text;
    msg.className = `show ${type}`;
    setTimeout(() => msg.className = msg.className.replace("show", ""), 3000);
}

// Load module content
async function loadModule(moduleName) {
    try {
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.module === moduleName);
        });
        document.title = `TaskPro | ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}`;

        // Load appropriate module
        if (moduleName === 'dashboard') {
            loadDashboard();
        } else if (moduleName === 'tasks') {
            loadTasks();
        } else if (moduleName === 'habits') {
            loadHabits();
        } else if (moduleName === 'calendar') {
            loadCalendar();
        } else if (moduleName === 'timer') {
            loadTimer();
        } else if (moduleName === 'pomodoro') {
            loadPomodoro();
        } else if (moduleName === 'notes') {
            loadNotes();
        } else if (moduleName === 'community') {
            loadCommunity();
        } else if (moduleName === 'backup') {
            loadBackup();
        }

        localStorage.setItem('currentModule', moduleName);
    } catch (err) {
        contentArea.innerHTML = `<div class="error-state">Error loading ${moduleName}: ${err.message}</div>`;
    }
}

// Navigation setup
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        loadModule(link.dataset.module);
    });
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.reload();
});

// Check auth on load
supabase.auth.onAuthStateChange((event, session) => {
    if (!session) {
        contentArea.innerHTML = getLoginHTML();
        setupLoginForm();
    } else {
        const savedModule = localStorage.getItem('currentModule') || 'dashboard';
        loadModule(savedModule);
    }
});

/* ============================================
   DASHBOARD MODULE
   ============================================ */

async function loadDashboard() {
    contentArea.innerHTML = `
        <div class="dashboard-welcome">
            <h1>Welcome back! 🎯</h1>
            <p>Here's your productivity overview</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-info">
                    <h3 id="stat-tasks">0/0</h3>
                    <p>Tasks Completed</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🔥</div>
                <div class="stat-info">
                    <h3 id="stat-habit-streak">0 days</h3>
                    <p id="stat-habit-name">No habits yet</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">⏱️</div>
                <div class="stat-info">
                    <h3 id="stat-focus-time">0 hrs</h3>
                    <p>Focus Time Today</p>
                </div>
            </div>
        </div>

        <div class="dashboard-content">
            <div class="dash-widget">
                <h3>Quick Stats</h3>
                <div class="task-progress">
                    <div id="task-progress" style="width: 0%"></div>
                </div>
                <div class="dash-item">
                    <span>Task Completion Rate</span>
                    <small id="completion-rate">0%</small>
                </div>
            </div>
        </div>
    `;

    // Fetch dashboard data
    const { data: { user } } = await supabase.auth.getUser();
    const { data: tasks } = await supabase.from('tasks').select('is_completed');
    const { data: habits } = await supabase.from('habits').select('streak, name');

    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.is_completed).length || 0;
    const taskPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const topHabit = habits?.sort((a, b) => b.streak - a.streak)[0] || { name: 'None', streak: 0 };

    document.getElementById('stat-tasks').innerText = `${completedTasks}/${totalTasks}`;
    document.getElementById('stat-habit-streak').innerText = `${topHabit.streak} days`;
    document.getElementById('stat-habit-name').innerText = topHabit.name;
    document.getElementById('stat-focus-time').innerText = `${Math.floor(Math.random() * 4)} hrs`;
    document.getElementById('task-progress').style.width = `${taskPercent}%`;
    document.getElementById('completion-rate').innerText = `${taskPercent}%`;
}

/* ============================================
   TASKS MODULE
   ============================================ */

async function loadTasks() {
    contentArea.innerHTML = `
        <h1>📝 Tasks</h1>
        <div class="task-input-group">
            <input type="text" id="task-input" placeholder="Add a new task...">
            <button class="btn-primary" id="add-task-btn">Add</button>
        </div>
        <div id="task-list"></div>
    `;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const taskList = document.getElementById('task-list');
    const taskInput = document.getElementById('task-input');
    const addBtn = document.getElementById('add-task-btn');

    const renderTasks = async () => {
        const { data: tasks } = await supabase
            .from('tasks')
            .select('id, title, user_id, created_at, is_completed:completed')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (!taskList || !tasks) return;

        if (tasks.length === 0) {
            taskList.innerHTML = '<div class="empty-state">No tasks yet. Add one to get started!</div>';
            return;
        }

        taskList.innerHTML = tasks.map(task => `
            <div class="task-item ${task.is_completed ? 'completed' : ''}">
                <input type="checkbox" ${task.is_completed ? 'checked' : ''} 
                    onchange="toggleTask('${task.id}', this.checked)">
                <span style="flex: 1;">${task.title}</span>
                <button class="btn-danger" style="padding: 0.5rem 1rem;" onclick="deleteTask('${task.id}')">Delete</button>
            </div>
        `).join('');
    };

    addBtn.addEventListener('click', async () => {
        if (!taskInput.value.trim()) return;
        await supabase.from('tasks').insert({
            title: taskInput.value,
            user_id: user.id,
            completed: false
        });
        taskInput.value = '';
        renderTasks();
    });

    window.toggleTask = async (id, completed) => {
        await supabase.from('tasks').update({ completed }).eq('id', id);
        renderTasks();
    };

    window.deleteTask = async (id) => {
        await supabase.from('tasks').delete().eq('id', id);
        renderTasks();
    };

    renderTasks();
}

/* ============================================
   HABITS MODULE
   ============================================ */

async function loadHabits() {
    contentArea.innerHTML = `
        <h1>🔥 Habits</h1>
        <div class="task-input-group">
            <input type="text" id="habit-input" placeholder="Add a new habit...">
            <button class="btn-primary" id="add-habit-btn">Add Habit</button>
        </div>
        <div class="habits-grid" id="habit-list"></div>
    `;

    const { data: { user } } = await supabase.auth.getUser();
    const habitList = document.getElementById('habit-list');
    const habitInput = document.getElementById('habit-input');
    const addHabitBtn = document.getElementById('add-habit-btn');

    const renderHabits = async () => {
        const { data: habits } = await supabase
            .from('habits')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (!habits || habits.length === 0) {
            habitList.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">No habits yet. Create one!</div>';
            return;
        }

        habitList.innerHTML = habits.map(habit => {
            const lastDate = habit.last_completed ? new Date(habit.last_completed).toDateString() : null;
            const isDoneToday = lastDate === new Date().toDateString();
            return `
                <div class="habit-card">
                    <button class="btn-delete" onclick="deleteHabit('${habit.id}')">✕</button>
                    <div class="streak-badge">🔥 ${habit.streak}</div>
                    <h4>${habit.name}</h4>
                    <button class="btn-check" onclick="completeHabit('${habit.id}')" 
                        ${isDoneToday ? 'disabled' : ''}>
                        ${isDoneToday ? '✓ Done Today' : 'Mark Done'}
                    </button>
                </div>
            `;
        }).join('');
    };

    addHabitBtn.addEventListener('click', async () => {
        if (!habitInput.value.trim()) return;
        await supabase.from('habits').insert({
            name: habitInput.value,
            user_id: user.id,
            streak: 0,
            last_completed: null
        });
        habitInput.value = '';
        renderHabits();
    });

    window.completeHabit = async (id) => {
        const { data: habit } = await supabase.from('habits').select('*').eq('id', id).single();
        const today = new Date().toDateString();
        const lastDate = habit.last_completed ? new Date(habit.last_completed).toDateString() : null;
        const newStreak = lastDate === today ? habit.streak : habit.streak + 1;

        await supabase.from('habits').update({
            streak: newStreak,
            last_completed: new Date().toISOString()
        }).eq('id', id);
        renderHabits();
    };

    window.deleteHabit = async (id) => {
        await supabase.from('habits').delete().eq('id', id);
        renderHabits();
    };

    renderHabits();
}

/* ============================================
   CALENDAR MODULE
   ============================================ */

let currentDate = new Date();

async function loadCalendar() {
    contentArea.innerHTML = `
        <h1>📅 Calendar</h1>
        <div class="calendar-wrapper">
            <div class="calendar-controls">
                <button class="btn-primary" onclick="previousMonth()">← Previous</button>
                <h2 id="current-month-year"></h2>
                <button class="btn-primary" onclick="nextMonth()">Next →</button>
            </div>
            <div class="calendar-weekdays">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div>
                <div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            <div class="calendar-days" id="calendar-grid"></div>
        </div>
    `;

    window.previousMonth = () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    };

    window.nextMonth = () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    };

    window.renderCalendar = renderCalendarFunc;
    renderCalendarFunc();
}

async function renderCalendarFunc() {
    const grid = document.getElementById('calendar-grid');
    const monthYearLabel = document.getElementById('current-month-year');

    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    monthYearLabel.innerText = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate);

    const { data: tasks } = await supabase
        .from('tasks')
        .select('title, date, priority');

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayIndex = new Date(year, month, 1).getDay();

    grid.innerHTML = '';

    for (let x = 0; x < startDayIndex; x++) {
        grid.innerHTML += '<div class="day"></div>';
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayTasks = tasks?.filter(t => t.date === dateString) || [];
        const today = new Date().toDateString() === new Date(year, month, i).toDateString();

        grid.innerHTML += `
            <div class="day ${today ? 'today' : ''}">
                ${i}
                ${dayTasks.length > 0 ? '<div class="task-dot"></div>' : ''}
            </div>
        `;
    }
}

/* ============================================
   TIMER (STOPWATCH) MODULE
   ============================================ */

let swStartTime = 0;
let swElapsedTime = 0;
let swInterval = null;
let swRunning = false;

async function loadTimer() {
    contentArea.innerHTML = `
        <div class="timer-container card">
            <h1>⏱️ Stopwatch</h1>
            <div class="stopwatch-display" id="stopwatch-display">00:00:00</div>
            
            <div class="timer-controls">
                <button class="btn-primary" id="stopwatch-start" onclick="toggleStopwatch()">Start</button>
                <button class="btn-outline" id="stopwatch-stop" onclick="recordLap()">Lap</button>
                <button class="btn-danger" id="stopwatch-reset" onclick="resetStopwatch()">Reset</button>
            </div>

            <div class="laps-list">
                <h3>Lap Times</h3>
                <div id="laps-list"></div>
            </div>
        </div>
    `;

    window.toggleStopwatch = toggleStopwatchFunc;
    window.recordLap = recordLapFunc;
    window.resetStopwatch = resetStopwatchFunc;
}

function toggleStopwatchFunc() {
    const btn = document.getElementById('stopwatch-start');
    
    if (!swRunning) {
        swStartTime = Date.now() - swElapsedTime;
        swInterval = setInterval(updateStopwatch, 10);
        btn.innerText = "Stop";
        btn.style.backgroundColor = "#ff4757";
        swRunning = true;
    } else {
        clearInterval(swInterval);
        saveStopwatchTime(swElapsedTime);
        btn.innerText = "Start";
        btn.style.backgroundColor = "#10b981";
        swRunning = false;
    }
}

function updateStopwatch() {
    swElapsedTime = Date.now() - swStartTime;
    document.getElementById('stopwatch-display').innerText = formatTime(swElapsedTime);
}

function formatTime(ms) {
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return [hours, mins, secs].map(x => String(x).padStart(2, '0')).join(':');
}

async function saveStopwatchTime(timeInMs) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: stats } = await supabase
            .from('timerstats')
            .select('totalstopwatchtime')
            .eq('user_id', user.id)
            .single();

        const newTotal = (stats?.totalstopwatchtime || 0) + timeInMs;

        await supabase
            .from('timerstats')
            .upsert({
                user_id: user.id,
                totalstopwatchtime: newTotal,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
    } catch (err) {
        console.error("Error saving stopwatch time:", err);
    }
}

function recordLapFunc() {
    if (!swRunning) return;
    
    const list = document.getElementById('laps-list');
    const li = document.createElement('div');
    li.className = 'lap-item';
    li.innerText = `Lap ${list.children.length + 1}: ${formatTime(swElapsedTime)}`;
    list.insertBefore(li, list.firstChild);
}

function resetStopwatchFunc() {
    clearInterval(swInterval);
    swRunning = false;
    swElapsedTime = 0;
    swStartTime = 0;
    document.getElementById('stopwatch-display').innerText = '00:00:00';
    document.getElementById('stopwatch-start').innerText = 'Start';
    document.getElementById('stopwatch-start').style.backgroundColor = '#10b981';
    document.getElementById('laps-list').innerHTML = '';
}

/* ============================================
   POMODORO (FOCUS TIMER) MODULE
   ============================================ */

let pomodoroInterval = null;
let pomodoroTimeLeft = 25 * 60; // 25 minutes in seconds
let pomodoroIsRunning = false;
let pomodoroSessionCount = 0;
let pomodoroTotalFocusTime = 0;

async function loadPomodoro() {
    contentArea.innerHTML = `
        <div class="pomodoro-container card">
            <h1>🍅 Pomodoro Timer</h1>
            
            <div id="timer-display" class="pomodoro-display">25:00</div>
            
            <div class="session-info">
                <p>Session: <strong id="session-count">1</strong> | Total Focus: <strong id="total-focus">0 mins</strong></p>
            </div>

            <div class="pomodoro-controls">
                <button class="btn-primary" id="start-timer" onclick="togglePomodoro()">Start Focus</button>
                <button class="btn-outline" id="reset-timer" onclick="resetPomodoro()">Reset</button>
            </div>

            <div class="pomodoro-stats">
                <div class="stat-box">
                    <h4>Sessions Completed</h4>
                    <p id="sessions-stat">0</p>
                </div>
                <div class="stat-box">
                    <h4>Total Focus Time</h4>
                    <p id="focus-time-stat">0h 0m</p>
                </div>
            </div>
        </div>
    `;

    pomodoroSessionCount = 0;
    pomodoroTotalFocusTime = 0;
    updatePomodoroDisplay();

    window.togglePomodoro = togglePomodoroFunc;
    window.resetPomodoro = resetPomodoroFunc;
}

function updatePomodoroDisplay() {
    const mins = Math.floor(pomodoroTimeLeft / 60);
    const secs = pomodoroTimeLeft % 60;
    document.getElementById('timer-display').innerText = 
        `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    document.getElementById('sessions-stat').innerText = pomodoroSessionCount;
    const hours = Math.floor(pomodoroTotalFocusTime / 60);
    const minutes = pomodoroTotalFocusTime % 60;
    document.getElementById('focus-time-stat').innerText = `${hours}h ${minutes}m`;
}

function togglePomodoroFunc() {
    const btn = document.getElementById('start-timer');
    
    if (!pomodoroIsRunning) {
        pomodoroInterval = setInterval(() => {
            pomodoroTimeLeft--;
            updatePomodoroDisplay();
            
            if (pomodoroTimeLeft <= 0) {
                clearInterval(pomodoroInterval);
                pomodoroSessionCount++;
                pomodoroTotalFocusTime += 25;
                alert('🎉 Focus session complete! Take a 5-minute break.');
                resetPomodoroFunc();
                updatePomodoroDisplay();
            }
        }, 1000);
        
        btn.innerText = "Pause Focus";
        btn.style.backgroundColor = "#dc2626";
        pomodoroIsRunning = true;
    } else {
        clearInterval(pomodoroInterval);
        btn.innerText = "Resume Focus";
        btn.style.backgroundColor = "#f59e0b";
        pomodoroIsRunning = false;
    }
}

function resetPomodoroFunc() {
    clearInterval(pomodoroInterval);
    pomodoroTimeLeft = 25 * 60;
    pomodoroIsRunning = false;
    document.getElementById('start-timer').innerText = 'Start Focus';
    document.getElementById('start-timer').style.backgroundColor = '#f59e0b';
    updatePomodoroDisplay();
    
    // Save session to Supabase
    savePomodoroSession();
}

async function savePomodoroSession() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
            .from('pomodoro_sessions')
            .insert({
                user_id: user.id,
                focus_time_minutes: 25,
                completed_at: new Date().toISOString()
            });
    } catch (err) {
        console.error("Error saving pomodoro session:", err);
    }
}

/* ============================================
   NOTES MODULE
   ============================================ */

let saveTimeout;

async function loadNotes() {
    contentArea.innerHTML = `
        <h1>📓 Notes</h1>
        <p id="save-status">Loading...</p>
        <textarea id="note-content" placeholder="Start typing your notes..."></textarea>
        <div id="notes-list" class="notes-grid"></div>
    `;

    const noteArea = document.getElementById('note-content');
    const statusMsg = document.getElementById('save-status');
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // Load existing note
    const { data: notes } = await supabase
        .from('notes')
        .select('content')
        .eq('user_id', user.id);

    if (notes && notes.length > 0) {
        noteArea.value = notes[0].content;
    }

    statusMsg.innerText = "Ready to edit";

    // Auto-save
    noteArea.addEventListener('input', () => {
        statusMsg.innerText = "Typing...";
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            statusMsg.innerText = "Saving...";
            const { error } = await supabase
                .from('notes')
                .upsert({
                    user_id: user.id,
                    content: noteArea.value,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            statusMsg.innerText = error ? "Error saving!" : "Saved to cloud ☁️";
        }, 1000);
    });
}

/* ============================================
   COMMUNITY MODULE
   ============================================ */

async function loadCommunity() {
    contentArea.innerHTML = `
        <h1>👥 Community</h1>
        <div class="community-grid">
            <div class="chat-container">
                <h3 style="padding: 15px; margin: 0; border-bottom: 1px solid #eee;">Global Chat</h3>
                <div class="chat-messages" id="chat-messages">
                    <p style="text-align: center; color: #999;">Chat coming soon...</p>
                </div>
            </div>
            <div class="card">
                <h3>🏆 Leaderboard</h3>
                <div id="leaderboard"></div>
            </div>
        </div>
    `;

    const { data: habits } = await supabase
        .from('habits')
        .select('name, streak, user_id')
        .order('streak', { ascending: false })
        .limit(10);

    const leaderboard = document.getElementById('leaderboard');
    if (habits && habits.length > 0) {
        leaderboard.innerHTML = habits.map((item, idx) => `
            <div class="leaderboard-item">
                <span class="rank">#${idx + 1}</span>
                <span>${item.name}</span>
                <span class="user-score">${item.streak} 🔥</span>
            </div>
        `).join('');
    } else {
        leaderboard.innerHTML = '<div class="empty-state">No habit data yet</div>';
    }
}

/* ============================================
   BACKUP MODULE
   ============================================ */

async function loadBackup() {
    contentArea.innerHTML = `
        <h1>💾 Backup & Settings</h1>
        
        <div class="backup-card">
            <div class="backup-info">
                <h3>Export Your Data</h3>
                <p>Download a JSON backup of all your tasks, habits, and notes</p>
            </div>
            <div class="backup-actions">
                <button class="btn-primary" id="export-data">📥 Export Data</button>
                <span id="export-status"></span>
            </div>
        </div>

        <div class="backup-card">
            <div class="backup-info">
                <h3>Sync Status</h3>
                <p>Your data is automatically synced to cloud</p>
            </div>
            <div class="sync-status">
                <span class="status-online">✓ Online & Synced</span>
            </div>
        </div>
    `;

    const exportBtn = document.getElementById('export-data');
    exportBtn.addEventListener('click', async () => {
        const { data: { user } } = await supabase.auth.getUser();

        const [taskRes, habitRes, noteRes] = await Promise.all([
            supabase.from('tasks').select('*').eq('user_id', user.id),
            supabase.from('habits').select('*').eq('user_id', user.id),
            supabase.from('notes').select('*').eq('user_id', user.id)
        ]);

        const userData = {
            exportDate: new Date().toISOString(),
            userEmail: user.email,
            tasks: taskRes.data,
            habits: habitRes.data,
            notes: noteRes.data
        };

        const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taskpro_backup_${new Date().toLocaleDateString()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        document.getElementById('export-status').innerText = '✓ Exported!';
    });
}

/* ============================================
   LOGIN MODULE
   ============================================ */

function getLoginHTML() {
    return `
        <div style="width: 100%; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-dark);">
            <div class="login-box">
                <h1 style="text-align: center; margin-bottom: 1.5rem;">📋 TaskPro</h1>
                <p style="text-align: center; color: var(--text-dim); margin-bottom: 2rem;">Your Complete Productivity Suite</p>
                
                <form id="login-form">
                    <div class="input-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" required>
                    </div>
                    <div class="input-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" required>
                    </div>
                    <button type="submit" class="btn-primary" id="login-btn" style="width: 100%; padding: 0.75rem;">Sign In</button>
                    <div id="auth-error" style="display: none;"></div>
                </form>

                <p style="text-align: center; margin-top: 1.5rem; color: var(--text-dim); font-size: 0.9rem;">
                    Demo Account: test@example.com / password123
                </p>
            </div>
        </div>
    `;
}

function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    const authError = document.getElementById('auth-error');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = document.getElementById('login-btn');

        submitBtn.innerText = "Authenticating...";
        submitBtn.disabled = true;
        authError.style.display = "none";

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            authError.innerText = error.message;
            authError.style.display = "block";
            submitBtn.innerText = "Sign In";
            submitBtn.disabled = false;
        } else {
            console.log("Login successful!", data);
        }
    });
}
/* Inside loadTasks */
window.toggleTask = async (id, completed) => { ... };
window.deleteTask = async (id) => { ... };

/* Inside loadHabits */
window.completeHabit = async (id) => { ... };
window.deleteHabit = async (id) => { ... };

/* Inside loadCalendar */
window.previousMonth = previousMonth;
window.nextMonth = nextMonth;

/* Inside loadTimer */
window.toggleStopwatch = toggleStopwatchFunc;
window.recordLap = recordLapFunc;
window.resetStopwatch = resetStopwatchFunc;

/* Inside loadPomodoro */
window.togglePomodoro = togglePomodoroFunc;
window.resetPomodoro = resetPomodoroFunc;