import { supabase } from '../../supabase-config.js';

export async function init() {
    const taskList = document.getElementById('task-list');
    const taskInput = document.getElementById('task-input');
    const addBtn = document.getElementById('add-task-btn');

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        console.error("No active user session found");
        return;
    }

    // 2. Function to Render Tasks
    const renderTasks = async () => {
        const { data: tasks, error } = await supabase
            .from('tasks')
            // FIX: We fetch 'completed' from DB but tell JS to call it 'is_completed'
            .select('id, title, user_id, created_at, is_completed:completed') 
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Fetch error:", error.message);
            return;
        }

        if (!taskList) return;

        taskList.innerHTML = tasks.map(task => `
            <div class="task-item ${task.is_completed ? 'completed' : ''}">
                <input type="checkbox" ${task.is_completed ? 'checked' : ''} 
                    onchange="toggleTask('${task.id}', ${task.is_completed})">
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
            // FIX: Changed column name to 'completed'
            .insert([{ title, user_id: user.id, completed: false }]); 

        if (error) {
            console.error("Insert error:", error.message);
        } else {
            taskInput.value = '';
            renderTasks();
        }
    };

    // 4. Expose functions to the window
    window.toggleTask = async (id, currentStatus) => {
        const { error } = await supabase
            .from('tasks')
            // FIX: Changed column name to 'completed'
            .update({ completed: !currentStatus }) 
            .eq('id', id);
        
        if (error) console.error("Update error:", error.message);
        renderTasks();
    };

    window.deleteTask = async (id) => {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);
            
        if (error) console.error("Delete error:", error.message);
        renderTasks();
    };

    renderTasks();
}