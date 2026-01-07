async function exportUserData() {
    const status = document.getElementById('export-status');
    status.innerText = "Gathering data...";
    
    try {
        const user = (await supabase.auth.getUser()).data.user;
        
        // Fetch from all relevant tables in parallel
        const [tasks, notes, habits, focus, timers, stats] = await Promise.all([
            supabase.from('tasks').select('*').eq('user_id', user.id),
            supabase.from('notes').select('*').eq('user_id', user.id),
            supabase.from('habits').select('*').eq('user_id', user.id),
            supabase.from('focus_sessions').select('*').eq('user_id', user.id),
            supabase.from('timer_sessions').select('*').eq('user_id', user.id),
            supabase.from('timer_stats').select('*').eq('user_id', user.id)
        ]);

        const fullBackup = {
            exportDate: new Date().toISOString(),
            userId: user.id,
            data: {
                tasks: tasks.data,
                notes: notes.data,
                habits: habits.data,
                focusSessions: focus.data,
                timerSessions: timers.data,
                statistics: stats.data
            }
        };

        downloadJSON(fullBackup, `TaskPro_Backup_${new Date().toLocaleDateString()}.json`);
        status.innerText = "Export Complete!";
    } catch (err) {
        status.innerText = "Export Failed.";
        console.error(err);
    }
}

function downloadJSON(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}