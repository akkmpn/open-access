// ===== ENHANCED DASHBOARD MODULE =====
// Advanced analytics and productivity tracking with Chart.js integration

let productivityChart = null;
let dashboardChart = null;

async function initDashboard() {
    if (!TaskProApp.currentUser) return;
    
    try {
        // Load all dashboard data in parallel
        await loadDashboardData();
        
        // Start real-time updates
        startDashboardUpdates();
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        TaskProApp.showNotification('Dashboard loading failed', 'error');
    }
}

async function loadDashboardData() {
    const userId = TaskProApp.currentUser.id;

    const [tasks, habits, stats, sessions] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact' }).eq('user_id', userId).eq('completed', false),
        supabase.from('habits').select('streak').eq('user_id', userId).order('streak', { ascending: false }).limit(1),
        supabase.from('timer_stats').select('total_focus_time').eq('user_id', userId).maybeSingle(),
        supabase
            .from('timer_sessions')
            .select('created_at, duration_ms')
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .eq('user_id', userId)
    ]);

    // Update stat cards with animated numbers
    animateValue('pending-tasks-count', tasks.count || 0);
    animateValue('best-streak-count', habits.data[0]?.streak || 0);
    const totalMinutes = Math.round((stats.data?.total_focus_time || 0) / 60000);
    animateValue('total-focus-count', totalMinutes, 'm');
    
    // Initialize the productivity chart
    await initProductivityChart(sessions.data || []);
}

async function initProductivityChart(sessions) {
    const ctx = document.getElementById('productivityChart');
    if (!ctx) return;

    // Process data for the chart (Group by day)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartData = new Array(7).fill(0);
    
    sessions.forEach(s => {
        const dayIndex = new Date(s.created_at).getDay();
        chartData[dayIndex] += (s.duration_ms / 60000); // Convert ms to minutes
    });

    if (productivityChart) productivityChart.destroy();

    // Create gradient for the chart
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 184, 148, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 184, 148, 0)');

    productivityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [{
                label: 'Focus Minutes',
                data: chartData,
                borderColor: '#00b894',
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointRadius: 4,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    display: false 
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#00b894',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return Math.round(context.parsed.y) + ' min';
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    grid: { 
                        color: 'rgba(255,255,255,0.1)' 
                    },
                    ticks: { 
                        color: 'rgba(255,255,255,0.7)',
                        font: {
                            size: window.innerWidth < 768 ? 10 : 12
                        },
                        callback: function(value) {
                            return Math.round(value);
                        }
                    }
                },
                x: { 
                    grid: { 
                        display: false 
                    },
                    ticks: { 
                        color: 'rgba(255,255,255,0.7)',
                        font: {
                            size: window.innerWidth < 768 ? 10 : 12
                        }
                    }
                }
            }
        }
    });
}

async function loadDashboardTasks() {
    const today = new Date().toISOString().split('T')[0];
    
    try {
        const result = await TaskProUtils.safeSupabaseOperation(
            () => supabase
                .from('tasks')
                .select('*')
                .eq('user_id', TaskProApp.currentUser.id)
                .order('created_at', { ascending: false })
        );
        
        return result.data || [];
    } catch (error) {
        console.error('Error loading dashboard tasks:', error);
        return [];
    }
}

async function loadDashboardHabits() {
    try {
        const result = await TaskProUtils.safeSupabaseOperation(
            () => supabase
                .from('habits')
                .select('*')
                .eq('user_id', TaskProApp.currentUser.id)
                .order('streak', { ascending: false })
        );
        
        return result.data || [];
    } catch (error) {
        console.error('Error loading dashboard habits:', error);
        return [];
    }
}

async function loadFocusStats() {
    try {
        const result = await TaskProUtils.safeSupabaseOperation(
            () => supabase
                .from('timer_stats')
                .select('*')
                .eq('user_id', TaskProApp.currentUser.id)
                .maybeSingle()
        );
        
        return result.data || {
            total_focus_time: 0,
            total_break_time: 0,
            session_count: 0,
            daily_streak: 0
        };
    } catch (error) {
        console.error('Error loading focus stats:', error);
        return {
            total_focus_time: 0,
            total_break_time: 0,
            session_count: 0,
            daily_streak: 0
        };
    }
}

async function loadWeeklyProductivity() {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    try {
        const result = await TaskProUtils.safeSupabaseOperation(
            () => supabase
                .from('tasks')
                .select('created_at, completed')
                .eq('user_id', TaskProApp.currentUser.id)
                .gte('created_at', weekAgo.toISOString())
                .order('created_at', { ascending: true })
        );
        
        return processWeeklyData(result.data || []);
    } catch (error) {
        console.error('Error loading weekly productivity:', error);
        return generateEmptyWeekData();
    }
}

function processWeeklyData(tasks) {
    const weekData = {
        labels: [],
        completed: [],
        created: []
    };
    
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateISO = date.toISOString().split('T')[0];
        
        weekData.labels.push(dateStr);
        
        const dayTasks = tasks.filter(task => 
            task.created_at.startsWith(dateISO)
        );
        
        weekData.created.push(dayTasks.length);
        weekData.completed.push(dayTasks.filter(task => task.completed).length);
    }
    
    return weekData;
}

function generateEmptyWeekData() {
    const weekData = {
        labels: [],
        completed: [],
        created: []
    };
    
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        weekData.labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        weekData.created.push(0);
        weekData.completed.push(0);
    }
    
    return weekData;
}

function updateTaskStats(tasks) {
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(task => task.date === today);
    const completedTasks = tasks.filter(task => task.completed);
    const pendingTasks = tasks.filter(task => !task.completed);
    
    // Update DOM elements with animations
    animateValue('dash-tasks-count', todayTasks.length);
    animateValue('dash-completed', completedTasks.length);
    animateValue('dash-pending', pendingTasks.length);
    
    // Update cache
    TaskProApp.cache.tasks = tasks;
}

function updateHabitStats(habits) {
    const bestStreak = habits.length > 0 ? 
        Math.max(...habits.map(h => h.streak || 0)) : 0;
    
    animateValue('dash-habit-streak', bestStreak);
    
    // Update cache
    TaskProApp.cache.habits = habits;
}

function updateFocusStats(stats) {
    const totalMinutes = Math.floor(stats.total_focus_time / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    document.getElementById('dash-focus-hours').textContent = 
        `${hours}h ${minutes}m`;
    
    // Update additional stats if elements exist
    const focusTimeElement = document.getElementById('focusTimeDisplay');
    if (focusTimeElement) {
        focusTimeElement.textContent = `${hours}h ${minutes}m`;
    }
    
    const sessionCountElement = document.getElementById('totalSessionsDisplay');
    if (sessionCountElement) {
        sessionCountElement.textContent = stats.session_count || 0;
    }
    
    const streakElement = document.getElementById('streakCount');
    if (streakElement) {
        streakElement.textContent = stats.daily_streak || 0;
    }
}

function updateWeeklyChart(weekData) {
    const ctx = document.getElementById('dashboardChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (dashboardChart) {
        dashboardChart.destroy();
    }
    
    // Create new chart
    dashboardChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weekData.labels,
            datasets: [
                {
                    label: 'Tasks Created',
                    data: weekData.created,
                    borderColor: '#208084',
                    backgroundColor: 'rgba(32, 128, 132, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Tasks Completed',
                    data: weekData.completed,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-main'),
                        font: {
                            size: window.innerWidth < 768 ? 10 : 12,
                            family: 'Inter'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg-card'),
                    titleColor: getComputedStyle(document.body).getPropertyValue('--text-main'),
                    bodyColor: getComputedStyle(document.body).getPropertyValue('--text-muted'),
                    borderColor: getComputedStyle(document.body).getPropertyValue('--border'),
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + Math.round(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-muted'),
                        stepSize: 1,
                        font: {
                            size: window.innerWidth < 768 ? 10 : 12
                        },
                        callback: function(value) {
                            return Math.round(value);
                        }
                    },
                    grid: {
                        color: getComputedStyle(document.body).getPropertyValue('--border'),
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-muted'),
                        font: {
                            size: window.innerWidth < 768 ? 10 : 12
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function updateUpcomingTasks(tasks) {
    const today = new Date().toISOString().split('T')[0];
    const upcomingTasks = tasks
        .filter(task => !task.completed && task.date >= today)
        .slice(0, 5);
    
    const upcomingList = document.getElementById('dash-upcoming-list');
    if (!upcomingList) return;
    
    if (upcomingTasks.length === 0) {
        upcomingList.innerHTML = `
            <div class="dash-item">
                <span>No upcoming tasks</span>
                <small>Great job!</small>
            </div>
        `;
        return;
    }
    
    upcomingList.innerHTML = upcomingTasks.map(task => `
        <div class="dash-item">
            <span>${task.title}</span>
            <small>${formatDate(task.date)}</small>
        </div>
    `).join('');
}

function formatDate(dateStr) {
    if (!dateStr) return 'No date';
    
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    if (dateStr === today.toISOString().split('T')[0]) {
        return 'Today';
    } else if (dateStr === tomorrow.toISOString().split('T')[0]) {
        return 'Tomorrow';
    } else {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
    }
}

function animateValue(elementId, targetValue, suffix = '') {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startValue = parseInt(element.textContent) || 0;
    const duration = 1000;
    const startTime = Date.now();
    
    function update() {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentValue = Math.floor(startValue + (targetValue - startValue) * progress);
        element.textContent = currentValue + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    update();
}

function startDashboardUpdates() {
    // Update dashboard every 5 minutes
    setInterval(async () => {
        if (TaskProApp.currentSection === 'dashboard') {
            await initDashboard();
        }
    }, 5 * 60 * 1000);
}

// Enhanced dashboard refresh function
async function refreshDashboard() {
    TaskProApp.setLoading(true);
    try {
        await initDashboard();
        TaskProApp.showNotification('Dashboard refreshed', 'success');
    } catch (error) {
        TaskProApp.showNotification('Refresh failed', 'error');
    } finally {
        TaskProApp.setLoading(false);
    }
}

// Export functions for global access
window.initDashboard = initDashboard;
window.loadDashboardData = loadDashboardData;
window.refreshDashboard = refreshDashboard;

// Auto-refresh on visibility change
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && TaskProApp.currentSection === 'dashboard') {
        refreshDashboard();
    }
});

// ===== CHART RESIZE HANDLER FOR MOBILE =====
window.addEventListener('resize', () => {
    if (productivityChart) {
        productivityChart.resize();
    }
    if (dashboardChart) {
        dashboardChart.resize();
    }
});
