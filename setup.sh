#!/bin/bash

# Exit on error
set -e

# 1. Create virtual environment if not exists
if [ ! -d "newvenv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv newvenv
fi

# 2. Activate virtual environment
source newvenv/bin/activate

# 3. Install requirements
pip install --upgrade pip
pip install -r requirements.txt

# 4. Run migrations
python blog_platform/manage.py makemigrations
python blog_platform/manage.py migrate

# 5. Collect static files
echo "Collecting static files..."
python blog_platform/manage.py collectstatic --noinput

# 6. Prompt to create superuser
read -p "Do you want to create a Django superuser now? (y/n): " create_superuser
if [ "$create_superuser" == "y" ]; then
    python blog_platform/manage.py createsuperuser
fi

echo "\nSetup complete! You can now run the server with:"
echo "source newvenv/bin/activate && python blog_platform/manage.py runserver"
