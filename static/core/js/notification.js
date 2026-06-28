// ==================== NOTIFICATION.JS - CAMPUS CONNECT ====================

// --- Variables ---
let notificationInterval = null;
let notificationDropdownOpen = false;
let currentFilter = 'all';
let allNotifications = [];

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

// --- Escape HTML ---
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- Get Notification Icon ---
function getNotificationIcon(type) {
    const icons = {
        'like': 'fas fa-heart',
        'comment': 'fas fa-comment',
        'announcement': 'fas fa-bullhorn',
        //'assignment': 'fas fa-tasks'
    };
    return icons[type] || 'fas fa-bell';
}

// --- Get Notification Label ---
function getNotificationLabel(type) {
    const labels = {
        'like': '❤️ Liked your post',
        'comment': '💬 Commented on your post',
        'announcement': '📢 New Announcement',
        //'assignment': '📚 New Assignment'
    };
    return labels[type] || 'Notification';
}

// --- Fetch Notifications ---
function fetchNotifications() {
    console.log('Fetching notifications...');
    fetch('/notifications/get/', {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('Notifications data:', data);
        allNotifications = data.notifications || [];
        updateNotificationBadge(data.unread_count);
        updateStatsAndFilters();
        renderNotifications(currentFilter);
        
        if (notificationDropdownOpen) {
            renderNotificationDropdown(data.notifications);
        }
    })
    .catch(error => console.error('Error fetching notifications:', error));
}

// --- Refresh Notifications ---
function refreshNotifications() {
    const btn = document.querySelector('.see-all');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        btn.disabled = true;
    }
    
    fetchNotifications();
    
    setTimeout(() => {
        if (btn) {
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            btn.disabled = false;
        }
        showToast('✅ Notifications refreshed!');
    }, 500);
}

// --- Clear All Notifications ---
function clearAllNotifications() {
    if (!allNotifications || allNotifications.length === 0) {
        showToast('No notifications to clear', 'error');
        return;
    }
    
    if (confirm('Delete ALL notifications?')) {
        const deletePromises = allNotifications.map(notif => 
            fetch(`/notifications/delete/${notif.id}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
        );
        
        Promise.all(deletePromises)
            .then(() => {
                allNotifications = [];
                fetchNotifications();
                showToast('✅ All notifications cleared!');
            })
            .catch(error => {
                console.error('Error clearing notifications:', error);
                showToast('❌ Error clearing notifications', 'error');
            });
    }
}

// --- Update Stats and Filters ---
function updateStatsAndFilters() {
    const total = allNotifications.length;
    const unread = allNotifications.filter(n => !n.is_read).length;
    const read = total - unread;
    
    // Update stats numbers
    document.getElementById('totalNotifCount').textContent = total;
    document.getElementById('unreadNotifCount').textContent = unread;
    document.getElementById('readNotifCount').textContent = read;
}

// --- Filter Notifications ---
function filterNotifications(filter, element) {
    currentFilter = filter;
    
    // Update active stat
    document.querySelectorAll('.stat-item').forEach(item => {
        item.classList.remove('active');
    });
    if (element) {
        element.classList.add('active');
    }
    
    renderNotifications(filter);
}

// --- Render Notifications - Like Image ---
function renderNotifications(filter) {
    const container = document.getElementById('allNotificationsList');
    if (!container) return;
    
    let filtered = [...allNotifications];
    
    if (filter === 'unread') {
        filtered = filtered.filter(n => !n.is_read);
    } else if (filter === 'read') {
        filtered = filtered.filter(n => n.is_read);
    } else if (filter !== 'all') {
        filtered = filtered.filter(n => n.type === filter);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="notification-empty-classic">
                <span class="empty-icon"><i class="fas fa-bell-slash"></i></span>
                <h3>All caught up! 🎉</h3>
                <p>${filter === 'all' ? 'No notifications to show' : `No ${filter} notifications`}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(notification => `
        <div class="notification-item-classic ${notification.is_read ? '' : 'unread'}" 
            data-id="${notification.id}"
            onclick="markAsRead(${notification.id})">
            
            <div class="notif-icon-circle ${notification.type}">
                <i class="${getNotificationIcon(notification.type)}"></i>
            </div>
            
            <div class="notif-text-content">
                <div class="notif-title-text">${getNotificationLabel(notification.type)}</div>
                <div class="notif-message-text">${escapeHtml(notification.message)}</div>
                <div class="notif-time-text">
                    <i class="far fa-clock"></i> ${escapeHtml(notification.created_at)}
                </div>
            </div>
            
            <span class="notif-status-dot ${notification.is_read ? 'read-dot' : 'unread-dot'}"></span>
            
            <button class="notif-x-btn" onclick="event.stopPropagation(); deleteNotification(${notification.id})" title="Delete">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// --- Render Notification Dropdown ---
function renderNotificationDropdown(notifications) {
    const container = document.getElementById('notificationList');
    if (!container) return;
    
    const list = (notifications || allNotifications).slice(0, 10);
    
    if (list.length === 0) {
        container.innerHTML = `
            <div class="notification-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = list.map(notification => `
        <div class="notification-item ${notification.is_read ? '' : 'unread'}" 
            data-id="${notification.id}" 
            onclick="markAsRead(${notification.id})">
            <div class="notification-icon ${notification.type}">
                <i class="${getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <p>${escapeHtml(notification.message)}</p>
                <span class="notification-time">${escapeHtml(notification.created_at)}</span>
            </div>
            ${!notification.is_read ? `<div class="notification-dot"></div>` : ''}
        </div>
    `).join('');
    
    const total = allNotifications.length || notifications?.length || 0;
    if (total > 10) {
        container.innerHTML += `
            <div style="text-align:center; padding:10px; border-top:1px solid #e2e8f0;">
                <a href="#" onclick="switchView('notifications', document.querySelector('.menu a[onclick*=\\'notifications\\']')); closeNotificationDropdown(); return false;" 
                    style="color: #7c3aed; font-weight: 600; font-size: 13px; text-decoration: none;">
                    View all ${total} notifications →
                </a>
            </div>
        `;
    }
}

// --- Delete Single Notification ---
function deleteNotification(notificationId) {
    if (confirm('Delete this notification?')) {
        fetch(`/notifications/delete/${notificationId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                allNotifications = allNotifications.filter(n => n.id !== notificationId);
                fetchNotifications();
                showToast('🗑️ Notification deleted');
            }
        })
        .catch(error => console.error('Error:', error));
    }
}

// --- Mark as Read ---
function markAsRead(notificationId) {
    fetch(`/notifications/mark/${notificationId}/read/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            fetchNotifications();
        }
    })
    .catch(error => console.error('Error marking notification as read:', error));
}

// --- Mark All as Read ---
function markAllAsRead() {
    const unreadCount = allNotifications.filter(n => !n.is_read).length;
    if (unreadCount === 0) {
        showToast('No unread notifications', 'error');
        return;
    }
    
    fetch('/notifications/mark/all/read/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            fetchNotifications();
            showToast(`✅ ${unreadCount} notifications marked as read!`);
        }
    })
    .catch(error => console.error('Error marking all as read:', error));
}

// --- Update Badge ---
function updateNotificationBadge(count) {
    const menuBadge = document.getElementById('menuNotificationBadge');
    if (menuBadge) {
        if (count > 0) {
            menuBadge.textContent = count;
            menuBadge.style.display = 'flex';
        } else {
            menuBadge.style.display = 'none';
        }
    }
}

// --- Toggle Notification Dropdown ---
function toggleNotificationDropdown(event) {
    if (event) {
        event.stopPropagation();
    }
    notificationDropdownOpen = !notificationDropdownOpen;
    
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) {
        dropdown.style.display = notificationDropdownOpen ? 'block' : 'none';
        if (notificationDropdownOpen) {
            fetchNotifications();
        }
    }
}

// --- Close Dropdown ---
function closeNotificationDropdown() {
    notificationDropdownOpen = false;
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

// --- Show Toast ---
function showToast(message, type = 'success') {
    document.querySelectorAll('.custom-toast').forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
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
        max-width: 400px;
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
    console.log('Notification.js loaded');
    
    setTimeout(function() {
        fetchNotifications();
    }, 500);
    
    notificationInterval = setInterval(fetchNotifications, 30000);
    
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('notificationDropdown');
        const bell = document.getElementById('notificationBell');
        if (dropdown && bell && !dropdown.contains(event.target) && !bell.contains(event.target)) {
            closeNotificationDropdown();
        }
    });
});

window.addEventListener('beforeunload', function() {
    if (notificationInterval) {
        clearInterval(notificationInterval);
    }
});