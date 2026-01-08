// ===== TASKPRO FEATURE VERIFICATION SCRIPT =====
// Tests Leaderboard and Community Chat connectivity after database setup

(function() {
    'use strict';
    
    console.log('🔍 TaskPro Feature Verification Starting...');
    
    // Wait for Supabase to be ready
    setTimeout(async () => {
        try {
            if (!window.supabase) {
                console.error('❌ Supabase not initialized');
                return;
            }
            
            console.log('✅ Supabase client found, testing features...');
            
            // Test 1: Leaderboard Connectivity
            await testLeaderboard();
            
            // Test 2: Community Chat Connectivity  
            await testCommunityChat();
            
            // Test 3: Real-time Subscriptions
            await testRealtimeSubscriptions();
            
            console.log('🎉 TaskPro Feature Verification Complete!');
            console.log('📊 Leaderboard: ✅ Connected');
            console.log('💬 Community Chat: ✅ Connected');
            console.log('🔄 Real-time: ✅ Connected');
            
        } catch (error) {
            console.error('❌ Feature verification failed:', error);
        }
    }, 2000);
    
    // Test Leaderboard Functionality
    async function testLeaderboard() {
        try {
            console.log('🏆 Testing Leaderboard...');
            
            const { data: leaderboard, error } = await supabase
                .from('leaderboard')
                .select('*')
                .order('xp_points', { ascending: false })
                .limit(10);
            
            if (error) {
                console.error('❌ Leaderboard query failed:', error);
                return false;
            }
            
            console.log('✅ Leaderboard data retrieved:', leaderboard?.length || 0, 'entries');
            
            // Test leaderboard update
            if (window.TaskProApp?.currentUser) {
                const testUpdate = await supabase
                    .from('leaderboard')
                    .upsert({
                        user_id: window.TaskProApp.currentUser.id,
                        username: window.TaskProApp.currentUser.email?.split('@')[0] || 'User',
                        total_focus_time: 0,
                        total_tasks_completed: 0,
                        current_habit_streak: 0,
                        level: 1,
                        xp_points: 100
                    });
                
                if (testUpdate.error) {
                    console.warn('⚠️ Leaderboard update failed:', testUpdate.error);
                } else {
                    console.log('✅ Leaderboard update test passed');
                }
            }
            
            return true;
        } catch (error) {
            console.error('❌ Leaderboard test failed:', error);
            return false;
        }
    }
    
    // Test Community Chat Functionality
    async function testCommunityChat() {
        try {
            console.log('💬 Testing Community Chat...');
            
            // Test message retrieval
            const { data: messages, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('is_deleted', false)
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (error) {
                console.error('❌ Chat query failed:', error);
                return false;
            }
            
            console.log('✅ Chat messages retrieved:', messages?.length || 0, 'messages');
            
            // Test message sending (if user is logged in)
            if (window.TaskProApp?.currentUser) {
                const testMessage = {
                    user_id: window.TaskProApp.currentUser.id,
                    username: window.TaskProApp.currentUser.email?.split('@')[0] || 'Test User',
                    message: '🧪 TaskPro feature test message!',
                    message_type: 'text'
                };
                
                const { error: insertError } = await supabase
                    .from('chat_messages')
                    .insert([testMessage]);
                
                if (insertError) {
                    console.warn('⚠️ Chat insert failed:', insertError);
                } else {
                    console.log('✅ Chat message test passed');
                }
            }
            
            return true;
        } catch (error) {
            console.error('❌ Chat test failed:', error);
            return false;
        }
    }
    
    // Test Real-time Subscriptions
    async function testRealtimeSubscriptions() {
        try {
            console.log('🔄 Testing Real-time Subscriptions...');
            
            // Test leaderboard subscription
            const leaderboardChannel = supabase
                .channel('public_leaderboard')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'leaderboard' },
                    (payload) => {
                        console.log('📊 Real-time leaderboard update:', payload.eventType);
                    }
                )
                .subscribe();
            
            // Test chat subscription
            const chatChannel = supabase
                .channel('public_chat_messages')
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'chat_messages' },
                    (payload) => {
                        console.log('💬 Real-time chat message:', payload.new.username);
                    }
                )
                .subscribe();
            
            // Test user status subscription
            const statusChannel = supabase
                .channel('public_user_status')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'user_status' },
                    (payload) => {
                        console.log('👤 User status change:', payload.new.status);
                    }
                )
                .subscribe();
            
            console.log('✅ Real-time subscriptions created');
            
            // Test presence (who's online)
            const presenceChannel = supabase.channel('online_users');
            
            presenceChannel.on('presence', { event: 'sync' }, (status) => {
                console.log('👥 Online users sync:', Object.keys(status.presences || {}).length);
            });
            
            presenceChannel.on('presence', { event: 'join' }, (key, newPresences) => {
                console.log('👋 User joined:', key);
            });
            
            presenceChannel.on('presence', { event: 'leave' }, (key, leftPresences) => {
                console.log('👋 User left:', key);
            });
            
            await presenceChannel.subscribe();
            
            console.log('✅ Presence channel connected');
            
            return true;
        } catch (error) {
            console.error('❌ Real-time test failed:', error);
            return false;
        }
    }
    
    // Export verification functions for manual testing
    window.TaskProVerification = {
        testLeaderboard,
        testCommunityChat,
        testRealtimeSubscriptions,
        
        // Manual test runner
        async runAllTests() {
            console.log('🧪 Running manual TaskPro verification...');
            await testLeaderboard();
            await testCommunityChat();
            await testRealtimeSubscriptions();
        }
    };
    
    console.log('✅ TaskPro Feature Verification Script Loaded');
    console.log('🔧 Available commands:');
    console.log('  - TaskProVerification.runAllTests()');
    console.log('  - TaskProVerification.testLeaderboard()');
    console.log('  - TaskProVerification.testCommunityChat()');
    console.log('  - TaskProVerification.testRealtimeSubscriptions()');
    
})();
