import { supabase } from '../../supabase-config.js';

export async function init() {
    const taskList = document.getElementById('task-list');
    const taskInput = document.getElementById('task-input');
    const addBtn = document.getElementById('add-task-btn');

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Function to Render Tasks
    const renderTasks = async () => {
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return console.error(error);

        taskList.innerHTML = tasks.map(task => `
            <div class="task-item ${task.is_completed ? 'completed' : ''}">
                <input type="checkbox" ${task.is_completed ? 'checked' : ''} 
                    onclick="toggleTask('${task.id}', ${task.is_completed})">
                <span>${task.title}</span>
                <button onclick="deleteTask('${task.id}')">🗑️</button>
            </div>
        `).join('');
    };

    // 3. Logic to Add Task
    addBtn.onclick = async () => {
        const title = taskInput.value.trim();
        if (!title) return;

        const { error } = await supabase
            .from('tasks')
            .insert([{ title, user_id: user.id }]);

        if (!error) {
            taskInput.value = '';
            renderTasks();
        }
    };

    // 4. Expose functions to the window (so HTML onclick can find them)
    window.toggleTask = async (id, status) => {
        await supabase.from('tasks').update({ is_completed: !status }).eq('id', id);
        renderTasks();
    };

    window.deleteTask = async (id) => {
        await supabase.from('tasks').delete().eq('id', id);
        renderTasks();
    };

    renderTasks();
}