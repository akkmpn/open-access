import { supabase } from '../../supabase-config.js';

export async function init() {
    const habitList = document.getElementById('habit-list');
    const habitInput = document.getElementById('habit-input');
    const addHabitBtn = document.getElementById('add-habit-btn');
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Fetch and Render Habits
    const renderHabits = async () => {
        const { data: habits, error } = await supabase
            .from('habits')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return console.error(error);

        habitList.innerHTML = habits.map(habit => {
            // Check if it was already completed today
            const lastDate = habit.last_completed ? new Date(habit.last_completed).toDateString() : null;
            const isDoneToday = lastDate === new Date().toDateString();

            return `
                <div class="habit-card">
                    <div class="habit-info">
                        <h3>${habit.name}</h3>
                        <p>🔥 Streak: ${habit.streak} days</p>
                    </div>
                    <button 
                        class="${isDoneToday ? 'btn-done' : 'btn-active'}" 
                        onclick="completeHabit('${habit.id}', ${habit.streak}, ${isDoneToday})"
                        ${isDoneToday ? 'disabled' : ''}>
                        ${isDoneToday ? 'Completed' : 'Complete Today'}
                    </button>
                </div>
            `;
        }).join('');
    };

    // 2. Add New Habit
    addHabitBtn.onclick = async () => {
        const name = habitInput.value.trim();
        if (!name) return;

        await supabase.from('habits').insert([{ name, user_id: user.id, streak: 0 }]);
        habitInput.value = '';
        renderHabits();
    };

    // 3. Logic to Increment Streak
    window.completeHabit = async (id, currentStreak, isDoneToday) => {
        if (isDoneToday) return;

        await supabase.from('habits')
            .update({ 
                streak: currentStreak + 1, 
                last_completed: new Date().toISOString() 
            })
            .eq('id', id);
        
        renderHabits();
    };

    renderHabits();
}