// 1. Chat Logic
const chatBox = document.getElementById('chat-box');
const chatForm = document.getElementById('chat-form');

// Subscribe to new messages (Realtime)
const chatSubscription = supabase
    .from('chat_messages')
    .on('INSERT', payload => {
        appendMessage(payload.new);
    })
    .subscribe();

async function loadChatHistory() {
    const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);
    
    messages.forEach(msg => appendMessage(msg));
}

function appendMessage(msg) {
    const div = document.createElement('div');
    div.className = `message ${msg.user_id === currentUser.id ? 'mine' : ''}`;
    div.innerHTML = `
        <span class="msg-user">${msg.username}</span>
        <p class="msg-text">${msg.message}</p>
    `;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const user = (await supabase.auth.getUser()).data.user;

    await supabase.from('chat_messages').insert([{
        user_id: user.id,
        username: user.email.split('@')[0],
        message: input.value
    }]);
    input.value = '';
});

// 2. Leaderboard Logic
async function loadLeaderboard() {
    const { data: scores } = await supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);

    const list = document.getElementById('leaderboard-list');
    list.innerHTML = scores.map((entry, index) => `
        <div class="leaderboard-item">
            <span class="rank">#${index + 1}</span>
            <span class="user-name">${entry.username}</span>
            <span class="user-score">${entry.score} pts</span>
        </div>
    `).join('');
}

// Initial Load
loadChatHistory();
loadLeaderboard();