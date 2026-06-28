// ==================== PROFILE.JS - CAMPUS CONNECT ====================

// --- Variables ---
let userPosts = [];
let showComments = {};

// --- Render User Profile ---
function renderUserProfile() {
    let user = null;
    
    if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER) {
        user = {
            name: CURRENT_USER.username || "User",
            username: CURRENT_USER.username || "user",
            department: CURRENT_USER.department || "Not specified",
            bio: CURRENT_USER.bio || "No bio added yet.",
            email: CURRENT_USER.email || ""
        };
        localStorage.setItem("currentUser", JSON.stringify(user));
    } else {
        const stored = localStorage.getItem("currentUser");
        if (stored) {
            try {
                user = JSON.parse(stored);
            } catch(e) {}
        }
    }
    
    if (!user) {
        user = {
            name: "User",
            username: "user",
            department: "Not specified",
            bio: "No bio added yet.",
            email: ""
        };
    }
    
    // Update profile elements
    const nameEl = document.getElementById('profileName');
    if (nameEl) nameEl.textContent = user.name;
    
    const usernameEl = document.getElementById('profileUsername');
    if (usernameEl) usernameEl.textContent = `@${user.username}`;
    
    const deptEl = document.getElementById('profileDept');
    if (deptEl) deptEl.textContent = user.department;
    
    const bioEl = document.getElementById('profileBio');
    if (bioEl) bioEl.textContent = user.bio;
    
    const avatar = document.getElementById('profileAvatar');
    if (avatar) avatar.textContent = user.name.charAt(0).toUpperCase();
    
    const sidebarName = document.querySelector('.user-card h4');
    if (sidebarName) sidebarName.textContent = user.name;
    
    const sidebarAvatar = document.querySelector('.user-card .user-avatar-small');
    if (sidebarAvatar) sidebarAvatar.textContent = user.name.charAt(0).toUpperCase();
    
    // ✅ Load user's posts on profile
    loadUserPosts();
}

// --- Load User Posts ---
function loadUserPosts() {
    const container = document.getElementById('userPostsContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div style="text-align:center; padding:30px; color:#94a3b8;">
            <i class="fas fa-spinner fa-spin" style="font-size:24px;"></i>
            <p style="margin-top:10px;">Loading your posts...</p>
        </div>
    `;
    
    fetch('/profile/posts/', {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        userPosts = data.posts || [];
        renderUserPosts();
    })
    .catch(error => {
        console.error('Error loading user posts:', error);
        container.innerHTML = `
            <div style="text-align:center; padding:30px; color:#94a3b8;">
                <i class="fas fa-exclamation-circle" style="font-size:24px; color:#ef4444;"></i>
                <p style="margin-top:10px;">Error loading posts. Please refresh.</p>
            </div>
        `;
    });
}

// --- Render User Posts ---
// --- Render User Posts ---
function renderUserPosts() {
    const container = document.getElementById('userPostsContainer');
    if (!container) return;
    
    // ✅ Update post count
    const postCountEl = document.getElementById('postCount');
    if (postCountEl) {
        postCountEl.textContent = `${userPosts.length} post${userPosts.length !== 1 ? 's' : ''}`;
    }
    
    if (userPosts.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px 20px; color:#94a3b8;">
                <i class="fas fa-pen" style="font-size:40px; display:block; margin-bottom:12px; color:#cbd5e1;"></i>
                <h3 style="color:#1e293b; margin-bottom:4px;">No posts yet</h3>
                <p style="font-size:14px;">Share your first post on the Home page!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = userPosts.map(post => `
        <div class="profile-post-card" data-post-id="${post.id}">
            <div class="profile-post-header">
                <div class="profile-post-user">
                    <div class="user-avatar-small" style="background: #7c3aed; color: white; width: 36px; height: 36px; font-size: 13px;">
                        ${post.author.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <span style="font-weight:600; color:#0f172a;">${post.author}</span>
                        <span style="font-size:12px; color:#94a3b8; margin-left:8px;">${post.created_at}</span>
                    </div>
                </div>
                <button onclick="deleteProfilePost(${post.id})" class="delete-btn" title="Delete Post">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="profile-post-content">${escapeHtml(post.content)}</div>
            <div class="profile-post-actions">
                <span onclick="toggleProfileLike(${post.id})" class="${post.is_liked ? 'liked' : ''}" style="cursor:pointer;">
                    <i class="${post.is_liked ? 'fas' : 'far'} fa-heart"></i> 
                    <span class="like-count">${post.likes_count}</span> Like
                </span>
                <span onclick="toggleProfileCommentBox(${post.id})" style="cursor:pointer;">
                    <i class="far fa-comment"></i> 
                    <span class="comment-count">${post.comments_count}</span> Comment
                </span>
            </div>
            
            <!-- Comments Section -->
            <div class="profile-comment-section" id="profile-comment-section-${post.id}" style="display:none; margin-top:12px; padding-top:12px; border-top:1px solid #f1f5f9;">
                <div class="comment-input-row">
                    <input type="text" class="comment-input" placeholder="Write a comment..." 
                        onkeydown="handleProfileComment(event, ${post.id})">
                </div>
                <div class="profile-comments-list" id="profile-comments-${post.id}">
                    ${post.comments && post.comments.length > 0 ? post.comments.map(comment => `
                        <div class="comment-item" data-comment-id="${comment.id}">
                            <strong>${comment.author}:</strong>
                            <span>${escapeHtml(comment.content)}</span>
                            <span class="comment-time">${comment.created_at}</span>
                            ${comment.author === (typeof CURRENT_USER !== 'undefined' ? CURRENT_USER.username : '') ? `
                                <button onclick="deleteProfileComment(${comment.id}, ${post.id})" class="delete-btn comment-delete-btn" title="Delete Comment">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    `).join('') : `
                        <p class="no-comments">No comments yet. Be the first!</p>
                    `}
                </div>
            </div>
        </div>
    `).join('');
}

// --- Toggle Profile Comment Box ---
function toggleProfileCommentBox(postId) {
    const section = document.getElementById(`profile-comment-section-${postId}`);
    if (section) {
        section.style.display = section.style.display === 'none' ? 'block' : 'none';
        if (section.style.display === 'block') {
            const input = section.querySelector('.comment-input');
            if (input) setTimeout(() => input.focus(), 100);
        }
    }
}

// --- Handle Profile Comment ---
function handleProfileComment(event, postId) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const input = event.target;
        const content = input.value.trim();
        
        if (!content) {
            alert('Please enter a comment.');
            return;
        }
        
        fetch(`/post/${postId}/comment/`, {
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
                const commentsList = document.getElementById(`profile-comments-${postId}`);
                const noComments = commentsList.querySelector('.no-comments');
                if (noComments) noComments.remove();
                
                const commentHtml = `
                    <div class="comment-item" data-comment-id="${data.comment.id}">
                        <strong>${data.comment.author}:</strong>
                        <span>${data.comment.content}</span>
                        <span class="comment-time">Just now</span>
                        <button onclick="deleteProfileComment(${data.comment.id}, ${postId})" class="delete-btn comment-delete-btn" title="Delete Comment">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                commentsList.insertAdjacentHTML('beforeend', commentHtml);
                input.value = '';
                
                // Update comment count
                updateProfileCommentCount(postId, 1);
                showToast('Comment added successfully');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error adding comment');
        });
    }
}

// --- Toggle Profile Like ---
function toggleProfileLike(postId) {
    const post = userPosts.find(p => p.id === postId);
    if (!post) return;
    
    const likeSpan = document.querySelector(`.profile-post-actions span[onclick*="toggleProfileLike(${postId})"]`);
    if (likeSpan) {
        const icon = likeSpan.querySelector('i');
        const countSpan = likeSpan.querySelector('.like-count');
        const isCurrentlyLiked = likeSpan.classList.contains('liked');
        
        // Optimistic update
        if (isCurrentlyLiked) {
            likeSpan.classList.remove('liked');
            icon.className = 'far fa-heart';
            if (countSpan) countSpan.textContent = parseInt(countSpan.textContent) - 1;
        } else {
            likeSpan.classList.add('liked');
            icon.className = 'fas fa-heart';
            icon.style.color = '#ef4444';
            if (countSpan) countSpan.textContent = parseInt(countSpan.textContent) + 1;
        }
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
            // Update the post in memory
            post.is_liked = data.is_liked;
            post.likes_count = data.likes_count;
            // Re-render to sync
            renderUserPosts();
        }
    })
    .catch(error => console.error('Error:', error));
}

// --- Delete Profile Post ---
function deleteProfilePost(postId) {
    if (confirm('Delete this post?')) {
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
                userPosts = userPosts.filter(p => p.id !== postId);
                renderUserPosts();
                showToast('Post deleted');
            }
        })
        .catch(error => console.error('Error:', error));
    }
}

// --- Delete Profile Comment ---
function deleteProfileComment(commentId, postId) {
    if (confirm('Delete this comment?')) {
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
                const commentEl = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
                if (commentEl) commentEl.remove();
                updateProfileCommentCount(postId, -1);
                showToast('Comment deleted');
            }
        })
        .catch(error => console.error('Error:', error));
    }
}

// --- Update Profile Comment Count ---
function updateProfileCommentCount(postId, change) {
    const commentSpan = document.querySelector(`.profile-post-actions span[onclick*="toggleProfileCommentBox(${postId})"]`);
    if (commentSpan) {
        const countSpan = commentSpan.querySelector('.comment-count');
        if (countSpan) {
            const current = parseInt(countSpan.textContent) || 0;
            countSpan.textContent = current + change;
        }
    }
}

// --- Escape HTML ---
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- Open Edit Profile Modal ---
function openEditProfileModal() {
    let user = null;
    
    if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER) {
        user = {
            name: CURRENT_USER.username || "",
            department: CURRENT_USER.department || "",
            bio: CURRENT_USER.bio || ""
        };
    } else {
        const stored = localStorage.getItem("currentUser");
        if (stored) {
            try {
                user = JSON.parse(stored);
            } catch(e) {}
        }
    }
    
    if (!user) {
        user = { name: "", department: "", bio: "" };
    }
    
    document.getElementById('editName').value = user.name || '';
    document.getElementById('editDept').value = user.department || '';
    document.getElementById('editBio').value = user.bio || '';
    
    document.getElementById('editProfileModal').style.display = 'flex';
}

// --- Close Edit Profile Modal ---
function closeEditProfileModal() {
    document.getElementById('editProfileModal').style.display = 'none';
}

// --- Save User Profile ---
function saveUserProfile() {
    const name = document.getElementById('editName').value.trim();
    const department = document.getElementById('editDept').value.trim();
    const bio = document.getElementById('editBio').value.trim();

    if (!name) {
        alert("Username cannot be empty.");
        return;
    }

    const saveBtn = document.querySelector('#editProfileModal .save-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;

    const formData = new FormData();
    formData.append('editName', name);
    formData.append('editDept', department);
    formData.append('editBio', bio);

    fetch('/profile/update/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (typeof CURRENT_USER !== 'undefined') {
                CURRENT_USER.username = name;
                CURRENT_USER.full_name = name;
                CURRENT_USER.department = department;
                CURRENT_USER.bio = bio;
            }
            
            let user = JSON.parse(localStorage.getItem("currentUser")) || {};
            user.name = name;
            user.username = name;
            user.department = department;
            user.bio = bio;
            localStorage.setItem("currentUser", JSON.stringify(user));
            
            closeEditProfileModal();
            renderUserProfile();
            showToast('Profile updated successfully');
            setTimeout(() => location.reload(), 1000);
        } else {
            alert(data.error || 'Failed to update profile');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error updating profile. Please try again.');
    })
    .finally(() => {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    });
}

// --- Get CSRF Token ---
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

// --- Show Toast ---
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
        animation: slideUp 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Initialize ---
document.addEventListener('DOMContentLoaded', function() {
    renderUserProfile();
});