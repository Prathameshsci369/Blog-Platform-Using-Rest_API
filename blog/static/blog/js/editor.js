document.addEventListener('DOMContentLoaded', function() {
    // Editor elements
    const editor = document.getElementById('editor');
    const contentField = document.getElementById('content');
    const postForm = document.getElementById('post-form');
    const fullscreenToggle = document.getElementById('fullscreen-toggle');
    const editorToolbar = document.querySelector('.editor-toolbar');
    const formatButtons = document.querySelectorAll('[data-format]');
    
    // Link modal elements
    const linkModal = new bootstrap.Modal(document.getElementById('linkModal'));
    const linkText = document.getElementById('link-text');
    const linkUrl = document.getElementById('link-url');
    const insertLinkBtn = document.getElementById('insert-link');
    
    // Image modal elements
    const imageModal = new bootstrap.Modal(document.getElementById('imageModal'));
    const imageUrl = document.getElementById('image-url');
    const imageAlt = document.getElementById('image-alt');
    const insertImageBtn = document.getElementById('insert-image');
    
    // Add placeholder to editor
    editor.setAttribute('data-placeholder', 'Start writing your post here...');
    
    // Save selection state for modals
    let savedSelection = null;
    
    // Formatting functions
    function formatDoc(command, value = null) {
        document.execCommand(command, false, value);
        editor.focus();
    }
    
    // Save current selection
    function saveSelection() {
        const sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            savedSelection = sel.getRangeAt(0);
        }
    }
    
    // Restore saved selection
    function restoreSelection() {
        if (savedSelection) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedSelection);
        }
    }
    
    // Init editor content from localStorage if available
    if (localStorage.getItem('editorContent')) {
        editor.innerHTML = localStorage.getItem('editorContent');
    }
    
    // Autosave content to localStorage
    function autosaveContent() {
        localStorage.setItem('editorContent', editor.innerHTML);
    }
    
    // Set interval for autosave (every 30 seconds)
    const autosaveInterval = setInterval(autosaveContent, 30000);
    
    // Handle editor toolbar buttons
    formatButtons.forEach(button => {
        button.addEventListener('click', () => {
            const format = button.getAttribute('data-format');
            
            switch(format) {
                case 'h1':
                    formatDoc('formatBlock', '<h1>');
                    break;
                case 'h2':
                    formatDoc('formatBlock', '<h2>');
                    break;
                case 'h3':
                    formatDoc('formatBlock', '<h3>');
                    break;
                case 'bold':
                    formatDoc('bold');
                    break;
                case 'italic':
                    formatDoc('italic');
                    break;
                case 'underline':
                    formatDoc('underline');
                    break;
                case 'ul':
                    formatDoc('insertUnorderedList');
                    break;
                case 'ol':
                    formatDoc('insertOrderedList');
                    break;
                case 'link':
                    saveSelection();
                    const selectedText = window.getSelection().toString();
                    linkText.value = selectedText;
                    linkUrl.value = '';
                    linkModal.show();
                    break;
                case 'image':
                    saveSelection();
                    imageUrl.value = '';
                    imageAlt.value = '';
                    imageModal.show();
                    break;
            }
        });
    });
    
    // Insert link
    insertLinkBtn.addEventListener('click', () => {
        restoreSelection();
        if (linkUrl.value) {
            const text = linkText.value.trim() || linkUrl.value;
            const html = `<a href="${linkUrl.value}" target="_blank">${text}</a>`;
            formatDoc('insertHTML', html);
        }
        linkModal.hide();
    });
    
    // Insert image
    insertImageBtn.addEventListener('click', () => {
        restoreSelection();
        if (imageUrl.value) {
            const alt = imageAlt.value || 'Image';
            const html = `<img src="${imageUrl.value}" alt="${alt}" class="img-fluid">`;
            formatDoc('insertHTML', html);
        }
        imageModal.hide();
    });
    
    // Handle fullscreen toggle
    fullscreenToggle.addEventListener('click', () => {
        document.body.classList.toggle('fullscreen-mode');
        const container = document.querySelector('.container-fluid');
        container.classList.toggle('fullscreen-editor');
        
        // Update button icon
        const icon = fullscreenToggle.querySelector('i');
        if (document.body.classList.contains('fullscreen-mode')) {
            icon.classList.remove('bi-arrows-fullscreen');
            icon.classList.add('bi-fullscreen-exit');
        } else {
            icon.classList.remove('bi-fullscreen-exit');
            icon.classList.add('bi-arrows-fullscreen');
        }
    });
    
    // Form submission
    postForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get editor content
        const editorContent = editor.innerHTML;
        
        // Check if editor has content
        if (!editorContent || editorContent.trim() === '') {
            alert('Please enter some content for your post.');
            return;
        }
        
        // Update hidden content field with editor HTML
        contentField.value = editorContent;
        
        // Get title
        const title = document.getElementById('title').value;
        if (!title) {
            alert('Please enter a title for your post.');
            return;
        }
        
        // Get category IDs
        const categorySelect = document.getElementById('category_ids');
        const categoryIds = Array.from(categorySelect.selectedOptions).map(option => option.value);
        
        // Validate categories
        if (categoryIds.length === 0) {
            alert('Please select at least one category for your post.');
            return;
        }
        
        // Get featured status
        const featured = document.getElementById('featured-post').checked;
        
        // Prepare form data
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', contentField.value);
        formData.append('featured', featured);
        categoryIds.forEach(id => {
            formData.append('category_ids', id);
        });
        
        // Log the form data for debugging
        console.log('Submitting post with data:', {
            title: title,
            content: contentField.value.substring(0, 100) + '...',
            featured: featured,
            categories: categoryIds
        });
        
        // Send AJAX request
        fetch('/api/posts/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'Accept': 'application/json'
            },
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(JSON.stringify(errorData));
                }).catch(() => {
                    throw new Error('Network response was not ok: ' + response.status);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Post created successfully:', data);
            
            // Clear localStorage
            localStorage.removeItem('editorContent');
            
            // Show success message
            alert('Post created successfully!');
            
            // Redirect to home page
            window.location.href = '/';
        })
        .catch(error => {
            console.error('Error creating post:', error);
            
            let errorMessage = 'There was an error creating your post. Please try again.';
            
            try {
                const errorData = JSON.parse(error.message);
                if (errorData) {
                    errorMessage = Object.entries(errorData)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join('\n');
                }
            } catch (e) {
                // Use default error message
            }
            
            alert('Error: ' + errorMessage);
        });
    });
    
    // Get CSRF token from cookies
    function getCsrfToken() {
        const name = 'csrftoken';
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    
    // Fetch and populate categories
    function fetchCategories() {
        console.log('Fetching categories...');
        fetch('/api/categories/')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log('Categories data received:', data);
            const categorySelect = document.getElementById('category_ids');
            
            // Clear existing options first
            categorySelect.innerHTML = '';
            
            // Check if data is an array or has a results property
            const categories = Array.isArray(data) ? data : (data.results || []);
            
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
            
            console.log('Categories loaded successfully');
        })
        .catch(error => {
            console.error('Error fetching categories:', error);
        });
    }
    
    // Initialize categories
    fetchCategories();
    
    // Add keyboard shortcuts
    editor.addEventListener('keydown', function(e) {
        // Save with Ctrl+S
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            autosaveContent();
            
            // Show temporary save notification
            const notification = document.createElement('div');
            notification.className = 'alert alert-success position-fixed top-0 end-0 m-3';
            notification.style.zIndex = '1050';
            notification.textContent = 'Draft saved';
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 2000);
        }
        
        // Bold: Ctrl+B
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            formatDoc('bold');
        }
        
        // Italic: Ctrl+I
        if (e.ctrlKey && e.key === 'i') {
            e.preventDefault();
            formatDoc('italic');
        }
        
        // Underline: Ctrl+U
        if (e.ctrlKey && e.key === 'u') {
            e.preventDefault();
            formatDoc('underline');
        }
    });
    
    // Clean up on page unload
    window.addEventListener('beforeunload', function() {
        clearInterval(autosaveInterval);
    });
});