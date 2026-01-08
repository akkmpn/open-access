// ===== ENHANCED TASKS MODULE =====
// Advanced task management with filtering, search, and drag-and-drop

// UI Elements
const tasksList = document.getElementById('tasks-list');
const taskForm = document.getElementById('task-form');
const taskModal = document.getElementById('task-modal');
const taskInput = document.getElementById('task-input');

// State
let currentFilter = 'all';
let searchQuery = '';
let sortBy = 'created_at';
let sortOrder = 'desc';
let draggedTask = null;

// Initialize tasks module
async function loadTasks() {
    if (!TaskProApp.currentUser) return;
    
    try {
        const tasks = await TaskProApp.loadTasks();
        renderTasks(tasks);
        updateTaskBadge();
        setupTaskEventListeners();
    } catch (error) {
        console.error('Error loading tasks:', error);
        TaskProApp.showNotification('Failed to load tasks', 'error');
    }
}

// Enhanced task rendering with animations and interactions
function renderTasks(tasks) {
    if (!tasksList) return;
    
    // Apply filters and search
    let filteredTasks = filterAndSearchTasks(tasks);
    
    // Apply sorting
    filteredTasks = sortTasks(filteredTasks);
    
    if (filteredTasks.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-state-container">
                <div class="empty-state-icon">🎯</div>
                <h3>All clear!</h3>
                <p>You don't have any tasks right now. Ready to start something new?</p>
                <button class="btn-primary" onclick="openTaskModal()">Create Your First Task</button>
            </div>
        `;
        return;
    }
    
    tasksList.innerHTML = filteredTasks.map(task => createTaskCard(task)).join('');
    
    // Add drag and drop listeners
    setupDragAndDrop();
    
    // Animate task cards
    animateTaskCards();
}

function createTaskCard(task) {
    const priorityColors = {
        high: 'var(--danger)',
        medium: 'var(--warning)', 
        low: 'var(--success)'
    };
    
    const tagColors = {
        work: '#208084',
        personal: '#8b5cf6',
        health: '#10b981',
        learning: '#f59e0b'
    };
    
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = task.date && task.date < today && !task.completed;
    const formattedDate = task.date ? formatDateRelative(task.date) : 'No date';
    
    return `
        <div class="task-card priority-${task.priority} ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}"
             data-task-id="${task.id}"
             draggable="true">
            <div class="task-header">
                <div class="task-checkbox-wrapper">
                    <input type="checkbox" 
                           class="task-checkbox" 
                           ${task.completed ? 'checked' : ''} 
                           onchange="toggleTask('${task.id}', ${task.completed})">
                </div>
                <div class="task-content">
                    <h4 class="task-title ${task.completed ? 'completed-title' : ''}">${escapeHtml(task.title)}</h4>
                    <div class="task-meta">
                        ${isOverdue ? '<span class="overdue-badge">⚠️ Overdue</span>' : ''}
                        ${task.tag ? `<span class="task-tag" style="background: ${tagColors[task.tag] || 'var(--accent)'}20; color: ${tagColors[task.tag] || 'var(--accent)'}">${task.tag}</span>` : ''}
                        <span class="task-date ${isOverdue ? 'overdue-date' : ''}">
                            <i class="far fa-calendar"></i> ${formattedDate}
                        </span>
                        <span class="task-priority-indicator" style="color: ${priorityColors[task.priority]}">
                            <i class="fas fa-flag"></i> ${task.priority}
                        </span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="task-action-btn" onclick="editTask('${task.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="task-action-btn" onclick="duplicateTask('${task.id}')" title="Duplicate">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="task-action-btn delete-btn" onclick="deleteTask('${task.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
        </div>
    `;
}

function filterAndSearchTasks(tasks) {
    let filtered = tasks;
    
    // Apply status filter
    if (currentFilter === 'active') {
        filtered = filtered.filter(task => !task.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(task => task.completed);
    } else if (currentFilter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        filtered = filtered.filter(task => task.date === today);
    } else if (currentFilter === 'overdue') {
        const today = new Date();
        filtered = filtered.filter(task => 
            task.date && 
            new Date(task.date) < today && 
            !task.completed
        );
    }
    
    // Apply search query
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(task => 
            task.title.toLowerCase().includes(query) ||
            (task.description && task.description.toLowerCase().includes(query)) ||
            (task.tag && task.tag.toLowerCase().includes(query))
        );
    }
    
    return filtered;
}

function sortTasks(tasks) {
    return tasks.sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];
        
        // Handle date sorting
        if (sortBy === 'date' || sortBy === 'created_at') {
            aValue = aValue ? new Date(aValue) : new Date(0);
            bValue = bValue ? new Date(bValue) : new Date(0);
        }
        
        // Handle priority sorting
        if (sortBy === 'priority') {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            aValue = priorityOrder[aValue] || 0;
            bValue = priorityOrder[bValue] || 0;
        }
        
        if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });
}

// Task CRUD operations
async function addTask(taskData) {
    if (!TaskProApp.currentUser) return;
    
    try {
        const result = await TaskProUtils.safeSupabaseOperation(
            () => supabase
                .from('tasks')
                .insert([{
                    ...taskData,
                    user_id: TaskProApp.currentUser.id,
                    created_at: new Date().toISOString()
                }])
        );
        
        if (result.error) throw result.error;
        
        showToast('Task Created!', 'success');
        await loadTasks();
        return result.data[0];
    } catch (error) {
        console.error('Error adding task:', error);
        TaskProApp.showNotification('Failed to add task', 'error');
        return null;
    }
}

async function updateTask(taskId, taskData) {
    if (!TaskProApp.currentUser) return;
    
    try {
        const result = await TaskProUtils.safeSupabaseOperation(
            () => supabase
                .from('tasks')
                .update({
                    ...taskData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', taskId)
        );
        
        if (result.error) throw result.error;
        
        TaskProApp.showNotification('Task updated successfully', 'success');
        await loadTasks();
        return result.data[0];
    } catch (error) {
        console.error('Error updating task:', error);
        TaskProApp.showNotification('Failed to update task', 'error');
        return null;
    }
}

async function toggleTask(taskId, currentStatus) {
    try {
        const result = await TaskProUtils.safeSupabaseOperation(
            () => supabase
                .from('tasks')
                .update({
                    completed: !currentStatus,
                    completed_at: !currentStatus ? new Date().toISOString() : null
                })
                .eq('id', taskId)
        );
        
        if (result.error) throw result.error;
        
        // Update cache
        const task = TaskProApp.cache.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !currentStatus;
            task.completed_at = !currentStatus ? new Date().toISOString() : null;
        }
        
        // Update UI immediately for better UX
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.classList.toggle('completed');
            const checkbox = taskElement.querySelector('.task-checkbox');
            if (checkbox) checkbox.checked = !currentStatus;
        }
        
        updateTaskBadge();
    } catch (error) {
        console.error('Error toggling task:', error);
        TaskProApp.showNotification('Failed to update task', 'error');
    }
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        const result = await TaskProUtils.safeSupabaseOperation(
            () => supabase
                .from('tasks')
                .delete()
                .eq('id', taskId)
        );
        
        if (result.error) throw result.error;
        
        showToast('Task Deleted!', 'success');
        
        // Remove from cache
        TaskProApp.cache.tasks = TaskProApp.cache.tasks.filter(t => t.id !== taskId);
        
        // Update UI with animation
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                loadTasks();
            }, 300);
        }
        
        updateTaskBadge();
    } catch (error) {
        console.error('Error deleting task:', error);
        TaskProApp.showNotification('Failed to delete task', 'error');
    }
}

async function duplicateTask(taskId) {
    const originalTask = TaskProApp.cache.tasks.find(t => t.id === taskId);
    if (!originalTask) return;
    
    const duplicatedTask = {
        title: `${originalTask.title} (copy)`,
        description: originalTask.description,
        priority: originalTask.priority,
        tag: originalTask.tag,
        date: originalTask.date,
        completed: false
    };
    
    await addTask(duplicatedTask);
}

// Modal management
function openTaskModal(taskId = null) {
    if (!taskModal) return;
    
    if (taskId) {
        // Edit mode
        const task = TaskProApp.cache.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-date').value = task.date || '';
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-tag').value = task.tag || '';
        
        document.querySelector('#task-modal h3').textContent = 'Edit Task';
    } else {
        // Create mode
        taskForm.reset();
        document.getElementById('task-id').value = '';
        document.getElementById('task-date').value = new Date().toISOString().split('T')[0];
        
        document.querySelector('#task-modal h3').textContent = 'Add New Task';
    }
    
    taskModal.style.display = 'flex';
    document.getElementById('task-title').focus();
}

function closeTaskModal() {
    if (!taskModal) return;
    taskModal.style.display = 'none';
    taskForm.reset();
}

// Filtering and searching
function setTaskFilter(filter) {
    currentFilter = filter;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadTasks();
}

function searchTasks(query) {
    searchQuery = query;
    loadTasks();
}

function setTaskSorting(field, order) {
    sortBy = field;
    sortOrder = order;
    loadTasks();
}

// Drag and drop functionality
function setupDragAndDrop() {
    const taskCards = document.querySelectorAll('.task-card');
    
    taskCards.forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    draggedTask = e.target;
    e.target.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.style.opacity = '';
    draggedTask = null;
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    
    const afterElement = getDragAfterElement(tasksList, e.clientY);
    if (afterElement == null) {
        tasksList.appendChild(draggedTask);
    } else {
        tasksList.insertBefore(draggedTask, afterElement);
    }
    
    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    // Update task order in database
    updateTaskOrder();
    
    return false;
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

async function updateTaskOrder() {
    const taskCards = document.querySelectorAll('.task-card');
    const newOrder = Array.from(taskCards).map(card => card.dataset.taskId);
    
    // Update task order in database (implementation depends on your schema)
    // This is a placeholder for the actual implementation
    console.log('New task order:', newOrder);
}

// UI utilities
function updateTaskBadge() {
    const badge = document.getElementById('badge');
    if (!badge) return;
    
    const activeTasks = TaskProApp.cache.tasks.filter(task => !task.completed).length;
    
    if (activeTasks > 0) {
        badge.textContent = activeTasks;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

function animateTaskCards() {
    const cards = document.querySelectorAll('.task-card');
    cards.forEach((card, index) => {
        card.style.animation = `fadeInUp 0.3s ease ${index * 0.1}s both`;
    });
}

function formatDateRelative(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    if (dateStr === today.toISOString().split('T')[0]) {
        return 'Today';
    } else if (dateStr === tomorrow.toISOString().split('T')[0]) {
        return 'Tomorrow';
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
function setupTaskEventListeners() {
    // Task form submission
    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const taskId = document.getElementById('task-id').value;
            const taskData = {
                title: document.getElementById('task-title').value.trim(),
                description: document.getElementById('task-description').value.trim(),
                date: document.getElementById('task-date').value,
                priority: document.getElementById('task-priority').value,
                tag: document.getElementById('task-tag').value.trim()
            };
            
            if (!taskData.title) {
                TaskProApp.showNotification('Please enter a task title', 'warning');
                return;
            }
            
            if (taskId) {
                await updateTask(taskId, taskData);
            } else {
                await addTask(taskData);
            }
            
            closeTaskModal();
        });
    }
    
    // Quick add task input
    if (taskInput) {
        taskInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                await addTask({
                    title: e.target.value.trim(),
                    priority: 'medium',
                    date: new Date().toISOString().split('T')[0]
                });
                e.target.value = '';
            }
        });
    }
    
    // Search input
    const searchInput = document.getElementById('task-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTasks(e.target.value);
        });
    }
    
    // Sort dropdowns
    const sortSelect = document.getElementById('task-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            const [field, order] = e.target.value.split('-');
            setTaskSorting(field, order);
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'n' && TaskProApp.currentSection === 'tasks') {
            e.preventDefault();
            openTaskModal();
        }
    });
}

// Export functions for global access
window.loadTasks = loadTasks;
window.openTaskModal = openTaskModal;
window.closeTaskModal = closeTaskModal;
window.editTask = openTaskModal;
window.deleteTask = deleteTask;
window.duplicateTask = duplicateTask;
window.toggleTask = toggleTask;
window.setTaskFilter = setTaskFilter;
window.filterTasks = filterTasks;
window.searchTasks = searchTasks;

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
    
    .task-card {
        cursor: move;
        transition: all 0.2s ease;
    }
    
    .task-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }
    
    .task-card.completed {
        opacity: 0.7;
    }
    
    .task-card.completed .task-title {
        text-decoration: line-through;
        color: var(--text-muted);
    }
    
    .task-card.overdue {
        border-left-color: var(--danger);
        background: rgba(239, 68, 68, 0.05);
    }
    
    .task-checkbox {
        width: 20px;
        height: 20px;
        border: 2px solid var(--border);
        border-radius: 4px;
        cursor: pointer;
        position: relative;
        transition: all 0.2s ease;
    }
    
    .task-checkbox:checked {
        background: var(--accent);
        border-color: var(--accent);
    }
    
    .task-checkbox:checked::after {
        content: '✓';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 12px;
    }
    
    .task-tag {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .task-date {
        font-size: 12px;
        color: var(--text-muted);
    }
    
    .task-date.overdue-date {
        color: var(--danger);
        font-weight: 600;
    }
    
    .task-priority-indicator {
        font-size: 12px;
        font-weight: 600;
    }
    
    .task-actions {
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.2s ease;
    }
    
    .task-card:hover .task-actions {
        opacity: 1;
    }
    
    .task-action-btn {
        background: none;
        border: none;
        color: var(--text-muted);
        padding: 4px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .task-action-btn:hover {
        background: var(--bg-hover);
        color: var(--text-main);
    }
    
    .task-action-btn.delete-btn:hover {
        background: rgba(239, 68, 68, 0.1);
        color: var(--danger);
    }
    
    .task-description {
        margin-top: 8px;
        padding: 8px 0;
        font-size: 13px;
        color: var(--text-muted);
        border-top: 1px solid var(--border);
    }
`;
document.head.appendChild(style);