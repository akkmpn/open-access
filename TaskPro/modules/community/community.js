// ===== COMMUNITY MODULE =====
// Chat and leaderboard with Supabase v2 Realtime API

// Wrap in IIFE to avoid global scope pollution
(() => {
    // UI Elements
    const chatBox = document.getElementById('chat-box');
    const chatForm = document.getElementById('chat-form');

    // Subscribe to new messages using Supabase v2 Realtime API
    const chatChannel = supabase.channel('public:chat_messages')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'chat_messages' }, 
            (payload) => {
                appendMessage(payload.new);
            }
        )
        .subscribe();

    async function loadChatHistory() {
        try {
            const { data: messages } = await supabase
                .from('chat_messages')
                .select('*')
                .order('created_at', { ascending: true })
                .limit(50);
            
            messages.forEach(msg => appendMessage(msg));
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }

    function appendMessage(msg) {
        if (!chatBox) return;
        
        const div = document.createElement('div');
        div.className = `message ${msg.user_id === TaskProApp.currentUser?.id ? 'mine' : ''}`;
        div.innerHTML = `
            <span class="msg-user">${msg.username}</span>
            <p class="msg-text">${msg.message}</p>
        `;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    if (chatForm) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            
            if (!input || !input.value.trim()) return;
            
            try {
                const user = TaskProApp.currentUser;
                if (!user) {
                    TaskProApp.showNotification('Please login to send messages', 'warning');
                    return;
                }

                await supabase.from('chat_messages').insert([{
                    user_id: user.id,
                    username: user.email.split('@')[0],
                    message: input.value.trim()
                }]);
                
                input.value = '';
            } catch (error) {
                console.error('Error sending message:', error);
                TaskProApp.showNotification('Failed to send message', 'error');
            }
        });
    }

    // Leaderboard Logic
    async function loadLeaderboard() {
        try {
            const { data: scores } = await supabase
                .from('leaderboard')
                .select('*')
                .order('score', { ascending: false })
                .limit(10);

            const list = document.getElementById('leaderboard-list');
            if (!list) return;
            
            list.innerHTML = scores.map((entry, index) => `
                <div class="leaderboard-item">
                    <span class="rank">#${index + 1}</span>
                    <span class="user-name">${entry.username}</span>
                    <span class="user-score">${entry.score} pts</span>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        }
    }

    // Initialize community module
    async function initCommunity() {
        if (!TaskProApp.currentUser) return;
        
        await loadChatHistory();
        await loadLeaderboard();
    }

    // Export functions for global access
    window.initCommunity = initCommunity;
    window.loadLeaderboard = loadLeaderboard;

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCommunity);
    } else {
        initCommunity();
    }

})();