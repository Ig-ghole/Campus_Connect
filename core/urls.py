from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path('', views.home, name='home'),
    path('signup/', views.signup, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    
    # Posts
    path('post/create/', views.create_post, name='create_post'),
    path('post/<int:post_id>/delete/', views.delete_post, name='delete_post'),
    path('post/<int:post_id>/like/', views.like_post, name='like_post'),
    path('post/<int:post_id>/comment/', views.add_comment, name='add_comment'),
    
    # Comments
    path('comment/<int:comment_id>/delete/', views.delete_comment, name='delete_comment'),
    
    # Announcements
    path('announcement/create/', views.create_announcement, name='create_announcement'),
    path('announcement/<int:announcement_id>/delete/', views.delete_announcement, name='delete_announcement'),
    
    # Profile
    path('profile/get/', views.get_profile, name='get_profile'),
    path('profile/update/', views.update_profile, name='update_profile'),
    
    # Assignments
    path('assignment/create/', views.create_assignment, name='create_assignment'),
    path('assignment/get/', views.get_assignments, name='get_assignments'),
    path('assignment/<int:assignment_id>/delete/', views.delete_assignment, name='delete_assignment'),
    
    # Notifications
    path('notifications/get/', views.get_notifications, name='get_notifications'),
    path('notifications/mark/<int:notification_id>/read/', views.mark_notification_read, name='mark_notification_read'),
    path('notifications/mark/all/read/', views.mark_all_notifications_read, name='mark_all_notifications_read'),
    path('notifications/delete/<int:notification_id>/', views.delete_notification, name='delete_notification'),
        # User Posts
    path('profile/posts/', views.get_user_posts, name='get_user_posts'),
    
    #OTP
    path('send-otp/', views.send_otp, name='send_otp'),
    path('verify-otp/', views.verify_otp, name='verify_otp'),
]