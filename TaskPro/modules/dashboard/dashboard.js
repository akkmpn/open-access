async function initDashboard() {
    const user = (await supabase.auth.getUser()).data.user;
    const today = new Date().toISOString().split('T')[0];

    // 1. Get Tasks count for today
    const { count: taskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('date', today);
    
    document.getElementById('dash-tasks-count').innerText = taskCount || 0;

    // 2. Get Best Habit Streak
    const { data: habits } = await supabase
        .from('habits')
        .select('streak')
        .eq('user_id', user.id)
        .order('streak', { ascending: false })
        .limit(1);
    
    document.getElementById('dash-habit-streak').innerText = habits[0]?.streak || 0;

    // 3. Get Total Focus Time from timer_stats
    const { data: stats } = await supabase
        .from('timer_stats')
        .select('total_stopwatch_time')
        .eq('user_id', user.id)
        .single();

    if (stats) {
        const totalMinutes = Math.floor(stats.total_stopwatch_time / 60000);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        document.getElementById('dash-focus-hours').innerText = `${h}h ${m}m`;
    }

    // 4. Load Upcoming Tasks (Widget)
    const { data: upcoming } = await supabase
        .from('tasks')
        .select('title, date')
        .eq('user_id', user.id)
        .eq('completed', false)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(3);

    renderDashboardList(upcoming);
}

function renderDashboardList(tasks) {
    const list = document.getElementById('dash-upcoming-list');
    list.innerHTML = tasks.map(t => `
        <div class="dash-item">
            <span>${t.title}</span>
            <small>${t.date}</small>
        </div>
    `).join('');
}

// Initial Run
initDashboard();