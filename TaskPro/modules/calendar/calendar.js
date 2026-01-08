let currentDate = new Date();

async function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthYearLabel = document.getElementById('current-month-year');
    
    // Set Header
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    monthYearLabel.innerText = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate);

    // Fetch Tasks for this month
    const firstDay = new Date(year, month, 1).toISOString();
    const lastDay = new Date(year, month + 1, 0).toISOString();
    
    const { data: tasks } = await supabase
        .from('tasks')
        .select('title, date, priority')
        .gte('date', firstDay)
        .lte('date', lastDay);

    // Calculate Grid
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayIndex = new Date(year, month, 1).getDay();
    
    grid.innerHTML = '';

    // Add empty slots for previous month days
    for (let x = 0; x < startDayIndex; x++) {
        grid.innerHTML += `<div class="day empty"></div>`;
    }

    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayTasks = tasks?.filter(t => t.date === dateString) || [];
        
        let indicator = '';
        if (dayTasks.length > 0) {
            indicator = `<span class="task-dot count-${dayTasks.length}"></span>`;
        }

        grid.innerHTML += `
            <div class="day ${isToday(year, month, i) ? 'today' : ''}">
                <span class="day-number">${i}</span>
                ${indicator}
            </div>
        `;
    }
}

function isToday(y, m, d) {
    const today = new Date();
    return y === today.getFullYear() && m === today.getMonth() && d === today.getDate();
}

function changeMonth(offset) {
    currentDate.setMonth(currentDate.getMonth() + offset);
    renderCalendar();
}

// Initial Load
renderCalendar();

// Export functions for global access
window.initCalendar = async function() {
    await renderCalendar();
};
window.renderCalendar = renderCalendar;
window.changeMonth = changeMonth;