// ==================== CLEAN.JS - CAMPUS CONNECT ====================

// --- Global Variables ---
let posts = [];
let tasks = JSON.parse(localStorage.getItem('ncit_perfect_tasks')) || [
    { title: 'Linear Algebra Midterm Study', course: 'MATH 220', desc: 'Review chapters 4-7.', date: 'Tomorrow' }
];

// --- CSRF Helper ---
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// --- Toast Notification ---
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 9999;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: toastSlideUp 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Core Functions ---
function init() {
    // Get user role from global CURRENT_USER
    let userRole = 'student';
    if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER.role) {
        userRole = CURRENT_USER.role;
    } else {
        const user = JSON.parse(localStorage.getItem("currentUser"));
        userRole = user ? user.role : "student";
    }

    // Hide teacher-only features
    if (userRole !== 'teacher' && userRole !== 'admin') {
        const btn = document.getElementById('teacherBtnSlot');
        if(btn) btn.style.display = 'none';
    }

    const roleEl = document.getElementById('displayRole');
    if (roleEl) { 
        roleEl.innerText = userRole.charAt(0).toUpperCase() + userRole.slice(1); 
    }
    
    // Load posts from Django-rendered HTML
    loadPostsFromDOM();
    renderTasks();
    
    // Render profile if available (from profile.js)
    if (typeof renderUserProfile === 'function') {
        renderUserProfile();
    }
}

// --- Load posts from Django-rendered DOM ---
function loadPostsFromDOM() {
    const feedCards = document.querySelectorAll('.feed-card');
    posts = [];
    
    feedCards.forEach(card => {
        const postId = card.dataset.postId;
        const content = card.querySelector('.feed-content')?.textContent || '';
        const authorName = card.querySelector('.feed-user-info h4')?.textContent || 'User';
        const timeText = card.querySelector('.feed-user-info h4 span')?.textContent || '';
        
        // Get comments from DOM
        const commentItems = card.querySelectorAll('.comment-item');
        const comments = [];
        commentItems.forEach(item => {
            const strong = item.querySelector('strong');
            const span = item.querySelector('span');
            if (strong && span) {
                comments.push({
                    user: strong.textContent.replace(':', ''),
                    text: span.textContent
                });
            }
        });
        
        // Check if user has liked this post
        const likeSpan = card.querySelector('.feed-actions span[data-post-id]');
        let isLiked = false;
        let likeCount = 0;
        if (likeSpan) {
            const icon = likeSpan.querySelector('i');
            isLiked = icon ? icon.classList.contains('fas') : false;
            const countSpan = likeSpan.querySelector('.like-count');
            likeCount = countSpan ? parseInt(countSpan.textContent) || 0 : 0;
        }
        
        posts.push({
            id: postId,
            name: authorName.split('•')[0]?.trim() || 'User',
            handle: '@user',
            time: timeText.trim() || 'Just now',
            content: content,
            comments: comments,
            isLiked: isLiked,
            likes: likeCount,
            showComments: false,
            showAllComments: false,
            commentCount: commentItems.length
        });
    });
}

// --- Render Feed ---
function renderFeed() {
    const feedContainer = document.getElementById('feedList');
    if (!feedContainer) return;
    
    // If we have Django posts, don't override them
    const djangoPosts = document.querySelectorAll('.feed-card');
    if (djangoPosts.length > 0) {
        return;
    }
    
    // Get current user name
    let userName = "Student";
    let userHandle = "@user";
    if (typeof CURRENT_USER !== 'undefined') {
        userName = CURRENT_USER.full_name || CURRENT_USER.username || "Student";
        userHandle = `@${CURRENT_USER.username || 'user'}`;
    }
    
    // Render from JavaScript array
    feedContainer.innerHTML = posts.map((post, index) => `
        <div class="feed-card" data-post-id="${post.id || index}">
            <div class="feed-header">
                <div class="user-avatar-small" style="background: #e0f2fe; color: #0369a1">${post.name.charAt(0) || 'U'}</div>
                <div class="feed-user-info">
                    <h4>${post.name || userName} <span>${post.handle || userHandle} • ${post.time || 'Just now'}</span></h4>
                </div>
                <button onclick="deleteLocalPost(${index})" class="delete-btn" title="Delete Post">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="feed-content">${post.content || ''}</div>
            
            <div class="feed-actions">
                <span onclick="toggleLike(${index})" class="${post.isLiked ? 'liked' : ''}" style="cursor:pointer;">
                    <i class="${post.isLiked ? 'fas' : 'far'} fa-heart"></i> 
                    <span class="like-count">${post.likes || 0}</span> Like
                </span>
                <span onclick="toggleCommentBox(${index})" style="cursor:pointer;">
                    <i class="far fa-comment"></i> 
                    <span class="comment-count">${post.comments ? post.comments.length : 0}</span> Comment
                </span>
            </div>

            ${post.showComments ? `
                <div class="comment-section">
                    <div class="comment-input-row">
                        <input type="text" class="comment-input" placeholder="Write a comment..." onkeydown="handleComment(event, ${index})">
                    </div>
                </div>
            ` : ''}

            ${post.comments && post.comments.length ? `
                <div class="comment-display-area" style="margin-top: 10px;">
                    ${post.showAllComments ? 
                        post.comments.map(c => `<div class="comment-item"><b>${c.user}:</b> ${c.text}</div>`).join('') 
                        : `<div class="comment-preview"><b>${post.comments[post.comments.length - 1].user}:</b> ${post.comments[post.comments.length - 1].text}</div>`
                    }
                    <small onclick="toggleComments(${index})" style="cursor:pointer; color: #0369a1; font-weight: 600;">
                        ${post.showAllComments ? 'Hide comments' : `View all ${post.comments.length} comments`}
                    </small>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// --- Toggle functions ---
function toggleComments(index) {
    posts[index].showAllComments = !posts[index].showAllComments;
    renderFeed();
}

function handleComment(event, index) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const commentText = event.target.value.trim();
        if (commentText !== "") {
            if (!posts[index].comments) posts[index].comments = [];
            
            let userName = "You";
            if (typeof CURRENT_USER !== 'undefined') {
                userName = CURRENT_USER.full_name || CURRENT_USER.username || "You";
            }
            
            posts[index].comments.push({ text: commentText, user: userName });
            event.target.value = "";
            renderFeed();
        }
    }
}

function toggleCommentBox(index) {
    posts[index].showComments = !posts[index].showComments;
    renderFeed();
}

function toggleLike(index) {
    const post = posts[index];
    if (typeof post.likes !== 'number') post.likes = 0;
    post.isLiked = !post.isLiked;
    post.likes += post.isLiked ? 1 : -1;
    renderFeed();
}

// --- COMMENT FUNCTIONS FOR DJANGO POSTS (with postId) ---

// Toggle comment box for Django posts
function toggleCommentBoxById(postId) {
    console.log("Toggle comment box for post:", postId);
    const section = document.getElementById(`comment-section-${postId}`);
    if (section) {
        if (section.style.display === 'none' || section.style.display === '') {
            section.style.display = 'block';
            const input = section.querySelector('.comment-input');
            if (input) {
                setTimeout(() => input.focus(), 100);
            }
        } else {
            section.style.display = 'none';
        }
    } else {
        console.error("Comment section not found for post:", postId);
    }
}

// Handle comment submission for Django posts
function handleCommentSubmit(event, postId) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const input = event.target;
        const commentText = input.value.trim();
        
        if (!commentText) {
            alert('Please enter a comment.');
            return;
        }
        
        console.log("Submitting comment for post:", postId);
        
        // Send comment to server
        fetch(`/post/${postId}/comment/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': getCookie('csrftoken'),
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: `content=${encodeURIComponent(commentText)}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log("Comment added successfully:", data);
                
                // Add comment to DOM
                const commentsList = document.getElementById(`comments-${postId}`);
                if (!commentsList) {
                    console.error("Comments list not found for post:", postId);
                    return;
                }
                
                // Remove "No comments" message if it exists
                const noComments = commentsList.querySelector('.no-comments');
                if (noComments) noComments.remove();
                
                // Get username from CURRENT_USER
                let userName = "You";
                if (typeof CURRENT_USER !== 'undefined') {
                    userName = CURRENT_USER.username || "You";
                }
                
                // Create new comment HTML
                const commentHtml = `
                    <div class="comment-item" data-comment-id="${data.comment.id}">
                        <strong>${userName}:</strong>
                        <span>${data.comment.content}</span>
                        <span class="comment-time">Just now</span>
                        <button onclick="deleteComment(${data.comment.id}, ${postId})" class="delete-btn comment-delete-btn" title="Delete Comment">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                commentsList.insertAdjacentHTML('beforeend', commentHtml);
                input.value = '';
                
                // Update comment count
                updateCommentCount(postId, 1);
                
                if (typeof showToast === 'function') {
                    showToast('Comment added successfully');
                }
            } else {
                alert(data.error || 'Failed to add comment');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while adding comment');
        });
    }
}

// Update comment count
function updateCommentCount(postId, change) {
    const commentSpan = document.querySelector(`.feed-actions span[data-post-id="${postId}"]:last-child`);
    if (commentSpan) {
        const countSpan = commentSpan.querySelector('.comment-count');
        if (countSpan) {
            const currentCount = parseInt(countSpan.textContent) || 0;
            countSpan.textContent = currentCount + change;
        }
    }
}

// --- Override toggleCommentBox for compatibility ---
// This handles both index and postId
function toggleCommentBox(param) {
    // If param is a number and it's a post ID (not an index)
    if (typeof param === 'number') {
        // Check if this is a post ID by looking for the comment section
        const section = document.getElementById(`comment-section-${param}`);
        if (section) {
            // This is a post ID, use the byId version
            toggleCommentBoxById(param);
            return;
        }
    }
    
    // Otherwise treat it as an index (for local posts)
    if (posts[param]) {
        posts[param].showComments = !posts[param].showComments;
        renderFeed();
    }
}

// --- Add New Post ---
function addNewPost() {
    const text = document.getElementById('postInput').value.trim();
    if (!text) {
        alert('Please enter some content.');
        return;
    }
    
    // Use actual user data from global CURRENT_USER
    let userName = "Student";
    let userHandle = "@user";
    if (typeof CURRENT_USER !== 'undefined') {
        userName = CURRENT_USER.full_name || CURRENT_USER.username || "Student";
        userHandle = `@${CURRENT_USER.username || 'user'}`;
    }
    
    // Send to Django backend
    fetch('/post/create/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': getCookie('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: `content=${encodeURIComponent(text)}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('postInput').value = '';
            showToast('Post created successfully!');
            // Reload to show new post from Django
            setTimeout(() => location.reload(), 500);
        } else {
            alert(data.error || 'Failed to create post');
            // Fallback: add locally
            posts.unshift({ 
                id: Date.now().toString(),
                name: userName,
                handle: userHandle,
                time: "Just now",
                content: text,
                comments: [],
                isLiked: false,
                likes: 0,
                showComments: false,
                showAllComments: false,
                commentCount: 0
            });
            document.getElementById('postInput').value = '';
            renderFeed();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        // Fallback: add locally
        posts.unshift({ 
            id: Date.now().toString(),
            name: userName,
            handle: userHandle,
            time: "Just now",
            content: text,
            comments: [],
            isLiked: false,
            likes: 0,
            showComments: false,
            showAllComments: false,
            commentCount: 0
        });
        document.getElementById('postInput').value = '';
        renderFeed();
        showToast('Post added locally (server error)', 'error');
    });
}

// --- Delete Post ---
function deletePost(postId) {
    if (!postId) {
        console.error('No post ID provided');
        return;
    }
    
    if (confirm('Are you sure you want to delete this post?')) {
        fetch(`/post/${postId}/delete/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const postElement = document.querySelector(`.feed-card[data-post-id="${postId}"]`);
                if (postElement) {
                    postElement.remove();
                    showToast('Post deleted successfully');
                }
            } else {
                alert(data.error || 'Failed to delete post');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while deleting the post');
        });
    }
}

// --- Delete Local Post ---
function deleteLocalPost(index) {
    if (confirm('Are you sure you want to delete this post?')) {
        posts.splice(index, 1);
        renderFeed();
    }
}

// --- Delete Comment ---
function deleteComment(commentId, postId) {
    if (!commentId) {
        console.error('No comment ID provided');
        return;
    }
    
    if (confirm('Are you sure you want to delete this comment?')) {
        fetch(`/comment/${commentId}/delete/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const commentElement = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
                if (commentElement) {
                    commentElement.remove();
                    updateCommentCount(postId, -1);
                    showToast('Comment deleted successfully');
                }
            } else {
                alert(data.error || 'Failed to delete comment');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while deleting the comment');
        });
    }
}

// --- Toggle Like Post ---
function toggleLikePost(postId) {
    if (!postId) return;
    
    const likeSpan = document.querySelector(`.feed-actions span[data-post-id="${postId}"]`);
    if (!likeSpan) return;
    
    const icon = likeSpan.querySelector('i');
    const countSpan = likeSpan.querySelector('.like-count');
    const isCurrentlyLiked = likeSpan.classList.contains('liked');
    
    // Optimistic update
    if (isCurrentlyLiked) {
        likeSpan.classList.remove('liked');
        icon.className = 'far fa-heart';
        icon.style.color = '';
        if (countSpan) countSpan.textContent = parseInt(countSpan.textContent) - 1;
    } else {
        likeSpan.classList.add('liked');
        icon.className = 'fas fa-heart';
        icon.style.color = '#ef4444';
        if (countSpan) countSpan.textContent = parseInt(countSpan.textContent) + 1;
    }
    
    fetch(`/post/${postId}/like/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (countSpan) countSpan.textContent = data.likes_count;
            if (data.is_liked) {
                likeSpan.classList.add('liked');
                icon.className = 'fas fa-heart';
                icon.style.color = '#ef4444';
            } else {
                likeSpan.classList.remove('liked');
                icon.className = 'far fa-heart';
                icon.style.color = '';
            }
        } else {
            // Revert on error
            if (isCurrentlyLiked) {
                likeSpan.classList.add('liked');
                icon.className = 'fas fa-heart';
                icon.style.color = '#ef4444';
                if (countSpan) countSpan.textContent = parseInt(countSpan.textContent) + 1;
            } else {
                likeSpan.classList.remove('liked');
                icon.className = 'far fa-heart';
                icon.style.color = '';
                if (countSpan) countSpan.textContent = parseInt(countSpan.textContent) - 1;
            }
            alert(data.error || 'Failed to like post');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        // Revert on error
        if (isCurrentlyLiked) {
            likeSpan.classList.add('liked');
            icon.className = 'fas fa-heart';
            icon.style.color = '#ef4444';
            if (countSpan) countSpan.textContent = parseInt(countSpan.textContent) + 1;
        } else {
            likeSpan.classList.remove('liked');
            icon.className = 'far fa-heart';
            icon.style.color = '';
            if (countSpan) countSpan.textContent = parseInt(countSpan.textContent) - 1;
        }
    });
}

// --- Assignment Logic (Simple Task Management) ---
function switchView(viewId, element) {
    document.querySelectorAll('.menu a').forEach(link => link.classList.remove('active'));
    if (element) element.classList.add('active');
    document.querySelectorAll('.dashboard-view').forEach(view => {
        view.classList.remove('active-view');
        view.style.display = 'none';
    });
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add('active-view');
        targetView.style.display = 'flex';
    }
}

function renderTasks() {
    const container = document.getElementById('assignmentList');
    if(!container) return;
    
    if (tasks.length === 0) {
        container.innerHTML = '<p class="empty-feed">No assignments yet. Add one above!</p>';
        return;
    }
    
    container.innerHTML = tasks.map(task => `
        <div class="assignment-card">
            <div class="status-dot"></div>
            <div class="card-info">
                <h3>${escapeHtml(task.title)}</h3>
                <div class="card-meta"><span>${escapeHtml(task.course)}</span> <span class="badge-high">HIGH</span></div>
                <p class="card-desc">${escapeHtml(task.desc || '')}</p>
                <div class="card-time"><i class="far fa-clock"></i> ${escapeHtml(task.date || 'No date')}</div>
            </div>
        </div>
    `).join('');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function openModal() { 
    document.getElementById('modalOverlay').style.display = 'flex'; 
}

function closeModal() { 
    document.getElementById('modalOverlay').style.display = 'none'; 
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskCourse').value = '';
    document.getElementById('taskDesc').value = '';
}

function saveTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const course = document.getElementById('taskCourse').value.trim();
    const desc = document.getElementById('taskDesc').value.trim();
    if(!title || !course) return alert("Title and Course are required");
    tasks.unshift({ 
        title, 
        course, 
        desc, 
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) 
    });
    localStorage.setItem('ncit_perfect_tasks', JSON.stringify(tasks));
    closeModal();
    renderTasks();
    showToast('Assignment added successfully');
}

// --- Post Modal ---
function openPostModal() {
    document.getElementById('postModalOverlay').style.display = 'flex';
}

function closePostModal() {
    document.getElementById('postModalOverlay').style.display = 'none';
    document.getElementById('postModalContent').value = '';
}

function savePost() {
    const content = document.getElementById('postModalContent').value.trim();
    if (!content) {
        alert('Please enter some content');
        return;
    }
    
    fetch('/post/create/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': getCookie('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: `content=${encodeURIComponent(content)}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closePostModal();
            showToast('Post created successfully');
            setTimeout(() => location.reload(), 500);
        } else {
            alert(data.error || 'Failed to create post');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred');
    });
}

// --- Initialize ---
document.addEventListener('DOMContentLoaded', function() {
    init();
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}