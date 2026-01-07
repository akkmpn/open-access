// Initialize connection (Assuming supabase is defined globally)
const tasksList = document.getElementById('tasks-list');
const taskForm = document.getElementById('task-form');

// 1. Fetch and Display Tasks
async function loadTasks() {
    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return console.error('Error:', error);
    renderTasks(tasks);
}

// 2. Render Tasks to HTML
function renderTasks(tasks) {
    tasksList.innerHTML = tasks.map(task => `
        <div class="task-card priority-${task.priority} ${task.completed ? 'is-completed' : ''}">
            <div class="task-info">
                <input type="checkbox" ${task.completed ? 'checked' : ''} 
                    onclick="toggleTask('${task.id}', ${task.completed})">
                <div>
                    <h4>${task.title}</h4>
                    <span>${task.date} | ${task.tag}</span>
                </div>
            </div>
            <div class="task-actions">
                <button onclick="editTask('${task.id}')">Edit</button>
                <button onclick="deleteTask('${task.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// 3. Add or Update Task
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('task-id').value;
    const taskData = {
        title: document.getElementById('task-title').value,
        date: document.getElementById('task-date').value,
        priority: document.getElementById('task-priority').value,
        tag: document.getElementById('task-tag').value,
        user_id: (await supabase.auth.getUser()).data.user.id
    };

    if (id) {
        await supabase.from('tasks').update(taskData).eq('id', id);
    } else {
        await supabase.from('tasks').insert([taskData]);
    }

    closeTaskModal();
    loadTasks();
});

// 4. Toggle Status
async function toggleTask(id, currentStatus) {
    await supabase.from('tasks').update({ completed: !currentStatus }).eq('id', id);
    loadTasks();
}

// 5. Delete Task
async function deleteTask(id) {
    if (confirm('Delete this task?')) {
        await supabase.from('tasks').delete().eq('id', id);
        loadTasks();
    }
}

// Initial Load
loadTasks();