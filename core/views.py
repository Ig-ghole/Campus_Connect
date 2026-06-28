from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login as auth_login, logout
from django.contrib.auth.models import User
from django.contrib import messages
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
import json
from datetime import datetime
from .models import Profile, Post, Comment, Announcement, Assignment, Notification
import random
from django.core.mail import send_mail
from django.utils import timezone
from .models import OTP

# ==================== AUTHENTICATION VIEWS ====================

def signup(request):
    if request.user.is_authenticated:
        return redirect('home')
        
    if request.method == 'POST':
        full_name = request.POST.get('regName', '').strip()
        email = request.POST.get('regEmail', '').strip()
        password = request.POST.get('regPass', '')
        role = request.POST.get('role', 'student')
        department = request.POST.get('dept', '').strip()
        bio = request.POST.get('bio', '').strip()
        
        # Validation
        if not full_name or not email or not password:
            messages.error(request, 'All fields are required')
            return render(request, 'core/signup.html')
        
        # Email domain validation
        if not email.endswith('@nec.edu.np'):
            messages.error(request, 'Only @nec.edu.np emails are allowed')
            return render(request, 'core/signup.html')
        
        if User.objects.filter(email=email).exists():
            messages.error(request, 'Email is already registered')
            return render(request, 'core/signup.html')
        
        # Create user with username as email
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name='',
            last_name=''
        )
        
        # Create profile with role
        profile = Profile.objects.create(
            user=user,
            role=role,
            department=department,
            bio=bio
        )
        
        messages.success(request, 'Account created successfully! Please login.')
        return redirect('login')
    
    return render(request, 'core/signup.html')

def login_view(request):
    if request.user.is_authenticated:
        return redirect('home')
        
    if request.method == 'POST':
        email = request.POST.get('loginEmail', '').strip()
        password = request.POST.get('loginPass', '')
        
        try:
            user_obj = User.objects.get(email=email)
            user = authenticate(request, username=user_obj.username, password=password)
            
            if user is not None:
                auth_login(request, user)
                return redirect('home')
            else:
                messages.error(request, 'Invalid email or password')
        except User.DoesNotExist:
            messages.error(request, 'Invalid email or password')
        
        return render(request, 'core/login.html')
    
    return render(request, 'core/login.html')

@login_required
def logout_view(request):
    logout(request)
    messages.success(request, 'You have been logged out successfully.')
    return redirect('login')

# ==================== HOME VIEW ====================

@login_required
def home(request):
    posts = Post.objects.all().prefetch_related('author', 'comments__author', 'likes')
    announcements = Announcement.objects.all()
    
    try:
        profile = Profile.objects.get(user=request.user)
        user_role = profile.role
        department = profile.department
        bio = profile.bio
    except Profile.DoesNotExist:
        user_role = 'student'
        department = ''
        bio = ''
    
    user_data = {
        'id': request.user.id,
        'username': request.user.username,
        'email': request.user.email,
        'full_name': request.user.username,
        'role': user_role,
        'department': department,
        'bio': bio,
    }
    
    context = {
        'posts': posts,
        'announcements': announcements,
        'user_data': json.dumps(user_data),
        'user': request.user,
        'user_role': user_role,
    }
    
    return render(request, 'core/home.html', context)

# ==================== POST VIEWS ====================

@login_required
def create_post(request):
    if request.method == 'POST':
        content = request.POST.get('content', '').strip()
        
        if not content:
            return JsonResponse({'success': False, 'error': 'Post content cannot be empty'})
        
        post = Post.objects.create(
            author=request.user,
            content=content
        )
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'post': {
                    'id': post.id,
                    'content': post.content,
                    'author': request.user.username,
                    'author_full': request.user.username,
                    'created_at': post.created_at.strftime('%B %d, %Y at %I:%M %p'),
                    'likes': 0,
                    'comments': []
                }
            })
        
        return redirect('home')
    
    return redirect('home')

@login_required
def delete_post(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    
    if request.user != post.author:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'error': 'Not authorized'})
        messages.error(request, 'You are not authorized to delete this post')
        return redirect('home')
    
    post.delete()
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({'success': True})
    
    messages.success(request, 'Post deleted successfully')
    return redirect('home')

@login_required
def like_post(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    
    if request.user in post.likes.all():
        post.likes.remove(request.user)
        is_liked = False
    else:
        post.likes.add(request.user)
        is_liked = True
        
        # ✅ Create notification for post author (if not liking own post)
        if request.user != post.author:
            try:
                Notification.objects.create(
                    recipient=post.author,
                    sender=request.user,
                    notification_type='like',
                    message=f"{request.user.username} liked your post: {post.content[:50]}...",
                    link=f"/post/{post.id}/"
                )
                print(f"✅ Like notification sent to {post.author.username}")
            except Exception as e:
                print(f"Error creating like notification: {e}")
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'is_liked': is_liked,
            'likes_count': post.total_likes()
        })
    
    return redirect('home')

@login_required
def add_comment(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    
    if request.method == 'POST':
        content = request.POST.get('content', '').strip()
        
        if not content:
            return JsonResponse({'success': False, 'error': 'Comment cannot be empty'})
        
        comment = Comment.objects.create(
            post=post,
            author=request.user,
            content=content
        )
        
        # ✅ Create notification for post author (if not commenting on own post)
        if request.user != post.author:
            try:
                Notification.objects.create(
                    recipient=post.author,
                    sender=request.user,
                    notification_type='comment',
                    message=f"{request.user.username} commented on your post: {content[:50]}...",
                    link=f"/post/{post.id}/"
                )
                print(f"✅ Comment notification sent to {post.author.username}")
            except Exception as e:
                print(f"Error creating comment notification: {e}")
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'comment': {
                    'id': comment.id,
                    'content': comment.content,
                    'author': request.user.username,
                    'author_full': request.user.username,
                    'created_at': comment.created_at.strftime('%B %d, %Y at %I:%M %p'),
                }
            })
        
        return redirect('home')
    
    return redirect('home')

# ==================== COMMENT DELETE ====================

@login_required
def delete_comment(request, comment_id):
    comment = get_object_or_404(Comment, id=comment_id)
    post_id = comment.post.id
    
    if request.user != comment.author:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'error': 'Not authorized'})
        messages.error(request, 'You are not authorized to delete this comment')
        return redirect('home')
    
    comment.delete()
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({'success': True, 'post_id': post_id})
    
    messages.success(request, 'Comment deleted successfully')
    return redirect('home')

# ==================== ANNOUNCEMENT VIEWS ====================

@login_required
def create_announcement(request):
    if request.method == 'POST':
        # ✅ ONLY ADMIN CAN CREATE ANNOUNCEMENTS
        try:
            profile = Profile.objects.get(user=request.user)
            if profile.role != 'admin':
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return JsonResponse({'success': False, 'error': 'Only admins can create announcements'})
                messages.error(request, 'Only admins can create announcements')
                return redirect('home')
        except Profile.DoesNotExist:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': False, 'error': 'Profile not found'})
            messages.error(request, 'Profile not found')
            return redirect('home')
        
        # Get form data
        title = request.POST.get('announcementTitle', '').strip()
        category = request.POST.get('announcementCategory', 'general')
        sender = request.POST.get('announcementSender', '').strip()
        content = request.POST.get('announcementDesc', '').strip()
        
        if not title or not content:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': False, 'error': 'Title and content are required'})
            messages.error(request, 'Title and content are required')
            return redirect('home')
        
        # Create announcement
        announcement = Announcement.objects.create(
            author=request.user,
            title=title,
            category=category,
            content=content
        )
        
        # Create notifications for all users (except author)
        users = User.objects.exclude(id=request.user.id)
        for user in users:
            try:
                Notification.objects.create(
                    recipient=user,
                    sender=request.user,
                    notification_type='announcement',
                    message=f"📢 New announcement: {title}",
                    link=f"/announcements/"
                )
            except Exception as e:
                print(f"Error creating notification: {e}")
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': 'Announcement created successfully',
                'announcement': {
                    'id': announcement.id,
                    'title': announcement.title,
                    'category': announcement.get_category_display_name(),
                    'category_key': announcement.category,
                    'content': announcement.content,
                    'author': request.user.username,
                    'created_at': announcement.created_at.strftime('%B %d, %Y'),
                }
            })
        
        messages.success(request, 'Announcement created successfully')
        return redirect('home')
    
    return redirect('home')

@login_required
def delete_announcement(request, announcement_id):
    announcement = get_object_or_404(Announcement, id=announcement_id)
    
    if request.user != announcement.author:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'error': 'Not authorized'})
        messages.error(request, 'You are not authorized to delete this announcement')
        return redirect('home')
    
    announcement.delete()
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({'success': True})
    
    messages.success(request, 'Announcement deleted successfully')
    return redirect('home')

# ==================== PROFILE VIEWS ====================

@login_required
def get_profile(request):
    try:
        profile = Profile.objects.get(user=request.user)
    except Profile.DoesNotExist:
        profile = None
    
    data = {
        'id': request.user.id,
        'username': request.user.username,
        'email': request.user.email,
        'full_name': request.user.username,
        'department': profile.department if profile else '',
        'bio': profile.bio if profile else '',
        'joined': request.user.date_joined.strftime('%B %Y'),
    }
    
    return JsonResponse(data)

@login_required
def update_profile(request):
    if request.method == 'POST':
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            profile = Profile.objects.create(user=request.user)
        
        # Get data from form
        username = request.POST.get('editName', '').strip()
        department = request.POST.get('editDept', '').strip()
        bio = request.POST.get('editBio', '').strip()
        
        # Update username if provided
        if username:
            # Check if username is already taken by another user
            if User.objects.filter(username=username).exclude(id=request.user.id).exists():
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return JsonResponse({'success': False, 'error': 'Username already taken'})
                messages.error(request, 'Username already taken')
                return redirect('home')
            
            # Update username
            request.user.username = username
            request.user.save()
        
        # Update profile
        profile.department = department
        profile.bio = bio
        profile.save()
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': 'Profile updated successfully',
                'user': {
                    'id': request.user.id,
                    'username': request.user.username,
                    'email': request.user.email,
                    'full_name': request.user.username,
                    'department': profile.department,
                    'bio': profile.bio,
                }
            })
        
        messages.success(request, 'Profile updated successfully')
        return redirect('home')
    
    return redirect('home')

# ==================== ASSIGNMENT VIEWS ====================


@login_required
def create_assignment(request):
    if request.method == 'POST':
        # Check if user is teacher or admin
        try:
            profile = Profile.objects.get(user=request.user)
            if profile.role not in ['teacher', 'admin']:
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return JsonResponse({'success': False, 'error': 'Only teachers and admins can create assignments'})
                messages.error(request, 'Only teachers and admins can create assignments')
                return redirect('home')
        except Profile.DoesNotExist:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': False, 'error': 'Profile not found'})
            messages.error(request, 'Profile not found')
            return redirect('home')
        
        # Get form data
        title = request.POST.get('title', '').strip()
        course_name = request.POST.get('course_name', '').strip()
        department = request.POST.get('department', 'general')
        due_date_str = request.POST.get('due_date', '')
        batch = request.POST.get('batch', '').strip()
        target_audience = request.POST.get('target_audience', 'all')
        file = request.FILES.get('assignment_file', None)
        
        # Validation
        if not title or not course_name or not due_date_str:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': False, 'error': 'Title, course name, and due date are required'})
            messages.error(request, 'Title, course name, and due date are required')
            return redirect('home')
        
        # Convert string to date object
        try:
            due_date_obj = datetime.strptime(due_date_str, '%Y-%m-%d').date()
        except ValueError:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': False, 'error': 'Invalid date format'})
            messages.error(request, 'Invalid date format')
            return redirect('home')
        
        # Create assignment
        assignment = Assignment.objects.create(
            author=request.user,
            title=title,
            course_name=course_name,
            department=department,
            due_date=due_date_obj,
            batch=batch,
            target_audience=target_audience,
            file=file
        )
        
        # ✅ Create notifications for ALL students (except author)
        #students = User.objects.filter(profile__role='student').exclude(id=request.user.id)
        #notification_count = 0
        
        #for student in students:
            #try:
                #Notification.objects.create(
                    #recipient=student,
                    #sender=request.user,
                    #notification_type='assignment',
                    #message=f"📚 New assignment: {title} - {course_name} (Due: {due_date_obj.strftime('%B %d, %Y')})",
                    #link=f"/tasks/"
                #)
                #notification_count += 1
            #except Exception as e:
                #print(f"Error creating assignment notification for {student.username}: {e}")
        
        #print(f"✅ Assignment notification sent to {notification_count} students")
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                #'message': f'Assignment created successfully! {notification_count} students notified.',
                'assignment': {
                    'id': assignment.id,
                    'title': assignment.title,
                    'course_name': assignment.course_name,
                    'department': assignment.get_department_display(),
                    'department_key': assignment.department,
                    'due_date': assignment.due_date.strftime('%B %d, %Y'),
                    'batch': assignment.batch,
                    'target_audience': assignment.get_target_audience_display(),
                    'file_url': assignment.file.url if assignment.file else None,
                    'author': request.user.username,
                    'created_at': assignment.created_at.strftime('%B %d, %Y'),
                }
            })
        
        messages.success(request, 'Assignment created successfully')
        return redirect('home')
    
    return redirect('home')
    
    
@login_required
def get_assignments(request):
    assignments = Assignment.objects.all().prefetch_related('author')
    
    # Filter based on user role
    try:
        profile = Profile.objects.get(user=request.user)
        if profile.role == 'student':
            assignments = assignments.filter(target_audience__in=['all', 'section_a'])
    except Profile.DoesNotExist:
        pass
    
    data = []
    for assignment in assignments:
        data.append({
            'id': assignment.id,
            'title': assignment.title,
            'course_name': assignment.course_name,
            'department': assignment.get_department_display(),
            'department_key': assignment.department,
            'due_date': assignment.due_date.strftime('%B %d, %Y'),  # ✅ Format here too
            'batch': assignment.batch,
            'target_audience': assignment.get_target_audience_display(),
            'file_url': assignment.file.url if assignment.file else None,
            'author': assignment.author.username,
            'created_at': assignment.created_at.strftime('%B %d, %Y'),
        })
    
    return JsonResponse({'assignments': data})

@login_required
def delete_assignment(request, assignment_id):
    assignment = get_object_or_404(Assignment, id=assignment_id)
    
    if request.user != assignment.author:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'error': 'Not authorized'})
        messages.error(request, 'You are not authorized to delete this assignment')
        return redirect('home')
    
    # Delete file if exists
    if assignment.file:
        assignment.file.delete()
    
    assignment.delete()
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({'success': True})
    
    messages.success(request, 'Assignment deleted successfully')
    return redirect('home')

@login_required
def get_notifications(request):
    notifications = Notification.objects.filter(recipient=request.user)
    
    data = {
        'unread_count': notifications.filter(is_read=False).count(),
        'notifications': []
    }
    
    for notification in notifications[:20]:  # Last 20 notifications
        data['notifications'].append({
            'id': notification.id,
            'type': notification.notification_type,
            'sender': notification.sender.username,
            'message': notification.message,
            'link': notification.link,
            'is_read': notification.is_read,
            'created_at': notification.created_at.strftime('%B %d, %Y at %I:%M %p'),
        })
    
    return JsonResponse(data)

@login_required
def mark_notification_read(request, notification_id):
    notification = get_object_or_404(Notification, id=notification_id, recipient=request.user)
    notification.is_read = True
    notification.save()
    return JsonResponse({'success': True})

@login_required
def mark_all_notifications_read(request):
    Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return JsonResponse({'success': True})

@login_required
def delete_notification(request, notification_id):
    notification = get_object_or_404(Notification, id=notification_id, recipient=request.user)
    notification.delete()
    return JsonResponse({'success': True})

# Add to core/views.py

@login_required
def get_user_posts(request):
    """Get posts for a specific user (for profile page)"""
    posts = Post.objects.filter(author=request.user).prefetch_related('likes', 'comments__author')
    
    data = []
    for post in posts:
        # Format time with proper timezone
        created_at = post.created_at.astimezone() if post.created_at.tzinfo else post.created_at
        data.append({
            'id': post.id,
            'content': post.content,
            'author': post.author.username,
            'created_at': created_at.strftime('%B %d, %Y at %I:%M %p'),
            'likes_count': post.total_likes(),
            'comments_count': post.comments_count(),
            'is_liked': request.user in post.likes.all(),
            'comments': [
                {
                    'id': comment.id,
                    'author': comment.author.username,
                    'content': comment.content,
                    'created_at': comment.created_at.strftime('%B %d, %Y at %I:%M %p'),
                }
                for comment in post.comments.all()
            ]
        })
    
    return JsonResponse({'posts': data})

# Add to core/views.py



# --- Generate OTP ---
def generate_otp():
    return str(random.randint(100000, 999999))

# --- Send OTP ---
@csrf_exempt
def send_otp(request):
    if request.method == 'POST':
        email = request.POST.get('email', '').strip()
        
        # Check if email ends with @nec.edu.np
        if not email.endswith('@nec.edu.np'):
            return JsonResponse({'success': False, 'error': 'Only @nec.edu.np emails are allowed'})
        
        # Check if email already registered
        if User.objects.filter(email=email).exists():
            return JsonResponse({'success': False, 'error': 'Email already registered'})
        
        # Delete old OTPs for this email
        OTP.objects.filter(email=email).delete()
        
        # Generate new OTP
        otp_code = generate_otp()
        OTP.objects.create(email=email, otp_code=otp_code)
        
        # Send email (for testing, print to console)
        try:
            send_mail(
                subject='Campus Connect - OTP Verification',
                message=f'Your OTP code is: {otp_code}\n\nThis code will expire in 10 minutes.\n\nThank you,\nCampus Connect Team',
                from_email='noreply@campusconnect.com',
                recipient_list=[email],
                fail_silently=False,
            )
            print(f"✅ OTP sent to {email}: {otp_code}")  # For debugging
        except Exception as e:
            print(f"❌ Error sending email: {e}")
            # For development, still return success but log the error
        
        return JsonResponse({'success': True, 'message': 'OTP sent to your email'})
    
    return JsonResponse({'success': False, 'error': 'Invalid request'})

# --- Verify OTP ---
@csrf_exempt
def verify_otp(request):
    if request.method == 'POST':
        email = request.POST.get('email', '').strip()
        otp_code = request.POST.get('otp', '').strip()
        
        try:
            otp = OTP.objects.get(email=email, otp_code=otp_code, is_used=False)
            
            if otp.is_expired():
                return JsonResponse({'success': False, 'error': 'OTP has expired. Please request a new one.'})
            
            # Mark OTP as used
            otp.is_used = True
            otp.save()
            
            return JsonResponse({'success': True, 'message': 'OTP verified successfully'})
            
        except OTP.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Invalid OTP code'})
    
    return JsonResponse({'success': False, 'error': 'Invalid request'})

# --- Updated Signup with OTP ---
def signup(request):
    if request.user.is_authenticated:
        return redirect('home')
        
    if request.method == 'POST':
        full_name = request.POST.get('regName', '').strip()
        email = request.POST.get('regEmail', '').strip()
        password = request.POST.get('regPass', '')
        otp_code = request.POST.get('otp', '').strip()
        role = request.POST.get('role', 'student')
        department = request.POST.get('dept', '').strip()
        bio = request.POST.get('bio', '').strip()
        
        # Validation
        if not full_name or not email or not password:
            messages.error(request, 'All fields are required')
            return render(request, 'core/signup.html')
        
        # Email domain validation
        if not email.endswith('@nec.edu.np'):
            messages.error(request, 'Only @nec.edu.np emails are allowed')
            return render(request, 'core/signup.html')
        
        if User.objects.filter(email=email).exists():
            messages.error(request, 'Email is already registered')
            return render(request, 'core/signup.html')
        
        # Verify OTP
        try:
            otp = OTP.objects.get(email=email, otp_code=otp_code, is_used=False)
            if otp.is_expired():
                messages.error(request, 'OTP has expired. Please request a new one.')
                return render(request, 'core/signup.html')
            # Mark as used
            otp.is_used = True
            otp.save()
        except OTP.DoesNotExist:
            messages.error(request, 'Invalid OTP code. Please request a new one.')
            return render(request, 'core/signup.html')
        
        # Create user
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name='',
            last_name=''
        )
        
        # Create profile
        profile = Profile.objects.create(
            user=user,
            role=role,
            department=department,
            bio=bio
        )
        
        messages.success(request, 'Account created successfully! Please login.')
        return redirect('login')
    
    return render(request, 'core/signup.html')