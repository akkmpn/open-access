const habitsList = document.getElementById('habits-list');
const habitForm = document.getElementById('habit-form');

// 1. Fetch Habits
async function loadHabits() {
    const { data: habits, error } = await supabase
        .from('habits')
        .select('*')
        .order('streak', { ascending: false });

    if (error) return console.error('Error fetching habits:', error);
    renderHabits(habits);
}

// 2. Render Habits
function renderHabits(habits) {
    habitsList.innerHTML = habits.map(habit => `
        <div class="habit-card">
            <div class="habit-details">
                <div class="streak-badge">🔥 ${habit.streak}</div>
                <h4>${habit.name}</h4>
            </div>
            <div class="habit-actions">
                <button class="btn-check" onclick="incrementStreak('${habit.id}', ${habit.streak})">
                    Done Today
                </button>
                <button class="btn-delete" onclick="deleteHabit('${habit.id}')">×</button>
            </div>
        </div>
    `).join('');
}

// 3. Create New Habit
habitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = (await supabase.auth.getUser()).data.user;
    
    const { error } = await supabase.from('habits').insert([{
        name: document.getElementById('habit-name').value,
        user_id: user.id,
        streak: 0
    }]);

    if (!error) {
        closeHabitModal();
        loadHabits();
    }
});

// 4. Increment Streak
async function incrementStreak(id, currentStreak) {
    const { error } = await supabase
        .from('habits')
        .update({ streak: currentStreak + 1 })
        .eq('id', id);

    if (!error) loadHabits();
}

// 5. Delete Habit
async function deleteHabit(id) {
    if (confirm('Stop tracking this habit?')) {
        await supabase.from('habits').delete().eq('id', id);
        loadHabits();
    }
}

// Initial Load
loadHabits();