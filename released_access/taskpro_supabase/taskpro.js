(function() {
// FORCE UNREGISTER ALL SERVICE WORKERS TO CLEAR CACHE
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
        console.log('✅ Service Workers Unregistered - Cache Cleared');
    });
}

const { createClient } = window.supabase;

const finishSound = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

/* ============================================
   SUPABASE CONFIGURATION
   ============================================ */

const SUPABASE_URL = "https://ozfmiburxwatrkbhnodw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Zm1pYnVyeHdhdHJrYmhub2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzE3NjgsImV4cCI6MjA4MzQ0Nzc2OH0.hwoxHjjfleKc206mtCARNJd-VFNZbY9NtAfXczuL7Ug";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Enhanced timezone-aware helpers
const getUTCToday = () => {
    return new Date().toISOString().split('T')[0];
};

const getLocalToday = () => {
    const now = new Date();
    return now.toLocaleDateString('en-CA');
};

const isSameDayLocal = (date1, date2) => {
    return new Date(date1).toLocaleDateString('en-CA') === 
           new Date(date2).toLocaleDateString('en-CA');
};

// Task filtering helper with timezone awareness
const filterTasksByLocalDate = (tasks, targetDate) => {
    return tasks.filter(task => {
        if (!task.due_date) return false;
        return task.due_date === targetDate;
    });
};

// RETURNS: "2026-01-15" (Based on User's System Clock, NOT UTC)
const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    // Month is 0-indexed in JS, so add 1. Pad with '0' if needed.
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// UI helper can just alias the main function now, as we want consistency
const getLocalDisplayDate = getLocalDate;

// Global chart instances to prevent conflicts
let taskChartInstance = null;
let habitChartInstance = null;
let activityChartInstance = null;
let focusTimeChartInstance = null;

// Global function for calendar day interaction
window.openDayTasks = (dateString) => {
    // 1. Save the date to a temporary filter
    localStorage.setItem('taskFilterDate', dateString);
    
    // 2. Switch to Tasks module
    // The loadTasks function needs to check this storage item
    document.querySelector('[data-module="tasks"]').click();
};

// Loading flag to prevent duplicate module calls
let isModuleLoading = false;

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

// Notification permission will be requested on user gesture (Start Timer click)

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

// Mobile header display helper
function updateMobileHeader(moduleName) {
    const mobileTitleEl = document.getElementById('mobile-page-title');
    if (mobileTitleEl) {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        
        // Show mobile title on mobile for all modules
        if (isMobile) {
            mobileTitleEl.style.display = 'block';
            if (moduleName === 'dashboard') {
                mobileTitleEl.innerText = 'Dashboard';
            } else if (moduleName === 'tasks') {
                mobileTitleEl.innerText = 'Tasks';
            } else if (moduleName === 'habits') {
                mobileTitleEl.innerText = 'Habits';
            } else if (moduleName === 'calendar') {
                mobileTitleEl.innerText = 'Calendar';
            } else if (moduleName === 'stopwatch') {
                mobileTitleEl.innerText = 'Stopwatch';
            } else if (moduleName === 'pomodoro') {
                mobileTitleEl.innerText = 'Pomodoro';
            } else if (moduleName === 'notes') {
                mobileTitleEl.innerText = 'Notes';
            } else if (moduleName === 'community') {
                mobileTitleEl.innerText = 'Community';
            } else if (moduleName === 'analytics') {
                mobileTitleEl.innerText = 'Analytics';
            } else if (moduleName === 'design') {
                mobileTitleEl.innerText = 'Design';
            } else if (moduleName === 'backup') {
                mobileTitleEl.innerText = 'Backup';
            } else {
                mobileTitleEl.innerText = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
            }
        } else {
            mobileTitleEl.style.display = 'none';
        }
    }
}

// Create mobile navigation for small screens
function createMobileNavigation() {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const desktopNav = document.getElementById('desktop-nav');
    
    if (isMobile && desktopNav) {
        // Check if mobile nav already exists
        let mobileNav = document.querySelector('.mobile-nav');
        if (!mobileNav) {
            mobileNav = document.createElement('div');
            mobileNav.className = 'mobile-nav';
            mobileNav.setAttribute('aria-label', 'Main navigation');
            
            // Copy navigation links from desktop nav
            const navLinks = desktopNav.querySelectorAll('.nav-link[data-module]');
            navLinks.forEach(link => {
                const mobileLink = link.cloneNode(true);
                // Remove active class to prevent conflicts
                mobileLink.classList.remove('active');
                mobileNav.appendChild(mobileLink);
            });
            
            // Add settings and logout
            const navActions = desktopNav.querySelector('.nav-actions');
            if (navActions) {
                const mobileActions = navActions.cloneNode(true);
                mobileNav.appendChild(mobileActions);
            }
            
            document.body.appendChild(mobileNav);
            
            // Trigger smooth animation
            setTimeout(() => {
                mobileNav.classList.add('show');
            }, 100);
        }
    } else {
        // Remove mobile nav if not mobile
        const mobileNav = document.querySelector('.mobile-nav');
        if (mobileNav) {
            mobileNav.remove();
        }
    }
}

// Update active nav link for both desktop and mobile
function updateActiveNav(moduleName) {
    // Desktop
    document.querySelectorAll('#desktop-nav .nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.module === moduleName);
    });
    
    // Mobile
    document.querySelectorAll('.mobile-nav .nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.module === moduleName);
    });
}

// Load module content
async function loadModule(moduleName) {
    if (isModuleLoading) return; // Ignore if a module is already being loaded
    isModuleLoading = true;
    
    try {
        console.log(`Loading module: ${moduleName}`);
        
        // Clean up previous subscription to prevent memory leaks
        if (window.activeSubscription) {
            window.activeSubscription.unsubscribe();
            window.activeSubscription = null;
        }
        
        // This ensures that every time you switch modules, 
        // the app recalculates "today" in case it's past midnight IST.
        const today = getLocalDate();
        console.log(`Module loading with current IST date: ${today}`);
    
    // Always exit auth mode when loading main app modules
    document.body.classList.remove('auth-mode');
    
    // Show navigation if it was hidden
    const nav = document.getElementById('desktop-nav');
    if (nav) nav.style.display = '';
    
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

  // Update mobile header display
  updateMobileHeader(moduleName);

  // Update active navigation state
  updateActiveNav(moduleName);

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
  } finally {
    isModuleLoading = false; // Reset the flag when done
  }
}

// ============================================
// IMPROVED NAVIGATION SETUP WITH EVENT DELEGATION
// ============================================

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    
    // Display user's timezone
    const tzElement = document.getElementById('user-timezone');
    if (tzElement) {
        tzElement.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    
    // Create mobile navigation and handle resize
    createMobileNavigation();
    
    // Handle window resize for responsive navigation
    window.addEventListener('resize', () => {
        createMobileNavigation();
    });
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
  
  // Mobile navigation delegation
  document.addEventListener('click', (e) => {
    const mobileNavLink = e.target.closest('.mobile-nav .nav-link');
    if (mobileNavLink) {
      e.preventDefault();
      const module = mobileNavLink.dataset.module;
      if (module) {
        loadModule(module);
      }
    }
  });
  
  console.log('✅ Navigation setup complete');
}

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
        
        // ONLY load if it's not the current module to stop redundant loading
        const currentModule = document.body.getAttribute('data-current-module');
        if (currentModule !== savedModule) {
            loadModule(savedModule);
        }
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
    
    // Calculate 7 days ago to match Analytics module and ensure comprehensive sync
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    // Set to start of day UTC for consistent comparisons
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);
    console.log("Fetching focus sessions from:", sevenDaysAgo.toISOString());
    
    // Fetch all tasks for total count
    const { data: allTasks } = await supabase.from('tasks').select('is_completed');
    // Fetch tasks completed in the last 7 days for dashboard stats
    const { data: todayTasks } = await supabase
        .from('tasks')
        .select('is_completed')
        .eq('is_completed', true)
        .gte('updated_at', sevenDaysAgo.toISOString());
    
    const { data: habits } = await supabase.from('habits').select('streak, name');
    const { data: focusSessions } = await supabase
        .from('pomodoro_sessions')
        .select('focus_time_minutes')
        .gte('completed_at', sevenDaysAgo.toISOString());
    
    // Debug logging for sync verification
    console.log(`✅ Dashboard fetch results: ${allTasks?.length || 0} total tasks, ${todayTasks?.length || 0} completed tasks, ${focusSessions?.length || 0} focus sessions`);

    const totalTasks = allTasks?.length || 0;
    const completedTasks = todayTasks?.length || 0;
    const taskPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const topHabit = habits?.sort((a, b) => b.streak - a.streak)[0] || { name: 'None', streak: 0 };
    
    // Calculate today's focus time only for "Focus Time Today" card
    const todayDate = getLocalToday(); // Use enhanced local timezone for UI
    const todaySessions = focusSessions?.filter(s => 
        new Date(s.completed_at).toLocaleDateString('en-CA') === todayDate
    ) || [];
    const totalMinutes = todaySessions.reduce((acc, s) => acc + s.focus_time_minutes, 0);
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

    // Set up real-time subscriptions for dashboard stats
    const dashboardChannel = supabase
        .channel('dashboard-sync')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'tasks' }, 
            () => {
                console.log('🔄 Dashboard: Task change detected, refreshing stats');
                if (document.body.getAttribute('data-current-module') === 'dashboard') {
                    loadDashboard();
                }
            }
        )
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'habits' }, 
            () => {
                console.log('🔄 Dashboard: Habit change detected, refreshing stats');
                if (document.body.getAttribute('data-current-module') === 'dashboard') {
                    loadDashboard();
                }
            }
        )
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'pomodoro_sessions' }, 
            () => {
                console.log('🔄 Dashboard: Pomodoro session change detected, refreshing stats');
                if (document.body.getAttribute('data-current-module') === 'dashboard') {
                    loadDashboard();
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Dashboard real-time subscription active');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Dashboard real-time subscription error');
            }
        });

    // Store subscription for cleanup when switching modules
    window.activeSubscription = dashboardChannel;
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

    // Check if we have a filter from the calendar
    const filterDate = localStorage.getItem('taskFilterDate');
    if (filterDate) {
        // Set the date input to the clicked date
        taskDate.value = filterDate;
        
        // Optional: Flash a message
        showStatusMessage(`Showing tasks for ${filterDate}`, 'success');
        
        // Clear the filter so it doesn't persist forever
        localStorage.removeItem('taskFilterDate');
    }

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

    const hideCompleted = document.getElementById('hide-completed')?.checked || false;
    
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

    // Helper function to add passive touch listeners to task items
    const addTouchListeners = () => {
        document.querySelectorAll('.task-item').forEach(item => {
            const id = item.dataset.taskId;
            item.addEventListener('touchstart', (e) => handleTaskTouchStart(e, id), { passive: true });
            item.addEventListener('touchmove', handleTaskTouchMove, { passive: false }); // Critical fix
            item.addEventListener('touchend', (e) => handleTaskTouchEnd(e, id), { passive: true });
        });
    };

    // Use displayTasks.map instead of sortedTasks.map
    taskList.innerHTML = displayTasks.map(task => `
        <div class="task-item ${task.is_completed ? 'completed' : ''}" 
             data-task-id="${task.id}">
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

    // Add passive touch event listeners after DOM is ready
    setTimeout(addTouchListeners, 0);
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

    const hideCompletedCheckbox = document.getElementById('hide-completed');
    if (hideCompletedCheckbox) {
        hideCompletedCheckbox.addEventListener('change', renderTasks);
    }

    renderTasks();

    // Set up real-time subscription for tasks
    const tasksChannel = supabase
        .channel('public:tasks')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'tasks' }, 
            (payload) => {
                console.log('🔄 Task change received:', payload);
                // If user is currently viewing tasks, refresh the list
                if (document.body.getAttribute('data-current-module') === 'tasks') {
                    renderTasks();
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Tasks real-time subscription active');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Tasks real-time subscription error');
            }
        });

    // Store subscription for cleanup when switching modules
    window.activeSubscription = tasksChannel;
}

// Global Task Functions
window.toggleTask = async (id, isChecked) => {
    await supabase.from('tasks').update({ 
        is_completed: isChecked,
        updated_at: new Date().toISOString() 
    }).eq('id', id);

    // FIX: Instead of calling renderTasks() directly (which is out of scope),
    // trigger a fresh load of tasks module.
    if (document.body.getAttribute('data-current-module') === 'tasks') {
        loadTasks(); 
    }
};

window.deleteTask = async (id) => {
    if (confirm("Are you sure you want to delete this task?")) {
        await supabase.from('tasks').delete().eq('id', id);
        if (document.body.getAttribute('data-current-module') === 'tasks') {
            loadTasks(); // This correctly refreshes UI
        }
    }
};

// Touch event handlers for swipe-to-delete functionality
let touchStartX = 0;
let touchStartY = 0;
let currentTaskId = null;
let deletedTask = null; // Store deleted task for undo

window.handleTaskTouchStart = (e, taskId) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    currentTaskId = taskId;
};

window.handleTaskTouchMove = (e) => {
    if (!currentTaskId) return;
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - touchStartX;
    const deltaY = touchY - touchStartY;
    
    // Check if it's a horizontal swipe (more horizontal than vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Prevent default scroll behavior
        e.preventDefault();
        
        // Swipe left to delete
        if (deltaX < -50) {
            const taskElement = document.querySelector(`[data-task-id="${currentTaskId}"]`);
            if (taskElement) {
                taskElement.style.transform = 'translateX(-100px)';
                taskElement.style.opacity = '0.5';
                
                // Add visual warning during delete window
                taskElement.style.backgroundColor = '#ef4444';
                taskElement.style.animation = 'shake 0.3s ease-in-out';
                
                // Get task data for undo
                const taskTitle = taskElement.querySelector('.task-item div div').textContent;
                const taskCheckbox = taskElement.querySelector('input[type="checkbox"]');
                const wasCompleted = taskCheckbox.checked;
                
                // Store deleted task info
                deletedTask = {
                    id: currentTaskId,
                    title: taskTitle,
                    is_completed: wasCompleted,
                    priority: taskElement.querySelector('.priority-badge').textContent // Capture priority
                };
                
                // Immediately remove from UI and database
                setTimeout(async () => {
                    if (!currentTaskId) return; // Guard clause
                    
                    // Reset visual warning before deletion
                    if (taskElement) {
                        taskElement.style.animation = '';
                        taskElement.style.backgroundColor = '';
                    }
                    
                    await supabase.from('tasks').delete().eq('id', currentTaskId);
                    
                    // Show snackbar with undo option
                    showTaskSnackbar('Task deleted', 'Undo', () => {
                        // Restore task
                        restoreTask(deletedTask);
                    });
                    
                    // Update task list
                    if (document.body.getAttribute('data-current-module') === 'tasks') {
                        loadTasks();
                    }
                }, 300);
            }
        }
    }
};

window.handleTaskTouchEnd = (e, taskId) => {
    currentTaskId = null;
    
    // Reset all task items that might have been moved
    document.querySelectorAll('.task-item').forEach(item => {
        item.style.transform = 'translateX(0)';
        item.style.opacity = '1';
    });
};

// Snackbar functionality for task deletion
function showTaskSnackbar(message, action, callback) {
    // Remove existing snackbar
    const existingSnackbar = document.querySelector('.task-snackbar');
    if (existingSnackbar) {
        existingSnackbar.remove();
    }
    
    // Create snackbar element
    const snackbar = document.createElement('div');
    snackbar.className = 'task-snackbar';
    
    // Create text span
    const textSpan = document.createElement('span');
    textSpan.innerText = message;
    snackbar.appendChild(textSpan);
    
    // Create action button only if an action and callback exist
    if (action && callback) {
        const actionBtn = document.createElement('button');
        actionBtn.className = 'snackbar-action';
        actionBtn.innerText = action;
        actionBtn.onclick = () => {
            snackbar.remove();
            callback(); // Direct function call, no string parsing needed
        };
        snackbar.appendChild(actionBtn);
    }
    
    // Add to page
    document.body.appendChild(snackbar);
    
    // Trigger animation
    setTimeout(() => snackbar.classList.add('show'), 100);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (snackbar.parentElement) {
            snackbar.remove();
        }
    }, 5000);
}

// Restore task function for undo
async function restoreTask(task) {
    try {
        await supabase.from('tasks').insert({
            id: task.id,
            title: task.title,
            user_id: (await supabase.auth.getUser()).data.user.id,
            is_completed: task.is_completed,
            priority: task.priority, // Use the captured priority
            created_at: new Date().toISOString()
        });
        
        // Update task list
        if (document.body.getAttribute('data-current-module') === 'tasks') {
            loadTasks();
        }
        
        // Show success feedback
        showTaskSnackbar('Task restored', '', null);
    } catch (error) {
        console.error('Error restoring task:', error);
        showTaskSnackbar('Error restoring task', '', null);
    }
}

/* ============================================
   HABITS MODULE
   ============================================ */

async function loadHabits() {
    // 1. Get current session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        console.error("User not authenticated for habits module");
        contentArea.innerHTML = `
            <h1>🔥 Habits</h1>
            <div class="empty-state">Please log in to view your habits.</div>
        `;
        return;
    }

    contentArea.innerHTML = `
        <h1>🔥 Habits</h1>
        <div class="task-input-group">
            <input type="text" id="habit-input" placeholder="Add a new habit...">
            <button class="btn-primary" id="add-habit-btn">Add Habit</button>
        </div>
        <div class="habits-grid" id="habit-list"></div>
    `;

    const habitList = document.getElementById('habit-list');
    const habitInput = document.getElementById('habit-input');
    const addHabitBtn = document.getElementById('add-habit-btn');

    const renderHabits = async () => {
        // GUARD: If user is null, stop execution to prevent 'id' error
        if (!user) {
            console.error("Cannot render habits: User object is null.");
            return;
        }

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
            const lastCompleted = habit.last_completed ? habit.last_completed.split('T')[0] : null;
            const isDoneToday = lastCompleted === getLocalDate();
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

    // Set up real-time subscription for habits
    const habitsChannel = supabase
        .channel('public:habits')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'habits' }, 
            (payload) => {
                console.log('🔄 Habit change received:', payload);
                // If user is currently viewing habits, refresh the list
                if (document.body.getAttribute('data-current-module') === 'habits') {
                    renderHabits();
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Habits real-time subscription active');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Habits real-time subscription error');
            }
        });

    // Store subscription for cleanup when switching modules
    window.activeSubscription = habitsChannel;
}

// Global Habit Functions
window.completeHabit = async (id) => {
    const today = getLocalDate();
    const { data: habit } = await supabase.from('habits').select('*').eq('id', id).single();

    const lastCompleted = habit.last_completed ? habit.last_completed.split('T')[0] : null;

    let newStreak = habit.streak;
    if (lastCompleted === today) {
        // Already counted today
    } else {
        newStreak++;
    }

    await supabase
        .from('habits')
        .update({ 
            streak: newStreak, 
            last_completed: new Date().toISOString() // DB still stores UTC, but our logic checks Local
        })
        .eq('id', id);
    
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

    // NEW: Add Resize Listener specifically for Calendar
    // This ensures switching between "Dots" and "Text" happens instantly
    const calendarResizeHandler = () => {
        // Debounce slightly to prevent performance hit
        if (window.calendarResizeTimeout) clearTimeout(window.calendarResizeTimeout);
        window.calendarResizeTimeout = setTimeout(() => {
            if (document.body.getAttribute('data-current-module') === 'calendar') {
                renderCalendarFunc();
            }
        }, 200);
    };

    window.removeEventListener('resize', calendarResizeHandler); // Cleanup old
    window.addEventListener('resize', calendarResizeHandler);

    // Set up real-time subscription for calendar tasks
    const calendarChannel = supabase
        .channel('calendar-sync')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'tasks' }, 
            () => {
                console.log('🔄 Calendar: Task change detected, refreshing calendar');
                if (document.body.getAttribute('data-current-module') === 'calendar') {
                    renderCalendarFunc();
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Calendar real-time subscription active');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Calendar real-time subscription error');
            }
        });

    // Store subscription for cleanup when switching modules
    window.activeSubscription = calendarChannel;
}

async function renderCalendarFunc() {
    const grid = document.getElementById('calendar-grid');
    const monthYearLabel = document.getElementById('current-month-year');
    if (!grid || !monthYearLabel) return;

    // 1. ADD this helper function to sanitize HTML
    const escapeHtml = (unsafe) => {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    };

    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const today = getLocalToday(); // Use enhanced timezone-aware local date
    monthYearLabel.innerText = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate);

    // Fetch tasks that have a due_date
    const { data: tasks } = await supabase
        .from('tasks')
        .select('title, due_date, priority, is_completed');

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayIndex = new Date(year, month, 1).getDay();

    // Calculate total grid cells and rows needed for dynamic styling
    const totalCells = startDayIndex + daysInMonth;
    const rowsNeeded = Math.ceil(totalCells / 7);

    // Update container class based on row count for specific mobile styling
    grid.className = `calendar-grid rows-${rowsNeeded}`;

    grid.innerHTML = '';

    // Add empty slots for previous month
    for (let x = 0; x < startDayIndex; x++) {
        grid.innerHTML += '<div class="day empty"></div>';
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayTasks = tasks?.filter(t => t.due_date === dateString) || [];
        const isToday = dateString === new Date(year, month, i).toLocaleDateString('en-CA');

        const isMobile = window.matchMedia('(max-width: 768px)').matches;

        // 2. UPDATE the mapping logic to use sanitized HTML
        const taskHtml = dayTasks.map(t => {
            const safeTitle = escapeHtml(t.title); // Sanitize immediately

            // MOBILE VIEW: Show simple dots instead of text
            if (isMobile) {
                return `<div class="calendar-dot ${t.priority}" title="${safeTitle}"></div>`;
            } 
            // DESKTOP VIEW: Show full text (existing logic)
            else {
                return `
                    <div class="calendar-task-item ${t.priority}" title="${safeTitle}">
                        ${t.is_completed ? '✅' : ''} ${safeTitle}
                    </div>
                `;
            }
        }).join('');

        grid.innerHTML += `
            <div class="day ${isToday ? 'today' : ''}" onclick="openDayTasks('${dateString}')" style="cursor: pointer;">
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
let pomodoroEndTime = null;

// Pomodoro timer functions
function togglePomodoroFunc() {
    const btn = document.getElementById('start-timer');
    if (!btn) return;
    
    if (!pomodoroIsRunning) {
        // STARTING / RESUMING
        pomodoroIsRunning = true;
        pomodoroEndTime = Date.now() + (pomodoroTimeLeft * 1000);
        
        // Request notification permission on user gesture (more reliable)
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission().then(permission => {
                console.log("Notification permission:", permission);
            });
        }
        
        localStorage.setItem('pomodoroState', 'running');
        localStorage.setItem('pomodoroEndTime', pomodoroEndTime.toString());
        localStorage.removeItem('pomodoroTimeLeft'); // Clear paused time
        
        btn.innerText = "Pause Focus";
        btn.style.backgroundColor = "#dc2626";
        startTimerLogic();
        
        console.log('[Pomodoro Debug] Timer started/resumed');
    } else {
        // PAUSING
        pomodoroIsRunning = false;
        clearInterval(pomodoroInterval);
        pomodoroInterval = null;
        
        localStorage.setItem('pomodoroState', 'paused');
        localStorage.setItem('pomodoroTimeLeft', pomodoroTimeLeft.toString());
        localStorage.removeItem('pomodoroEndTime'); // Clear end time when paused
        
        btn.innerText = "Resume Focus";
        btn.style.backgroundColor = "#f59e0b";
        document.title = 'TaskPro | Pomodoro';
        
        console.log('[Pomodoro Debug] Timer paused at', pomodoroTimeLeft, 'seconds');
    }
}

function stopPomodoroFunc() {
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;

    const state = localStorage.getItem('pomodoroState');
    if (state === 'running' || state === 'paused') {
        const totalPossible = 25 * 60;
        const currentRemaining = parseInt(localStorage.getItem('pomodoroTimeLeft')) || 0;
        const secondsSpent = totalPossible - currentRemaining;
        const minutesSpent = Math.floor(secondsSpent / 60);

        if (minutesSpent > 0) {
            console.log(`[Pomodoro] Manual stop. Logging ${minutesSpent} minutes focus time.`);
            savePomodoroSession(minutesSpent);
        }
    }

    clearPomodoroState();
    updatePomodoroDisplay(25 * 60);
    document.getElementById('start-timer').innerText = 'Start Focus';
}

function resetPomodoroFunc() {
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;
    clearPomodoroState();
    updatePomodoroDisplay(25 * 60);
    document.getElementById('start-timer').innerText = 'Start Focus';
    console.log('[Pomodoro] Timer reset. No database logging.');
}

function clearPomodoroState() {
    localStorage.removeItem('pomodoroState');
    localStorage.removeItem('pomodoroEndTime');
    localStorage.removeItem('pomodoroTimeLeft');
    pomodoroTimeLeft = 25 * 60;
    pomodoroIsRunning = false;
    pomodoroEndTime = null;
}

function updatePomodoroDisplay() {
    const display = document.getElementById('timer-display');
    
    // ADD NULL CHECK:
    if (!display) return;
    
    // Ensure we don't show negative time
    const displayTime = pomodoroTimeLeft < 0 ? 0 : pomodoroTimeLeft;
    
    const mins = Math.floor(displayTime / 60);
    const secs = displayTime % 60;
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

async function loadPomodoro() {
    // Clean up any existing interval to prevent "ghost timers"
    if (pomodoroInterval) {
        clearInterval(pomodoroInterval);
        pomodoroInterval = null;
    }

    contentArea.innerHTML = `
        <div class="pomodoro-container card">
            <h1>🍅 Pomodoro Timer</h1>
            
            <div id="timer-display" class="pomodoro-display">25:00</div>
            
            <div class="session-info">
                <p>Session: <strong id="session-count">1</strong> | Total Focus: <strong id="total-focus">0 mins</strong></p>
            </div>

            <div class="pomodoro-controls" style="display: flex; gap: 10px; justify-content: center;">
                <button id="start-timer" onclick="togglePomodoro()" class="btn-primary">Start Focus</button>
                <button id="stop-timer" onclick="stopPomodoro()" class="btn-outline" style="border-color: #ef4444; color: #ef4444;">Stop</button>
                <button id="reset-timer" onclick="resetPomodoro()" class="btn-outline">Reset</button>
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

    // 1. Load Session Stats
    pomodoroSessionCount = parseInt(localStorage.getItem('pomodoroSessionCount')) || 0;
    pomodoroTotalFocusTime = parseInt(localStorage.getItem('pomodoroTotalFocusTime')) || 0;
    console.log('[Pomodoro Debug] Loaded session stats:', { sessions: pomodoroSessionCount, focusTime: pomodoroTotalFocusTime });

    // 2. Restore Timer State
    const savedEndTime = localStorage.getItem('pomodoroEndTime');
    const savedState = localStorage.getItem('pomodoroState'); // 'running' or 'paused'
    const savedTimeLeft = localStorage.getItem('pomodoroTimeLeft');
    
    console.log('[Pomodoro Debug] Restoring state:', { endTime: savedEndTime, state: savedState, timeLeft: savedTimeLeft });

    if (savedState === 'running' && savedEndTime) {
        const remaining = Math.floor((parseInt(savedEndTime) - Date.now()) / 1000);
        if (remaining > 0) {
            pomodoroTimeLeft = remaining;
            pomodoroIsRunning = true;
            pomodoroEndTime = parseInt(savedEndTime);
            startTimerLogic(); // Resume counting
            console.log('[Pomodoro Debug] Resumed running timer with', remaining, 'seconds');
        } else {
            resetPomodoroFunc(); // Time expired while away
            console.log('[Pomodoro Debug] Timer expired while away, resetting');
        }
    } else if (savedState === 'paused' && savedTimeLeft) {
        pomodoroTimeLeft = parseInt(savedTimeLeft);
        pomodoroIsRunning = false;
        console.log('[Pomodoro Debug] Restored paused timer with', savedTimeLeft, 'seconds');
    } else {
        // Fresh start
        pomodoroTimeLeft = 25 * 60;
        pomodoroIsRunning = false;
        console.log('[Pomodoro Debug] Fresh timer start');
    }

    updatePomodoroDisplay();
    
    // Sync UI button text
    const btn = document.getElementById('start-timer');
    if (btn && pomodoroIsRunning) {
        btn.innerText = "Pause Focus";
        btn.style.backgroundColor = "#dc2626";
    } else if (btn && !pomodoroIsRunning && pomodoroTimeLeft < 25 * 60) {
        btn.innerText = "Resume Focus";
        btn.style.backgroundColor = "#f59e0b";
    }

    window.togglePomodoro = togglePomodoroFunc;
    window.stopPomodoro = stopPomodoroFunc;
    window.resetPomodoro = resetPomodoroFunc;
    
    // Debug: Verify functions are properly defined
    console.log('[Pomodoro Debug] Functions assigned to window:', {
        togglePomodoro: typeof window.togglePomodoro,
        stopPomodoro: typeof window.stopPomodoro,
        resetPomodoro: typeof window.resetPomodoro
    });
}

function updatePomodoroDisplay() {
    const display = document.getElementById('timer-display');
    
    // ADD NULL CHECK:
    if (!display) return;
    
    // Ensure we don't show negative time
    const displayTime = pomodoroTimeLeft < 0 ? 0 : pomodoroTimeLeft;
    
    const mins = Math.floor(displayTime / 60);
    const secs = displayTime % 60;
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

function startTimerLogic() {
    // Defensive check: Clear any existing interval before starting
    if (pomodoroInterval) {
        clearInterval(pomodoroInterval);
        pomodoroInterval = null;
    }

    pomodoroInterval = setInterval(() => {
        if (pomodoroIsRunning) {
            const now = Date.now();
            pomodoroTimeLeft = Math.max(0, Math.floor((pomodoroEndTime - now) / 1000));
            
            updatePomodoroDisplay();
            
            // Tab Title Sync
            const mins = Math.floor(pomodoroTimeLeft / 60);
            const secs = pomodoroTimeLeft % 60;
            const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            document.title = `(${timeStr}) Focus | TaskPro`;

            if (pomodoroTimeLeft <= 0) {
                handleTimerCompletion();
            }
        }
    }, 1000);
    
    console.log('[Pomodoro Debug] Timer interval started');
}

function handleTimerCompletion() {
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;
    finishSound.play();
    
    pomodoroSessionCount++;
    pomodoroTotalFocusTime += 25;
    
    console.log('[Pomodoro Debug] Timer completed! Sessions:', pomodoroSessionCount, 'Focus time:', pomodoroTotalFocusTime);
    
    showStatusMessage('🎉 Focus session complete! Take a 5-minute break.', 'success');
    
    // System notification with error handling
    if ("Notification" in window && Notification.permission === "granted") {
        try {
            new Notification("Pomodoro Finished!", { 
                body: "Great job! Take a 5-minute break.",
                icon: "/favicon.ico"
            });
        } catch (error) {
            console.warn("Failed to show notification:", error);
        }
    }
    
    // Dynamic favicon change for visual alert
    changeFavicon('alert');
    
    // Reset tab title
    document.title = 'TaskPro | Pomodoro';
    
    // Save Stats
    localStorage.setItem('pomodoroSessionCount', pomodoroSessionCount);
    localStorage.setItem('pomodoroTotalFocusTime', pomodoroTotalFocusTime);
    
    savePomodoroSession(); // Cloud Save
}

function resetPomodoroFunc() {
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;
    clearPomodoroState();
    updatePomodoroDisplay(25 * 60);
    document.getElementById('start-timer').innerText = 'Start Focus';
    console.log('[Pomodoro] Timer reset. No database logging.');
}

function stopPomodoroFunc() {
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;

    const state = localStorage.getItem('pomodoroState');
    if (state === 'running' || state === 'paused') {
        const totalPossible = 25 * 60;
        const currentRemaining = parseInt(localStorage.getItem('pomodoroTimeLeft')) || 0;
        const secondsSpent = totalPossible - currentRemaining;
        const minutesSpent = Math.floor(secondsSpent / 60);

        if (minutesSpent > 0) {
            console.log(`[Pomodoro] Manual stop. Logging ${minutesSpent} minutes focus time.`);
            savePomodoroSession(minutesSpent);
        }
    }

    clearPomodoroState();
    updatePomodoroDisplay(25 * 60);
    document.getElementById('start-timer').innerText = 'Start Focus';
}

function clearPomodoroState() {
    localStorage.removeItem('pomodoroState');
    localStorage.removeItem('pomodoroEndTime');
    localStorage.removeItem('pomodoroTimeLeft');
    pomodoroTimeLeft = 25 * 60;
    pomodoroIsRunning = false;
    pomodoroEndTime = null;
}

// Dynamic favicon change for visual alerts
function changeFavicon(state) {
    const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
    link.rel = 'icon';
    
    if (state === 'alert') {
        // Red alert favicon with timer emoji
        link.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22 fill="%23ef4444%22>⏰</text></svg>';
        console.log('[Pomodoro Debug] Favicon changed to alert state');
    } else {
        // Normal favicon (you can replace with your actual favicon path)
        link.href = '/favicon.ico';
        console.log('[Pomodoro Debug] Favicon reset to normal');
    }
    
    if (!document.querySelector("link[rel~='icon']")) {
        document.head.appendChild(link);
    }
}

// Tab visibility listener for accurate timer behavior
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // If a timer was running, force a UI sync from saved EndTime
        const state = localStorage.getItem('pomodoroState');
        if (state === 'running') {
            const savedEndTime = localStorage.getItem('pomodoroEndTime');
            if (savedEndTime) {
                const remaining = Math.floor((parseInt(savedEndTime) - Date.now()) / 1000);
                if (remaining > 0 && remaining < 25 * 60) {
                    pomodoroTimeLeft = remaining;
                    pomodoroIsRunning = true;
                    pomodoroEndTime = parseInt(savedEndTime);
                    startTimerLogic(); // This will clear old interval and start fresh, accurate one
                    console.log('[Pomodoro Debug] Tab visible - synced running timer');
                }
            }
        }
    }
});

async function savePomodoroSession(minutesSpent = 25) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error("No user found, cannot save session");
            return;
        }

        // Ensure INTEGER compliance with database schema
        const minutesInteger = Math.floor(minutesSpent);

        const { error } = await supabase
            .from('pomodoro_sessions')
            .insert({
                user_id: user.id,
                focus_time_minutes: minutesInteger,
                completed_at: new Date().toISOString()
            });

        if (error) {
            console.error("Error saving pomodoro session:", error.message);
        } else {
            console.log(`✅ Pomodoro session saved: ${minutesInteger} minutes`);
        }
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

            statusMsg.innerText = error ? "Error saving!" : (() => {
                // Show the exact IST time of the last save
                const lastSave = new Date().toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
                return `Saved to cloud at ${lastSave} ☁️`;
            })();
        }, 1000);
    });

    // Set up real-time subscription for notes
    const notesChannel = supabase
        .channel('public:notes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'notes' }, 
            (payload) => {
                console.log('🔄 Note change received:', payload);
                // If user is currently viewing notes, refresh the content
                if (document.body.getAttribute('data-current-module') === 'notes') {
                    // Reload the note content from database
                    supabase.from('notes').select('content').eq('user_id', user.id).single()
                        .then(({ data }) => {
                            if (data && data.content) {
                                document.getElementById('notes-editor').value = data.content;
                            }
                        });
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Notes real-time subscription active');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Notes real-time subscription error');
            }
        });

    // Store subscription for cleanup when switching modules
    window.activeSubscription = notesChannel;
}

/* ============================================
   COMMUNITY MODULE
   ============================================ */

async function loadCommunity() {
    // Get user data once and pass it down to prevent multiple auth requests
    const { data: { user } } = await supabase.auth.getUser();
    
    contentArea.innerHTML = `
        <div class="community-header">
            <h1>👥 Community</h1>
            <button class="leaderboard-toggle-btn" id="toggle-leaderboard">
                🏆 View Leaderboard
            </button>
        </div>
        <div class="community-grid">
            <div class="chat-container card">
                <h3 style="padding: 15px; margin: 0; border-bottom: 1px solid #eee;">Global Chat</h3>
                <div class="chat-messages" id="chat-messages"></div>
                <div class="chat-input-area">
                    <input type="text" id="chat-input" placeholder="Type a message...">
                    <button id="send-chat" class="btn-primary">Send</button>
                </div>
            </div>
            <div class="card" id="leaderboard-section">
                <h3>🏆 Leaderboard</h3>
                <div id="leaderboard"></div>
            </div>
        </div>
    `;

    // Add toggle event listener
    const toggleBtn = document.getElementById('toggle-leaderboard');
    const leaderboard = document.getElementById('leaderboard-section');
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            leaderboard.classList.toggle('mobile-show');
            toggleBtn.innerText = leaderboard.classList.contains('mobile-show') 
                ? "💬 Back to Chat" 
                : "🏆 View Leaderboard";
        });
    }

    setupChat(user); // Pass user data to prevent multiple auth requests
    renderLeaderboard(); // Your existing leaderboard logic
}

async function setupChat(user) {
    const chatBox = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-chat');
    // User data is now passed in, no need to request again

    // 1. Load Last 50 Messages
    const { data: messages } = await supabase
        .from('messages')
        .select('*') // Select all columns including user_email
        .order('created_at', { ascending: true })
        .limit(50);

    const renderMessage = (msg) => {
        // Check if user session is ready to prevent crashes
        if (!user) return; // Exit if user session isn't ready yet
        
        // Convert DB timestamp to IST display format
        const istTime = new Date(msg.created_at).toLocaleTimeString('en-IN', {
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
        
        const div = document.createElement('div');
        div.className = `chat-msg ${msg.user_id === user.id ? 'sent' : 'received'}`;
        
        // Privacy: Use only the part before @ symbol as display name
        const displayName = msg.user_email ? msg.user_email.split('@')[0] : 'User';
        
        // SANITIZATION FIX: Create elements safely
        const meta = document.createElement('small');
        meta.textContent = `${displayName} • ${istTime}`;

        const text = document.createElement('p');
        text.textContent = msg.content; // textContent prevents HTML execution

        div.appendChild(meta);
        div.appendChild(text);
        
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    if (messages) messages.forEach(renderMessage);

    // 2. Listen for Message Changes (Realtime)
    const channel = supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, 
            payload => renderMessage(payload.new))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, 
            payload => {
                // Find and update the existing message
                const messageEl = document.querySelector(`[data-id="${payload.new.id}"]`).closest('.chat-msg');
                if (messageEl) {
                    const contentEl = messageEl.querySelector('.message-content');
                    if (contentEl) {
                        contentEl.textContent = payload.new.content;
                    }
                }
            })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, 
            payload => {
                // Remove the deleted message from UI
                const messageEl = document.querySelector(`[data-id="${payload.old.id}"]`).closest('.chat-msg');
                if (messageEl) {
                    messageEl.remove();
                }
            })
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

    // Handle Edit and Delete actions
    document.addEventListener('click', async (e) => {
        // Handle Deletion
        if (e.target.classList.contains('delete-msg')) {
            const msgId = e.target.dataset.id;
            if (confirm("Delete this message?")) {
                await supabase.from('messages').delete().eq('id', msgId);
                // The Realtime listener will handle the UI removal
            }
        }

        // Handle Editing
        if (e.target.classList.contains('edit-msg')) {
            const msgId = e.target.dataset.id;
            const newText = prompt("Edit your message:");
            if (newText && newText.trim()) {
                await supabase.from('messages').update({ content: newText.trim() }).eq('id', msgId);
            }
        }
    });
}

async function renderLeaderboard() {
    const leaderboard = document.getElementById('leaderboard');
    
    // GUARD: If the HTML element isn't on the screen yet, stop
    if (!leaderboard) return;

    const { data: habits } = await supabase
        .from('habits')
        .select('name, streak, user_id')
        .order('streak', { ascending: false })
        .limit(10);

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
            
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Productivity Score</h3>
                    <div id="productivity-score" style="font-size: 2.5rem; font-weight: bold; color: var(--primary);">--</div>
                    <p style="color: var(--text-dim);">Based on recent activity</p>
                </div>
                <div class="stat-card">
                    <h3>Total Tasks</h3>
                    <div id="total-tasks" style="font-size: 2rem; font-weight: bold; color: var(--text-main);">--</div>
                    <p style="color: var(--text-dim);">All time tasks</p>
                </div>
                <div class="stat-card">
                    <h3>Active Habits</h3>
                    <div id="active-habits" style="font-size: 2rem; font-weight: bold; color: var(--text-main);">--</div>
                    <p style="color: var(--text-dim);">Current streaks</p>
                </div>
            </div>

            <div class="dashboard-content" style="margin-top: 2rem;">
                <div class="card">
                    <h3>Task Distribution</h3>
                    <canvas id="taskChart" width="400" height="250"></canvas>
                </div>
                <div class="card">
                    <h3>Habit Streaks</h3>
                    <canvas id="habitChart" width="400" height="250"></canvas>
                </div>
            </div>

            <div class="card" style="margin-top: 2rem;">
                <h3>7-Day Activity</h3>
                <canvas id="activityChart" width="400" height="200"></canvas>
            </div>

            <div class="card" style="margin-top: 2rem; grid-column: span 2;">
                <h3>Focus Time Analysis (Minutes)</h3>
                <canvas id="focusTimeChart" width="800" height="250"></canvas>
            </div>
        </div>
    `;

    // 1. Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // 2. Guard against null user
    if (authError || !user) {
        console.error("Cannot load analytics: User not authenticated.");
        contentArea.innerHTML = `
            <h1>📊 Productivity Insights</h1>
            <div class="empty-state">Please log in to view your analytics.</div>
        `;
        return;
    }

    console.log("Loading analytics for user:", user.id);
    console.log("Analytics using UTC timezone - charts will flip at midnight UTC");
    
    // Calculate date range for last 7 days to handle device clock skew
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Generate last 7 days in Local Time for chart labels and filtering
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.push(d.toLocaleDateString('en-CA'));
    }

    // Fetch data for the last 7 days only (more efficient)
    const [tasksRes, habitsRes, sessionsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id).gte('updated_at', sevenDaysAgo.toISOString()),
        supabase.from('habits').select('*').eq('user_id', user.id),
        supabase.from('pomodoro_sessions').select('focus_time_minutes, completed_at').eq('user_id', user.id).gte('completed_at', sevenDaysAgo.toISOString()).order('completed_at', { ascending: true })
    ]);

    const tasks = tasksRes.data || [];
    const habits = habitsRes.data || [];
    const sessions = sessionsRes.data || [];
    
    console.log('Analytics UTC date range:', last7Days[0], 'to', last7Days[6]);

    // 1. Calculate Productivity Score
    const completed = tasks.filter(t => t.is_completed).length;
    const score = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    
    // Guard against null elements
    const scoreElement = document.getElementById('productivity-score');
    const tasksElement = document.getElementById('total-tasks');
    const habitsElement = document.getElementById('active-habits');
    
    if (scoreElement) scoreElement.innerText = `${score}%`;
    if (tasksElement) tasksElement.innerText = tasks.length;
    if (habitsElement) habitsElement.innerText = habits.length;

    // 2. Render Task Distribution Pie Chart
    const pending = tasks.length - completed;
    
    // --- FIX: DESTROY EXISTING CHART ---
    if (taskChartInstance) {
        taskChartInstance.destroy();
    }
    
    // --- CREATE NEW CHART AND SAVE REFERENCE ---
    taskChartInstance = new Chart(document.getElementById('taskChart'), {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Pending'],
            datasets: [{
                data: [completed, pending],
                backgroundColor: ['#10b981', '#6366f1'],
                borderWidth: 0
            }]
        },
        options: { 
            responsive: true,
            plugins: { 
                legend: { 
                    position: 'bottom', 
                    labels: { color: '#f8fafc' } 
                } 
            } 
        }
    });

    // 3. Render Habit Streaks Bar Chart
    // --- FIX: DESTROY EXISTING CHART ---
    if (habitChartInstance) {
        habitChartInstance.destroy();
    }
    
    // --- CREATE NEW CHART AND SAVE REFERENCE ---
    habitChartInstance = new Chart(document.getElementById('habitChart'), {
        type: 'bar',
        data: {
            labels: habits.map(h => h.name || 'Unnamed'),
            datasets: [{
                label: 'Current Streak',
                data: habits.map(h => h.streak || 0),
                backgroundColor: '#f59e0b',
                borderRadius: 5
            }]
        },
        options: { 
            responsive: true,
            scales: { 
                y: { 
                    ticks: { color: '#94a3b8' },
                    beginAtZero: true
                },
                x: { 
                    ticks: { color: '#94a3b8' } 
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#f8fafc' }
                }
            }
        }
    });

    // 4. Render 7-Day Activity Line Chart - Optimized IST Logic
    const last7DayLabels = last7Days.map((date, i) => {
        const d = new Date(date);
        return d.toLocaleDateString('en', { weekday: 'short' });
    });

    // Group Tasks by Local Date using efficient filtering
    const taskStats = last7Days.map(date => {
        return tasks.filter(t => {
            if (!t.is_completed || !t.updated_at) return false;
            // Convert task updated_at to local date string for proper comparison
            const taskDate = new Date(t.updated_at).toLocaleDateString('en-CA');
            return taskDate === date;
        }).length;
    });

    // --- FIX: DESTROY EXISTING CHART ---
    if (activityChartInstance) {
        activityChartInstance.destroy();
    }
    
    // --- CREATE NEW CHART AND SAVE REFERENCE ---
    activityChartInstance = new Chart(document.getElementById('activityChart'), {
        type: 'line',
        data: {
            labels: last7DayLabels,
            datasets: [{
                label: 'Tasks Completed',
                data: taskStats,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: { 
                y: { 
                    ticks: { color: '#94a3b8', stepSize: 1 },
                    beginAtZero: true
                },
                x: { 
                    ticks: { color: '#94a3b8' } 
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#f8fafc' }
                }
            }
        }
    });

    // 5. Render Focus Time Analysis Chart - Optimized IST Logic
    const focusDayLabels = last7Days.map((date, i) => {
        const d = new Date(date);
        return d.toLocaleDateString('en', { weekday: 'short' });
    });

    // Group Focus Time by Local Date using efficient filtering
    const focusStats = last7Days.map(date => {
        const totalMins = sessions
            ?.filter(s => {
                // Convert session completed_at to local date string for proper comparison
                const sessionDate = new Date(s.completed_at).toLocaleDateString('en-CA');
                return sessionDate === date;
            })
            .reduce((sum, s) => sum + (s.focus_time_minutes || 0), 0) || 0;
        return (totalMins / 60).toFixed(1); // Convert to hours
    });

    // --- FIX: DESTROY EXISTING CHART ---
    if (focusTimeChartInstance) {
        focusTimeChartInstance.destroy();
    }
    
    // --- CREATE NEW CHART AND SAVE REFERENCE ---
    focusTimeChartInstance = new Chart(document.getElementById('focusTimeChart'), {
        type: 'line',
        data: {
            labels: focusDayLabels,
            datasets: [{
                label: 'Focus Time (Hours)',
                data: focusStats,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { 
                    beginAtZero: true, 
                    ticks: { color: '#94a3b8' },
                    title: {
                        display: true,
                        text: 'Minutes',
                        color: '#94a3b8'
                    }
                },
                x: { 
                    ticks: { color: '#94a3b8' },
                    title: {
                        display: true,
                        text: 'Day of Week',
                        color: '#94a3b8'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#f8fafc' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Focus Time: ${context.parsed.y} minutes`;
                        }
                    }
                }
            }
        }
    });

    // Set up real-time subscriptions for analytics charts
    const analyticsChannel = supabase
        .channel('analytics-sync')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'tasks' }, 
            () => {
                console.log('🔄 Analytics: Task change detected, refreshing charts');
                if (document.body.getAttribute('data-current-module') === 'analytics') {
                    window.loadAnalytics();
                }
            }
        )
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'pomodoro_sessions' }, 
            () => {
                console.log('🔄 Analytics: Pomodoro session change detected, refreshing charts');
                if (document.body.getAttribute('data-current-module') === 'analytics') {
                    window.loadAnalytics();
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Analytics real-time subscription active');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Analytics real-time subscription error');
            }
        });

    // Store subscription for cleanup when switching modules
    window.activeSubscription = analyticsChannel;
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

        <div class="backup-section" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
            <h3>Restore Data</h3>
            <p style="color: var(--text-dim); margin-bottom: 15px;">Select a TaskPro backup file (.json) to restore your data.</p>
            <input type="file" id="restore-input" accept=".json" style="display: none;">
            <button id="restore-btn" class="btn-outline" style="width: auto;">📂 Choose File & Restore</button>
            <div id="restore-status" style="margin-top: 10px;"></div>
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

    // Restore functionality
    document.getElementById('restore-btn').addEventListener('click', () => {
        document.getElementById('restore-input').click();
    });

    document.getElementById('restore-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        const restoreStatus = document.getElementById('restore-status');
        
        reader.onload = async (event) => {
            try {
                restoreStatus.innerHTML = '<span style="color: #f59e0b;">⏳ Processing backup...</span>';
                
                const data = JSON.parse(event.target.result);
                const { data: { user } } = await supabase.auth.getUser();
                
                if (!user) throw new Error("User not authenticated");

                // Restore Tasks
                if (data.tasks && data.tasks.length > 0) {
                    const tasksToRestore = data.tasks.map(t => ({ ...t, user_id: user.id }));
                    await supabase.from('tasks').upsert(tasksToRestore);
                }

                // Restore Habits
                if (data.habits && data.habits.length > 0) {
                    const habitsToRestore = data.habits.map(h => ({ ...h, user_id: user.id }));
                    await supabase.from('habits').upsert(habitsToRestore);
                }

                // Restore Notes
                if (data.notes && data.notes.length > 0) {
                    const notesToRestore = data.notes.map(n => ({ ...n, user_id: user.id }));
                    await supabase.from('notes').upsert(notesToRestore);
                }

                restoreStatus.innerHTML = '<span style="color: #10b981;">✅ Restore successful! Your data has been synced.</span>';
                
                // Refresh to show new data after a short delay
                setTimeout(() => {
                    location.reload();
                }, 2000);
                
            } catch (err) {
                console.error(err);
                restoreStatus.innerHTML = '<span style="color: #ef4444;">❌ Restore failed: Invalid file format.</span>';
            }
        };
        
        reader.readAsText(file);
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
                
                <div class="card">
                    <h3>Color Themes</h3>
                    <button class="btn-primary" onclick="updateTheme('emerald')" style="background: #10b981;">Emerald</button>
                    <button class="btn-primary" onclick="updateTheme('rose')" style="background: #f43f5e;">Rose</button>
                    <button class="btn-primary" onclick="updateTheme('amber')" style="background: #f59e0b;">Amber</button>
                    <button class="btn-primary" onclick="updateTheme('indigo')" style="background: #6366f1;">Indigo</button>
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
            
            <div class="design-section" style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">
                <h3>System Preferences</h3>
                <p style="color: var(--text-dim); font-size: 0.9rem; margin-bottom: 15px;">
                    Manage how TaskPro interacts with your device.
                </p>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button id="enable-notifications-btn" class="btn-primary" style="width: auto; padding: 10px 20px;">
                        🔔 Enable Notifications
                    </button>
                    <button id="test-notification-btn" class="btn-outline" style="width: auto; padding: 10px 20px;">
                        🧪 Test Notification
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add notification button event listener
    document.getElementById('enable-notifications-btn').addEventListener('click', async () => {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            alert('Notifications enabled! You will now receive alerts for important events. 🚀');
        } else {
            alert('Notifications were blocked. Please enable them in your browser settings to receive alerts.');
        }
    });

    // Test Notification
    document.getElementById('test-notification-btn').addEventListener('click', () => {
        if (Notification.permission === 'granted') {
            new Notification('TaskPro Test', {
                body: 'This is a test notification from your productivity suite!',
                icon: 'https://cdn-icons-png.flaticon.com/512/906/906334.png'
            });
        } else {
            alert('Please enable notifications first!');
        }
    });
};

/* ============================================
   AUTHENTICATION UI & LOGIC
   ============================================ */

async function loadAuth() {
    // Hide navigation if it exists
    const nav = document.getElementById('desktop-nav');
    if (nav) nav.style.display = 'none';
    
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

// Daily Briefing Logic
window.sendDailyBriefing = async () => {
    const today = getLocalDate();
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
}  // Close setupLoginForm function

// --- SETTINGS & DIAGNOSTICS LOGIC ---
function setupSettingsListeners() {
    const modal = document.getElementById('settings-modal');
    const openBtn = document.getElementById('open-settings-btn');
    const closeBtn = document.getElementById('close-settings');
    const runTestBtn = document.getElementById('run-sync-test');
    const resetBtn = document.getElementById('reset-all-data');
    const statusLog = document.getElementById('sync-test-status');

    openBtn.onclick = () => modal.style.display = 'flex';
    closeBtn.onclick = () => {
        modal.style.display = 'none';
        statusLog.style.display = 'none';
    };

    // Close on outside click
    window.onclick = (e) => { if (e.target === modal) closeBtn.onclick(); };

    // SYNC TEST PULSE
    runTestBtn.onclick = async () => {
        // 1. Check if already running to prevent duplicate POSTs
        if (runTestBtn.disabled) return; 

        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;

        statusLog.style.display = 'block';
        runTestBtn.disabled = true; // Properly lock the button
        runTestBtn.innerText = "Test Running...";

        try {
            const testId = `TEST_${Math.floor(Math.random() * 1000)}`;
            
            statusLog.innerHTML += "<br>📤 Injecting test items...";
            
            // 1. Insert test data across tables
            await Promise.all([
                supabase.from('tasks').insert([{ user_id: user.id, title: `🔄 SYNC TEST (${testId})`, is_completed: false }]),
                supabase.from('habits').insert([{ user_id: user.id, name: `🔄 SYNC TEST (${testId})` }]),
                supabase.from('notes').insert([{ user_id: user.id, content: `🔄 SYNC TEST (${testId})` }])
            ]);

            statusLog.innerHTML += `<br>✅ Pulse sent! Check your other devices now.`;
            statusLog.innerHTML += `<br>⏳ Cleaning up in 5 seconds...`;

            setTimeout(async () => {
                statusLog.innerHTML += "<br>🧹 Removing test data...";
                await Promise.all([
                    supabase.from('tasks').delete().ilike('title', '%SYNC TEST%'),
                    supabase.from('habits').delete().ilike('name', '%SYNC TEST%'),
                    supabase.from('notes').delete().ilike('content', '%SYNC TEST%')
                ]);
                statusLog.innerHTML += "<br>✨ Test Complete. System synced.";
                runTestBtn.disabled = false;
                runTestBtn.innerText = "Run Test Pulse";
            }, 5000);

        } catch (err) {
            statusLog.innerHTML += `<br>❌ Error: ${err.message}`;
            runTestBtn.disabled = false;
            runTestBtn.innerText = "Run Test Pulse";
        }
    };

    // MASTER DATA RESET
    resetBtn.onclick = async () => {
        const confirmed = confirm("⚠️ WARNING: This will permanently delete ALL your tasks, habits, notes, and stats. This cannot be undone. Proceed?");
        if (!confirmed) return;

        const user = (await supabase.auth.getUser()).data.user;
        resetBtn.innerText = "Deleting...";
        resetBtn.disabled = true;

        try {
            // Sequential delete to avoid collision
            await supabase.from('tasks').delete().eq('user_id', user.id);
            await supabase.from('habits').delete().eq('user_id', user.id);
            await supabase.from('notes').delete().eq('user_id', user.id);
            await supabase.from('pomodoro_sessions').delete().eq('user_id', user.id);
            await supabase.from('timerstats').delete().eq('user_id', user.id);

            alert("Data successfully wiped. The app will now restart.");
            window.location.reload();
        } catch (err) {
            alert("Error resetting data: " + err.message);
            resetBtn.innerText = "Reset All My Data";
            resetBtn.disabled = false;
        }
    };
}

// Auth State Listener - FIXED VERSION
supabase.auth.onAuthStateChange((event, session) => {
    console.log("Auth event:", event, "Session exists:", !!session);

    // 1. Only load modules if we actually have a session
    if (session) {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            const savedModule = localStorage.getItem('currentModule') || 'dashboard';
            loadModule(savedModule);
            
            // Setup Settings listeners when authenticated
            setupSettingsListeners();
        }
    } 
    // 2. If no session exists, or they signed out, FORCE login screen
    else {
        console.log('No active session, showing login');
        loadAuth(); 
    }
});
}());
