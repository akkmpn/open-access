let timerInterval;
let timeLeft = 1500; // 25 minutes in seconds
let isRunning = false;
let currentMode = 'focus';

const display = document.getElementById('timer-countdown');

// 1. Core Timer Logic
function updateDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    display.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function toggleTimer() {
    const startBtn = document.getElementById('start-btn');
    if (isRunning) {
        clearInterval(timerInterval);
        startBtn.innerText = 'Start';
    } else {
        startBtn.innerText = 'Pause';
        timerInterval = setInterval(() => {
            timeLeft--;
            updateDisplay();
            if (timeLeft <= 0) {
                completeSession();
            }
        }, 1000);
    }
    isRunning = !isRunning;
}

// 2. Handle Completion and Supabase Sync
async function completeSession() {
    clearInterval(timerInterval);
    isRunning = false;
    alert("Session Finished!");

    const user = (await supabase.auth.getUser()).data.user;
    
    // Log to timer_sessions table
    if (currentMode === 'focus') {
        const { error } = await supabase.from('timer_sessions').insert([{
            user_id: user.id,
            type: 'pomodoro',
            duration_ms: 1500 * 1000, // Duration in milliseconds
            created_at: new Date()
        }]);
        
        if (!error) console.log("Session saved to Supabase");
    }

    resetTimer();
}

function setMode(mode) {
    currentMode = mode;
    if (mode === 'focus') timeLeft = 1500;
    else if (mode === 'short') timeLeft = 300;
    else if (mode === 'long') timeLeft = 900;
    
    updateDisplay();
    // Update UI active buttons
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    setMode(currentMode);
    document.getElementById('start-btn').innerText = 'Start';
}