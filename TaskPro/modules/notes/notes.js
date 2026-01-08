const notesList = document.getElementById('notes-list');
const noteForm = document.getElementById('note-form');

// 1. Fetch Notes from Supabase
async function loadNotes() {
    const { data: notes, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return console.error('Error fetching notes:', error);
    renderNotes(notes);
}

// 2. Render Notes Grid
function renderNotes(notes) {
    if (notes.length === 0) {
        notesList.innerHTML = `<p class="empty-state">No notes yet.</p>`;
        return;
    }

    notesList.innerHTML = notes.map(note => `
        <div class="note-card">
            <div class="note-date">${new Date(note.created_at).toLocaleDateString()}</div>
            <div class="note-body">${note.content}</div>
            <div class="note-footer">
                <button class="btn-icon delete" onclick="deleteNote('${note.id}')">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `).join('');
}

// 3. Save New Note
noteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = (await supabase.auth.getUser()).data.user;
    
    const { error } = await supabase.from('notes').insert([{
        content: document.getElementById('note-content').value,
        user_id: user.id
    }]);

    if (!error) {
        document.getElementById('note-content').value = ''; // Clear textarea
        closeNoteModal();
        loadNotes();
    }
});

// 4. Delete Note
async function deleteNote(id) {
    if (confirm('Are you sure you want to delete this note?')) {
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', id);

        if (!error) loadNotes();
    }
}

// Initial Load
loadNotes();