import { supabase } from '../../supabase-config.js';

export async function init() {
    const exportBtn = document.getElementById('export-data');

    exportBtn.onclick = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Fetch everything in parallel
        const [tasks, habits, notes] = await Promise.all([
            supabase.from('tasks').select('*'),
            supabase.from('habits').select('*'),
            supabase.from('notes').select('*')
        ]);

        const userData = {
            exportDate: new Date().toISOString(),
            userEmail: user.email,
            tasks: tasks.data,
            habits: habits.data,
            notes: notes.data
        };

        // Create a downloadable file
        const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taskpro_backup_${new Date().toLocaleDateString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };
}