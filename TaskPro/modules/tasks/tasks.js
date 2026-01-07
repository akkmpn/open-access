// UI Elements
const tasksList = document.getElementById('tasks-list');
const taskForm = document.getElementById('task-form');
const taskModal = document.getElementById('task-modal'); // Ensure this ID exists in index.html

// 1. Fetch and Display Tasks
async function loadTasks() {
    // currentUser is defined globally in app.js
    if (!currentUser) return;

    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', currentUser.id) // ONLY fetch tasks for the logged-in user
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching tasks:', error);
        return;
    }
    renderTasks(tasks);
}

// 2. Render HTML
function renderTasks(tasks) {
    if (tasks.length === 0) {
        tasksList.innerHTML = '<p class="empty-msg">No tasks yet. Click the + button to start!</p>';
        return;
    }

    tasksList.innerHTML = tasks.map(task => `
        <div class="task-card priority-${task.priority} ${task.completed ? 'is-completed' : ''}">
            <div class="task-info">
                <input type="checkbox" ${task.completed ? 'checked' : ''} 
                    onclick="toggleTask('${task.id}', ${task.completed})">
                <div>
                    <h4 style="${task.completed ? 'text-decoration: line-through; color: gray;' : ''}">${task.title}</h4>
                    <small>${task.date || 'No date'} | ${task.tag || 'General'}</small>
                </div>
            </div>
            <div class="task-actions">
                <button class="btn-icon" onclick="prepareEdit('${task.id}')">✏️</button>
                <button class="btn-icon" onclick="deleteTask('${task.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

// 3. Add/Update Logic
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('task-id').value;
    const taskData = {
        title: document.getElementById('task-title').value,
        date: document.getElementById('task-date').value,
        priority: document.getElementById('task-priority').value,
        tag: document.getElementById('task-tag').value,
        user_id: currentUser.id
    };

    if (id) {
        await supabase.from('tasks').update(taskData).eq('id', id);
    } else {
        await supabase.from('tasks').insert([taskData]);
    }

    closeTaskModal();
    loadTasks();
});

// 4. Modal Helpers
function openTaskModal() {
    taskForm.reset();
    document.getElementById('task-id').value = ''; // Clear hidden ID
    taskModal.style.display = 'flex';
}

function closeTaskModal() {
    taskModal.style.display = 'none';
}

// 5. Edit Preparation
async function prepareEdit(id) {
    const { data: task } = await supabase.from('tasks').select('*').eq('id', id).single();
    
    if (task) {
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-date').value = task.date;
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-tag').value = task.tag;
        
        taskModal.style.display = 'flex';
    }
}

// 6. Delete & Toggle Status
async function toggleTask(id, currentStatus) {
    await supabase.from('tasks').update({ completed: !currentStatus }).eq('id', id);
    loadTasks();
}

async function deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        await supabase.from('tasks').delete().eq('id', id);
        loadTasks();
    }
}