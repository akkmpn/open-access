let swStartTime;
let swElapsedTime = 0;
let swInterval;
let swRunning = false;

// 1. Core Logic
function toggleStopwatch() {
    const btn = document.getElementById('sw-start-btn');
    if (!swRunning) {
        swStartTime = Date.now() - swElapsedTime;
        swInterval = setInterval(updateStopwatch, 10); // Update every 10ms
        btn.innerText = 'Stop';
        btn.style.backgroundColor = '#ff4757';
        swRunning = true;
    } else {
        clearInterval(swInterval);
        saveStopwatchTime(swElapsedTime);
        btn.innerText = 'Start';
        btn.style.backgroundColor = '#2ecc71';
        swRunning = false;
    }
}

function updateStopwatch() {
    swElapsedTime = Date.now() - swStartTime;
    document.getElementById('sw-display').innerText = formatTime(swElapsedTime);
}

function formatTime(ms) {
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 2. Supabase Sync: Update total_stopwatch_time
async function saveStopwatchTime(timeInMs) {
    const user = (await supabase.auth.getUser()).data.user;
    
    // Fetch current stats first
    const { data: stats } = await supabase
        .from('timer_stats')
        .select('total_stopwatch_time')
        .eq('user_id', user.id)
        .single();

    const newTotal = (stats?.total_stopwatch_time || 0) + timeInMs;

    // Update the aggregate table
    await supabase
        .from('timer_stats')
        .upsert({ 
            user_id: user.id, 
            total_stopwatch_time: newTotal,
            updated_at: new Date()
        });
}

function recordLap() {
    if (!swRunning) return;
    const list = document.getElementById('laps-list');
    const li = document.createElement('li');
    li.innerText = `Lap ${list.children.length + 1}: ${formatTime(swElapsedTime)}`;
    list.prepend(li);
}

function resetStopwatch() {
    clearInterval(swInterval);
    swRunning = false;
    swElapsedTime = 0;
    document.getElementById('sw-display').innerText = "00:00:00";
    document.getElementById('sw-start-btn').innerText = 'Start';
    document.getElementById('laps-list').innerHTML = '';
}