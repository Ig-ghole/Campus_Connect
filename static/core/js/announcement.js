// ==================== ANNOUNCEMENT.JS - CAMPUS CONNECT ====================

let selectedCategoryFilter = "general";

// --- Render Announcements ---
function renderAnnouncements() {
    const container = document.getElementById('announcementsContainer');
    if (!container) return;
    
    const cards = container.querySelectorAll('.announcement-card');
    cards.forEach(card => {
        const category = card.dataset.category || 'general';
        const shouldShow = category === selectedCategoryFilter;
        card.style.display = shouldShow ? '' : 'none';
    });
}

// --- Filter Announcements ---
function filterAnnouncements(category, element) {
    selectedCategoryFilter = category;
    
    document.querySelectorAll('.filter-tags-bar .filter-tag').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (element) {
        element.classList.add('active');
    }
    
    renderAnnouncements();
}

// --- Open Announcement Modal ---
function openAnnouncementModal() {
    // ✅ Check if user is admin
    if (typeof CURRENT_USER === 'undefined' || CURRENT_USER.role !== 'admin') {
        alert('Only admins can create announcements.');
        return;
    }
    
    const overlay = document.getElementById('announcementModalOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

// --- Close Announcement Modal ---
function closeAnnouncementModal() {
    const overlay = document.getElementById('announcementModalOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    document.getElementById('announcementTitle').value = '';
    document.getElementById('announcementSender').value = '';
    document.getElementById('announcementDesc').value = '';
}

// --- Save Announcement ---
function saveAnnouncement() {
    // ✅ Double-check admin permission
    if (typeof CURRENT_USER === 'undefined' || CURRENT_USER.role !== 'admin') {
        alert('Only admins can create announcements.');
        return;
    }
    
    const title = document.getElementById('announcementTitle').value.trim();
    const sender = document.getElementById('announcementSender').value.trim();
    const category = document.getElementById('announcementCategory').value;
    const desc = document.getElementById('announcementDesc').value.trim();

    if (!title || !sender || !desc) {
        alert("Please fill all fields before publishing");
        return;
    }

    const submitBtn = document.querySelector('#announcementModalOverlay .save-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';
    submitBtn.disabled = true;

    const formData = new FormData();
    formData.append('announcementTitle', title);
    formData.append('announcementSender', sender);
    formData.append('announcementCategory', category);
    formData.append('announcementDesc', desc);

    fetch('/announcement/create/', {
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
            closeAnnouncementModal();
            showToast('✅ Announcement published successfully!');
            // Reload to show new announcement
            setTimeout(() => location.reload(), 500);
        } else {
            alert('❌ ' + (data.error || 'Failed to create announcement'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('❌ An error occurred while creating the announcement');
    })
    .finally(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

// --- Delete Announcement ---
function deleteAnnouncement(announcementId) {
    if (!announcementId) {
        console.error('No announcement ID provided');
        return;
    }
    
    // ✅ Check if user is admin
    if (typeof CURRENT_USER === 'undefined' || CURRENT_USER.role !== 'admin') {
        alert('Only admins can delete announcements.');
        return;
    }
    
    if (confirm('Are you sure you want to delete this announcement?')) {
        fetch(`/announcement/${announcementId}/delete/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const card = document.querySelector(`.announcement-card[data-announcement-id="${announcementId}"]`);
                if (card) {
                    card.remove();
                    showToast('🗑️ Announcement deleted successfully');
                }
            } else {
                alert(data.error || 'Failed to delete announcement');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('❌ An error occurred while deleting the announcement');
        });
    }
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
    renderAnnouncements();
});