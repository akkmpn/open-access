// ===== ENHANCED TIMER MODULE =====
// Advanced stopwatch and custom timer with laps, session tracking, and statistics

// Wrap in IIFE to avoid global scope pollution
(() => {
    // UI Elements
    const stopwatchDisplay = document.getElementById('sw-display');
    const timerDisplay2 = document.getElementById('timer-display2');
    const startStopwatchBtn = document.getElementById('sw-start-btn');
    const lapStopwatchBtn = document.getElementById('sw-lap-btn');
    const resetStopwatchBtn = document.getElementById('sw-reset-btn');
    const timerInput = document.getElementById('timer-input');
    const startTimerBtn = document.getElementById('btn-start-timer');
    const resetTimerBtn = document.getElementById('btn-reset-timer');
    const lapsList = document.getElementById('laps-list');

    // State
    let stopwatchState = {
        isRunning: false,
        isPaused: false,
        elapsed: 0,
        laps: [],
        startTime: null,
        totalTime: 0,
        interval: null
    };

    let timerState = {
        isRunning: false,
        timeLeft: 0,
        totalTime: 0,
        startTime: null,
        interval: null
    };

    // Initialize timer module
    function initStopwatch() {
        setupTimerEventListeners();
        updateStopwatchUI();
        loadTimerStats();
    loadTimerStats();
}

// Enhanced stopwatch functionality
function toggleStopwatch() {
    if (stopwatchState.isRunning) {
        pauseStopwatch();
    } else {
        startStopwatch();
    }
}

function startStopwatch() {
    if (stopwatchState.isPaused) {
        // Resume from pause
        stopwatchState.isPaused = false;
        stopwatchState.startTime = Date.now() - stopwatchState.elapsed;
    } else {
        // Start fresh
        stopwatchState.startTime = Date.now();
        stopwatchState.elapsed = 0;
        stopwatchState.laps = [];
    }
    
    stopwatchState.isRunning = true;
    stopwatchState.interval = setInterval(() => {
        if (!stopwatchState.isPaused) {
            stopwatchState.elapsed = Date.now() - stopwatchState.startTime;
            updateStopwatchUI();
        }
    }, 10);
    
    updateStopwatchUI();
}

function pauseStopwatch() {
    stopwatchState.isPaused = true;
    stopwatchState.isRunning = false;
    clearInterval(stopwatchState.interval);
    updateStopwatchUI();
}

function resetStopwatch() {
    if (stopwatchState.isRunning && stopwatchState.elapsed > 0) {
        // Save current session
        saveStopwatchSession(stopwatchState.elapsed);
    }
    
    clearInterval(stopwatchState.interval);
    stopwatchState.isRunning = false;
    stopwatchState.isPaused = false;
    stopwatchState.elapsed = 0;
    stopwatchState.laps = [];
    stopwatchState.startTime = null;
    
    updateStopwatchUI();
}

function addLap() {
    if (!stopwatchState.isRunning) return;
    
    stopwatchState.laps.push(stopwatchState.elapsed);
    
    // Update UI
    renderLaps();
    playLapSound();
}

function renderLaps() {
    if (!lapsList) return;
    
    lapsList.innerHTML = stopwatchState.laps.map((lap, index) => {
        const time = formatTime(lap);
        return `
            <div class="lap-item">
                <span class="lap-number">Lap ${index + 1}</span>
                <span class="lap-time">${time}</span>
            </div>
        `;
    }).join('');
    
    // Scroll to latest lap
    lapsList.scrollTop = lapsList.scrollHeight;
}

// Enhanced timer functionality
function startCustomTimer() {
    const seconds = parseInt(timerInput.value);
    if (seconds <= 0 || isNaN(seconds)) {
        TaskProApp.showNotification('Please enter a valid time in seconds', 'warning');
        return;
    }
    
    timerState.timeLeft = seconds * 1000;
    timerState.totalTime = seconds * 1000;
    timerState.isRunning = true;
    timerState.startTime = Date.now();
    
    timerState.interval = setInterval(() => {
        timerState.timeLeft -= 100;
        updateTimerUI();
        
        if (timerState.timeLeft <= 0) {
            completeTimer();
        }
    }, 100);
    
    updateTimerUI();
}

async function completeTimer() {
    clearInterval(timerState.interval);
    timerState.isRunning = false;
    
    const sessionDuration = timerState.totalTime - timerState.timeLeft;
    
    // Save session to database
    await saveTimerSession('timer', sessionDuration);
    
    // Play completion sound
    playCompletionSound();
    
    // Show notification
    TaskProApp.showNotification('Timer completed!', 'success');
    
    // Reset timer
    timerState.timeLeft = 0;
    timerInput.value = '';
    updateTimerUI();
    updateTimerStats();
}

async function resetTimer() {
    if (timerState.isRunning && timerState.timeLeft < timerState.totalTime) {
        // Save partial session
        const sessionDuration = timerState.totalTime - timerState.timeLeft;
        await saveTimerSession('timer', sessionDuration);
    }
    
    clearInterval(timerState.interval);
    timerState.isRunning = false;
    timerState.timeLeft = 0;
    timerState.totalTime = 0;
    timerInput.value = '';
    
    updateTimerUI();
    updateTimerStats();
}

// Session tracking and statistics
async function saveStopwatchSession(duration) {
    if (!TaskProApp.currentUser) return;
    
    try {
        await TaskProUtils.safeSupabaseOperation(
            () => supabase
                .from('timer_sessions')
                .insert([{
                    user_id: TaskProApp.currentUser.id,
                    type: 'stopwatch',
                    duration_ms: duration,
                    created_at: new Date().toISOString()
                }])
        );
        
        // Update global timer stats
        TaskProApp.timers.stopwatch.totalTime += duration;
        
    } catch (error) {
        console.error('Error saving stopwatch session:', error);
    }
}

async function saveTimerSession(type, duration) {
    if (!TaskProApp.currentUser) return;
    
    try {
        await TaskProUtils.safeSupabaseOperation(
            () => supabase
                .from('timer_sessions')
                .insert([{
                    user_id: TaskProApp.currentUser.id,
                    type: type,
                    duration_ms: duration,
                    created_at: new Date().toISOString()
                }])
        );
        
        // Update global timer stats
        if (type === 'timer') {
            TaskProApp.timers.timer.totalTime += duration;
        }
        
    } catch (error) {
        console.error('Error saving timer session:', error);
    }
}

function loadTimerStats() {
    // Load statistics from database
    if (!TaskProApp.currentUser) return;
    
    // This would load from timer_sessions table
    // For now, use cached values
    updateTimerStats();
}

function updateTimerStats() {
    // Update total time displays
    const totalStopwatchTimeElement = document.getElementById('total-stopwatch-time');
    if (totalStopwatchTimeElement) {
        const time = TaskProApp.timers.stopwatch.totalTime;
        const h = Math.floor(time / 3600000);
        const m = Math.floor((time % 360000) / 60000);
        const s = Math.floor((time % 60000) / 1000);
        totalStopwatchTimeElement.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    
    const totalTimerTimeElement = document.getElementById('total-timer-time');
    if (totalTimerTimeElement) {
        const time = TaskProApp.timers.timer.totalTime;
        const h = Math.floor(time / 3600000);
        const m = Math.floor((time % 360000) / 60000);
        const s = Math.floor((time % 60000) / 1000);
        totalTimerTimeElement.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    
    const totalSessionsElement = document.getElementById('total-sessions-count');
    if (totalSessionsElement) {
        totalSessionsElement.textContent = 
            TaskProApp.timers.pomodoro.sessionCount + 
            (TaskProApp.timers.stopwatch.totalTime > 0 ? 1 : 0) + 
            (TaskProApp.timers.timer.totalTime > 0 ? 1 : 0);
    }
}

// UI updates
function updateStopwatchUI() {
    if (!stopwatchDisplay) return;
    
    const time = stopwatchState.elapsed;
    const h = Math.floor(time / 3600000);
    const m = Math.floor((time % 360000) / 60000);
    const s = Math.floor((time % 60000) / 1000);
    
    stopwatchDisplay.textContent = 
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    
    // Update buttons
    if (startStopwatchBtn) {
        if (stopwatchState.isRunning && !stopwatchState.isPaused) {
            startStopwatchBtn.textContent = 'Pause';
            startStopwatchBtn.className = 'btn-primary';
        } else if (stopwatchState.isPaused) {
            startStopwatchBtn.textContent = 'Resume';
            startStopwatchBtn.className = 'btn-secondary';
        } else {
            startStopwatchBtn.textContent = 'Start';
            startStopwatchBtn.className = 'btn-primary';
        }
    }
    
    // Update lap button
    if (lapStopwatchBtn) {
        lapStopwatchBtn.style.display = stopwatchState.isRunning ? 'inline-flex' : 'none';
    }
}

function updateTimerUI() {
    if (!timerDisplay2) return;
    
    const time = Math.max(0, timerState.timeLeft);
    const h = Math.floor(time / 3600000);
    const m = Math.floor((time % 360000) / 60000);
    const s = Math.floor((time % 60000) / 1000);
    
    timerDisplay2.textContent = 
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    
    // Update buttons
    if (startTimerBtn) {
        if (timerState.isRunning) {
            startTimerBtn.textContent = 'Stop';
            startTimerBtn.className = 'btn-danger';
        } else {
            startTimerBtn.textContent = 'Start';
            startTimerBtn.className = 'btn-primary';
        }
    }
    
    if (resetTimerBtn) {
        resetTimerBtn.style.display = timerState.isRunning ? 'inline-flex' : 'inline-flex';
    }
}

// Audio feedback
function playLapSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        
        oscillator.frequency.value = 1000;
        oscillator.type = "sine";
        
        gain.gain.setValueAtTime(0.2, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
        console.error('Error playing lap sound:', error);
    }
}

function playCompletionSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        
        oscillator.frequency.value = 1200;
        oscillator.type = "sine";
        
        gain.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        console.error('Error playing completion sound:', error);
    }
}

// Utility functions
function formatTime(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 360000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Event listeners
function setupTimerEventListeners() {
    // Stopwatch controls
    if (startStopwatchBtn) {
        startStopwatchBtn.addEventListener('click', toggleStopwatch);
    }
    
    if (lapStopwatchBtn) {
        lapStopwatchBtn.addEventListener('click', addLap);
    }
    
    if (resetStopwatchBtn) {
        resetStopwatchBtn.addEventListener('click', resetStopwatch);
    }
    
    // Timer controls
    if (startTimerBtn) {
        startTimerBtn.addEventListener('click', startCustomTimer);
    }
    
    if (resetTimerBtn) {
        resetTimerBtn.addEventListener('click', resetTimer);
    }
    
    // Timer input
    if (timerInput) {
        timerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                startCustomTimer();
            }
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (TaskProApp.currentSection === 'timer') {
            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    toggleStopwatch();
                    break;
                case 'l':
                    e.preventDefault();
                    if (stopwatchState.isRunning) addLap();
                    break;
                case 'r':
                    e.preventDefault();
                    resetStopwatch();
                    break;
                case 't':
                    e.preventDefault();
                    startCustomTimer();
                    break;
                case 'Escape':
                    e.preventDefault();
                    if (stopwatchState.isRunning) pauseStopwatch();
                    break;
            }
        }
    });
    
    // Prevent accidental tab closing during active sessions
    window.addEventListener('beforeunload', (e) => {
        if ((stopwatchState.isRunning && !stopwatchState.isPaused) || 
            (timerState.isRunning)) {
            e.preventDefault();
            e.returnValue = 'Timer is running. Are you sure you want to leave?';
        }
    });
}

// Export functions for global access
window.initStopwatch = initStopwatch;
window.toggleStopwatch = toggleStopwatch;
window.addLap = addLap;
window.resetStopwatch = resetStopwatch;
window.startCustomTimer = startCustomTimer;
window.resetTimer = resetTimer;

// Add CSS for enhanced timer components
const style = document.createElement('style');
style.textContent = `
    .timer-container {
        max-width: 500px;
        margin: 0 auto;
        text-align: center;
    }
    
    .timer-header {
        margin-bottom: 20px;
    }
    
    .timer-header h2 {
        color: var(--text-main);
        font-size: 18px;
    }
    
    .session-label {
        color: var(--text-muted);
        font-size: 12px;
    }
    
    .stopwatch-display {
        margin-bottom: 30px;
    }
    
    .stopwatch-display h1 {
        font-size: 48px;
        font-weight: 700;
        color: var(--text-main);
        font-family: 'Roboto Mono', monospace;
    }
    
    .laps-container {
        max-height: 200px;
        overflow-y: auto;
        margin-top: 20px;
        padding-right: 10px;
    }
    
    .laps-list {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
    
    .lap-item {
        padding: 8px;
        background: var(--bg-card);
        border-radius: var(--radius);
        font-family: 'Roboto Mono', monospace;
        font-size: 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border: 1px solid var(--border);
    }
    
    .lap-number {
        font-weight: 600;
        color: var(--text-muted);
    }
    
    .lap-time {
        color: var(--text-main);
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
    
    .timer-circle.timer-active {
        border-color: var(--success);
        box-shadow: 0 0 40px rgba(16, 185, 129, 0.5), inset 0 0 15px rgba(16, 185, 129, 0.2);
    }
    
    .timer-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
        margin-top: 30px;
        padding: 15px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius);
    }
    
    .stat-item {
        text-align: center;
    }
    
    .stat-value {
        font-size: 18px;
        font-weight: 700;
        color: var(--text-main);
        margin-bottom: 5px;
    }
    
    .stat-label {
        font-size: 11px;
        color: var(--text-muted);
    }
`;
document.head.appendChild(style);

// Export functions for global access
window.initStopwatch = initStopwatch;
window.toggleStopwatch = toggleStopwatch;
window.addLap = addLap;
window.resetStopwatch = resetStopwatch;
window.startCustomTimer = startCustomTimer;
window.resetTimer = resetTimer;

})();