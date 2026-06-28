from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import Profile, Post, Comment, Announcement, Assignment, Notification

# Profile Admin
class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = 'Profile'

class CustomUserAdmin(UserAdmin):
    inlines = (ProfileInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'get_role', 'is_staff')
    list_filter = ('profile__role', 'is_staff', 'is_superuser', 'is_active')
    
    def get_role(self, obj):
        try:
            return obj.profile.get_role_display()
        except Profile.DoesNotExist:
            return 'No Profile'
    get_role.short_description = 'Role'

# Re-register User admin
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)

# Profile Admin
@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'get_role_display', 'department', 'created_at')
    list_filter = ('role', 'department')
    search_fields = ('user__username', 'user__email', 'department')
    
    def get_role_display(self, obj):
        return obj.get_role_display()
    get_role_display.short_description = 'Role'

# Post Admin
@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('id', 'author', 'content_preview', 'created_at', 'total_likes')
    list_filter = ('created_at', 'author')
    search_fields = ('content', 'author__username')
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'

# Comment Admin
@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'author', 'post_preview', 'content_preview', 'created_at')
    list_filter = ('created_at', 'author')
    search_fields = ('content', 'author__username')
    
    def post_preview(self, obj):
        return obj.post.content[:30] + '...' if len(obj.post.content) > 30 else obj.post.content
    post_preview.short_description = 'Post'
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Comment'

# Announcement Admin
@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'category', 'created_at', 'is_pinned')
    list_filter = ('category', 'is_pinned', 'created_at')
    search_fields = ('title', 'content', 'author__username')
    



@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ('title', 'course_name', 'author', 'due_date', 'target_audience', 'created_at')
    list_filter = ('course_name', 'target_audience', 'due_date')
    search_fields = ('title', 'course_name', 'author__username')
    date_hierarchy = 'created_at'    
    



@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'sender', 'notification_type', 'message', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('recipient__username', 'sender__username', 'message')