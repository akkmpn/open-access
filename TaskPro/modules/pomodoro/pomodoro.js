let timerInterval;
let timeLeft = 25 * 60; // 25 minutes in seconds
let isRunning = false;

export function init() {
    const timerDisplay = document.getElementById('timer-display');
    const startBtn = document.getElementById('start-timer');
    const resetBtn = document.getElementById('reset-timer');

    function updateDisplay() {
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timerDisplay.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    startBtn.onclick = () => {
        if (isRunning) {
            clearInterval(timerInterval);
            startBtn.innerText = "Resume";
        } else {
            startBtn.innerText = "Pause";
            timerInterval = setInterval(() => {
                timeLeft--;
                updateDisplay();
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    alert("Focus session complete! Take a break.");
                    resetTimer();
                }
            }, 1000);
        }
        isRunning = !isRunning;
    };

    resetBtn.onclick = resetTimer;

    function resetTimer() {
        clearInterval(timerInterval);
        timeLeft = 25 * 60;
        isRunning = false;
        startBtn.innerText = "Start Focus";
        updateDisplay();
    }

    updateDisplay();
}