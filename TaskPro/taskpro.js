(function() {
const { createClient } = window.supabase;

const finishSound = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

/* ============================================
   SUPABASE CONFIGURATION
   ============================================ */

const SUPABASE_URL = "https://ozfmiburxwatrkbhnodw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Zm1pYnVyeHdhdHJrYmhub2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzE3NjgsImV4cCI6MjA4MzQ0Nzc2OH0.hwoxHjjfleKc206mtCARNJd-VFNZbY9NtAfXczuL7Ug";

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
    console.log(`Loading module: ${moduleName}`);
    
    // Always exit auth mode when loading main app modules
    document.body.classList.remove('auth-mode');
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.module === moduleName);
    });

    // Pretty name for tab title
  let prettyName;
  if (moduleName === 'dashboard') {
    prettyName = 'Welcome back!';
  } else if (moduleName === 'tasks') {
    prettyName = 'Tasks';
  } else if (moduleName === 'stopwatch') {
    prettyName = 'Stopwatch';
  } else {
    prettyName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
  }

  // Browser tab title (always)
  document.title = `TaskPro | ${prettyName}`;

  // MOBILE header title – only used on narrow screens
  const mobileTitleEl = document.getElementById('mobile-page-title');
  if (mobileTitleEl) {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    if (isMobile && (moduleName === 'dashboard' || moduleName === 'tasks')) {
      mobileTitleEl.textContent = prettyName;
      mobileTitleEl.style.display = 'block';
    } else {
      mobileTitleEl.textContent = '';
      mobileTitleEl.style.display = 'none';
    }
  }

  // Set current module for CSS targeting
  document.body.setAttribute('data-current-module', moduleName);

    // Load appropriate module
    if (moduleName === 'dashboard') {
      await loadDashboard();
    } else if (moduleName === 'tasks') {
      await loadTasks();
    } else if (moduleName === 'habits') {
      await loadHabits();
    } else if (moduleName === 'calendar') {
      await loadCalendar();
    } else if (moduleName === 'stopwatch') {
      await loadTimer();
    } else if (moduleName === 'pomodoro') {
      await loadPomodoro();
    } else if (moduleName === 'notes') {
      await loadNotes();
    } else if (moduleName === 'community') {
      await loadCommunity();
    } else if (moduleName === 'analytics') {
      await loadAnalytics();
    } else if (moduleName === 'backup') {
      await loadBackup();
    } else if (moduleName === 'design') {
      await loadDesignWizard();
    }

    localStorage.setItem('currentModule', moduleName);
    console.log(`✅ Module loaded: ${moduleName}`);
    
  } catch (err) {
    console.error(`Error loading ${moduleName}:`, err);
    contentArea.innerHTML = `<div class="error-state">Error loading ${moduleName}: ${err.message}</div>`;
  }
}

// ============================================
// IMPROVED NAVIGATION SETUP WITH EVENT DELEGATION
// ============================================

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
});

function setupNavigation() {
  // Desktop navigation
  const desktopNav = document.querySelector('#desktop-nav');
  
  if (desktopNav) {
    desktopNav.addEventListener('click', (e) => {
      const navLink = e.target.closest('.nav-link');
      if (!navLink) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const module = navLink.dataset.module;
      if (!module) return;
      
      if (navLink.disabled) return;
      navLink.disabled = true;
      
      loadModule(module).finally(() => {
        setTimeout(() => {
          navLink.disabled = false;
        }, 300);
      });
    });
  }
  
  // Mobile hamburger menu
  const hamburgerBtn = document.getElementById('mobile-menu-btn');
  const menuOverlay = document.getElementById('mobile-menu-overlay');
  const closeMenuBtn = document.getElementById('close-menu-btn');
  const menuGrid = document.querySelector('.menu-grid');
  const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
  
  // Open menu
  if (hamburgerBtn) {
    // Remove any existing listeners to prevent duplicates if setupNavigation is called multiple times
    const newBtn = hamburgerBtn.cloneNode(true);
    hamburgerBtn.parentNode.replaceChild(newBtn, hamburgerBtn);
    
    newBtn.addEventListener('click', () => {
      if (menuOverlay) {
          menuOverlay.classList.add('active');
          newBtn.classList.add('active');
          document.body.style.overflow = 'hidden'; // Prevent background scrolling
      } else {
          // Fallback for simple menu toggle if overlay doesn't exist
          document.body.classList.toggle('menu-open');
      }
    });
  }
  
  // Close menu function
  function closeMenu() {
    if (menuOverlay) menuOverlay.classList.remove('active');
    const currentBtn = document.getElementById('mobile-menu-btn');
    if (currentBtn) currentBtn.classList.remove('active');
    document.body.classList.remove('menu-open');
    document.body.style.overflow = ''; // Restore scrolling
  }
  
  // Close button
  if (closeMenuBtn) {
    closeMenuBtn.addEventListener('click', closeMenu);
  }
  
  // Close on overlay click (outside menu)
  if (menuOverlay) {
    menuOverlay.addEventListener('click', (e) => {
      if (e.target === menuOverlay) {
        closeMenu();
      }
    });
  }
  
  // Menu item clicks
  if (menuGrid) {
    menuGrid.addEventListener('click', (e) => {
      const menuItem = e.target.closest('.menu-item');
      if (!menuItem) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const module = menuItem.dataset.module;
      if (!module) return;
      
      if (menuItem.disabled) return;
      menuItem.disabled = true;
      
      // Close menu and load module
      closeMenu();
      
      loadModule(module).finally(() => {
        setTimeout(() => {
          menuItem.disabled = false;
          // Update active state in mobile menu
          document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.toggle('active', item.dataset.module === module);
          });
        }, 300);
      });
    });
  }
  
  // Mobile logout button
  if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      window.location.reload();
    });
  }
  
  // Add inside setupNavigation() in taskpro.js
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            desktopNav.classList.remove('active');
            document.body.style.overflow = ''; // Restore scrolling
        }
    });
  });
  
  console.log('✅ Navigation setup complete');
}

// Logout

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.reload();
});

// Check auth on load
supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "PASSWORD_RECOVERY") {
        const newPassword = prompt("Enter your new password:");
        if (newPassword) {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) alert("Error updating password: " + error.message);
            else alert("Password updated successfully!");
        }
    } else if (session) {
        // Apply saved design settings
        applySavedDesign();
        
        // User is logged in - handle INITIAL_SESSION and subsequent changes
        const savedModule = localStorage.getItem('currentModule') || 'dashboard';
        loadModule(savedModule);
    } else {
        // No session found, show login
        await loadAuth();
    }
});

/* ============================================
   DASHBOARD MODULE
   ============================================ */

async function loadDashboard() {
    contentArea.innerHTML = `
        <div class="dashboard-welcome">
            <h1>Welcome back!</h1>
            <p>Loading stats...</p>
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
    const { data: focusSessions } = await supabase
        .from('pomodoro_sessions')
        .select('focus_time_minutes');

    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.is_completed).length || 0;
    const taskPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const topHabit = habits?.sort((a, b) => b.streak - a.streak)[0] || { name: 'None', streak: 0 };
    const totalMinutes = focusSessions?.reduce((acc, s) => acc + s.focus_time_minutes, 0) || 0;
    const displayHours = (totalMinutes / 60).toFixed(1);

    if (document.getElementById('stat-tasks')) document.getElementById('stat-tasks').innerText = `${completedTasks}/${totalTasks}`;
    if (document.getElementById('stat-habit-streak')) document.getElementById('stat-habit-streak').innerText = `${topHabit.streak} days`;
    if (document.getElementById('stat-habit-name')) document.getElementById('stat-habit-name').innerText = topHabit.name;
    if (document.getElementById('stat-focus-time')) document.getElementById('stat-focus-time').innerText = `${displayHours} hrs`;
    if (document.getElementById('task-progress')) document.getElementById('task-progress').style.width = `${taskPercent}%`;
    if (document.getElementById('completion-rate')) document.getElementById('completion-rate').innerText = `${taskPercent}%`;
    
    // Update welcome message after loading
    const welcomeEl = document.querySelector('.dashboard-welcome p');
    if (welcomeEl) {
        welcomeEl.innerText = "Here's your productivity overview";
    }
}

/* ============================================
   TASKS MODULE
   ============================================ */

async function loadTasks() {
    contentArea.innerHTML = `
        <h1>Tasks</h1>
        <div class="task-input-container card">
            <div class="task-input-group">
                <input type="text" id="task-input" placeholder="What needs to be done?">
            </div>
            <div class="task-meta-group" style="display: flex; gap: 10px; margin-top: 10px;">
                <input type="date" id="task-date" class="btn-outline">
                <select id="task-priority" class="btn-outline">
                    <option value="low">Low Priority</option>
                    <option value="medium" selected>Medium Priority</option>
                    <option value="high">High Priority</option>
                </select>
                <button class="btn-primary" id="add-task-btn">Add Task</button>
            </div>
        </div>
        <div style="margin: 1rem 0; display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="hide-completed">
            <label for="hide-completed" style="font-size: 0.9rem; color: var(--text-dim);">Hide Completed Tasks</label>
        </div>
        <div id="task-list"></div>
    `;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const taskList = document.getElementById('task-list');
    const taskInput = document.getElementById('task-input');
    const taskDate = document.getElementById('task-date');
    const taskPriority = document.getElementById('task-priority');
    const addBtn = document.getElementById('add-task-btn');

const renderTasks = async () => {
    const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, user_id, created_at, is_completed, priority')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (!taskList || !tasks) return;

    // ADDED: Sorting logic
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    const sortedTasks = [...tasks].sort((a, b) => {
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    });

    const hideCompleted = document.getElementById('hide-completed')?.checked;
    
    // Filter tasks if the checkbox is checked
    let displayTasks = sortedTasks;
    if (hideCompleted) {
        displayTasks = sortedTasks.filter(t => !t.is_completed);
    }

    if (displayTasks.length === 0 && hideCompleted) {
        taskList.innerHTML = '<div class="empty-state">No active tasks. All completed tasks are hidden!</div>';
        return;
    } else if (displayTasks.length === 0) {
        taskList.innerHTML = '<div class="empty-state">No tasks yet. Add one to get started!</div>';
        return;
    }

    // Use displayTasks.map instead of sortedTasks.map
    taskList.innerHTML = displayTasks.map(task => `
        <div class="task-item ${task.is_completed ? 'completed' : ''}">
            <input type="checkbox" ${task.is_completed ? 'checked' : ''} 
                onchange="toggleTask('${task.id}', this.checked)">
            <div style="flex: 1;">
                <div style="font-weight: 600;">${task.title}</div>
                ${task.due_date ? `<small style="color: var(--text-dim); font-size: 0.8rem;">📅 ${new Date(task.due_date).toLocaleDateString()}</small>` : ''}
            </div>
            <span class="priority-badge ${task.priority}">${task.priority}</span>
            <button class="btn-danger" style="padding: 0.5rem 1rem;" onclick="deleteTask('${task.id}')">Delete</button>
        </div>
    `).join('');
};

    addBtn.addEventListener('click', async () => {
        if (!taskInput.value.trim()) {
            alert("Please enter a task title!");
            return;
        }
        
        await supabase.from('tasks').insert({
            title: taskInput.value,
            user_id: user.id,
            is_completed: false,
            due_date: taskDate.value || null, // Saves the date for the calendar
            priority: taskPriority.value      // Saves the priority
        });

        taskInput.value = '';
        taskDate.value = '';
        renderTasks();
    });

    document.getElementById('hide-completed').addEventListener('change', renderTasks);

    renderTasks();
}

// Global Task Functions
window.toggleTask = async (id, isChecked) => {
    await supabase.from('tasks').update({ is_completed: isChecked }).eq('id', id);
    // Re-load tasks to update UI - we need to access the current module's render function
    // Ideally we would refactor to not rely on global reload, but for now we can re-trigger the module load
    // or dispatch a custom event. A simple way is to reload the module if it's active.
    if (document.body.getAttribute('data-current-module') === 'tasks') {
        loadTasks(); 
    }
};

window.deleteTask = async (id) => {
    if (confirm("Are you sure you want to delete this task?")) {
        await supabase.from('tasks').delete().eq('id', id);
        if (document.body.getAttribute('data-current-module') === 'tasks') {
            loadTasks();
        }
    }
};

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
        if (!habitInput.value.trim()) {
            alert("Please enter a habit name!");
            return;
        }
        await supabase.from('habits').insert({
            name: habitInput.value,
            user_id: user.id,
            streak: 0,
            last_completed: null
        });
        habitInput.value = '';
        renderHabits();
    });

    renderHabits();
}

// Global Habit Functions
window.completeHabit = async (id) => {
    const { data: habit } = await supabase.from('habits').select('*').eq('id', id).single();
    const today = new Date().toDateString();
    const lastDate = habit.last_completed ? new Date(habit.last_completed).toDateString() : null;
    const newStreak = lastDate === today ? habit.streak : habit.streak + 1;

    await supabase.from('habits').update({
        streak: newStreak,
        last_completed: new Date().toISOString()
    }).eq('id', id);
    
    if (document.body.getAttribute('data-current-module') === 'habits') {
        loadHabits();
    }
};

window.deleteHabit = async (id) => {
    if (confirm("Are you sure you want to delete this habit?")) {
        await supabase.from('habits').delete().eq('id', id);
        if (document.body.getAttribute('data-current-module') === 'habits') {
            loadHabits();
        }
    }
};

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
    if (!grid || !monthYearLabel) return;

    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    monthYearLabel.innerText = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate);

    // Fetch tasks that have a due_date
    const { data: tasks } = await supabase
        .from('tasks')
        .select('title, due_date, priority, is_completed');

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayIndex = new Date(year, month, 1).getDay();

    grid.innerHTML = '';

    // Add empty slots for previous month
    for (let x = 0; x < startDayIndex; x++) {
        grid.innerHTML += '<div class="day empty"></div>';
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayTasks = tasks?.filter(t => t.due_date === dateString) || [];
        const isToday = new Date().toDateString() === new Date(year, month, i).toDateString();

        const taskHtml = dayTasks.map(t => `
            <div class="calendar-task-item ${t.priority}" title="${t.title}">
                ${t.is_completed ? '✅' : ''} ${t.title}
            </div>
        `).join('');

        grid.innerHTML += `
            <div class="day ${isToday ? 'today' : ''}">
                <span class="day-number">${i}</span>
                <div class="calendar-task-list">${taskHtml}</div>
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
    const display = document.getElementById('stopwatch-display');
    
    // ADD THIS LINE:
    if (!display) return; 

    swElapsedTime = Date.now() - swStartTime;
    display.innerText = formatTime(swElapsedTime);
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
    
    const display = document.getElementById('stopwatch-display');
    const startBtn = document.getElementById('stopwatch-start');
    const lapsList = document.getElementById('laps-list');
    
    if (display) display.innerText = '00:00:00';
    if (startBtn) {
        startBtn.innerText = 'Start';
        startBtn.style.backgroundColor = '#10b981';
    }
    if (lapsList) lapsList.innerHTML = '';
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
    const display = document.getElementById('timer-display');
    
    // ADD NULL CHECK:
    if (!display) return;
    
    const mins = Math.floor(pomodoroTimeLeft / 60);
    const secs = pomodoroTimeLeft % 60;
    display.innerText = 
        `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    const sessionStat = document.getElementById('sessions-stat');
    const focusStat = document.getElementById('focus-time-stat');
    
    if (sessionStat) sessionStat.innerText = pomodoroSessionCount;
    if (focusStat) {
        const hours = Math.floor(pomodoroTotalFocusTime / 60);
        const minutes = pomodoroTotalFocusTime % 60;
        focusStat.innerText = `${hours}h ${minutes}m`;
    }
}

function togglePomodoroFunc() {
    const btn = document.getElementById('start-timer');
    
    if (!pomodoroIsRunning) {
        pomodoroInterval = setInterval(() => {
            pomodoroTimeLeft--;
            updatePomodoroDisplay();
            
            if (pomodoroTimeLeft <= 0) {
                clearInterval(pomodoroInterval);
                finishSound.play(); // PLAY SOUND HERE
                pomodoroSessionCount++;
                pomodoroTotalFocusTime += 25;
                showStatusMessage('🎉 Focus session complete! Take a 5-minute break.', 'success');
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
    
    const startBtn = document.getElementById('start-timer');
    if (startBtn) {
        startBtn.innerText = 'Start Focus';
        startBtn.style.backgroundColor = '#f59e0b';
    }
    
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
            <div class="chat-container card">
                <h3 style="padding: 15px; margin: 0; border-bottom: 1px solid #eee;">Global Chat</h3>
                <div class="chat-messages" id="chat-messages"></div>
                <div class="chat-input-area">
                    <input type="text" id="chat-input" placeholder="Type a message...">
                    <button id="send-chat" class="btn-primary">Send</button>
                </div>
            </div>
            <div class="card">
                <h3>🏆 Leaderboard</h3>
                <div id="leaderboard"></div>
            </div>
        </div>
    `;

    setupChat(); // Initialize real-time chat logic
    renderLeaderboard(); // Your existing leaderboard logic
}

async function setupChat() {
    const chatBox = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-chat');
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Load Last 50 Messages
    const { data: messages } = await supabase
        .from('messages')
        .select('*') // Select all columns including user_email
        .order('created_at', { ascending: true })
        .limit(50);

    const renderMessage = (msg) => {
        const div = document.createElement('div');
        div.className = `chat-msg ${msg.user_id === user.id ? 'own' : ''}`;
        
        // Privacy: Use only the part before @ symbol as display name
        const displayName = msg.user_email ? msg.user_email.split('@')[0] : 'User';
        
        div.innerHTML = `<strong>${displayName}:</strong> ${msg.content}`;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    if (messages) messages.forEach(renderMessage);

    // 2. Listen for NEW Messages (Realtime)
    const channel = supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, 
            payload => renderMessage(payload.new))
        .subscribe(status => {
            if (status === 'SUBSCRIBED') {
                console.log('📡 Connected to Global Chat!');
            }
        });

    // 3. Sending Messages
    const sendMessage = async () => {
        if (!chatInput.value.trim()) return;
        await supabase.from('messages').insert({
            content: chatInput.value,
            user_id: user.id,
            user_email: user.email // Temporary way to show names
        });
        chatInput.value = '';
    };

    sendBtn.onclick = sendMessage;
    chatInput.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
}

async function renderLeaderboard() {
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
   ANALYTICS MODULE
   ============================================ */

window.loadAnalytics = async () => {
    const contentArea = document.getElementById('main-content');
    contentArea.innerHTML = `
        <div class="analytics-container">
            <h1>📊 Productivity Insights</h1>
            <div class="card" style="margin-top: 20px;">
                <canvas id="productivityChart"></canvas>
            </div>
            <div id="stats-summary" class="stats-grid" style="margin-top: 20px;">
                </div>
        </div>
    `;

    const { data: { user } } = await supabase.auth.getUser();
    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);

    if (error) return console.error(error);

    // Process data for last 7 days
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();

    const completedCounts = last7Days.map(date => 
        tasks.filter(t => t.is_completed && t.updated_at?.startsWith(date)).length
    );

    // Render Chart
    const ctx = document.getElementById('productivityChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], // Simplified labels
            datasets: [{
                label: 'Tasks Completed',
                data: completedCounts,
                backgroundColor: '#10b981',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });

    // Update Summary Cards
    const totalCompleted = tasks.filter(t => t.is_completed).length;
    document.getElementById('stats-summary').innerHTML = `
        <div class="card"><h3>${totalCompleted}</h3><p>Total Completed</p></div>
        <div class="card"><h3>${tasks.length - totalCompleted}</h3><p>Active Tasks</p></div>
    `;
};

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
   DESIGN WIZARD FUNCTIONS
   ============================================ */

window.updateTheme = (theme) => {
    document.body.className = document.body.className.replace(/\btheme-\S+/g, '');
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('tp-theme', theme);
};

window.updateLayout = (side) => {
    document.body.style.flexDirection = side === 'right' ? 'row-reverse' : 'row';
    localStorage.setItem('tp-layout', side);
};

window.updateCardStyle = (style) => {
    const radius = style === 'rounded' ? '25px' : '12px';
    document.documentElement.style.setProperty('--card-radius', radius);
    localStorage.setItem('tp-card-style', style);
};

// Fixed: Single global instance of applySavedDesign
window.applySavedDesign = () => {
    const theme = localStorage.getItem('tp-theme') || 'dark';
    const layout = localStorage.getItem('tp-layout') || 'left';
    const card = localStorage.getItem('tp-card-style') || 'sharp';

    window.updateTheme(theme);
    window.updateLayout(layout);
    window.updateCardStyle(card);
};

// Fixed: Single global instance of loadDesignWizard
window.loadDesignWizard = () => {
    const contentArea = document.getElementById('main-content');
    contentArea.innerHTML = `
        <div class="design-wizard-container">
            <h1>🎨 Layout Wizard</h1>
            <p>Customize TaskPro's appearance.</p>
            <div class="stats-grid">
                <div class="card">
                    <h3>Theme Mode</h3>
                    <button class="btn-primary" onclick="updateTheme('dark')">Dark</button>
                    <button class="btn-primary" onclick="updateTheme('light')">Light</button>
                    <button class="btn-primary" onclick="updateTheme('glass')">Glass</button>
                </div>
                
                <div class="card layout-control-card">
                    <h3>Sidebar Position</h3>
                    <p style="font-size: 0.8rem; color: var(--text-dim);">Desktop Only</p>
                    <button class="btn-primary" onclick="updateLayout('left')">Left</button>
                    <button class="btn-primary" onclick="updateLayout('right')">Right</button>
                </div>

                <div class="card">
                    <h3>Card Style</h3>
                    <button class="btn-primary" onclick="updateCardStyle('sharp')">Sharp</button>
                    <button class="btn-primary" onclick="updateCardStyle('rounded')">Rounded</button>
                </div>
            </div>
        </div>
    `;
};

/* ============================================
   AUTHENTICATION UI & LOGIC
   ============================================ */

async function loadAuth() {
    // Mark auth mode on body
    document.body.classList.add('auth-mode');

    // Clear active nav link (auth is separate view)
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });

    // Render login markup
    contentArea.innerHTML = getLoginHTML();
    setupLoginForm();
}

function getLoginHTML() {
    return `
        <div class="login-container">
            <div class="login-card card">
                <h1 style="text-align: center; margin-bottom: 1.5rem;" id="auth-title">📋 TaskPro</h1>
                <p style="text-align: center; color: var(--text-dim); margin-bottom: 2rem;" id="auth-subtitle">Sign in to your account</p>
                
                <form id="login-form">
                    <div class="input-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" required autocomplete="username">
                    </div>
                    <div class="input-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" required autocomplete="current-password">
                    </div>
                    <div style="text-align: right; margin-top: -10px; margin-bottom: 15px;">
                        <a href="#" id="forgot-password-link" style="color: var(--primary); font-size: 0.8rem; text-decoration: none;">Forgot Password?</a>
                    </div>
                    <button type="submit" class="btn-primary" id="login-btn" style="width: 100%; padding: 0.75rem;">Sign In</button>
                    <div id="auth-error" style="display: none; color: #ff4757; margin-top: 10px; text-align: center;"></div>
                </form>

                <p style="text-align: center; margin-top: 1.5rem; color: var(--text-dim); font-size: 0.9rem;">
                    <a href="#" id="toggle-auth" style="color: var(--accent-color); text-decoration: none;">Don't have an account? Sign Up</a>
                </p>
            </div>
        </div>
    `;
}

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log("🚀 TaskPro PWA Ready"))
      .catch((err) => console.log("PWA Error", err));
}

// Request Notification Permission for Daily Briefing
if ("Notification" in window) {
    Notification.requestPermission();
}

// Daily Briefing Logic
window.sendDailyBriefing = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return; // Only send if user is logged in
    
    const { data: tasks } = await supabase
        .from('tasks')
        .select('title')
        .eq('user_id', user.id) // Privacy: Only fetch user's own tasks
        .eq('is_completed', false)
        .eq('due_date', today);

    if (tasks && tasks.length > 0 && Notification.permission === "granted") {
        new Notification("TaskPro: Your Daily Briefing", {
            body: `You have ${tasks.length} tasks due today!`,
            icon: "https://cdn-icons-png.flaticon.com/512/906/906334.png"
        });
    }
};

// Check every hour for daily briefing
setInterval(window.sendDailyBriefing, 3600000);

function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    const authError = document.getElementById('auth-error');
    const toggleBtn = document.getElementById('toggle-auth');
    const submitBtn = document.getElementById('login-btn');
    const title = document.getElementById('auth-title');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    
    let isSignUp = false;

    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        if (!email) {
            authError.innerText = "Please enter your email address first.";
            authError.style.display = "block";
            return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.href,
        });
        if (error) {
            authError.innerText = error.message;
            authError.style.display = "block";
        } else {
            authError.innerText = "Password reset email sent! Check your inbox.";
            authError.style.color = "#10b981";
            authError.style.display = "block";
        }
    });

    toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        isSignUp = !isSignUp;
        title.innerText = isSignUp ? "Create Account" : "📋 TaskPro";
        submitBtn.innerText = isSignUp ? "Sign Up" : "Sign In";
        toggleBtn.innerText = isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up";
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        submitBtn.innerText = "Processing...";
        submitBtn.disabled = true;
        authError.style.display = "none";

        let result = isSignUp ? 
            await supabase.auth.signUp({ email, password }) : 
            await supabase.auth.signInWithPassword({ email, password });

        if (result.error) {
            authError.innerText = result.error.message;
            authError.style.display = "block";
            submitBtn.innerText = isSignUp ? "Sign Up" : "Sign In";
            submitBtn.disabled = false;
        } else if (isSignUp && !result.data.session) {
            authError.innerText = "Check your email for the confirmation link!";
            authError.style.color = "#10b981";
            authError.style.display = "block";
        }
    });
}

// Mobile Menu Toggle Logic
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const desktopNav = document.getElementById('desktop-nav');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        desktopNav.classList.toggle('active');
    });
}

// Close sidebar when a link is clicked (Mobile improvement)
const navLinks = document.querySelectorAll('.nav-link, .menu-item');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            desktopNav.classList.remove('active');
        }
    });
});
})();
