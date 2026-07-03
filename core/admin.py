from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import Profile, Post, Comment, Announcement, Assignment, Notification

# ==================== PROFILE ADMIN ====================
@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'role', 'department', 'section', 'batch', 'created_at')
    list_editable = ('role', 'department', 'section', 'batch')
    list_filter = ('role', 'department', 'section')
    search_fields = ('user__username', 'user__email', 'department')
    raw_id_fields = ('user',)
    readonly_fields = ('created_at', 'updated_at')

# ==================== USER ADMIN ====================
class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = 'Profile'

class CustomUserAdmin(UserAdmin):
    inlines = (ProfileInline,)
    
    list_display = ('username', 'email', 'get_role', 'is_staff', 'is_active')
    list_editable = ('is_staff', 'is_active', 'email')
    list_filter = ('is_staff', 'is_active', 'is_superuser')
    search_fields = ('username', 'email')
    readonly_fields = ('date_joined', 'last_login')
    
    def get_role(self, obj):
        try:
            return obj.profile.role
        except Profile.DoesNotExist:
            return '-'
    get_role.short_description = 'Role'
    
    fieldsets = (
        (None, {'fields': ('username', 'email', 'password')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2'),
        }),
    )

admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)

# ==================== POST ADMIN ====================
@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('id', 'author', 'content_preview', 'created_at', 'total_likes')
    list_editable = ('author',)
    list_filter = ('created_at', 'author')
    search_fields = ('content', 'author__username')
    readonly_fields = ('created_at', 'updated_at')

    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'

    def total_likes(self, obj):
        return obj.total_likes()
    total_likes.short_description = 'Likes'

# ==================== COMMENT ADMIN ====================
@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'author', 'post_preview', 'content_preview', 'created_at')
    list_editable = ('author',)
    list_filter = ('created_at', 'author')
    search_fields = ('content', 'author__username')
    readonly_fields = ('created_at', 'updated_at')

    def post_preview(self, obj):
        return obj.post.content[:30] + '...' if len(obj.post.content) > 30 else obj.post.content
    post_preview.short_description = 'Post'

    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Comment'

# ==================== ANNOUNCEMENT ADMIN ====================
@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'author', 'category', 'created_at', 'is_pinned')
    list_editable = ('category', 'is_pinned')
    list_filter = ('category', 'is_pinned', 'created_at')
    search_fields = ('title', 'content', 'author__username')
    readonly_fields = ('created_at', 'updated_at')

# ==================== ASSIGNMENT ADMIN ====================
@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'course_name', 'author', 'department', 'batch', 'due_date')
    list_editable = ('course_name', 'department', 'batch', 'due_date')
    list_filter = ('department', 'course_name', 'due_date')
    search_fields = ('title', 'course_name', 'author__username')
    readonly_fields = ('created_at', 'updated_at')

# ==================== NOTIFICATION ADMIN ====================
@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'recipient', 'sender', 'notification_type', 'is_read', 'created_at')
    list_editable = ('is_read',)
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('recipient__username', 'sender__username', 'message')
    readonly_fields = ('created_at',)



# ==================== CUSTOM ACTIONS ====================
@admin.action(description='Mark selected as read')
def mark_as_read(modeladmin, request, queryset):
    queryset.update(is_read=True)

@admin.action(description='Mark selected as unread')
def mark_as_unread(modeladmin, request, queryset):
    queryset.update(is_read=False)

@admin.action(description='Pin selected announcements')
def pin_announcements(modeladmin, request, queryset):
    queryset.update(is_pinned=True)

@admin.action(description='Unpin selected announcements')
def unpin_announcements(modeladmin, request, queryset):
    queryset.update(is_pinned=False)

NotificationAdmin.actions = [mark_as_read, mark_as_unread, 'delete_selected']
AnnouncementAdmin.actions = [pin_announcements, unpin_announcements, 'delete_selected']