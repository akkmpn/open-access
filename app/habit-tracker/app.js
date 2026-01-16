/**
 * HABIT TRACKER - CORE LOGIC (FIXED VERSION)
 * Features: Auth, Real-time Sync, Streaks, Analytics, and PWA Support
 */
// 1. INITIALIZATION & CONFIG
// Support environment variables for production builds
const SUPABASE_URL = window.ENV?.SUPABASE_URL || "https://nkejmazavfhzszsrkrsj.supabase.co";
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZWptYXphdmZoenN6c3JrcnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NDY4NDAsImV4cCI6MjA4NDEyMjg0MH0.guKibmfnkYaANEafrIl0TmBT88TmcA_xnd_VbRz9NiE";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State Management
let currentUser = null;
let currentHabits = [];
let currentFilter = 'all';
let completionChart = null;
let categoryChart = null;
let selectedIcon = '🎯';
let selectedColor = '#10b981';
let deferredPrompt = null;

// 2. DOM ELEMENTS
let dom = {};

// 3. AUTHENTICATION LOGIC
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    handleAuthStateChange(session?.user || null);
    
    // Listen to auth state changes
    supabase.auth.onAuthStateChange((_event, session) => {
        handleAuthStateChange(session?.user || null);
    });
}

function handleAuthStateChange(user) {
    currentUser = user;
    if (dom.loading) dom.loading.classList.add('hidden');

    if (user) {
        dom.auth.classList.add('hidden');
        dom.app.classList.remove('hidden');
        
        // Update user email in settings
        const userEmailInput = document.getElementById('user-email');
        if (userEmailInput) userEmailInput.value = user.email;
        
        // Load user profile to get timezone
        loadUserProfile();
        
        loadHabits();
        setupRealtimeSubscription();
    } else {
        dom.auth.classList.remove('hidden');
        dom.app.classList.add('hidden');
    }
}

// Load user profile data
async function loadUserProfile() {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (error) {
            console.error('Failed to load profile:', error);
            return;
        }
        
        if (profile) {
            // Update current user with profile data
            currentUser = { ...currentUser, ...profile };
            
            // Populate timezone dropdown
            populateTimezoneDropdown();
        }
    } catch (error) {
        console.error('Profile load error:', error);
        showToast('Failed to load profile data', 'error');
    }
}

// 4. HABIT OPERATIONS
async function loadHabits() {
    const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        showToast('Failed to load habits', 'error');
        return;
    }
    
    currentHabits = data || [];
    renderHabits();
    debouncedUpdateAnalytics();
}

function renderHabits() {
    const filtered = currentFilter === 'all'
        ? currentHabits
        : currentHabits.filter(h => h.category === currentFilter);

    if (filtered.length === 0) {
        dom.habitsList.innerHTML = '';
        dom.emptyState.classList.remove('hidden');
        return;
    }

    dom.emptyState.classList.add('hidden');
    dom.habitsList.innerHTML = filtered.map(habit => `
        <div class="habit-card" style="border-left: 4px solid ${habit.color}">
            <div class="habit-info">
                <span class="habit-icon">${habit.icon}</span>
                <div>
                    <h3 class="habit-name">${habit.name}</h3>
                    <p class="habit-streak">🔥 ${habit.streak} day streak</p>
                </div>
            </div>
            <div class="habit-actions">
                <button 
                    class="btn btn-primary check-in-btn" 
                    onclick="checkIn('${habit.id}')"
                    data-habit-id="${habit.id}"
                >
                    Check In
                </button>
                <button 
                    class="btn btn-secondary edit-habit-btn" 
                    onclick="editHabit('${habit.id}')"
                    title="Edit Habit"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button 
                    class="btn btn-danger delete-habit-btn" 
                    onclick="deleteHabit('${habit.id}')"
                    title="Delete Habit"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
    
    // Check which habits have been completed today
    checkTodayCompletions();
}

// Check if habits were completed today
async function checkTodayCompletions() {
    // Get user's timezone from profile or default to IST
    const userTimezone = currentUser?.timezone || 'Asia/Kolkata';
    
    // Get today's date in user's timezone
    const today = new Date();
    const todayInUserTimezone = new Date(today.toLocaleString('en-US', { timeZone: userTimezone }));
    const todayStr = todayInUserTimezone.toISOString().split('T')[0];
    
    // Get start and end of today in user's timezone
    const startOfDay = new Date(todayInUserTimezone);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(todayInUserTimezone);
    endOfDay.setHours(23, 59, 59, 999);
    
    const { data, error } = await supabase
        .from('habit_completions')
        .select('habit_id')
        .eq('user_id', currentUser.id)
        .gte('completed_at', startOfDay.toISOString())
        .lte('completed_at', endOfDay.toISOString());
    
    if (error) {
        console.error('Error checking completions:', error);
        return;
    }
    
    const completedHabitIds = data.map(c => c.habit_id);
    
    // Update buttons
    document.querySelectorAll('.check-in-btn').forEach(btn => {
        const habitId = btn.dataset.habitId;
        if (completedHabitIds.includes(habitId)) {
            btn.textContent = '✓ Completed';
            btn.disabled = true;
            btn.classList.add('completed');
        }
    });
    
    // Check for missed days and reset streaks
    await checkAndResetMissedStreaks(userTimezone);
}

// Check for missed days and reset streaks accordingly
async function checkAndResetMissedStreaks(userTimezone = 'UTC') {
    if (!currentUser || currentHabits.length === 0) return;
    
    const today = new Date();
    const todayInUserTimezone = new Date(today.toLocaleString('en-US', { timeZone: userTimezone }));
    todayInUserTimezone.setHours(0, 0, 0, 0); // Set to start of today
    
    for (const habit of currentHabits) {
        if (!habit.last_completed) continue;
        
        const lastCompleted = new Date(habit.last_completed);
        const lastCompletedInUserTimezone = new Date(lastCompleted.toLocaleString('en-US', { timeZone: userTimezone }));
        lastCompletedInUserTimezone.setHours(0, 0, 0, 0); // Set to start of that day
        
        const daysSinceLastCompletion = Math.floor((todayInUserTimezone - lastCompletedInUserTimezone) / (1000 * 60 * 60 * 24));
        
        // Reset streak if more than 1 day has passed
        if (daysSinceLastCompletion > 1 && habit.streak > 0) {
            console.log(`Resetting streak for ${habit.name} - missed ${daysSinceLastCompletion} days`);
            
            const { error } = await supabase.rpc('reset_streak', { 
                habit_row_id: habit.id 
            });
            
            if (error) {
                console.error('Streak reset error:', error);
            } else {
                console.log(`Streak reset for ${habit.name}`);
            }
        }
    }
}

// Make checkIn available globally
window.checkIn = async function(habitId) {
    const button = document.querySelector(`[data-habit-id="${habitId}"]`);
    if (!button) return;
    
    // Prevent double clicks
    if (button.disabled) return;
    
    // Set loading state
    button.disabled = true;
    button.textContent = 'Checking in...';
    button.classList.add('loading');
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
        // Check if already completed today
        const { data: existing } = await supabase
            .from('habit_completions')
            .select('id')
            .eq('habit_id', habitId)
            .eq('user_id', currentUser.id)
            .gte('completed_at', `${today}T00:00:00`)
            .lte('completed_at', `${today}T23:59:59`);
        
        if (existing && existing.length > 0) {
            showToast("Already checked in today!", 'error');
            return;
        }
        
        const { error } = await supabase
            .from('habit_completions')
            .insert([{ habit_id: habitId, user_id: currentUser.id }]);

        if (error) {
            showToast("Failed to check in", 'error');
            console.error(error);
        } else {
            showToast("Great job! 🎉", 'success');
            
            // Call the complete_habit function to increment streak
            const { error: streakError } = await supabase.rpc('complete_habit', { 
                habit_row_id: habitId 
            });
            
            if (streakError) console.error('Streak increment error:', streakError);
            
            loadHabits();
        }
    } finally {
        // Reset button state
        button.disabled = false;
        button.textContent = 'Check In';
        button.classList.remove('loading');
    }
};

// Make editHabit available globally
window.editHabit = async function(habitId) {
    const habit = currentHabits.find(h => h.id === habitId);
    if (!habit) return;
    
    // Populate modal with habit data
    document.getElementById('habit-name').value = habit.name;
    document.getElementById('habit-category').value = habit.category;
    document.getElementById('habit-reminder').value = habit.reminder_time || '';
    document.getElementById('habit-id').value = habit.id;
    
    // CRITICAL: Sync global state FIRST
    selectedIcon = habit.icon;
    selectedColor = habit.color;
    
    // CRITICAL: Update hidden inputs explicitly
    const iconInput = document.getElementById('habit-icon');
    const colorInput = document.getElementById('habit-color');
    if (iconInput) iconInput.value = habit.icon;
    if (colorInput) colorInput.value = habit.color;
    
    // Update picker selections AFTER setting global state
    updatePickerSelections();
    
    // Show modal
    dom.addHabitModal.classList.remove('hidden');
    
    // Change modal title to "Edit Habit"
    const modalTitle = dom.addHabitModal.querySelector('h2');
    if (modalTitle) modalTitle.textContent = 'Edit Habit';
};

// Make deleteHabit available globally
window.deleteHabit = async function(habitId) {
    const habit = currentHabits.find(h => h.id === habitId);
    if (!habit) return;
    
    // Confirmation dialog
    const confirmed = confirm(
        `Are you sure you want to delete "${habit.name}"?\n\n` +
        'This will also delete all completion history for this habit.\n\n' +
        'This action cannot be undone.'
    );
    
    if (!confirmed) return;
    
    try {
        // Delete habit completions first
        const { error: completionsError } = await supabase
            .from('habit_completions')
            .delete()
            .eq('habit_id', habitId);
        
        if (completionsError) throw completionsError;
        
        // Delete the habit
        const { error: habitError } = await supabase
            .from('habits')
            .delete()
            .eq('id', habitId);
        
        if (habitError) throw habitError;
        
        showToast(`"${habit.name}" deleted successfully`, 'success');
        loadHabits();
        
    } catch (error) {
        console.error('Delete habit error:', error);
        showToast('Failed to delete habit: ' + error.message, 'error');
    }
};

// 5. ANALYTICS
let analyticsUpdateInProgress = false;
let currentDate = new Date();

// Calendar functionality
async function renderCalendar() {
    if (!currentUser) return;
    
    const calendarContainer = document.getElementById('calendar-container');
    const currentMonthElement = document.getElementById('current-month');
    
    if (!calendarContainer || !currentMonthElement) return;
    
    // Update month display
    currentMonthElement.textContent = currentDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
    });
    
    // Get first day of month and number of days
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    // Get completions for current month
    const monthStart = new Date(year, month, 1).toISOString().split('T')[0];
    const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    const { data: completions } = await supabase
        .from('habit_completions')
        .select('completed_at, habit_id')
        .eq('user_id', currentUser.id)
        .gte('completed_at', monthStart)
        .lte('completed_at', monthEnd);
    
    // Process completions by date
    const completionsByDate = {};
    if (completions) {
        completions.forEach(completion => {
            const date = new Date(completion.completed_at).toISOString().split('T')[0];
            if (!completionsByDate[date]) {
                completionsByDate[date] = [];
            }
            completionsByDate[date].push(completion.habit_id);
        });
    }
    
    // Build calendar HTML
    let calendarHTML = '<div class="calendar-grid">';
    
    // Day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        calendarHTML += `<div class="calendar-day-header">${day}</div>`;
    });
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        calendarHTML += `<div class="calendar-day other-month">${day}</div>`;
    }
    
    // Current month days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        // FIX: Use local timezone instead of UTC
        const date = new Date(year, month, day);
        const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD format in local timezone
        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
        const dayCompletions = completionsByDate[dateStr] || [];
        
        calendarHTML += `<div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateStr}">`;
        calendarHTML += `<div class="calendar-day-number">${day}</div>`;
        
        if (dayCompletions.length > 0) {
            calendarHTML += '<div class="calendar-day-dots">';
            const uniqueHabits = [...new Set(dayCompletions)];
            uniqueHabits.forEach(habitId => {
                const habit = currentHabits.find(h => h.id === habitId);
                const dotColor = habit ? habit.color : '#10b981';
                calendarHTML += `<div class="calendar-day-dot completed" style="background-color: ${dotColor}"></div>`;
            });
            calendarHTML += '</div>';
        }
        
        calendarHTML += '</div>';
    }
    
    // Next month days
    const totalCells = firstDay + daysInMonth;
    const nextMonthDays = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= nextMonthDays; day++) {
        calendarHTML += `<div class="calendar-day other-month">${day}</div>`;
    }
    
    calendarHTML += '</div>';
    calendarContainer.innerHTML = calendarHTML;
    
    // Add click listeners to calendar days
    calendarContainer.querySelectorAll('.calendar-day:not(.other-month)').forEach(dayEl => {
        dayEl.addEventListener('click', () => {
            const date = dayEl.dataset.date;
            const habitsDone = completionsByDate[date] || [];
            
            if (habitsDone.length > 0) {
                const habitNames = currentHabits
                    .filter(h => habitsDone.includes(h.id))
                    .map(h => `${h.icon} ${h.name}`)
                    .join(', ');
                showToast(`✅ Completed on ${date}: ${habitNames}`, 'success');
            } else {
                showToast(`📝 No habits completed on ${date}`, 'info');
            }
        });
    });
    
    // Add empty state message for calendar
    const hasAnyCompletions = Object.values(completionsByDate).some(completions => completions.length > 0);
    const emptyStateMsg = document.getElementById('calendar-empty-state');
    if (emptyStateMsg) {
        if (!hasAnyCompletions) {
            emptyStateMsg.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 16px;">📅</div>
                    <h3>No habits tracked yet</h3>
                    <p>Start building your habit streak by checking in daily!</p>
                </div>
            `;
            emptyStateMsg.style.display = 'block';
        } else {
            emptyStateMsg.style.display = 'none';
        }
    }
}

// Calendar navigation
document.getElementById('prev-month')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('next-month')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

// Debounced analytics update to prevent excessive calls
const debouncedUpdateAnalytics = debounce(async () => {
    if (analyticsUpdateInProgress) {
        console.log('Analytics update already in progress, skipping...');
        return;
    }
    
    analyticsUpdateInProgress = true;
    
    try {
        await updateAnalytics();
        console.log('Analytics updated successfully');
    } catch (error) {
        console.error('Failed to update analytics:', error);
        showToast('Error loading analytics', 'error');
    } finally {
        analyticsUpdateInProgress = false;
    }
}, 300);

async function updateAnalytics() {
    if (!currentUser) return;
    
    try {
        // Get selected period from dropdown
        const periodSelect = document.getElementById('analytics-period');
        const days = periodSelect ? parseInt(periodSelect.value) : 30;
        
        // Single query to get all completion data for the selected period
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const { data: allCompletions, error } = await supabase
            .from('habit_completions')
            .select('completed_at')
            .eq('user_id', currentUser.id)
            .gte('completed_at', startDate.toISOString());
            
        if (error) throw error;
        
        // Process completion data for last 7 days
        const last7Days = [];
        const completionCounts = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            last7Days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            
            const dayCompletions = allCompletions?.filter(c => {
                const completionDate = new Date(c.completed_at).toISOString().split('T')[0];
                return completionDate === dateStr;
            }) || [];
            
            completionCounts.push(dayCompletions.length);
        }
        
        // Update Completion Chart
        const ctx = document.getElementById('completion-chart')?.getContext('2d');
        if (ctx) {
            if (completionChart) completionChart.destroy();
            completionChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: last7Days,
                    datasets: [{
                        label: 'Check-ins',
                        data: completionCounts,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }

        // Update Category Chart
        const catCtx = document.getElementById('category-chart')?.getContext('2d');
        if (catCtx) {
            if (categoryChart) categoryChart.destroy();

            const counts = {};
            currentHabits.forEach(h => {
                counts[h.category] = (counts[h.category] || 0) + 1;
            });

            categoryChart = new Chart(catCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(counts).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
                    datasets: [{
                        data: Object.values(counts),
                        backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#ec4899']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right' } }
                }
            });
        }

        // Update Text Stats
        const totalHabitsStat = document.getElementById('total-habits-stat');
        if (totalHabitsStat) totalHabitsStat.innerText = currentHabits.length;

        const maxStreakStat = document.getElementById('longest-streak-stat');
        if (maxStreakStat) {
            const maxStreak = Math.max(...currentHabits.map(h => h.streak), 0);
            maxStreakStat.innerText = maxStreak;
        }
        
        // Use the already fetched completions data
        const totalCompletionsStat = document.getElementById('total-completions-stat');
        if (totalCompletionsStat) {
            totalCompletionsStat.innerText = allCompletions ? allCompletions.length : 0;
        }
        
        // Calculate completion rate
        const completionRateStat = document.getElementById('completion-rate-stat');
        if (completionRateStat && currentHabits.length > 0) {
            const totalPossible = currentHabits.length * 7; // Last 7 days
            const totalActual = completionCounts.reduce((a, b) => a + b, 0);
            const rate = Math.round((totalActual / totalPossible) * 100);
            completionRateStat.innerText = `${rate}%`;
        }
        
    } catch (error) {
        console.error('Analytics update error:', error);
        throw error;
    }
}

// 6. UTILITIES

// Debounce helper to prevent excessive function calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    }
}

// Populate timezone dropdown with common timezones
function populateTimezoneDropdown() {
    const timezoneSelect = document.getElementById('user-timezone');
    if (!timezoneSelect) return;
    
    // Clear existing options
    timezoneSelect.innerHTML = '';
    
    // Common timezones list
    const timezones = [
        { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
        { value: 'America/New_York', label: 'Eastern Time (ET)' },
        { value: 'America/Chicago', label: 'Central Time (CT)' },
        { value: 'America/Denver', label: 'Mountain Time (MT)' },
        { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
        { value: 'America/Toronto', label: 'Toronto' },
        { value: 'America/Vancouver', label: 'Vancouver' },
        { value: 'America/Mexico_City', label: 'Mexico City' },
        { value: 'America/Sao_Paulo', label: 'São Paulo' },
        { value: 'Europe/London', label: 'London (GMT/BST)' },
        { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
        { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
        { value: 'Europe/Rome', label: 'Rome (CET/CEST)' },
        { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
        { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
        { value: 'Asia/Dubai', label: 'Dubai (GST)' },
        { value: 'Asia/Kolkata', label: 'India (IST)' },
        { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
        { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
        { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
        { value: 'Asia/Seoul', label: 'Seoul (KST)' },
        { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
        { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
        { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
        { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' }
    ];
    
    // Detect user's timezone but default to IST
    const userTimezone = currentUser?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Add options
    timezones.forEach(tz => {
        const option = document.createElement('option');
        option.value = tz.value;
        option.textContent = tz.label;
        
        // Set selected based on user's saved timezone or default to IST
        if (tz.value === (currentUser?.timezone || 'Asia/Kolkata')) {
            option.selected = true;
        }
        
        timezoneSelect.appendChild(option);
    });
    
    // Add change event listener
    timezoneSelect.addEventListener('change', async (e) => {
        console.log('Timezone changed to:', e.target.value);
        
        try {
            // Save timezone to user profile
            const { error } = await supabase
                .from('profiles')
                .update({ timezone: e.target.value })
                .eq('id', currentUser.id);
                
            if (error) {
                console.error('Failed to save timezone:', error);
                showToast('Failed to save timezone', 'error');
            } else {
                showToast('Timezone updated successfully', 'success');
                // Update current user object with new timezone
                currentUser.timezone = e.target.value;
            }
        } catch (error) {
            console.error('Timezone save error:', error);
            showToast('Failed to save timezone', 'error');
        }
    });
}

function showToast(msg, type = 'info') {
    if (!dom.toastMsg || !dom.toast) return;
    dom.toastMsg.textContent = msg;
    dom.toast.className = `toast show ${type}`;
    setTimeout(() => dom.toast.classList.remove('show'), 3000);
}

function setupRealtimeSubscription() {
    supabase
        .channel('schema-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'habits' }, loadHabits)
        .subscribe();
}

// 7. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements
    dom = {
        loading: document.getElementById('loading-screen'),
        auth: document.getElementById('auth-screen'),
        app: document.getElementById('app'),
        loginForm: document.getElementById('login-form'),
        signupForm: document.getElementById('signup-form'),
        habitsList: document.getElementById('habits-list'),
        emptyState: document.getElementById('empty-state'),
        addHabitModal: document.getElementById('habit-modal'),
        addHabitForm: document.getElementById('habit-form'),
        toast: document.getElementById('toast'),
        toastMsg: document.getElementById('toast-message'),
        navTabs: document.querySelectorAll('.nav-tab'),
        mobileNavItems: document.querySelectorAll('.mobile-nav-item'),
        views: document.querySelectorAll('.view')
    };

    // Check Auth
    checkAuth();

    // ========== NAVIGATION ==========
    
    // Desktop Navigation
    dom.navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const viewName = tab.dataset.view;
            switchView(viewName);
            
            // Update active states
            dom.navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Close user menu dropdown when switching tabs
            const userMenuDropdown = document.getElementById('user-menu-dropdown');
            if (userMenuDropdown) {
                userMenuDropdown.classList.add('hidden');
            }
        });
    });
    
    // Mobile Navigation
    dom.mobileNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewName = item.dataset.view;
            switchView(viewName);
            
            // Update active states
            dom.mobileNavItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Sync with desktop nav
            dom.navTabs.forEach(t => {
                if (t.dataset.view === viewName) t.classList.add('active');
                else t.classList.remove('active');
            });
            
            // Close user menu dropdown when switching tabs
            const userMenuDropdown = document.getElementById('user-menu-dropdown');
            if (userMenuDropdown) {
                userMenuDropdown.classList.add('hidden');
            }
        });
    });
    
    function switchView(viewName) {
        dom.views.forEach(v => {
            v.classList.remove('active');
            if (v.id === `${viewName}-view`) v.classList.add('active');
        });
        
        if (viewName === 'analytics') debouncedUpdateAnalytics();
        if (viewName === 'calendar') renderCalendarView();
    }

    // ========== AUTH ==========
    
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const isLogin = tab.dataset.tab === 'login';
            dom.loginForm.classList.toggle('hidden', !isLogin);
            dom.signupForm.classList.toggle('hidden', isLogin);
        });
    });

    dom.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) showToast(error.message, 'error');
        else showToast('Welcome back!', 'success');
    });

    dom.signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-confirm').value;
        if (password !== confirm) return showToast("Passwords do not match", 'error');
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) showToast(error.message, 'error');
        else showToast("Check your email for the confirmation link!", 'success');
    });

    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            await supabase.auth.signInWithOAuth({ provider: 'google' });
        });
    }
    
    const forgotPasswordBtn = document.getElementById('forgot-password-btn');
    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', async () => {
            const email = document.getElementById('login-email').value;
            if (!email) {
                showToast('Please enter your email address first', 'error');
                return;
            }
            
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin
            });
            
            if (error) {
                showToast('Failed to send reset email', 'error');
            } else {
                showToast('Password reset email sent! Check your inbox', 'success');
            }
        });
    }

    // ========== FILTERS ==========
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderHabits();
        });
    });

    // ========== ADD HABIT MODAL ==========
    
    const addBtn = document.getElementById('add-habit-btn');
    const cancelBtn = document.getElementById('cancel-habit-btn');
    const closeBtn = document.getElementById('close-habit-modal');

    if (addBtn) addBtn.onclick = () => {
        dom.addHabitModal.classList.remove('hidden');
        dom.addHabitForm.reset();
        document.getElementById('habit-id').value = '';
        selectedIcon = '🎯';
        selectedColor = '#10b981';
        updatePickerSelections();
        
        // Reset modal title
        const modalTitle = dom.addHabitModal.querySelector('h2');
        if (modalTitle) modalTitle.textContent = 'Add New Habit';
    };
    
    if (cancelBtn) cancelBtn.onclick = () => dom.addHabitModal.classList.add('hidden');
    if (closeBtn) closeBtn.onclick = () => dom.addHabitModal.classList.add('hidden');
    
    // Icon Picker
    document.querySelectorAll('.icon-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.icon-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedIcon = btn.dataset.icon;
            document.getElementById('habit-icon').value = selectedIcon;
        });
    });
    
    // Color Picker
    document.querySelectorAll('.color-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedColor = btn.dataset.color;
            document.getElementById('habit-color').value = selectedColor;
        });
    });
    
    // Add Habit Form
    dom.addHabitForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const habitId = document.getElementById('habit-id').value;
        const habitData = {
            user_id: currentUser.id,
            name: document.getElementById('habit-name').value,
            category: document.getElementById('habit-category').value,
            icon: document.getElementById('habit-icon')?.value || selectedIcon,
            color: document.getElementById('habit-color')?.value || selectedColor,
            reminder_time: document.getElementById('habit-reminder').value || null
        };

        // Validate reminder time format
        if (habitData.reminder_time && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(habitData.reminder_time)) {
            showToast('Please enter a valid time format (HH:MM)', 'error');
            return;
        }

        let error;
        let successMessage;

        if (habitId) {
            // Update existing habit
            ({ error } = await supabase
                .from('habits')
                .update(habitData)
                .eq('id', habitId));
            successMessage = "Habit updated successfully! 🎉";
        } else {
            // Add new habit
            ({ error } = await supabase.from('habits').insert([habitData]));
            successMessage = "Habit created successfully! 🎉";
        }

        if (error) {
            showToast(error.message, 'error');
            console.error(error);
        } else {
            showToast(successMessage, 'success');
            dom.addHabitModal.classList.add('hidden');
            dom.addHabitForm.reset();
            document.getElementById('habit-id').value = '';
            
            // Reset modal title
            const modalTitle = dom.addHabitModal.querySelector('h2');
            if (modalTitle) modalTitle.textContent = 'Add New Habit';
            
            // CRITICAL: Refresh habits to show updated data immediately
            await loadHabits();
        }
    });

    // ========== SETTINGS ==========
    
    // User Menu Dropdown
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userMenuDropdown = document.getElementById('user-menu-dropdown');
    
    if (userMenuBtn && userMenuDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenuDropdown.classList.toggle('hidden');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userMenuDropdown.contains(e.target) && !userMenuBtn.contains(e.target)) {
                userMenuDropdown.classList.add('hidden');
            }
        });
        
        // Profile button
        const profileBtn = document.getElementById('profile-btn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                switchView('settings');
                userMenuDropdown.classList.add('hidden');
            });
        }
        
        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                switchView('settings');
                userMenuDropdown.classList.add('hidden');
            });
        }
        
        // Logout dropdown button
        const logoutDropdownBtn = document.getElementById('logout-dropdown-btn');
        if (logoutDropdownBtn) {
            logoutDropdownBtn.addEventListener('click', async () => {
                const { error } = await supabase.auth.signOut();
                if (error) showToast('Failed to sign out', 'error');
                else showToast('Signed out successfully', 'success');
                userMenuDropdown.classList.add('hidden');
            });
        }
    }
    
    // Data Management
    const exportDataBtn = document.getElementById('export-data-btn');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', async () => {
            try {
                // Get all user data
                const { data: habits } = await supabase
                    .from('habits')
                    .select('*')
                    .eq('user_id', currentUser.id);
                
                const { data: completions } = await supabase
                    .from('habit_completions')
                    .select('*')
                    .eq('user_id', currentUser.id);
                
                // Create export data structure
                const exportData = {
                    export_date: new Date().toISOString(),
                    user_id: currentUser.id,
                    habits: habits || [],
                    habit_completions: completions || []
                };
                
                // Create and download JSON file
                const dataStr = JSON.stringify(exportData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = `habit-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                showToast('Data exported successfully!', 'success');
            } catch (error) {
                console.error('Export error:', error);
                showToast('Failed to export data', 'error');
            }
        });
    }
    
    const importDataBtn = document.getElementById('import-data-btn');
    const importFileInput = document.getElementById('import-file-input');
    
    if (importDataBtn && importFileInput) {
        importDataBtn.addEventListener('click', () => {
            importFileInput.click();
        });
        
        importFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const importData = JSON.parse(text);
                
                // Validate import data structure
                if (!importData.habits || !importData.habit_completions) {
                    throw new Error('Invalid file format');
                }
                
                let importedHabits = 0;
                let importedCompletions = 0;
                
                // Import habits (assign new user_id and generate new UUIDs)
                if (importData.habits.length > 0) {
                    const habitsToImport = importData.habits.map(habit => ({
                        ...habit,
                        user_id: currentUser.id,
                        id: undefined, // Let Supabase generate new UUID
                        created_at: undefined,
                        updated_at: undefined
                    }));
                    
                    const { data: insertedHabits, error: habitsError } = await supabase
                        .from('habits')
                        .insert(habitsToImport)
                        .select();
                    
                    if (habitsError) throw habitsError;
                    importedHabits = insertedHabits.length;
                }
                
                // Import completions (map old habit_ids to new ones)
                if (importData.habit_completions.length > 0 && importedHabits > 0) {
                    const { data: newHabits } = await supabase
                        .from('habits')
                        .select('id, name')
                        .eq('user_id', currentUser.id);
                    
                    // Create mapping of old habit_id to new habit_id based on name
                    const habitIdMap = {};
                    importData.habits.forEach(oldHabit => {
                        const newHabit = newHabits.find(h => h.name === oldHabit.name);
                        if (newHabit) {
                            habitIdMap[oldHabit.id] = newHabit.id;
                        }
                    });
                    
                    const completionsToImport = importData.habit_completions
                        .filter(comp => habitIdMap[comp.habit_id])
                        .map(completion => ({
                            ...completion,
                            user_id: currentUser.id,
                            habit_id: habitIdMap[completion.habit_id],
                            id: undefined,
                            created_at: undefined
                        }));
                    
                    if (completionsToImport.length > 0) {
                        const { data: insertedCompletions, error: completionsError } = await supabase
                            .from('habit_completions')
                            .insert(completionsToImport);
                        
                        if (completionsError) throw completionsError;
                        importedCompletions = insertedCompletions.length;
                    }
                }
                
                showToast(`Imported ${importedHabits} habits and ${importedCompletions} completions!`, 'success');
                loadHabits(); // Refresh the habits list
                
            } catch (error) {
                console.error('Import error:', error);
                showToast('Failed to import data: ' + error.message, 'error');
            } finally {
                importFileInput.value = ''; // Clear the file input
            }
        });
    }
    
    const analyticsPeriod = document.getElementById('analytics-period');
    if (analyticsPeriod) {
        analyticsPeriod.addEventListener('change', () => {
            debouncedUpdateAnalytics();
        });
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const { error } = await supabase.auth.signOut();
            if (error) showToast('Failed to sign out', 'error');
            else showToast('Signed out successfully', 'success');
        });
    }
    
    // Delete Account functionality
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            // Confirmation dialog
            const confirmed = confirm(
                '⚠️ DANGER ZONE ⚠️\n\n' +
                'This will PERMANENTLY delete:\n' +
                '• All your habits\n' +
                '• All your completion data\n' +
                '• Your account profile\n\n' +
                'This action CANNOT be undone!\n\n' +
                'Type "DELETE" to confirm:'
            );
            
            if (!confirmed) return;
            
            const confirmation = prompt('Type "DELETE" to confirm account deletion:');
            if (confirmation !== 'DELETE') {
                showToast('Confirmation text does not match. Account deletion cancelled.', 'error');
                return;
            }
            
            try {
                // Delete user's habits
                const { error: habitsError } = await supabase
                    .from('habits')
                    .delete()
                    .eq('user_id', currentUser.id);
                
                if (habitsError) throw habitsError;
                
                // Delete user's habit completions
                const { error: completionsError } = await supabase
                    .from('habit_completions')
                    .delete()
                    .eq('user_id', currentUser.id);
                
                if (completionsError) throw completionsError;
                
                // Delete user's profile
                const { error: profileError } = await supabase
                    .from('profiles')
                    .delete()
                    .eq('id', currentUser.id);
                
                if (profileError) throw profileError;
                
                // Delete the user's auth account
                const { error: authError } = await supabase.auth.admin.deleteUser(
                    currentUser.id
                );
                
                if (authError) throw authError;
                
                showToast('Account deleted successfully. Redirecting...', 'success');
                
                // Redirect to home after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
                
            } catch (error) {
                console.error('Delete account error:', error);
                showToast('Failed to delete account: ' + error.message, 'error');
            }
        });
    }
    
    const testNotificationBtn = document.getElementById('test-notification-btn');
    if (testNotificationBtn) {
        testNotificationBtn.addEventListener('click', () => {
            if ('Notification' in window) {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification('Habit Tracker', {
                            body: 'Notifications are working! 🎉',
                            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔥</text></svg>'
                        });
                        showToast('Notification sent!', 'success');
                    } else {
                        showToast('Please enable notifications in your browser', 'error');
                    }
                });
            } else {
                showToast('Notifications not supported in this browser', 'error');
            }
        });
    }
    
    // Enable notifications checkbox
    const enableNotificationsCheckbox = document.getElementById('enable-notifications');
    if (enableNotificationsCheckbox) {
        enableNotificationsCheckbox.addEventListener('change', async (e) => {
            if (e.target.checked) {
                if ('Notification' in window) {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        showToast('Notifications enabled!', 'success');
                        // Here you could save preference to user profile
                    } else {
                        e.target.checked = false;
                        showToast('Please enable notifications in your browser', 'error');
                    }
                } else {
                    e.target.checked = false;
                    showToast('Notifications not supported in this browser', 'error');
                }
            } else {
                showToast('Notifications disabled', 'info');
                // Here you could save preference to user profile
            }
        });
    }

    // ========== PWA INSTALL ==========
    
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                showToast('App installed successfully!', 'success');
            }
            
            deferredPrompt = null;
            document.getElementById('install-prompt').classList.add('hidden');
        });
    }
    
    const dismissInstallBtn = document.getElementById('dismiss-install');
    if (dismissInstallBtn) {
        dismissInstallBtn.addEventListener('click', () => {
            document.getElementById('install-prompt').classList.add('hidden');
        });
    }

    // ========== SERVICE WORKER ==========
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('✓ Service Worker registered'))
            .catch(err => console.log('✗ SW registration failed', err));
    }
});

// Global helper functions for proper scope
function updatePickerSelections() {
    // Highlight the selected icon in the modal
    document.querySelectorAll('.icon-option').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.icon === selectedIcon);
    });

    // Highlight the selected color in the modal
    document.querySelectorAll('.color-option').forEach(btn => {
        // Normalizing for comparison
        const btnColor = btn.dataset.color.toLowerCase();
        const currentColor = selectedColor.toLowerCase();
        btn.classList.toggle('selected', btnColor === currentColor);
    });
}

// Alias for switchView to find the function
function renderCalendarView() {
    renderCalendar(); 
}

