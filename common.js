// ================== تكوين Supabase ==================
const SUPABASE_URL = "https://zlkpoghjbqtnhzhmmdbw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_7evDsA5aEgPMsRBTFjntrg_XZQFmNLw";

// تجنب التصريح المزدوج
if (typeof window.supabaseClient === 'undefined') {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
const supabase = window.supabaseClient;

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
    if (num === undefined || num === null) return '0';
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

        localStorage.setItem('posts', JSON.stringify(posts || []));
        localStorage.setItem('users', JSON.stringify(users || {}));
        if (settings) localStorage.setItem('app_settings', JSON.stringify(settings));

        console.log("✅ تم تحميل البيانات من Supabase");
        return { posts: posts || [], users: users || [], settings };
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
            const { error } = await supabase
                .from('posts')
                .upsert(post, { onConflict: 'id' });
            if (error) console.error(`خطأ في حفظ المنشور ${post.id}:`, error);
        }

        const users = JSON.parse(localStorage.getItem('users')) || {};
        const usersArray = Object.values(users);
        for (const user of usersArray) {
            if (user.id) {
                const { error } = await supabase
                    .from('users')
                    .upsert(user, { onConflict: 'id' });
                if (error) console.error(`خطأ في حفظ المستخدم ${user.id}:`, error);
            }
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
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .single();
        if (!existing) {
            await supabase.from('users').insert(user);
        } else {
            await supabase.from('users').update(user).eq('id', user.id);
        }
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
        id: "11111111-1111-1111-1111-111111111111",
        username: "سارة أحمد",
        email: "sara@ramz-x.com",
        avatar: "https://randomuser.me/api/portraits/women/68.jpg",
        bio: "كاتبة ومحررة 📝",
        unique_name: "sara_ahmed"
    };
    const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', demoUser.id)
        .single();
    if (!existingUser) {
        await supabase.from('users').insert(demoUser);
    }

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
        const { data: existingPost } = await supabase
            .from('posts')
            .select('id')
            .eq('id', post.id)
            .single();
        if (!existingPost) {
            await supabase.from('posts').insert(post);
        }
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
        if (profileError && profileError.code !== 'PGRST116') {
            console.error(profileError);
        }
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
        // لا توجيه تلقائي هنا، يتم التعامل معه في الصفحات
        return null;
    }
}

async function saveUserToDB(user) {
    if (!user) return;
    const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();
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

// ================== دوال التفاعل مع تحسين الأمان ==================
async function toggleLike(postId, btnElement) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) { showToast('يجب تسجيل الدخول', true); return; }
    if (!postId || !btnElement) { console.error("Invalid parameters to toggleLike"); return; }
    const isLiked = btnElement.classList.contains('liked');
    if (!isLiked) {
        const { error } = await supabase
            .from('likes')
            .insert({ user_id: currentUser.id, post_id: postId });
        if (error) { showToast(error.message, true); return; }
        await supabase.rpc('increment_likes', { row_id: postId });
        btnElement.classList.add('liked');
        const countSpan = btnElement.querySelector('.count');
        if (countSpan) {
            let current = parseInt(countSpan.innerText);
            countSpan.innerText = formatNumber(current + 1);
        }
        showToast('👍 تم الإعجاب');
    } else {
        const { error } = await supabase
            .from('likes')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('post_id', postId);
        if (error) { showToast(error.message, true); return; }
        await supabase.rpc('decrement_likes', { row_id: postId });
        btnElement.classList.remove('liked');
        const countSpan = btnElement.querySelector('.count');
        if (countSpan) {
            let current = parseInt(countSpan.innerText);
            countSpan.innerText = formatNumber(current - 1);
        }
        showToast('👎 تم إلغاء الإعجاب');
    }
}

async function toggleFavorite(postId, btnElement) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) { showToast('يجب تسجيل الدخول', true); return; }
    if (!postId || !btnElement) return;
    const isFav = btnElement.classList.contains('favorited');
    if (!isFav) {
        const { error } = await supabase
            .from('favorites')
            .insert({ user_id: currentUser.id, post_id: postId });
        if (error) { showToast(error.message, true); return; }
        await supabase.rpc('increment_favorites', { row_id: postId });
        btnElement.classList.add('favorited');
        const icon = btnElement.querySelector('i');
        if (icon) icon.className = 'fas fa-star';
        const countSpan = btnElement.querySelector('span');
        if (countSpan) {
            let current = parseInt(countSpan.innerText);
            countSpan.innerText = formatNumber(current + 1);
        }
        showToast('⭐ أضيف إلى المفضلة');
    } else {
        const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('post_id', postId);
        if (error) { showToast(error.message, true); return; }
        await supabase.rpc('decrement_favorites', { row_id: postId });
        btnElement.classList.remove('favorited');
        const icon = btnElement.querySelector('i');
        if (icon) icon.className = 'far fa-star';
        const countSpan = btnElement.querySelector('span');
        if (countSpan) {
            let current = parseInt(countSpan.innerText);
            countSpan.innerText = formatNumber(current - 1);
        }
        showToast('⭐ تمت إزالة من المفضلة');
    }
}

async function toggleRepost(postId, btnElement) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) { showToast('يجب تسجيل الدخول', true); return; }
    if (!postId || !btnElement) return;
    const isReposted = btnElement.classList.contains('reposted');
    if (!isReposted) {
        const { data: original, error: fetchError } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();
        if (fetchError) { showToast(fetchError.message, true); return; }
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
        const { error: insertError } = await supabase
            .from('posts')
            .insert(newPost);
        if (insertError) { showToast(insertError.message, true); return; }
        await supabase.rpc('increment_reposts', { row_id: postId });
        btnElement.classList.add('reposted');
        const countSpan = btnElement.querySelector('.repost-count');
        if (countSpan) {
            let current = parseInt(countSpan.innerText);
            countSpan.innerText = formatNumber(current + 1);
        }
        showToast('🔁 تمت إعادة النشر');
    } else {
        await supabase.rpc('decrement_reposts', { row_id: postId });
        btnElement.classList.remove('reposted');
        const countSpan = btnElement.querySelector('.repost-count');
        if (countSpan) {
            let current = parseInt(countSpan.innerText);
            countSpan.innerText = formatNumber(current - 1);
        }
        showToast('↩️ تم إلغاء إعادة النشر');
    }
}

async function toggleFollow(authorId, btnElement) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) { showToast('يجب تسجيل الدخول', true); return; }
    if (!authorId || !btnElement) return;
    const isFollowing = btnElement.innerText === 'متابَع';
    if (!isFollowing) {
        const { error } = await supabase
            .from('follows')
            .insert({ follower_id: currentUser.id, following_id: authorId });
        if (error) { showToast(error.message, true); return; }
        btnElement.innerText = 'متابَع';
        showToast('✅ تمت متابعة المستخدم');
    } else {
        const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', currentUser.id)
            .eq('following_id', authorId);
        if (error) { showToast(error.message, true); return; }
        btnElement.innerText = 'متابعة';
        showToast('✅ تم إلغاء المتابعة');
    }
}

// ================== جلب التغذية والتفاعلات مع تحسين الأمان ==================
async function fetchFeed() {
    try {
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
        if (!posts || !Array.isArray(posts)) return [];
        return posts.map(p => ({
            id: p.id,
            title: p.title || '',
            content: p.content || '',
            image: p.image || '',
            author_id: p.author_id || '',
            author_name: p.users?.username || p.author_name || 'مستخدم غير معروف',
            author_avatar: p.users?.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg',
            created_at: p.created_at || new Date(),
            likes_count: p.likes_count || 0,
            comments_count: p.comments_count || 0,
            views_count: p.views_count || 0,
            reposts_count: p.reposts_count || 0,
            favorites_count: p.favorites_count || 0,
            hashtag: p.hashtag || '',
            category: p.category || 'عام',
            type: p.type || 'article'
        }));
    } catch (err) {
        console.error("fetchFeed error:", err);
        return [];
    }
}

async function getUserInteractions(postIds) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !postIds || !Array.isArray(postIds) || postIds.length === 0) {
        return { likes: {}, favorites: {}, reposts: {}, follows: {} };
    }
    try {
        const { data: likes } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', currentUser.id)
            .in('post_id', postIds);
        const { data: favs } = await supabase
            .from('favorites')
            .select('post_id')
            .eq('user_id', currentUser.id)
            .in('post_id', postIds);
        const { data: reps } = await supabase
            .from('reposts')
            .select('post_id')
            .eq('user_id', currentUser.id)
            .in('post_id', postIds);
        const { data: follows } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', currentUser.id);
        const likesMap = {};
        likes?.forEach(l => likesMap[l.post_id] = true);
        const favsMap = {};
        favs?.forEach(f => favsMap[f.post_id] = true);
        const repsMap = {};
        reps?.forEach(r => repsMap[r.post_id] = true);
        const followsSet = new Set(follows?.map(f => f.following_id) || []);
        return { likes: likesMap, favorites: favsMap, reposts: repsMap, follows: followsSet };
    } catch (err) {
        console.error("getUserInteractions error:", err);
        return { likes: {}, favorites: {}, reposts: {}, follows: {} };
    }
}

// ================== إنشاء منشور جديد مع التحقق من وجود المستخدم ومنع الضيوف ==================
async function createPost(postData) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        showToast('يجب تسجيل الدخول', true);
        return false;
    }
    
    // منع الضيوف من النشر
    if (currentUser.isGuest) {
        showToast('لا يمكن للضيوف نشر منشورات. يرجى تسجيل الدخول أولاً.', true);
        return false;
    }
    
    // التحقق من وجود المستخدم في جدول users
    try {
        let { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('id', currentUser.id)
            .single();
        
        if (checkError && checkError.code === 'PGRST116') {
            // المستخدم غير موجود – نقوم بإنشائه
            const { error: insertError } = await supabase
                .from('users')
                .insert({
                    id: currentUser.id,
                    username: currentUser.username,
                    bio: currentUser.bio || '',
                    avatar: currentUser.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg',
                    unique_name: currentUser.username.toLowerCase().replace(/\s/g, '_') + '_' + Math.floor(Math.random() * 1000),
                    followers_count: 0,
                    following_count: 0
                });
            if (insertError) {
                console.error("فشل إنشاء المستخدم في جدول users:", insertError);
                showToast("حدث خطأ في إنشاء حسابك. حاول تسجيل الخروج والدخول مرة أخرى.", true);
                return false;
            }
            console.log("✅ تم إنشاء المستخدم تلقائياً في جدول users");
        } else if (checkError) {
            console.error("خطأ في التحقق من المستخدم:", checkError);
            showToast(checkError.message, true);
            return false;
        }
    } catch (err) {
        console.error("خطأ غير متوقع في createPost:", err);
        showToast("حدث خطأ غير متوقع. حاول مرة أخرى.", true);
        return false;
    }
    
    // الآن إنشاء المنشور
    const newPost = {
        title: postData.title || '',
        content: postData.content || '',
        image: postData.image || "https://picsum.photos/id/1/1200/800",
        author_id: currentUser.id,
        author_name: currentUser.username,
        likes_count: 0,
        comments_count: 0,
        views_count: 0,
        reposts_count: 0,
        favorites_count: 0,
        edit_count: 0,
        hashtag: postData.hashtag || '',
        category: postData.category || 'عام',
        type: postData.type || 'article',
        hidden: false,
        created_at: new Date().toISOString()
    };
    
    const { error } = await supabase.from('posts').insert(newPost);
    if (error) {
        console.error("فشل نشر المنشور:", error);
        showToast(error.message, true);
        return false;
    }
    
    showToast("🎉 تم نشر المنشور بنجاح!");
    return true;
}

// ================== التعليقات ==================
async function fetchComments(postId) {
    if (!postId) return [];
    try {
        const { data, error } = await supabase
            .from('comments')
            .select('*, users:user_id (username, avatar)')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });
        if (error) {
            showToast(error.message, true);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error("fetchComments error:", err);
        return [];
    }
}

async function addComment(postId, text) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) { showToast('يجب تسجيل الدخول', true); return false; }
    if (!postId || !text) return false;
    try {
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
    } catch (err) {
        console.error("addComment error:", err);
        return false;
    }
}
