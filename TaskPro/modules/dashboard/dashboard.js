import { supabase } from '../../supabase-config.js';

export async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Fetch data for stats
    const { data: tasks } = await supabase.from('tasks').select('is_completed');
    const { data: habits } = await supabase.from('habits').select('streak, name');

    // 2. Calculate metrics
    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.is_completed).length || 0;
    const taskPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const topHabit = habits?.sort((a, b) => b.streak - a.streak)[0] || { name: 'None', streak: 0 };

    // 3. Inject into UI
    document.getElementById('stat-tasks').innerText = `${completedTasks}/${totalTasks}`;
    document.getElementById('stat-habit-streak').innerText = `${topHabit.streak} days`;
    document.getElementById('stat-habit-name').innerText = topHabit.name;
    
    // Simple Progress Bar Update
    document.getElementById('task-progress').style.width = `${taskPercent}%`;
}