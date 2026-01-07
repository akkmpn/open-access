// Initialize UI Elements
const tasksList = document.getElementById('tasks-list');
const taskForm = document.getElementById('task-form');
const taskModal = document.getElementById('task-modal');

// 1. Fetch and Display Tasks (Triggered by app.js)
async function loadTasks() {
    if (!currentUser) return;

    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', currentUser.id) // Security: Only show current user's tasks
        .order('created_at', { ascending: false });

    if (error) return console.error('Fetch Error:', error);
    renderTasks(tasks);
}

// 2. Render Tasks to HTML
function renderTasks(tasks) {
    if (tasks.length === 0) {
        tasksList.innerHTML = `<p class="empty-state">No tasks found. Add one to get started!</p>`;
        return;
    }

    tasksList.innerHTML = tasks.map(task => `
        <div class="task-card priority-${task.priority} ${task.completed ? 'is-completed' : ''}">
            <div class="task-info">
                <input type="checkbox" ${task.completed ? 'checked' : ''} 
                    onclick="toggleTask('${task.id}', ${task.completed})">
                <div>
                    <h4 style="${task.completed ? 'text-decoration: line-through' : ''}">${task.title}</h4>
                    <span>${task.date} | ${task.tag || 'No Tag'}</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="btn-edit" onclick="editTask('${task.id}')">Edit</button>
                <button class="btn-delete" onclick="deleteTask('${task.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// 3. Modal Controls
function openTaskModal() {
    taskForm.reset();
    document.getElementById('task-id').value = '';
    document.getElementById('modal-title').innerText = 'New Task';
    taskModal.style.display = 'flex';
}

function closeTaskModal() {
    taskModal.style.display = 'none';
}

// 4. Edit Task Logic
async function editTask(id) {
    const { data: task, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return alert("Could not fetch task details");

    // Fill form with existing data
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-date').value = task.date;
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-tag').value = task.tag;
    
    document.getElementById('modal-title').innerText = 'Edit Task';
    taskModal.style.display = 'flex';
}

// 5. Add or Update Task Submission
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

// 6. Toggle and Delete
async function toggleTask(id, currentStatus) {
    await supabase.from('tasks').update({ completed: !currentStatus }).eq('id', id);
    loadTasks();
}

async function deleteTask(id) {
    if (confirm('Delete this task forever?')) {
        await supabase.from('tasks').delete().eq('id', id);
        loadTasks();
    }
}