from django.core.management.base import BaseCommand
from blog.models import Category

class Command(BaseCommand):
    help = 'Creates test categories for the blog platform'

    def handle(self, *args, **kwargs):
        # List of categories to create
        categories = [
            'Technology',
            'Health',
            'Science',
            'Business',
            'Entertainment',
            'Sports',
            'Politics',
            'Education',
            'Travel',
            'Food',
            'Fashion',
            'Art',
            'Beauty',
            'lifestyle',
            'trending',
            'social media',
            'fake-news',
            'astronomy',
            'astrology'
        ]

        # Create categories that don't already exist
        created_count = 0
        for category_name in categories:
            category, created = Category.objects.get_or_create(name=category_name)
            if created:
                created_count += 1
                self.stdout.write(f'Created category: {category_name}')

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {created_count} new categories. {len(categories) - created_count} already existed.'
            )
        )