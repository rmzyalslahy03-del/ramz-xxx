// ================== تكوين Supabase ==================
const SUPABASE_URL = "https://zlkpoghjbqtnhzhmmdbw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_7evDsA5aEgPMsRBTFjntrg_XZQFmNLw";

// تجنب التصريح المزدوج: نستخدم var أو نتحقق من window.supabaseClient
if (typeof window.supabaseClient === 'undefined') {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
// لا نستخدم const أو let هنا لتجنب إعادة التصريح
var supabase = window.supabaseClient;

// ================== دوال مساعدة ==================
function showToast(msg, isError = false) {
    const toast = document.getElementById('globalToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.backgroundColor = isError ? '#3a1e1e' : '#1f1f1f';
    toast.style.borderLeftColor = isError ? '#ff4444' : '#fe2c55';
    setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

function formatNumber(num) {
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

// ================== دوال تهيئة البيانات ==================
async function loadFromSupabase() {
    try {
        let settings = null;
        const { data: settingsData, error: settingsErr } = await supabase
            .from('settings')
            .select('data')
            .eq('id', 'main')
            .single();
        if (!settingsErr && settingsData) settings = settingsData.data;

        const { data: posts, error: postsErr } = await supabase
            .from('posts')
            .select('*')
            .eq('hidden', false)
            .order('created_at', { ascending: false });
        if (postsErr) throw postsErr;

        const { data: users, error: usersErr } = await supabase
            .from('users')
            .select('*');
        if (usersErr) throw usersErr;

        localStorage.setItem('posts', JSON.stringify(posts));
        localStorage.setItem('users', JSON.stringify(users));
        if (settings) localStorage.setItem('app_settings', JSON.stringify(settings));

        console.log("✅ تم تحميل البيانات من Supabase");
        return { posts, users, settings };
    } catch (err) {
        console.error("خطأ في loadFromSupabase:", err);
        showToast("⚠️ فشل تحميل البيانات من الخادم", true);
        return null;
    }
}

async function saveToSupabase() {
    try {
        const posts = JSON.parse(localStorage.getItem('posts')) || [];
        for (const post of posts) {
            await supabase.from('posts').upsert(post, { onConflict: 'id' });
        }
        const users = JSON.parse(localStorage.getItem('users')) || {};
        const usersArray = Object.values(users);
        for (const user of usersArray) {
            if (user.id) await supabase.from('users').upsert(user, { onConflict: 'id' });
        }
        console.log("✅ تم حفظ البيانات إلى Supabase");
        showToast("تم حفظ التغييرات في السحابة", false);
        return true;
    } catch (err) {
        console.error("خطأ في saveToSupabase:", err);
        showToast("❌ فشل حفظ البيانات", true);
        return false;
    }
}

async function syncLocalUsers() {
    const localUsers = JSON.parse(localStorage.getItem('users')) || {};
    const localUsersArray = Object.values(localUsers);
    for (const user of localUsersArray) {
        if (!user.id) continue;
        const { data: existing } = await supabase.from('users').select('id').eq('id', user.id).single();
        if (!existing) await supabase.from('users').insert(user);
        else await supabase.from('users').update(user).eq('id', user.id);
    }
    const { data: remoteUsers } = await supabase.from('users').select('*');
    if (remoteUsers) {
        const usersObj = {};
        remoteUsers.forEach(u => { usersObj[u.username] = u; });
        localStorage.setItem('users', JSON.stringify(usersObj));
    }
    console.log("✅ تمت مزامنة المستخدمين");
}

async function seedSupabase() {
    showToast("🔄 جاري تهيئة قاعدة البيانات...", false);
    const demoUser = {
        id: "00000000-0000-0000-0000-000000000001",
        username: "سارة أحمد",
        email: "sara@ramz-x.com",
        avatar: "https://randomuser.me/api/portraits/women/68.jpg",
        bio: "كاتبة ومحررة 📝",
        unique_name: "sara_ahmed"
    };
    const { data: existingUser } = await supabase.from('users').select('id').eq('id', demoUser.id).single();
    if (!existingUser) await supabase.from('users').insert(demoUser);

    const samplePosts = [
        {
            id: 1,
            title: "جمال الطبيعة في الخريف",
            content: "أوراق ذهبية وهواء عليل...",
            image: "https://picsum.photos/id/104/800/600",
            author_id: demoUser.id,
            author_name: demoUser.username,
            likes_count: 124,
            comments_count: 18,
            views_count: 3400,
            reposts_count: 5,
            favorites_count: 12,
            hashtag: "طبيعة_خريف",
            category: "طبيعة",
            type: "image",
            hidden: false,
            created_at: new Date().toISOString()
        },
        {
            id: 2,
            title: "نصائح لكتابة مقالات احترافية",
            content: "الكتابة موهبة تحتاج تمرين...",
            image: "https://picsum.photos/id/0/800/600",
            author_id: demoUser.id,
            author_name: demoUser.username,
            likes_count: 89,
            comments_count: 7,
            views_count: 1200,
            reposts_count: 2,
            favorites_count: 5,
            hashtag: "كتابة_إبداعية",
            category: "تعليم",
            type: "article",
            hidden: false,
            created_at: new Date().toISOString()
        }
    ];
    for (const post of samplePosts) {
        const { data: existingPost } = await supabase.from('posts').select('id').eq('id', post.id).single();
        if (!existingPost) await supabase.from('posts').insert(post);
    }
    showToast("✅ تم تهيئة قاعدة البيانات", false);
}

async function initDB() {
    try {
        const result = await loadFromSupabase();
        if (!result) {
            await seedSupabase();
            await loadFromSupabase();
        }
        await syncLocalUsers();
        console.log("✅ تمت تهيئة قاعدة البيانات");
        return true;
    } catch (err) {
        console.error("فشل initDB:", err);
        showToast("⚠️ فشل الاتصال بقاعدة البيانات. الرجاء تحديث الصفحة.", true);
        return false;
    }
}

// ================== إدارة الجلسة والمستخدم ==================
async function checkSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error("خطأ في الجلسة:", error);
        return null;
    }
    if (session) {
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
        if (profileError && profileError.code !== 'PGRST116') console.error(profileError);
        const currentUser = profile || {
            id: session.user.id,
            username: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
            email: session.user.email,
            avatar: session.user.user_metadata?.avatar_url || 'https://randomuser.me/api/portraits/lego/1.jpg',
            bio: ''
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        return currentUser;
    } else {
        window.location.href = 'auth.html';
        return null;
    }
}

async function saveUserToDB(user) {
    if (!user) return;
    const { data: existing } = await supabase.from('users').select('id').eq('id', user.id).single();
    if (!existing) {
        const username = user.user_metadata?.full_name || user.email.split('@')[0];
        const uniqueName = user.email.split('@')[0] + '_' + Math.floor(Math.random() * 1000);
        await supabase.from('users').insert({
            id: user.id,
            username: username,
            full_name: user.user_metadata?.full_name || '',
            bio: '',
            avatar: user.user_metadata?.avatar_url || 'https://randomuser.me/api/portraits/lego/1.jpg',
            unique_name: uniqueName
        });
    }
    localStorage.setItem('currentUser', JSON.stringify({
        id: user.id,
        username: user.user_metadata?.full_name || user.email.split('@')[0],
        email: user.email,
        avatar: user.user_metadata?.avatar_url || 'https://randomuser.me/api/portraits/lego/1.jpg'
    }));
}

// ================== دوال التفاعل ==================
async function toggleLike(postId, btnElement) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) { showToast('يجب تسجيل الدخول', true); return; }
    const isLiked = btnElement.classList.contains('liked');
    if (!isLiked) {
        await supabase.from('likes').insert({ user_id: currentUser.id, post_id: postId });
        await supabase.rpc('increment_likes', { row_id: postId });
        btnElement.classList.add('liked');
        const countSpan = btnElement.querySelector('.count');
        let current = parseInt(countSpan.innerText);
        countSpan.innerText = formatNumber(current + 1);
        showToast('👍 تم الإعجاب');
    } else {
        await supabase.from('likes').delete().eq('user_id', currentUser.id).eq('post_id', postId);
        await supabase.rpc('decrement_likes', { row_id: postId });
        btnElement.classList.remove('liked');
        const countSpan = btnElement.querySelector('.count');
        let current = parseInt(countSpan.innerText);
        countSpan.innerText = formatNumber(current - 1);
        showToast('👎 تم إلغاء الإعجاب');
    }
}

async function toggleFavorite(postId, btnElement) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) { showToast('يجب تسجيل الدخول', true); return; }
    const isFav = btnElement.classList.contains('favorited');
    if (!isFav) {
        await supabase.from('favorites').insert({ user_id: currentUser.id, post_id: postId });
        await supabase.rpc('increment_favorites', { row_id: postId });
        btnElement.classList.add('favorited');
        btnElement.querySelector('i').className = 'fas fa-star';
        const countSpan = btnElement.querySelector('span');
        let current = parseInt(countSpan.innerText);
        countSpan.innerText = formatNumber(current + 1);
        showToast('⭐ أضيف إلى المفضلة');
    } else {
        await supabase.from('favorites').delete().eq('user_id', currentUser.id).eq('post_id', postId);
        await supabase.rpc('decrement_favorites', { row_id: postId });
        btnElement.classList.remove('favorited');
        btnElement.querySelector('i').className = 'far fa-star';
        const countSpan = btnElement.querySelector('span');
        let current = parseInt(countSpan.innerText);
        countSpan.innerText = formatNumber(current - 1);
        showToast('⭐ تمت إزالة من المفضلة');
    }
}

async function toggleRepost(postId, btnElement) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) { showToast('يجب تسجيل الدخول', true); return; }
    const isReposted = btnElement.classList.contains('reposted');
    if (!isReposted) {
        const { data: original } = await supabase.from('posts').select('*').eq('id', postId).single();
        const newPost = {
            title: original.title,
            content: original.content,
            image: original.image,
            author_id: currentUser.id,
            author_name: currentUser.username,
            likes_count: 0,
            comments_count: 0,
            views_count: 0,
            reposts_count: 0,
            favorites_count: 0,
            edit_count: 0,
            hashtag: original.hashtag,
            category: original.category,
            type: original.type,
            hidden: false,
            created_at: new Date()
        };
        await supabase.from('posts').insert(newPost);
        await supabase.rpc('increment_reposts', { row_id: postId });
        btnElement.classList.add('reposted');
        const countSpan = btnElement.querySelector('.repost-count');
        let current = parseInt(countSpan.innerText);
        countSpan.innerText = formatNumber(current + 1);
        showToast('🔁 تمت إعادة النشر');
    } else {
        await supabase.rpc('decrement_reposts', { row_id: postId });
        btnElement.classList.remove('reposted');
        const countSpan = btnElement.querySelector('.repost-count');
        let current = parseInt(countSpan.innerText);
        countSpan.innerText = formatNumber(current - 1);
        showToast('↩️ تم إلغاء إعادة النشر');
    }
}

async function toggleFollow(authorId, btnElement) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) { showToast('يجب تسجيل الدخول', true); return; }
    const isFollowing = btnElement.innerText === 'متابَع';
    if (!isFollowing) {
        await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: authorId });
        btnElement.innerText = 'متابَع';
        showToast('✅ تمت متابعة المستخدم');
    } else {
        await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', authorId);
        btnElement.innerText = 'متابعة';
        showToast('✅ تم إلغاء المتابعة');
    }
}

// ================== جلب التغذية والتفاعلات ==================
async function fetchFeed() {
    const { data: posts, error } = await supabase
        .from('posts')
        .select(`
            *,
            users:author_id (id, username, avatar)
        `)
        .eq('hidden', false)
        .order('created_at', { ascending: false });
    if (error) {
        showToast(error.message, true);
        return [];
    }
    return posts.map(p => ({
        id: p.id,
        title: p.title,
        content: p.content,
        image: p.image,
        author_id: p.author_id,
        author_name: p.users?.username || p.author_name,
        author_avatar: p.users?.avatar,
        created_at: p.created_at,
        likes_count: p.likes_count,
        comments_count: p.comments_count,
        views_count: p.views_count,
        reposts_count: p.reposts_count,
        favorites_count: p.favorites_count,
        hashtag: p.hashtag,
        category: p.category,
        type: p.type
    }));
}

async function getUserInteractions(postIds) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return { likes: {}, favorites: {}, reposts: {}, follows: {} };
    const { data: likes } = await supabase.from('likes').select('post_id').eq('user_id', currentUser.id).in('post_id', postIds);
    const { data: favs } = await supabase.from('favorites').select('post_id').eq('user_id', currentUser.id).in('post_id', postIds);
    const { data: reps } = await supabase.from('reposts').select('post_id').eq('user_id', currentUser.id).in('post_id', postIds);
    const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', currentUser.id);
    const likesMap = {}; likes?.forEach(l => likesMap[l.post_id] = true);
    const favsMap = {}; favs?.forEach(f => favsMap[f.post_id] = true);
    const repsMap = {}; reps?.forEach(r => repsMap[r.post_id] = true);
    const followsSet = new Set(follows?.map(f => f.following_id) || []);
    return { likes: likesMap, favorites: favsMap, reposts: repsMap, follows: followsSet };
}

async function createPost(postData) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) { showToast('يجب تسجيل الدخول', true); return false; }
    const newPost = {
        title: postData.title,
        content: postData.content,
        image: postData.image || "https://picsum.photos/id/1/1200/800",
        author_id: currentUser.id,
        author_name: currentUser.username,
        likes_count: 0,
        comments_count: 0,
        views_count: 0,
        reposts_count: 0,
        favorites_count: 0,
        edit_count: 0,
        hashtag: postData.hashtag,
        category: postData.category,
        type: postData.type || 'article',
        hidden: false,
        created_at: new Date().toISOString()
    };
    const { error } = await supabase.from('posts').insert(newPost);
    if (error) { showToast(error.message, true); return false; }
    showToast("🎉 تم نشر المنشور بنجاح!");
    return true;
}

// ================== التعليقات ==================
async function fetchComments(postId) {
    const { data, error } = await supabase
        .from('comments')
        .select('*, users:user_id (username, avatar)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
    if (error) {
        showToast(error.message, true);
        return [];
    }
    return data;
}

async function addComment(postId, text) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) { showToast('يجب تسجيل الدخول', true); return false; }
    const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: currentUser.id,
        text: text
    });
    if (error) {
        showToast(error.message, true);
        return false;
    }
    await supabase.rpc('increment_comments_count', { row_id: postId });
    showToast('💬 تم إضافة التعليق');
    return true;
                                                      }
