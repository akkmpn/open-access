import { supabase } from '../../supabase-config.js';

let saveTimeout;

export async function init() {
    const noteArea = document.getElementById('note-content');
    const statusMsg = document.getElementById('save-status');
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Load the existing note
    const { data: note } = await supabase
        .from('notes')
        .select('content')
        .eq('user_id', user.id)
        .single();

    if (note) {
        noteArea.value = note.content;
    }

    // 2. Auto-save Event Listener
    noteArea.addEventListener('input', () => {
        statusMsg.innerText = "Typing...";
        
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            statusMsg.innerText = "Saving...";
            
            const { error } = await supabase
                .from('notes')
                .upsert({ 
                    user_id: user.id, 
                    content: noteArea.value,
                    updated_at: new Date() 
                }, { onConflict: 'user_id' });

            statusMsg.innerText = error ? "Error saving!" : "Saved to cloud";
        }, 1000); // 1 second delay
    });
}