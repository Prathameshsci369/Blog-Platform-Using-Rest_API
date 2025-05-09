"""
URL configuration for blog_platform project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from blog import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register(f'posts', views.PostViewSet)
router.register(f'comments', views.CommentViewSet)
router.register(r'categories' , views.CategoryViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.home, name='home'),
    path('create-post/', views.create_post, name='create_post'),  # New URL for enhanced post creation
    path('accounts/signup/', views.signup, name='signup'),
    path('accounts/login/', views.login_view, name='login'),  # Custom login view
    path('accounts/logout/', views.logout_view, name='logout'),  # Custom logout view
    path('api/', include(router.urls)),
    path('accounts/', include('django.contrib.auth.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
