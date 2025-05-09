from django.db import models
from django.contrib.auth.models import User 
from django.core.exceptions import ValidationError 

class Category(models.Model):
    name = models.CharField(max_length=50, unique=True) 
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
    
class Post(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name = 'posts')
    title = models.CharField(max_length=200)
    content = models.TextField()
    categories = models.ManyToManyField(Category, related_name='posts', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title 
    
    def clean(self):
        if Post.objects.exclude(pk=self.pk).filter(user=self.user, title__iexact=self.title).exists():
            raise ValidationError(f"A Post with this title  '{self.title}' already exists for this user.")
        

class Comment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
                                      
    def __str__(self):
        return f"Comment by {self.user.username} on {self.post.title}"
    