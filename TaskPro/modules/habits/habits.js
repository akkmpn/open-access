// ===== ENHANCED HABITS MODULE =====
// Advanced habit tracking with streak management, statistics, and calendar view

// Wrap in IIFE to avoid global scope pollution
(() => {
    // UI Elements
    const habitsList = document.getElementById('habits-list');
    const habitForm = document.getElementById('habit-form');
    const habitModal = document.getElementById('habit-modal');

    // State
    let currentHabits = [];
    let habitStats = {
        totalHabits: 0,
        activeStreaks: 0,
        bestStreak: 0,
        completedToday: 0
    };

    // Initialize habits module
    async function loadHabits() {
        if (!TaskProApp.currentUser) return;
        
        try {
            const habits = await TaskProApp.loadHabits();
            currentHabits = habits;
            renderHabits(habits);
            updateHabitStats();
            setupHabitsEventListeners();
            checkDailyReset();
        } catch (error) {
            console.error('Error loading habits:', error);
            TaskProApp.showNotification('Failed to load habits', 'error');
        }
    }

    // Enhanced habit rendering with calendar view
    function renderHabits(habits) {
        if (!habitsList) return;
        
        if (habits.length === 0) {
            habitsList.innerHTML = `
                <div class="empty-state-container">
                    <div class="empty-state-icon">🔥</div>
                    <h3>Start building habits!</h3>
                    <p>Create your first habit and start building streaks. Small steps lead to big changes!</p>
                    <button class="btn-primary" onclick="openHabitModal()">Create Your First Habit</button>
                </div>
            `;
            return;
        }
        
        habitsList.innerHTML = habits.map(habit => createHabitCard(habit)).join('');
        
        // Animate habit cards
        animateHabitCards();
    }

    function createHabitCard(habit) {
        const isCompletedToday = habit.completed_today || false;
        const streakColor = getStreakColor(habit.streak);
        const completionRate = calculateCompletionRate(habit);
        
        return `
            <div class="habit-card ${isCompletedToday ? 'completed-today' : ''}" data-habit-id="${habit.id}">
                <div class="habit-header">
                    <div class="habit-info">
                        <h4 class="habit-name">${escapeHtml(habit.name)}</h4>
                        <div class="habit-meta">
                            <span class="habit-streak" style="color: ${streakColor};">
                                <i class="fas fa-fire"></i> ${habit.streak} day streak
                            </span>
                            <span class="habit-completion">${completionRate}% completion</span>
                        </div>
                    </div>
                    <div class="habit-actions">
                        <button class="habit-action-btn complete-btn ${isCompletedToday ? 'completed' : ''}" 
                                onclick="toggleHabit('${habit.id}')" 
                                title="${isCompletedToday ? 'Mark as incomplete' : 'Mark as complete'}">
                            <i class="fas ${isCompletedToday ? 'fa-check-circle' : 'fa-circle'}"></i>
                        </button>
                        <button class="habit-action-btn" onclick="editHabit('${habit.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="habit-action-btn delete-btn" onclick="deleteHabit('${habit.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="habit-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${completionRate}%; background: ${streakColor};"></div>
                    </div>
                    <div class="progress-text">Last 30 days: ${getRecentCompletions(habit)} days</div>
                </div>
            </div>
        `;
    }
    animateHabitCards();
}

function createHabitCard(habit) {
    const isCompletedToday = habit.completed_today || false;
    const streakColor = getStreakColor(habit.streak);
    const completionRate = calculateCompletionRate(habit);
    
    return `
        <div class="habit-card ${isCompletedToday ? 'completed-today' : ''}" data-habit-id="${habit.id}">
            <div class="habit-header">
                <div class="habit-info">
                    <h4 class="habit-name">${escapeHtml(habit.name)}</h4>
                    <div class="habit-meta">
                        <span class="habit-streak" style="color: ${streakColor};">
                            <i class="fas fa-fire"></i> ${habit.streak} day streak
                        </span>
                        <span class="habit-completion">${completionRate}% completion</span>
                    </div>
                </div>
                <div class="habit-actions">
                    <button class="habit-action-btn complete-btn ${isCompletedToday ? 'completed' : ''}" 
                            onclick="toggleHabit('${habit.id}')" 
                            title="${isCompletedToday ? 'Mark as incomplete' : 'Mark as complete'}">
                        <i class="fas ${isCompletedToday ? 'fa-check-circle' : 'fa-circle'}"></i>
                    </button>
                    <button class="habit-action-btn" onclick="editHabit('${habit.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="habit-action-btn delete-btn" onclick="deleteHabit('${habit.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="habit-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${completionRate}%; background: ${streakColor};"></div>
                </div>
                <div class="progress-text">Last 30 days: ${getRecentCompletions(habit)} days</div>
            </div>
        </div>
    `;
}

function getStreakColor(streak) {
    if (streak >= 30) return '#10b981'; // Green
    if (streak >= 21) return '#3b82f6'; // Blue
    if (streak >= 14) return '#8b5cf6'; // Purple
    if (streak >= 7) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
}

function calculateCompletionRate(habit) {
    // This would be calculated from actual completion history
    // For now, return a mock value based on streak
    return Math.min(100, Math.round((habit.streak / 30) * 100));
}

function getRecentCompletions(habit) {
    // Mock calculation - in real implementation, this would check completion history
    return Math.min(habit.streak, 30);
}

function generateMiniCalendar(habit) {
    const today = new Date();
    const calendar = [];
    
    // Generate last 30 days
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const isCompleted = Math.random() > 0.3; // Mock - would check actual completion
        
        calendar.push(`
            <div class="calendar-day ${isCompleted ? 'completed' : ''}" title="${dateStr}">
                ${date.getDate()}
            </div>
        `);
    }
    
    return `<div class="mini-calendar">${calendar.join('')}</div>`;
}

// Habit CRUD operations
async function addHabit(habitData) {
    if (!TaskProApp.currentUser) return;
    
    try {
        const result = await TaskProUtils.safeSupabaseOperation(
            () => supabase
                .from('habits')
                .insert([{
                    ...habitData,
                    user_id: TaskProApp.currentUser.id,
                    streak: 0,
                    completed_today: false,
                    created_at: new Date().toISOString()
                }])
        );
        
        if (result.error) throw result.error;
        
        TaskProApp.showNotification('Habit added successfully', 'success');
        await loadHabits();
        return result.data[0];
    } catch (error) {
        console.error('Error adding habit:', error);
        TaskProApp.showNotification('Failed to add habit', 'error');
        return null;
    }
}

async function updateHabit(habitId, habitData) {
    if (!TaskProApp.currentUser) return;
    
    try {
        const result = await TaskProUtils.safeSupabaseOperation(
            () => supabase
                .from('habits')
                .update({
                    ...habitData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', habitId)
        );
        
        if (result.error) throw result.error;
        
        TaskProApp.showNotification('Habit updated successfully', 'success');
        await loadHabits();
        return result.data[0];
    } catch (error) {
        console.error('Error updating habit:', error);
        TaskProApp.showNotification('Failed to update habit', 'error');
        return null;
    }
}

async function toggleHabit(habitId) {
    const habit = currentHabits.find(h => h.id === habitId);
    if (!habit) return;
    
    const newCompletedStatus = !habit.completed_today;
    const newStreak = newCompletedStatus ? habit.streak + 1 : Math.max(0, habit.streak - 1);
    
    try {
        const result = await TaskProUtils.safeSupabaseOperation(
            () => supabase
                .from('habits')
                .update({
                    completed_today: newCompletedStatus,
                    streak: newStreak,
                    last_completed: newCompletedStatus ? new Date().toISOString() : habit.last_completed
                })
                .eq('id', habitId)
        );
        
        if (result.error) throw result.error;
        
        // Update cache
        habit.completed_today = newCompletedStatus;
        habit.streak = newStreak;
        
        // Show notification
        if (newCompletedStatus) {
            TaskProApp.showNotification(`Great job! ${habit.name} - ${newStreak} day streak!`, 'success');
            playSuccessSound();
        } else {
            TaskProApp.showNotification(`Habit marked as incomplete`, 'info');
        }
        
        // Update UI immediately
        const habitElement = document.querySelector(`[data-habit-id="${habitId}"]`);
        if (habitElement) {
            habitElement.classList.toggle('completed-today');
            const completeBtn = habitElement.querySelector('.complete-btn i');
            if (completeBtn) {
                completeBtn.className = newCompletedStatus ? 'fas fa-check-circle' : 'fas fa-circle';
            }
            completeBtn.parentElement.classList.toggle('completed', newCompletedStatus);
        }
        
        updateHabitStats();
    } catch (error) {
        console.error('Error toggling habit:', error);
        TaskProApp.showNotification('Failed to update habit', 'error');
    }
}

async function deleteHabit(habitId) {
    const habit = currentHabits.find(h => h.id === habitId);
    if (!habit) return;
    
    if (!confirm(`Are you sure you want to stop tracking "${habit.name}"? This will delete all history.`)) return;
    
    try {
        const result = await TaskProUtils.safeSupabaseOperation(
            () => supabase
                .from('habits')
                .delete()
                .eq('id', habitId)
        );
        
        if (result.error) throw result.error;
        
        TaskProApp.showNotification('Habit deleted successfully', 'success');
        
        // Remove from cache
        TaskProApp.cache.habits = TaskProApp.cache.habits.filter(h => h.id !== habitId);
        
        // Update UI with animation
        const habitElement = document.querySelector(`[data-habit-id="${habitId}"]`);
        if (habitElement) {
            habitElement.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                loadHabits();
            }, 300);
        }
        
        updateHabitStats();
    } catch (error) {
        console.error('Error deleting habit:', error);
        TaskProApp.showNotification('Failed to delete habit', 'error');
    }
}

// Modal management
function openHabitModal(habitId = null) {
    if (!habitModal) return;
    
    if (habitId) {
        // Edit mode
        const habit = currentHabits.find(h => h.id === habitId);
        if (!habit) return;
        
        document.getElementById('habit-name').value = habit.name;
        document.querySelector('#habit-modal h3').textContent = 'Edit Habit';
    } else {
        // Create mode
        habitForm.reset();
        document.querySelector('#habit-modal h3').textContent = 'New Habit';
    }
    
    habitModal.style.display = 'flex';
    document.getElementById('habit-name').focus();
}

function closeHabitModal() {
    if (!habitModal) return;
    habitModal.style.display = 'none';
    habitForm.reset();
}

// Statistics and analytics
function updateHabitStats() {
    habitStats.totalHabits = currentHabits.length;
    habitStats.activeStreaks = currentHabits.filter(h => h.streak > 0).length;
    habitStats.bestStreak = currentHabits.length > 0 ? 
        Math.max(...currentHabits.map(h => h.streak)) : 0;
    habitStats.completedToday = currentHabits.filter(h => h.completed_today).length;
    
    // Update UI elements if they exist
    const totalElement = document.getElementById('habit-total');
    if (totalElement) totalElement.textContent = habitStats.totalHabits;
    
    const activeStreaksElement = document.getElementById('habit-active-streaks');
    if (activeStreaksElement) activeStreaksElement.textContent = habitStats.activeStreaks;
    
    const bestStreakElement = document.getElementById('habit-best-streak');
    if (bestStreakElement) bestStreakElement.textContent = habitStats.bestStreak;
    
    const completedTodayElement = document.getElementById('habit-completed-today');
    if (completedTodayElement) completedTodayElement.textContent = habitStats.completedToday;
}

// Daily reset check
function checkDailyReset() {
    const lastReset = localStorage.getItem('habit-last-reset');
    const today = new Date().toISOString().split('T')[0];
    
    if (lastReset !== today) {
        resetDailyHabits();
        localStorage.setItem('habit-last-reset', today);
    }
}

async function resetDailyHabits() {
    try {
        await TaskProUtils.safeSupabaseOperation(
            () => supabase
                .from('habits')
                .update({ completed_today: false })
                .eq('user_id', TaskProApp.currentUser.id)
        );
        
        // Update local cache
        currentHabits.forEach(habit => {
            habit.completed_today = false;
        });
        
        await loadHabits();
    } catch (error) {
        console.error('Error resetting daily habits:', error);
    }
}

// Audio feedback
function playSuccessSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.frequency.value = 523.25; // C5 note
        oscillator.type = "sine";

        gain.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        console.error('Error playing success sound:', error);
    }
}

// UI utilities
function animateHabitCards() {
    const cards = document.querySelectorAll('.habit-card');
    cards.forEach((card, index) => {
        card.style.animation = `fadeInUp 0.3s ease ${index * 0.1}s both`;
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listeners
function setupHabitsEventListeners() {
    // Habit form submission
    if (habitForm) {
        habitForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const habitName = document.getElementById('habit-name').value.trim();
            
            if (!habitName) {
                TaskProApp.showNotification('Please enter a habit name', 'warning');
                return;
            }
            
            await addHabit({ name: habitName });
            closeHabitModal();
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'h' && TaskProApp.currentSection === 'habits') {
            e.preventDefault();
            openHabitModal();
        }
    });
}

// Export functions for global access
window.loadHabits = loadHabits;
window.openHabitModal = openHabitModal;
window.closeHabitModal = closeHabitModal;
window.editHabit = openHabitModal;
window.deleteHabit = deleteHabit;
window.toggleHabit = toggleHabit;

// Add CSS for enhanced habit cards
const style = document.createElement('style');
style.textContent = `
    .habit-card {
        position: relative;
        transition: all 0.2s ease;
    }
    
    .habit-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }
    
    .habit-card.completed-today {
        border-left: 4px solid var(--success);
        background: rgba(16, 185, 129, 0.05);
    }
    
    .habit-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
    }
    
    .habit-info {
        flex: 1;
    }
    
    .habit-name {
        font-size: 18px;
        font-weight: 600;
        color: var(--text-main);
        margin-bottom: 8px;
    }
    
    .habit-meta {
        display: flex;
        gap: 16px;
        align-items: center;
        font-size: 12px;
    }
    
    .habit-streak {
        display: flex;
        align-items: center;
        gap: 4px;
        font-weight: 600;
    }
    
    .habit-completion {
        color: var(--text-muted);
    }
    
    .habit-actions {
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.2s ease;
    }
    
    .habit-card:hover .habit-actions {
        opacity: 1;
    }
    
    .habit-action-btn {
        background: none;
        border: none;
        color: var(--text-muted);
        padding: 6px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .habit-action-btn:hover {
        background: var(--bg-hover);
        color: var(--text-main);
    }
    
    .habit-action-btn.complete-btn {
        color: var(--text-muted);
    }
    
    .habit-action-btn.complete-btn.completed {
        color: var(--success);
    }
    
    .habit-action-btn.delete-btn:hover {
        background: rgba(239, 68, 68, 0.1);
        color: var(--danger);
    }
    
    .habit-progress {
        margin-bottom: 16px;
    }
    
    .progress-bar {
        height: 4px;
        background: var(--bg-input);
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 4px;
    }
    
    .progress-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.3s ease;
    }
    
    .progress-text {
        font-size: 11px;
        color: var(--text-muted);
    }
    
    .habit-calendar {
        margin-top: 12px;
    }
    
    .mini-calendar {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
        margin-top: 8px;
    }
    
    .calendar-day {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        border-radius: 2px;
        background: var(--bg-input);
        color: var(--text-muted);
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .calendar-day.completed {
        background: var(--success);
        color: white;
    }
    
    .calendar-day:hover {
        transform: scale(1.1);
    }
`;
document.head.appendChild(style);

// Export functions for global access
window.loadHabits = loadHabits;
window.openHabitModal = openHabitModal;
window.closeHabitModal = closeHabitModal;
window.editHabit = openHabitModal;
window.deleteHabit = deleteHabit;
window.toggleHabit = toggleHabit;

})();