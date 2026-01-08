// ===== ENHANCED NOTES MODULE =====
// Advanced note management with search, editing, and better UI

// Wrap in IIFE to avoid global scope pollution
(() => {
    // UI Elements
    const notesList = document.getElementById('notes-list');
    const noteForm = document.getElementById('note-form');
    const noteModal = document.getElementById('note-modal');
    const noteInput = document.getElementById('note-input');

    // State
    let currentNotes = [];
    let searchQuery = '';
    let sortBy = 'created_at';
    let sortOrder = 'desc';
    let editingNoteId = null;

    // Initialize notes module
    async function loadNotes() {
        if (!TaskProApp.currentUser) return;
        
        try {
            const notes = await TaskProApp.loadNotes();
            currentNotes = notes;
            renderNotes(notes);
            setupNotesEventListeners();
        } catch (error) {
            console.error('Error loading notes:', error);
            TaskProApp.showNotification('Failed to load notes', 'error');
        }
    try {
        const notes = await TaskProApp.loadNotes();
        currentNotes = notes;
        renderNotes(notes);
        setupNotesEventListeners();
    } catch (error) {
        console.error('Error loading notes:', error);
        TaskProApp.showNotification('Failed to load notes', 'error');
    }
}

// Enhanced note rendering with animations
function renderNotes(notes) {
    if (!notesList) return;
    
    // Apply search and sorting
    let filteredNotes = filterAndSearchNotes(notes);
    filteredNotes = sortNotes(filteredNotes);
    
    if (filteredNotes.length === 0) {
        notesList.innerHTML = `
            <div class="empty-state-container">
                <div class="empty-state-icon">📝</div>
                <h3>Capture your thoughts!</h3>
                <p>${searchQuery ? 'No notes match your search. Try different keywords?' : 'Start writing notes to organize your ideas and thoughts.'}</p>
                <button class="btn-primary" onclick="openNoteModal()">Create Your First Note</button>
            </div>
        `;
        return;
    }
    
    notesList.innerHTML = filteredNotes.map(note => createNoteCard(note)).join('');
    
    // Animate note cards
    animateNoteCards();
}

function createNoteCard(note) {
    const formattedDate = formatDateRelative(note.created_at);
    const contentPreview = note.content.length > 150 ? 
        note.content.substring(0, 150) + '...' : note.content;
    
    return `
        <div class="note-card" data-note-id="${note.id}">
            <div class="note-header">
                <div class="note-date">
                    <i class="far fa-calendar"></i> ${formattedDate}
                </div>
                <div class="note-actions">
                    <button class="note-action-btn" onclick="editNote('${note.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="note-action-btn" onclick="duplicateNote('${note.id}')" title="Duplicate">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="note-action-btn delete-btn" onclick="deleteNote('${note.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="note-content">
                ${escapeHtml(note.content)}
            </div>
            <div class="note-footer">
                <span class="note-length">${note.content.length} characters</span>
                <button class="note-expand-btn" onclick="expandNote('${note.id}')">
                    <i class="fas fa-expand-alt"></i>
                </button>
            </div>
        </div>
    `;
}

function filterAndSearchNotes(notes) {
    let filtered = notes;
    
    // Apply search query
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(note => 
            note.content.toLowerCase().includes(query)
        );
    }
    
    return filtered;
}

function sortNotes(notes) {
    return notes.sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];
        
        if (sortBy === 'created_at') {
            aValue = aValue ? new Date(aValue) : new Date(0);
            bValue = bValue ? new Date(bValue) : new Date(0);
        }
        
        if (sortBy === 'content') {
            aValue = aValue || '';
            bValue = bValue || '';
        }
        
        if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });
}

// Note CRUD operations
async function addNote(noteData) {
    if (!TaskProApp.currentUser) return;
    
    try {
        const result = await TaskProUtils.safeSupabaseOperation(
            () => supabase
                .from('notes')
                .insert([{
                    ...noteData,
                    user_id: TaskProApp.currentUser.id,
                    created_at: new Date().toISOString()
                }])
        );
        
        if (result.error) throw result.error;
        
        TaskProApp.showNotification('Note added successfully', 'success');
        await loadNotes();
        return result.data[0];
    } catch (error) {
        console.error('Error adding note:', error);
        TaskProApp.showNotification('Failed to add note', 'error');
        return null;
    }
}

async function updateNote(noteId, noteData) {
    if (!TaskProApp.currentUser) return;
    
    try {
        const result = await TaskProUtils.safeSupabaseOperation(
            () => supabase
                .from('notes')
                .update({
                    ...noteData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', noteId)
        );
        
        if (result.error) throw result.error;
        
        TaskProApp.showNotification('Note updated successfully', 'success');
        await loadNotes();
        return result.data[0];
    } catch (error) {
        console.error('Error updating note:', error);
        TaskProApp.showNotification('Failed to update note', 'error');
        return null;
    }
}

async function deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
        const result = await TaskProUtils.safeSupabaseOperation(
            () => supabase
                .from('notes')
                .delete()
                .eq('id', noteId)
        );
        
        if (result.error) throw result.error;
        
        TaskProApp.showNotification('Note deleted successfully', 'success');
        
        // Remove from cache
        TaskProApp.cache.notes = TaskProApp.cache.notes.filter(n => n.id !== noteId);
        
        // Update UI with animation
        const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
        if (noteElement) {
            noteElement.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                loadNotes();
            }, 300);
        }
    } catch (error) {
        console.error('Error deleting note:', error);
        TaskProApp.showNotification('Failed to delete note', 'error');
    }
}

async function duplicateNote(noteId) {
    const originalNote = currentNotes.find(n => n.id === noteId);
    if (!originalNote) return;
    
    const duplicatedNote = {
        content: originalNote.content + ' (copy)'
    };
    
    await addNote(duplicatedNote);
}

// Modal management
function openNoteModal(noteId = null) {
    if (!noteModal) return;
    
    if (noteId) {
        // Edit mode
        const note = currentNotes.find(n => n.id === noteId);
        if (!note) return;
        
        editingNoteId = noteId;
        document.getElementById('note-content').value = note.content;
        document.querySelector('#note-modal h3').textContent = 'Edit Note';
    } else {
        // Create mode
        editingNoteId = null;
        noteForm.reset();
        document.querySelector('#note-modal h3').textContent = 'New Note';
    }
    
    noteModal.style.display = 'flex';
    document.getElementById('note-content').focus();
}

function closeNoteModal() {
    if (!noteModal) return;
    noteModal.style.display = 'none';
    noteForm.reset();
    editingNoteId = null;
}

function expandNote(noteId) {
    const note = currentNotes.find(n => n.id === noteId);
    if (!note) return;
    
    // Create expanded view modal
    const expandedModal = document.createElement('div');
    expandedModal.className = 'modal';
    expandedModal.style.display = 'flex';
    expandedModal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="note-header">
                <h3>Note Details</h3>
                <button class="btn-icon" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="note-content" style="white-space: pre-wrap; font-family: 'Playfair Display', serif; font-size: 16px; line-height: 1.6;">
                ${escapeHtml(note.content)}
            </div>
            <div class="note-meta">
                <p><strong>Created:</strong> ${new Date(note.created_at).toLocaleString()}</p>
                ${note.updated_at ? `<p><strong>Updated:</strong> ${new Date(note.updated_at).toLocaleString()}</p>` : ''}
                <p><strong>Length:</strong> ${note.content.length} characters</p>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" onclick="editNote('${note.id}'); this.closest('.modal').remove();">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-primary" onclick="copyNoteToClipboard('${note.id}')">
                    <i class="fas fa-copy"></i> Copy
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(expandedModal);
}

async function copyNoteToClipboard(noteId) {
    const note = currentNotes.find(n => n.id === noteId);
    if (!note) return;
    
    try {
        await navigator.clipboard.writeText(note.content);
        TaskProApp.showNotification('Note copied to clipboard', 'success');
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        TaskProApp.showNotification('Failed to copy note', 'error');
    }
}

// Search and filtering
function searchNotes(query) {
    searchQuery = query;
    renderNotes(currentNotes);
}

function setNoteSorting(field, order) {
    sortBy = field;
    sortOrder = order;
    renderNotes(currentNotes);
}

// UI utilities
function animateNoteCards() {
    const cards = document.querySelectorAll('.note-card');
    cards.forEach((card, index) => {
        card.style.animation = `fadeInUp 0.3s ease ${index * 0.1}s both`;
    });
}

function formatDateRelative(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    if (dateStr === today.toISOString().split('T')[0]) {
        return 'Today';
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listeners
function setupNotesEventListeners() {
    // Note form submission
    if (noteForm) {
        noteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const content = document.getElementById('note-content').value.trim();
            
            if (!content) {
                TaskProApp.showNotification('Please enter note content', 'warning');
                return;
            }
            
            if (editingNoteId) {
                await updateNote(editingNoteId, { content });
            } else {
                await addNote({ content });
            }
            
            closeNoteModal();
        });
    }
    
    // Quick add note input
    if (noteInput) {
        noteInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && e.ctrlKey && e.target.value.trim()) {
                await addNote({ content: e.target.value.trim() });
                e.target.value = '';
            }
        });
    }
    
    // Search input
    const searchInput = document.getElementById('note-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchNotes(e.target.value);
        });
    }
    
    // Sort dropdowns
    const sortSelect = document.getElementById('note-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            const [field, order] = e.target.value.split('-');
            setNoteSorting(field, order);
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'n' && TaskProApp.currentSection === 'notes') {
            e.preventDefault();
            openNoteModal();
        }
    });
}

// Export functions for global access
window.loadNotes = loadNotes;
window.openNoteModal = openNoteModal;
window.closeNoteModal = closeNoteModal;
window.editNote = openNoteModal;
window.deleteNote = deleteNote;
window.duplicateNote = duplicateNote;
window.expandNote = expandNote;
window.copyNoteToClipboard = copyNoteToClipboard;
window.searchNotes = searchNotes;

// Add CSS animations for notes
const style = document.createElement('style');
style.textContent = `
    .note-card {
        position: relative;
        transition: all 0.2s ease;
        cursor: pointer;
    }
    
    .note-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }
    
    .note-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }
    
    .note-date {
        font-size: 12px;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        gap: 6px;
    }
    
    .note-actions {
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.2s ease;
    }
    
    .note-card:hover .note-actions {
        opacity: 1;
    }
    
    .note-action-btn {
        background: none;
        border: none;
        color: var(--text-muted);
        padding: 4px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .note-action-btn:hover {
        background: var(--bg-hover);
        color: var(--text-main);
    }
    
    .note-action-btn.delete-btn:hover {
        background: rgba(239, 68, 68, 0.1);
        color: var(--danger);
    }
    
    .note-content {
        font-family: 'Playfair Display', serif;
        font-size: 16px;
        line-height: 1.6;
        color: var(--text-main);
        white-space: pre-wrap;
        word-wrap: break-word;
        margin-bottom: 12px;
        min-height: 60px;
    }
    
    .note-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 8px;
        border-top: 1px solid var(--border);
        font-size: 11px;
        color: var(--text-muted);
    }
    
    .note-length {
        font-style: italic;
    }
    
    .note-expand-btn {
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 2px;
        border-radius: 2px;
        transition: all 0.2s ease;
    }
    
    .note-expand-btn:hover {
        color: var(--text-main);
        background: var(--bg-hover);
    }
    
    .note-meta {
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid var(--border);
        font-size: 12px;
        color: var(--text-muted);
    }
    
    .note-meta p {
        margin-bottom: 5px;
    }
    
    .note-meta strong {
        color: var(--text-main);
    }
`;
document.head.appendChild(style);

})();