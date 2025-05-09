from rest_framework import serializers
from .models import Category, Post, Comment

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'created_at']

class CommentSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only = True)
    post = serializers.PrimaryKeyRelatedField(queryset=Post.objects.all())
    username = serializers.SerializerMethodField()
    
    def get_username(self, obj):
        return obj.user.username if obj.user else "Unknown"

    class Meta:
        model = Comment
        fields = ['id', 'user', 'username', 'post', 'content', 'created_at']

class PostSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only = True)
    username = serializers.SerializerMethodField()
    categories = CategorySerializer(many = True, read_only=True)
    category_ids = serializers.PrimaryKeyRelatedField(
        queryset = Category.objects.all(), many= True, write_only=True, source='categories'
    )
    
    def get_username(self, obj):
        return obj.user.username if obj.user else "Unknown"

    class Meta:
        model = Post
        fields = ['id', 'user', 'username', 'title', 'content', 'categories', 'category_ids', 'created_at', 'updated_at']