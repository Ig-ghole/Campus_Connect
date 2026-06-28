// ==================== ASSIGNMENT.JS - CAMPUS CONNECT ====================

// --- Get CSRF Token (if not already defined) ---
if (typeof getCookie === 'undefined') {
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
}

// --- Show Toast (if not already defined) ---
if (typeof showToast === 'undefined') {
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
}

// --- Escape HTML ---
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- Render Assignments ---
// --- Render Assignments ---
function renderAssignments() {
    const container = document.getElementById('assignmentList');
    if (!container) {
        console.error('assignmentList container not found');
        return;
    }
    
    container.innerHTML = '<div style="text-align:center; padding:40px; color:#64748b;"><i class="fas fa-spinner fa-spin"></i> Loading assignments...</div>';
    
    fetch('/assignment/get/', {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('Assignments data:', data);
        
        if (data.assignments && data.assignments.length > 0) {
            container.innerHTML = data.assignments.map(assignment => `
                <div class="assignment-card" data-assignment-id="${assignment.id}">
                    <div class="status-dot"></div>
                    <div class="card-info">
                        <h3>${escapeHtml(assignment.title)}</h3>
                        <div class="card-meta">
                            <span><i class="fas fa-book"></i> ${escapeHtml(assignment.course_name)}</span>
                            <span class="badge-department badge-${escapeHtml(assignment.department_key || 'general')}">
                                <i class="fas fa-building"></i> ${escapeHtml(assignment.department || 'General')}
                            </span>
                            <!-- ✅ BATCH IS HERE -->
                            <span class="badge-batch">
                                <i class="fas fa-users"></i> Batch: ${escapeHtml(assignment.batch || 'N/A')}
                            </span>
                            <span class="badge-high"><i class="fas fa-calendar-alt"></i> Due: ${escapeHtml(assignment.due_date)}</span>
                        </div>
                        <p class="card-desc"><i class="fas fa-users"></i> Target: ${escapeHtml(assignment.target_audience)}</p>
                        ${assignment.file_url ? `<a href="${assignment.file_url}" class="card-time" target="_blank" style="display:inline-flex; align-items:center; gap:6px; text-decoration:none; color: #7c22ff;"><i class="fas fa-download"></i> Download File</a>` : ''}
                        <div class="card-time"><i class="far fa-clock"></i> Created: ${escapeHtml(assignment.created_at)}</div>
                    </div>
                    ${assignment.author === (typeof CURRENT_USER !== 'undefined' ? CURRENT_USER.username : '') ? `
                        <button onclick="deleteAssignment(${assignment.id})" class="delete-btn" title="Delete Assignment">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="empty-feed">📚 No assignments yet. Check back later!</p>';
        }
    })
    .catch(error => {
        console.error('Error loading assignments:', error);
        container.innerHTML = '<p class="empty-feed">❌ Error loading assignments. Please refresh the page.</p>';
    });
}

// --- Handle Assignment Form Submit ---
function handleAssignmentSubmit(event) {
    event.preventDefault();
    
    const form = document.getElementById('assignTaskForm');
    const formData = new FormData(form);
    
    console.log('Form data being sent:');
    for (let [key, value] of formData.entries()) {
        console.log(key + ': ' + value);
    }
    
    const submitBtn = form.querySelector('.btn-submit');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    submitBtn.disabled = true;
    
    fetch('/assignment/create/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData
    })
    .then(response => {
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
            throw new Error('Server responded with status: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        console.log('Server response:', data);
        
        if (data.success) {
            closeAssignModal();
            showToast('✅ Assignment created successfully!');
            renderAssignments();
            form.reset();
            document.getElementById('selectedFileName').textContent = '';
        } else {
            alert('❌ ' + (data.error || 'Failed to create assignment'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('❌ An error occurred while creating the assignment. Please check the console for details.');
    })
    .finally(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

// --- Open/Close Modal ---
function openAssignModal() {
    const modal = document.getElementById('assignTaskModal');
    if (modal) {
        modal.style.display = 'flex';
        const dueDateInput = document.getElementById('dueDateInput');
        if (dueDateInput) {
            const date = new Date();
            date.setDate(date.getDate() + 7);
            dueDateInput.value = date.toISOString().split('T')[0];
        }
    }
}

function closeAssignModal() {
    const modal = document.getElementById('assignTaskModal');
    if (modal) {
        modal.style.display = 'none';
    }
    const form = document.getElementById('assignTaskForm');
    if (form) {
        form.reset();
    }
    const fileDisplay = document.getElementById('selectedFileName');
    if (fileDisplay) {
        fileDisplay.textContent = '';
        fileDisplay.style.color = '';
    }
}

// --- File Input Functions ---
function triggerFileInput() {
    document.getElementById('fileInput').click();
}

function updateFileName() {
    const input = document.getElementById('fileInput');
    const display = document.getElementById('selectedFileName');
    
    if (input && input.files && input.files.length > 0) {
        const file = input.files[0];
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        display.innerHTML = `<i class="fas fa-check-circle" style="color: #10b981;"></i> Selected: <strong>${file.name}</strong> (${fileSize} MB)`;
        display.style.color = '#10b981';
    } else {
        display.textContent = '';
        display.style.color = '';
    }
}

// --- Delete Assignment ---
function deleteAssignment(assignmentId) {
    if (!assignmentId) {
        console.error('No assignment ID provided');
        return;
    }
    
    if (confirm('Are you sure you want to delete this assignment?')) {
        fetch(`/assignment/${assignmentId}/delete/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const card = document.querySelector(`.assignment-card[data-assignment-id="${assignmentId}"]`);
                if (card) {
                    card.style.opacity = '0';
                    card.style.transition = 'opacity 0.3s';
                    setTimeout(() => {
                        card.remove();
                        showToast('🗑️ Assignment deleted successfully');
                        const remainingCards = document.querySelectorAll('.assignment-card');
                        if (remainingCards.length === 0) {
                            const container = document.getElementById('assignmentList');
                            if (container) {
                                container.innerHTML = '<p class="empty-feed">📚 No assignments yet. Check back later!</p>';
                            }
                        }
                    }, 300);
                }
            } else {
                alert(data.error || 'Failed to delete assignment');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('❌ An error occurred while deleting the assignment');
        });
    }
}

// --- Initialize ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('Assignment.js loaded');
    
    if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER && 
        (CURRENT_USER.role === 'teacher' || CURRENT_USER.role === 'admin')) {
        const addTaskBtn = document.getElementById('addTaskBtn');
        if (addTaskBtn) {
            addTaskBtn.style.display = 'flex';
            addTaskBtn.classList.add('visible');
        }
    }
    
    setTimeout(function() {
        renderAssignments();
    }, 100);
});

// --- Re-render when tasks view is switched to ---
const originalSwitchView = window.switchView;
if (typeof originalSwitchView === 'function') {
    window.switchView = function(viewId, element) {
        originalSwitchView(viewId, element);
        if (viewId === 'tasks') {
            setTimeout(function() {
                renderAssignments();
            }, 200);
        }
    };
}

// --- Also re-render when coming back to page ---
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        const tasksView = document.getElementById('tasks');
        if (tasksView && tasksView.classList.contains('active-view')) {
            renderAssignments();
        }
    }
});