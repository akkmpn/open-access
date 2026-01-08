const { data: leaderboard } = await supabase
    .from('habits')
    .select('name, streak, user_id')
    .order('streak', { ascending: false })
    .limit(10);