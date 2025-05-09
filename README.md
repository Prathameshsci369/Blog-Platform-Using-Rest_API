# Blog Platform Using Rest API


A simple blog platform built with Django and Django REST Framework. Users can register, log in, create posts, comment, and browse posts by category. The project features JWT authentication, a RESTful API, and a clean web interface.

## Features
- User registration and authentication (session & JWT)
- Create, edit, and delete blog posts
- Comment on posts
- Category management
- RESTful API endpoints
- Error logging to a central log file

## Tech Stack
- Python 3
- Django
- Django REST Framework
- SimpleJWT (for JWT authentication)
- SQLite (default, can be changed)
- HTML/CSS/JS (Bootstrap for frontend)

## Installation & Setup

### Linux
1. **Clone the repository:**
   ```bash
   git clone https://github.com/Prathameshsci369/Blog-Platform-Using-Rest_API/
   cd Blog-Platform-Using-Rest_API
   ```
2. **Run the setup script:**
   ```bash
   bash setup.sh
   ```
   This will:
   - Create a virtual environment (`newvenv`)
   - Install dependencies
   - Run migrations
   - Collect static files
   - Optionally create a superuser
3. **Run the development server:**
   ```bash
   source newvenv/bin/activate
   python blog_platform/manage.py runserver
   ```
4. **Access the app:**
   Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/) in your browser.

### Windows
1. **Clone the repository:**
   ```cmd
   git clone https://github.com/Prathameshsci369/Blog-Platform-Using-Rest_API/
   cd application
   ```
2. **Create and activate a virtual environment:**
   ```cmd
   python -m venv newvenv
   newvenv\Scripts\activate
   ```
3. **Install dependencies:**
   ```cmd
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
4. **Run migrations and collect static files:**
   ```cmd
   python blog_platform/manage.py makemigrations
   python blog_platform/manage.py migrate
   python blog_platform/manage.py collectstatic --noinput
   ```
5. **(Optional) Create a superuser:**
   ```cmd
   python blog_platform/manage.py createsuperuser
   ```
6. **Run the development server:**
   ```cmd
   python blog_platform/manage.py runserver
   ```
7. **Access the app:**
   Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/) in your browser.

## Logging
All errors are logged to `blog_platform/blog_platform.log` for easy debugging.

## License
MIT License 
