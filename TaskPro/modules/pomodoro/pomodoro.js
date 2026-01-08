// ===== ENHANCED POMODORO MODULE =====
// Advanced Pomodoro timer with session tracking, statistics, and audio notifications

// UI Elements
const timerDisplay = document.getElementById('timer-countdown');
const timerStatus = document.getElementById('timer-status');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const focusDuration = document.getElementById('focus-duration');
const breakDuration = document.getElementById('break-duration');
const soundSelect = document.getElementById('sound-select');

// State
let pomodoroState = {
    isRunning: false,
    isPaused: false,
    mode: 'focus', // focus, short, long
    timeLeft: 25 * 60, // 25 minutes in seconds
    totalFocusTime: 0,
    totalBreakTime: 0,
    sessionCount: 0,
    sessionStartTime: null,
    timerInterval: null,
    settings: {
        focusDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        longBreakInterval: 4, // Long break after 4 pomodoros
        soundEnabled: true,
        soundType: 'bell'
    }
};

// Initialize pomodoro module
function initPomodoro() {
    loadPomodoroSettings();
    setupPomodoroEventListeners();
    updatePomodoroUI();
    loadPomodoroStats();
}

function loadPomodoroSettings() {
    const saved = localStorage.getItem('pomodoro-settings');
    if (saved) {
        pomodoroState.settings = { ...pomodoroState.settings, ...JSON.parse(saved) };
    }
    
    // Apply settings to UI
    if (focusDuration) focusDuration.value = pomodoroState.settings.focusDuration;
    if (breakDuration) breakDuration.value = pomodoroState.settings.shortBreakDuration;
    if (soundSelect) soundSelect.value = pomodoroState.settings.soundType;
}

function savePomodoroSettings() {
    localStorage.setItem('pomodoro-settings', JSON.stringify(pomodoroState.settings));
}

// Enhanced timer controls
function toggleTimer() {
    if (pomodoroState.isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    if (pomodoroState.isPaused) {
        // Resume from pause
        pomodoroState.isPaused = false;
    } else {
        // Start new session
        pomodoroState.sessionStartTime = Date.now();
        pomodoroState.timeLeft = getModeDuration();
    }
    
    pomodoroState.isRunning = true;
    pomodoroState.timerInterval = setInterval(() => {
        if (!pomodoroState.isPaused) {
            pomodoroState.timeLeft--;
            updatePomodoroUI();
            
            if (pomodoroState.timeLeft <= 0) {
                completeSession();
            }
        }
    }, 1000);
    
    updatePomodoroUI();
    enterFocusMode();
}

function pauseTimer() {
    pomodoroState.isPaused = true;
    pomodoroState.isRunning = false;
    clearInterval(pomodoroState.timerInterval);
    updatePomodoroUI();
    exitFocusMode();
}

function resetTimer() {
    clearInterval(pomodoroState.timerInterval);
    pomodoroState.isRunning = false;
    pomodoroState.isPaused = false;
    pomodoroState.timeLeft = getModeDuration();
    pomodoroState.sessionStartTime = null;
    updatePomodoroUI();
    exitFocusMode();
}

async function completeSession() {
    clearInterval(pomodoroState.timerInterval);
    pomodoroState.isRunning = false;
    pomodoroState.isPaused = false;
    
    const sessionDuration = Date.now() - pomodoroState.sessionStartTime;
    
    // Update statistics
    if (pomodoroState.mode === 'focus') {
        pomodoroState.totalFocusTime += sessionDuration;
        pomodoroState.sessionCount++;
        
        // Save session to database
        await savePomodoroSession('focus', sessionDuration);
        
        // Play completion sound
        playCompletionSound();
        
        // Show notification
        TaskProApp.showNotification('Focus session completed! Time for a break.', 'success');
        
        // Auto-start break if enabled
        if (pomodoroState.sessionCount % pomodoroState.settings.longBreakInterval === 0) {
            setMode('long');
            setTimeout(() => startTimer(), 2000);
        } else {
            setMode('short');
            setTimeout(() => startTimer(), 2000);
        }
    } else {
        pomodoroState.totalBreakTime += sessionDuration;
        
        // Save break session
        await savePomodoroSession('break', sessionDuration);
        
        // Play completion sound
        playCompletionSound();
        
        // Show notification
        TaskProApp.showNotification('Break completed! Ready for focus?', 'info');
        
        // Auto-start focus session
        setMode('focus');
        setTimeout(() => startTimer(), 2000);
    }
    
    updatePomodoroUI();
    updatePomodoroStats();
}

async function savePomodoroSession(type, duration) {
    if (!TaskProApp.currentUser) return;
    
    try {
        await TaskProUtils.safeSupabaseOperation(
            () => supabase
                .from('timer_sessions')
                .insert([{
                    user_id: TaskProApp.currentUser.id,
                    type: 'pomodoro',
                    session_type: type,
                    duration_ms: duration,
                    created_at: new Date().toISOString()
                }])
        );
        
        // Update global timer stats
        TaskProApp.timers.pomodoro.totalFocusTime = pomodoroState.totalFocusTime;
        TaskProApp.timers.pomodoro.sessionCount = pomodoroState.sessionCount;
        
    } catch (error) {
        console.error('Error saving pomodoro session:', error);
    }
}

function setMode(mode) {
    pomodoroState.mode = mode;
    pomodoroState.timeLeft = getModeDuration();
    
    // Update UI based on onclick attribute instead
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
        const btnOnclick = btn.getAttribute('onclick');
        if (btnOnclick && btnOnclick.includes(`'${mode}'`)) {
            btn.classList.add('active');
        }
    });
    
    updatePomodoroUI();
}

function getModeDuration() {
    switch (pomodoroState.mode) {
        case 'focus':
            return pomodoroState.settings.focusDuration * 60;
        case 'short':
            return pomodoroState.settings.shortBreakDuration * 60;
        case 'long':
            return pomodoroState.settings.longBreakDuration * 60;
        default:
            return pomodoroState.settings.focusDuration * 60;
    }
}

// UI updates
function updatePomodoroUI() {
    if (!timerDisplay) return;
    
    const minutes = Math.floor(pomodoroState.timeLeft / 60);
    const seconds = pomodoroState.timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update status text
    if (timerStatus) {
        if (pomodoroState.isPaused) {
            timerStatus.textContent = 'Paused';
        } else if (pomodoroState.isRunning) {
            timerStatus.textContent = pomodoroState.mode.charAt(0).toUpperCase() + pomodoroState.mode.slice(1);
        } else {
            timerStatus.textContent = 'Ready to work?';
        }
    }
    
    // Update buttons
    if (startBtn) {
        if (pomodoroState.isRunning && !pomodoroState.isPaused) {
            startBtn.textContent = 'Pause';
            startBtn.className = 'btn-primary';
        } else if (pomodoroState.isPaused) {
            startBtn.textContent = 'Resume';
            startBtn.className = 'btn-secondary';
        } else {
            startBtn.textContent = 'Start';
            startBtn.className = 'btn-primary';
        }
    }
    
    // Update timer circle visual
    const timerCircle = document.querySelector('.timer-circle');
    if (timerCircle) {
        timerCircle.className = 'timer-circle';
        
        if (pomodoroState.isRunning && !pomodoroState.isPaused) {
            if (pomodoroState.mode === 'focus') {
                timerCircle.classList.add('timer-active', 'focus-mode');
            } else {
                timerCircle.classList.add('timer-active', 'break-mode');
            }
        } else if (pomodoroState.isPaused) {
            timerCircle.classList.add('timer-active', 'paused');
        }
    }
}

function updatePomodoroStats() {
    // Update today's focus time
    const todayFocusElement = document.getElementById('today-focus-time');
    if (todayFocusElement) {
        const todayMinutes = Math.floor(pomodoroState.totalFocusTime / 60000);
        todayFocusElement.textContent = todayMinutes;
    }
    
    // Update dashboard stats if available
    const focusTimeDisplay = document.getElementById('focusTimeDisplay');
    if (focusTimeDisplay) {
        const hours = Math.floor(pomodoroState.totalFocusTime / 3600000);
        const minutes = Math.floor((pomodoroState.totalFocusTime % 3600000) / 60000);
        focusTimeDisplay.textContent = `${hours}h ${minutes}m`;
    }
}

// Focus mode helpers
function enterFocusMode() {
    // Could implement distraction-blocking features here
    document.body.classList.add('pomodoro-focus-mode');
}

function exitFocusMode() {
    document.body.classList.remove('pomodoro-focus-mode');
}

// Audio notifications
function playCompletionSound() {
    if (!pomodoroState.settings.soundEnabled) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        
        // Different sounds for different modes
        if (pomodoroState.mode === 'focus') {
            oscillator.frequency.value = 800; // Higher pitch for focus completion
        } else {
            oscillator.frequency.value = 600; // Lower pitch for break completion
        }
        
        oscillator.type = pomodoroState.settings.soundType === 'bell' ? 'sine' : 'triangle';
        
        gain.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.error('Error playing completion sound:', error);
    }
}

// Settings management
function updateSettings() {
    pomodoroState.settings.focusDuration = parseInt(focusDuration.value) || 25;
    pomodoroState.settings.shortBreakDuration = parseInt(breakDuration.value) || 5;
    pomodoroState.settings.longBreakDuration = 15;
    pomodoroState.settings.soundType = soundSelect.value || 'bell';
    
    savePomodoroSettings();
    
    // Update current session if not running
    if (!pomodoroState.isRunning) {
        pomodoroState.timeLeft = getModeDuration();
        updatePomodoroUI();
    }
}

function loadPomodoroStats() {
    // Load today's statistics from database
    if (!TaskProApp.currentUser) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    // This would load from timer_sessions table
    // For now, use cached values
    updatePomodoroStats();
}

// Event listeners
function setupPomodoroEventListeners() {
    // Timer controls
    if (startBtn) {
        startBtn.addEventListener('click', toggleTimer);
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', resetTimer);
    }
    
    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!pomodoroState.isRunning) {
                setMode(btn.dataset.mode);
            }
        });
    });
    
    // Settings
    if (focusDuration) {
        focusDuration.addEventListener('change', updateSettings);
    }
    
    if (breakDuration) {
        breakDuration.addEventListener('change', updateSettings);
    }
    
    if (soundSelect) {
        soundSelect.addEventListener('change', () => {
            pomodoroState.settings.soundType = soundSelect.value;
            pomodoroState.settings.soundEnabled = soundSelect.value !== 'none';
            savePomodoroSettings();
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (TaskProApp.currentSection === 'pomodoro') {
            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    toggleTimer();
                    break;
                case 'r':
                    e.preventDefault();
                    resetTimer();
                    break;
                case '1':
                    e.preventDefault();
                    if (!pomodoroState.isRunning) setMode('focus');
                    break;
                case '2':
                    e.preventDefault();
                    if (!pomodoroState.isRunning) setMode('short');
                    break;
                case '3':
                    e.preventDefault();
                    if (!pomodoroState.isRunning) setMode('long');
                    break;
            }
        }
    });
    
    // Prevent accidental tab closing during session
    window.addEventListener('beforeunload', (e) => {
        if (pomodoroState.isRunning && !pomodoroState.isPaused) {
            e.preventDefault();
            e.returnValue = 'Pomodoro session is in progress. Are you sure you want to leave?';
        }
    });
}

// Export functions for global access
window.initPomodoro = initPomodoro;
window.toggleTimer = toggleTimer;
window.resetTimer = resetTimer;
window.setMode = setMode;

// Add CSS for enhanced pomodoro timer
const style = document.createElement('style');
style.textContent = `
    .pomodoro-focus-mode {
        background: var(--bg-body) !important;
    }
    
    .pomodoro-focus-mode * {
        transition: filter 0.3s ease !important;
    }
    
    .pomodoro-focus-mode :not(.timer-container, .timer-container *, .timer-controls):hover {
        filter: blur(2px) !important;
        opacity: 0.7 !important;
        pointer-events: none !important;
    }
    
    .timer-circle {
        width: 240px;
        height: 240px;
        border-radius: 50%;
        border: 8px solid var(--bg-card);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin: 20px auto;
        position: relative;
        background: radial-gradient(circle, var(--bg-sidebar) 0%, var(--bg-body) 100%);
        box-shadow: var(--shadow);
        color: var(--text-main);
        transition: 0.3s;
    }
    
    .timer-active.focus-mode {
        border-color: var(--accent);
        box-shadow: 0 0 40px rgba(32, 128, 132, 0.5), inset 0 0 15px rgba(32, 128, 132, 0.2);
    }
    
    .timer-active.break-mode {
        border-color: var(--success);
        box-shadow: 0 0 40px rgba(16, 185, 129, 0.5), inset 0 0 15px rgba(16, 185, 129, 0.2);
    }
    
    .timer-active.paused {
        border-color: var(--warning);
        box-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 1; }
    }
    
    .timer-time {
        font-size: 48px;
        font-weight: 700;
        line-height: 1;
    }
    
    .timer-label {
        font-size: 14px;
        text-transform: uppercase;
        color: var(--text-muted);
        margin-top: 5px;
        letter-spacing: 1px;
    }
    
    .timer-modes {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-bottom: 20px;
        flex-wrap: wrap;
    }
    
    .mode-btn {
        padding: 10px 20px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        color: var(--text-muted);
        cursor: pointer;
        transition: 0.2s;
    }
    
    .mode-btn.active {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
    }
    
    .timer-controls {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-bottom: 30px;
        flex-wrap: wrap;
    }
    
    .pomodoro-stats {
        text-align: center;
        margin-top: 20px;
        color: var(--text-muted);
        font-size: 14px;
    }
`;
document.head.appendChild(style);