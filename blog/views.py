from django.shortcuts import render,redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.db import models  # Add this import for Q objects
from django.contrib.auth.decorators import login_required
from rest_framework.viewsets import ModelViewSet 
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework.response import Response 
from rest_framework import status
from .models import Category,Post,Comment 
from .serializers import CategorySerializer, PostSerializer, CommentSerializer
from rest_framework import permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.views.decorators.csrf import csrf_protect
from django.contrib import messages
import logging

logger = logging.getLogger('blog')

def home(request):
    try:
        return render(request, 'blog/home.html')
    except Exception as e:
        logger.error(f"Error in home view: {e}", exc_info=True)
        return render(request, 'blog/home.html', {'error': 'An error occurred.'})

def signup(request):
    try:
        if request.method == 'POST':
            form = UserCreationForm(request.POST)
            if form.is_valid():
                user = form.save()
                login(request, user)
                return redirect('home')
        else:
            form = UserCreationForm()
        return render(request, 'blog/signup.html', {'form': form})
    except Exception as e:
        logger.error(f"Error in signup view: {e}", exc_info=True)
        return render(request, 'blog/signup.html', {'form': UserCreationForm(), 'error': 'An error occurred.'})

@login_required
def create_post(request):
    try:
        return render(request, 'blog/create_post.html')
    except Exception as e:
        logger.error(f"Error in create_post view: {e}", exc_info=True)
        return render(request, 'blog/create_post.html', {'error': 'An error occurred.'})

@csrf_protect
def login_view(request):
    try:
        if request.method == 'POST':
            username = request.POST.get('username')
            password = request.POST.get('password')
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                refresh = RefreshToken.for_user(user)
                request.session['jwt_token'] = str(refresh.access_token)
                next_page = request.POST.get('next', '')
                if next_page:
                    return redirect(next_page)
                return redirect('home')
            else:
                messages.error(request, 'Invalid username or password')
        return render(request, 'blog/login.html')
    except Exception as e:
        logger.error(f"Error in login_view: {e}", exc_info=True)
        return render(request, 'blog/login.html', {'error': 'An error occurred.'})

def logout_view(request):
    try:
        logout(request)
        return HttpResponseRedirect(reverse('home'))
    except Exception as e:
        logger.error(f"Error in logout_view: {e}", exc_info=True)
        return HttpResponseRedirect(reverse('home'))

class IsOwnerReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:  # Changed from SAFE_METHOD to SAFE_METHODS
            return True
        return obj.user == request.user
    
class CategoryViewSet(ModelViewSet):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        queryset = super().get_queryset()
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(categories__name__iexact=category)
        return queryset
    
class CommentViewSet(ModelViewSet):
    queryset = Comment.objects.all().order_by('-created_at')
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

        
class PostViewSet(ModelViewSet):
    queryset = Post.objects.all().order_by('-created_at')
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Get search parameters
        category = self.request.query_params.get('category', None)
        search_query = self.request.query_params.get('search', None)
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        author = self.request.query_params.get('author', None)
        sort_by = self.request.query_params.get('sort_by', '-created_at')
        
        # Apply filters if provided
        if category:
            # Support multiple comma-separated categories
            category_list = [c.strip() for c in category.split(',') if c.strip()]
            if category_list:
                queryset = queryset.filter(categories__name__in=category_list).distinct()
        
        if search_query:
            # Search in title and content
            queryset = queryset.filter(
                models.Q(title__icontains=search_query) | 
                models.Q(content__icontains=search_query)
            )
        
        if date_from:
            try:
                queryset = queryset.filter(created_at__gte=date_from)
            except ValueError:
                pass
        
        if date_to:
            try:
                queryset = queryset.filter(created_at__lte=date_to)
            except ValueError:
                pass
        
        if author:
            queryset = queryset.filter(user__username__icontains=author)
        
        # Apply sorting
        valid_sort_fields = ['created_at', '-created_at', 'title', '-title', 'user__username', '-user__username']
        if sort_by in valid_sort_fields:
            queryset = queryset.order_by(sort_by)
        else:
            # Default sort by newest
            queryset = queryset.order_by('-created_at')
        
        return queryset

    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        """Get paginated comments for a specific post with username information"""
        post = self.get_object()
        page_size = int(request.query_params.get('page_size', 5))  # Default 5 comments per page
        page = int(request.query_params.get('page', 1))
        
        # Get all comments for this post
        all_comments = Comment.objects.filter(post=post).order_by('-created_at')
        
        # Calculate pagination indices
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        # Get paginated comments
        paginated_comments = all_comments[start_idx:end_idx]
        serializer = CommentSerializer(paginated_comments, many=True)
        
        # Enhance the serialized data with username information
        comments_data = serializer.data
        for comment_data in comments_data:
            user_id = comment_data.get('user')
            if user_id:
                try:
                    user = User.objects.get(id=user_id)
                    comment_data['username'] = user.username
                except User.DoesNotExist:
                    comment_data['username'] = 'Unknown User'
        
        # Add pagination info
        response_data = {
            'results': comments_data,
            'page': page,
            'total_comments': all_comments.count(),
            'has_more': end_idx < all_comments.count()
        }
        
        return Response(response_data)
