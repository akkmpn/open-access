import { supabase } from '../../supabase-config.js';

let saveTimeout;

export async function init() {
    const noteArea = document.getElementById('note-content');
    const statusMsg = document.getElementById('save-status');
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // 1. Load the existing note 
    // FIXED: Removed .single() to prevent 406 error on empty results
    const { data: notes, error } = await supabase
        .from('notes')
        .select('content')
        .eq('user_id', user.id);

    if (error) {
        console.error("Error loading notes:", error.message);
    } else if (notes && notes.length > 0) {
        noteArea.value = notes[0].content;
    }

    // 2. Auto-save Event Listener
    noteArea.addEventListener('input', () => {
        statusMsg.innerText = "Typing...";
        
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            statusMsg.innerText = "Saving...";
            
            // FIXED: Using upsert correctly with user_id as the unique constraint
            const { error } = await supabase
                .from('notes')
                .upsert({ 
                    user_id: user.id, 
                    content: noteArea.value,
                    updated_at: new Date().toISOString() // Better practice to use ISO string
                }, { onConflict: 'user_id' });

            if (error) {
                console.error("Save error details:", error);
                statusMsg.innerText = "Error saving!";
            } else {
                statusMsg.innerText = "Saved to cloud";
            }
        }, 1000); // 1 second delay
    });
}