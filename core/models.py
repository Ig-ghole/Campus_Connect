from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Profile(models.Model):
    # Role choices
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('teacher', 'Teacher'),
        ('admin', 'Admin'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(blank=True, max_length=500)
    department = models.CharField(max_length=100, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    profile_image = models.ImageField(upload_to='profile_images/', default='default.jpg', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"
    
    def get_full_name(self):
        return f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username

class Post(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    content = models.TextField(max_length=1000)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    likes = models.ManyToManyField(User, related_name='liked_posts', blank=True)
    
    def __str__(self):
        return f"{self.author.username}: {self.content[:50]}"
    
    def total_likes(self):
        return self.likes.count()
    
    def comments_count(self):
        return self.comments.count()
    
    class Meta:
        ordering = ['-created_at']

class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.author.username} on {self.post}: {self.content[:30]}"
    
    class Meta:
        ordering = ['created_at']

class Announcement(models.Model):
    CATEGORY_CHOICES = [
        ('events', 'Events'),
        ('academic', 'Academic'),
        ('general', 'General'),
        ('club', 'Club'),
        ('sports', 'Sports'),
        ('admin', 'Admin'),
    ]
    
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='announcements')
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='general')
    content = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_pinned = models.BooleanField(default=False)
    
    def __str__(self):
        return self.title
    
    def get_category_display_name(self):
        return dict(self.CATEGORY_CHOICES).get(self.category, self.category)
    
    class Meta:
        ordering = ['-is_pinned', '-created_at']
        
        

class Assignment(models.Model):
    TARGET_CHOICES = [
    ('all', 'All Students'),
    ('section_a', 'Section A Only'),
    ('section_b', 'Section B Only'),
    ('section_c', 'Section C Only'),
    ('section_d', 'Section D Only'),
]
    
    DEPARTMENT_CHOICES = [
        ('computer', 'Computer Science'),
        ('civil', 'Civil Engineering'),
        ('architecture', 'Architecture'),
        ('electronics', 'Electronics Engineering'),
        ('mechanical', 'Mechanical Engineering'),
        ('electrical', 'Electrical Engineering'),
        ('general', 'General'),
    ]
    
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assignments')
    title = models.CharField(max_length=200)
    course_name = models.CharField(max_length=100)
    # FIX: Increase max_length to 50 (the longest value is 26 characters)
    department = models.CharField(max_length=50, choices=DEPARTMENT_CHOICES, default='general')
    due_date = models.DateField()
    batch = models.CharField(max_length=50, blank=True, null=True) 
    description = models.TextField(blank=True)
    file = models.FileField(upload_to='assignments/', blank=True, null=True)
    target_audience = models.CharField(max_length=20, choices=TARGET_CHOICES, default='all')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.title} - {self.course_name} ({self.get_department_display()})"
    
    class Meta:
        ordering = ['-created_at']
        



class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('like', 'Like'),
        ('comment', 'Comment'),
        ('announcement', 'Announcement'),
        #('assignment', 'Assignment'),
        
    ]
    
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    message = models.TextField(max_length=500)
    link = models.CharField(max_length=255, blank=True, null=True)  # URL to the related item
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.sender.username} -> {self.recipient.username}: {self.notification_type}"        
    


class OTP(models.Model):
    email = models.EmailField()
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)
    
    def is_expired(self):
        # OTP expires after 10 minutes
        from django.utils import timezone
        from datetime import timedelta
        return timezone.now() > self.created_at + timedelta(minutes=10)
    
    def __str__(self):
        return f"{self.email} - {self.otp_code}"