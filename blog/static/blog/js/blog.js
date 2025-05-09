/**
 * Blog Platform JavaScript
 * Contains all functionality for posts, comments, and user interactions
 */

// Global variables
let currentUserId = null;
let searchParams = {};
// Configure the API base URL - helps with consistent API access
const API_BASE_URL = window.location.origin;  // Get the current origin (e.g., http://localhost:8000)

// Authentication handling
function getToken() {
    // Check if user is authenticated through Django's session
    const isAuthenticated = document.body.dataset.authenticated === 'true';
    if (isAuthenticated) {
        // For session-based auth, we'll use the CSRF token
        return {
            'X-CSRFToken': getCookie('csrftoken')
        };
    } else if (localStorage.getItem('token')) {
        // For token-based auth, use the stored token
        return {
            'Authorization': 'Bearer ' + localStorage.getItem('token'),
            'X-CSRFToken': getCookie('csrftoken')
        };
    }
    return {
        'X-CSRFToken': getCookie('csrftoken')
    };
}

function isAuthenticated() {
    return document.body.dataset.authenticated === 'true' || localStorage.getItem('token') !== null;
}

// Debug function to check if JavaScript is working
function updateDebugInfo(message) {
    $('#debug-info').html(`
        <p><strong>Debug Info:</strong> ${message}</p>
        <p>Time: ${new Date().toLocaleTimeString()}</p>
    `);
}

// Helper function to get CSRF token
function getCookie(name) {
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

// Utility function to sanitize HTML and keep only simple text (no tags)
function sanitizeHtmlToText(html) {
    // Create a temporary div and get only the text content
    var tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

/**
 * Search and Filtering Functions
 */
function buildSearchUrl(page = 1) {
    let url = `${API_BASE_URL}/api/posts/?page=${page}`;
    
    // Add search parameters if they exist
    if (searchParams.query) url += `&search=${encodeURIComponent(searchParams.query)}`;
    
    if (searchParams.categories && searchParams.categories.length) {
        const categoryParam = searchParams.categories.join(',');
        url += `&category=${encodeURIComponent(categoryParam)}`;
    }
    
    if (searchParams.author) url += `&author=${encodeURIComponent(searchParams.author)}`;
    if (searchParams.dateFrom) url += `&date_from=${encodeURIComponent(searchParams.dateFrom)}`;
    if (searchParams.dateTo) url += `&date_to=${encodeURIComponent(searchParams.dateTo)}`;
    if (searchParams.sortBy) url += `&sort_by=${encodeURIComponent(searchParams.sortBy)}`;
    
    return url;
}

function updateActiveFilters() {
    const $filterBadges = $('#filter-badges');
    $filterBadges.empty();
    let hasFilters = false;
    
    // Create badges for active filters
    if (searchParams.query) {
        $filterBadges.append(createFilterBadge('Search', searchParams.query, 'query'));
        hasFilters = true;
    }
    
    if (searchParams.categories && searchParams.categories.length) {
        searchParams.categories.forEach(category => {
            $filterBadges.append(createFilterBadge('Category', category, 'category', category));
        });
        hasFilters = true;
    }
    
    if (searchParams.author) {
        $filterBadges.append(createFilterBadge('Author', searchParams.author, 'author'));
        hasFilters = true;
    }
    
    if (searchParams.dateFrom) {
        $filterBadges.append(createFilterBadge('From', formatDateForDisplay(searchParams.dateFrom), 'dateFrom'));
        hasFilters = true;
    }
    
    if (searchParams.dateTo) {
        $filterBadges.append(createFilterBadge('To', formatDateForDisplay(searchParams.dateTo), 'dateTo'));
        hasFilters = true;
    }
    
    if (searchParams.sortBy && searchParams.sortBy !== '-created_at') {
        const sortText = {
            'created_at': 'Oldest First',
            '-created_at': 'Newest First',
            'title': 'Title A-Z',
            '-title': 'Title Z-A',
            'user__username': 'Author A-Z',
            '-user__username': 'Author Z-A'
        }[searchParams.sortBy] || searchParams.sortBy;
        
        $filterBadges.append(createFilterBadge('Sort', sortText, 'sortBy'));
        hasFilters = true;
    }
    
    // Show or hide the active filters section
    $('#active-filters').toggle(hasFilters);
    
    // Return whether we have any filters
    return hasFilters;
}

function createFilterBadge(label, value, type, specificValue = null) {
    const badge = $(`
        <span class="badge bg-info text-dark filter-badge">
            ${label}: ${value}
            <button type="button" class="btn-close btn-close-white btn-sm ms-1" 
                    data-filter-type="${type}" 
                    ${specificValue ? `data-specific-value="${specificValue}"` : ''} 
                    aria-label="Remove filter"></button>
        </span>
    `);
    
    // Add click handler for the close button
    badge.find('.btn-close').on('click', function() {
        const filterType = $(this).data('filter-type');
        const specificValue = $(this).data('specific-value');
        
        if (filterType === 'category' && specificValue) {
            // Remove specific category
            searchParams.categories = searchParams.categories.filter(c => c !== specificValue);
            if (searchParams.categories.length === 0) {
                delete searchParams.categories;
            }
        } else {
            // Remove other filter types
            delete searchParams[filterType];
        }
        
        // Update UI and reload posts
        updateActiveFilters();
        loadPosts();
    });
    
    return badge;
}

function formatDateForDisplay(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
}

/**
 * Post Management Functions
 */

function loadCategories(targetSelector = '#category_ids') {
    updateDebugInfo('Loading categories...');
    $.ajax({
        url: `${API_BASE_URL}/api/categories/`,
        type: 'GET',
        success: function(data) {
            updateDebugInfo('Categories loaded successfully!');
            console.log('Categories API response:', data);
            
            let html = '';
            let sidebarCategoryHtml = '';
            
            if (data.results && data.results.length > 0) {
                // For dropdowns (create post, edit post, search)
                data.results.forEach(category => {
                    html += `<option value="${category.id}">${category.name}</option>`;
                    
                    // For sidebar category list - as clickable badges
                    sidebarCategoryHtml += `
                        <a href="#" class="badge bg-secondary text-decoration-none category-filter" 
                           data-category="${category.name}">${category.name}</a>
                    `;
                });
            } else {
                html = '<option disabled>No categories available</option>';
                sidebarCategoryHtml = '<div class="text-muted">No categories available</div>';
            }
            
            // Update all relevant elements
            $(targetSelector).html(html);
            
            // Also populate the search categories dropdown with category names
            if (targetSelector === '#category_ids') {
                let searchCategoriesHtml = '';
                if (data.results && data.results.length > 0) {
                    data.results.forEach(category => {
                        searchCategoriesHtml += `<option value="${category.name}">${category.name}</option>`;
                    });
                }
                $('#search-categories').html(searchCategoriesHtml);
                
                // Update the sidebar category list
                $('#category-list').html(sidebarCategoryHtml);
            }
        },
        error: function(xhr, status, error) {
            updateDebugInfo('Error loading categories: ' + error);
            console.error('Categories API error:', xhr.responseText);
            $('#category-list').html('<div class="text-danger">Error loading categories</div>');
        }
    });
}

function truncateWords(text, wordLimit = 100) {
    // Remove extra whitespace
    const words = text.trim().split(/\s+/);
    if (words.length <= wordLimit) return { truncated: text, isTruncated: false };
    return { truncated: words.slice(0, wordLimit).join(' ') + '...', isTruncated: true };
}

function stripHtml(html) {
    // Remove all HTML tags and decode HTML entities
    var tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

function loadPosts(page = 1) {
    updateDebugInfo('Attempting to load posts...');
    
    // Build the URL with search parameters
    const url = buildSearchUrl(page);

    // Helper function to strip HTML tags from a string
    function stripHtml(html) {
        var tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    }
    
    $.ajax({
        url: url,
        type: 'GET',
        headers: getToken(),
        success: function(data) {
            console.log('Posts API response:', data);
            updateDebugInfo('Posts loaded successfully! Count: ' + (data.results ? data.results.length : 'unknown'));
            
            let html = '';
            if (!data.results || data.results.length === 0) {
                html = '<div class="alert alert-warning">No posts found matching your criteria.</div>';
            } else {
                data.results.forEach(post => {
                    // Always strip HTML before truncating
                    const plainTextContent = stripHtml(post.content);
                    const { truncated, isTruncated } = truncateWords(plainTextContent, 100);

                    html += `
                        <div class="card post-card mb-3" data-id="${post.id}">
                            <div class="card-body">
                                <h5 class="card-title">${post.title}</h5>
                                <p class="card-text" data-full-content="${encodeURIComponent(post.content)}">
                                    ${truncated}
                                </p>
                                ${isTruncated ? `<button class="btn btn-sm btn-link see-more" data-post-id="${post.id}">Read Full Article</button>` : ''}
                                <p><strong>Categories:</strong> ${post.categories && post.categories.length 
                                    ? post.categories.map(c => `<span class='badge bg-secondary me-1'>${c.name}</span>`).join(' ')
                                    : '<span class="text-muted">None</span>'}
                                </p>
                                <p><small class="text-muted">
                                    Posted by: ${post.username || 'Unknown User'} 
                                    on ${formatDate(post.created_at)}
                                </small></p>
                                <div class="d-flex gap-2">
                                    <button class="btn btn-sm btn-primary view-comments" data-bs-toggle="modal" data-bs-target="#commentModal">
                                        <i class="bi bi-chat"></i> Comments
                                    </button>
                                    ${isAuthenticated() && parseInt(currentUserId) === post.user ? `
                                        <button class="btn btn-sm btn-warning edit-post" data-bs-toggle="modal" data-bs-target="#editPostModal">
                                            <i class="bi bi-pencil"></i> Edit
                                        </button>
                                        <button class="btn btn-sm btn-danger delete-post">
                                            <i class="bi bi-trash"></i> Delete
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
            $('#post-list').html(html);

            // Update pagination
            let paginationHtml = '';
            if (data.previous) {
                paginationHtml += `<a href="#" class="btn btn-sm btn-outline-primary me-2 page-link" data-page="${page-1}">Previous</a>`;
            }
            if (data.next) {
                paginationHtml += `<a href="#" class="btn btn-sm btn-outline-primary page-link" data-page="${page+1}">Next</a>`;
            }
            $('#pagination').html(paginationHtml);
        },
        error: function(xhr, status, error) {
            updateDebugInfo('Error loading posts: ' + error);
            console.error('Posts API error:', xhr.responseText);
            $('#post-list').html('<div class="alert alert-danger">Error loading posts. See console for details.</div>');
        }
    });
}

// See More and Read Less button handler
$(document).on('click', '.see-more', function(e) {
    e.preventDefault();
    const postCard = $(this).closest('.post-card');
    const fullContent = decodeURIComponent(postCard.find('.card-text').data('full-content'));
    postCard.find('.card-text').html(fullContent.replace(/\n/g, '<br>'));
    // Add Read Less button
    $(this).replaceWith('<button class="btn btn-sm btn-link read-less">Read Less</button>');
});

$(document).on('click', '.read-less', function(e) {
    e.preventDefault();
    const postCard = $(this).closest('.post-card');
    const fullContent = decodeURIComponent(postCard.find('.card-text').data('full-content'));
    // Truncate again to 100 words
    const plainTextContent = stripHtml(fullContent);
    const { truncated, isTruncated } = truncateWords(plainTextContent, 100);
    postCard.find('.card-text').html(truncated);
    // Add See More button if needed
    if (isTruncated) {
        $(this).replaceWith('<button class="btn btn-sm btn-link see-more">Read Full Article</button>');
    } else {
        $(this).remove();
    }
});

/**
 * Comment Management Functions
 */

// Track current comment page and post ID for pagination
let currentCommentPage = 1;
let currentPostId = null;
let commentsPerPage = 5;

function loadComments(postId, page = 1, append = false) {
    // Store current post ID for pagination
    currentPostId = postId;
    currentCommentPage = page;
    
    $.ajax({
        url: `${API_BASE_URL}/api/posts/${postId}/comments/?page=${page}&page_size=${commentsPerPage}`,
        type: 'GET',
        success: function(data) {
            console.log('Comments API response:', data);
            
            let commentsHtml = '';
            
            // Generate HTML for comments
            if (data.results && data.results.length > 0) {
                data.results.forEach(comment => {
                    commentsHtml += `
                        <div class="comment mb-3 p-3 border-bottom">
                            <div class="d-flex align-items-start">
                                <div class="comment-avatar me-2">
                                    <div class="rounded-circle bg-secondary bg-opacity-25 text-center" 
                                         style="width: 40px; height: 40px; line-height: 40px;">
                                        ${comment.username ? comment.username.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                </div>
                                <div class="comment-content flex-grow-1">
                                    <div class="d-flex justify-content-between">
                                        <h6 class="mb-1 fw-bold">${comment.username || 'Unknown User'}</h6>
                                        <small class="text-muted">${formatDate(comment.created_at)}</small>
                                    </div>
                                    <p class="mb-0">${comment.content}</p>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
            
            // If we're appending (Show More button was clicked)
            if (append) {
                // Append new comments to existing comments
                $('#comments-list').append(commentsHtml);
            } else {
                // First load - replace all contents
                if (data.total_comments === 0) {
                    $('#comments-list').html('<p>No comments yet. Be the first to comment!</p>');
                } else {
                    $('#comments-list').html(`
                        <h6 class="mb-3">${data.total_comments} Comment${data.total_comments !== 1 ? 's' : ''}</h6>
                        ${commentsHtml}
                    `);
                }
            }
            
            // Update or remove the "Show More" button based on whether there are more comments
            if (data.has_more) {
                if ($('#load-more-comments').length === 0) {
                    $('#comments-list').append(`
                        <div class="text-center mt-3">
                            <button id="load-more-comments" class="btn btn-sm btn-outline-primary">
                                Show More Comments
                            </button>
                        </div>
                    `);
                }
            } else {
                $('#load-more-comments').remove();
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading comments:', xhr.responseText);
            $('#comments-list').html('<p class="text-danger">Error loading comments.</p>');
        }
    });
}

// Format date for better display
function formatDate(dateString) {
    const date = new Date(dateString);
    // Return a relative time if recent, otherwise a formatted date
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // Difference in seconds
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    
    // For older comments, show the actual date
    return date.toLocaleDateString();
}

/**
 * Format post content for better display in the read modal
 * This converts line breaks to paragraphs for better readability
 */
function formatPostContentForDisplay(content) {
    if (!content) return '';
    
    // Split by double line breaks for paragraphs
    const paragraphs = content.split(/\n\s*\n/);
    return paragraphs.map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`).join('');
}

/**
 * Document Ready - Event Handlers
 */
$(document).ready(function() {
    console.log('Document ready, loading data...');
    updateDebugInfo('Page loaded, initializing...');
    
    // Store the current user ID from the data attribute
    currentUserId = document.body.dataset.userId || null;
    
    // Check for stored token
    if (document.body.dataset.jwtToken) {
        localStorage.setItem('token', document.body.dataset.jwtToken);
        console.log('JWT token saved from session');
    }
    
    // First verify we can manipulate the DOM
    $('#post-list').html('<p>Initializing...</p>');
    
    // Add click handler for the "Create New Post" button
    $('#create-post-btn').on('click', function() {
        window.location.href = `${API_BASE_URL}/create-post/`;
    });
    
    // Load initial data
    setTimeout(function() {
        loadCategories();
        loadCategories('#edit-category-ids');
        loadPosts();
    }, 500); // Small delay to ensure DOM is ready
    
    // Post form submission
    $('#post-form').submit(function(e) {
        e.preventDefault();
        const postData = {
            title: $('#title').val(),
            // Sanitize content before saving
            content: sanitizeHtmlToText($('#content').val()),
            category_ids: $('#category_ids').val()
        };
        $.ajax({
            url: `${API_BASE_URL}/api/posts/`,
            type: 'POST', 
            data: JSON.stringify(postData),
            contentType: 'application/json',
            headers: getToken(),
            success: function(response) {
                console.log('Post created successfully:', response);
                $('#post-form')[0].reset();
                // Ensure posts are reloaded and truncation logic is applied
                loadPosts();
                alert('Post created successfully');
            },
            error: function(xhr, status, error) {
                console.error('Error creating post:', xhr.responseText);
                alert('Error: '+ (xhr.responseJSON?.detail || error || 'Failed to create post.'));
            }
        });
    });
    
    // Comment functionality
    $(document).on('click', '.view-comments', function() {
        const postId = $(this).closest('.post-card').data('id');
        $('#comment-post-id').val(postId);
        console.log('Comment dialog opened for post ID:', postId);
        
        // Reset to first page when opening the modal
        currentCommentPage = 1;
        
        // Update modal title to include post title
        const postTitle = $(this).closest('.post-card').find('.card-title').text();
        $('#commentModalLabel').text(`Comments on "${postTitle}"`);
        
        // Load initial comments
        loadComments(postId);
    });
    
    // "Show More Comments" button handler
    $(document).on('click', '#load-more-comments', function() {
        currentCommentPage++;
        loadComments(currentPostId, currentCommentPage, true);
    });
    
    // Save comment handler
    $('#save-comment').click(function() {
        const postId = $('#comment-post-id').val();
        const content = $('#comment-content').val();
        
        if (!content) {
            alert('Please enter a comment');
            return;
        }
        
        console.log('Saving comment for post ID:', postId);
        
        const commentData = {
            post: postId,
            content: content
        };
        
        $.ajax({
            url: `${API_BASE_URL}/api/comments/`,
            type: 'POST',
            data: JSON.stringify(commentData),
            contentType: 'application/json',
            headers: getToken(),
            success: function(response) {
                console.log('Comment added successfully:', response);
                
                // Clear the form but don't close the modal
                $('#comment-content').val('');
                
                // Reload the comments to include the new one
                loadComments(postId);
                
                // Show success message in modal instead of alert
                const successMessage = `
                    <div class="alert alert-success alert-dismissible fade show" role="alert">
                        Comment added successfully!
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    </div>
                `;
                $('#comment-form').before(successMessage);
                
                // Auto-hide the message after 3 seconds
                setTimeout(function() {
                    $('.alert-success').alert('close');
                }, 3000);
            },
            error: function(xhr, status, error) {
                console.error('Error adding comment:', xhr.responseText);
                
                // Show error message in modal
                const errorMessage = `
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        Failed to add comment: ${xhr.responseJSON?.detail || error}
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    </div>
                `;
                $('#comment-form').before(errorMessage);
            }
        });
    });
    
    // Edit post handler
$(document).on('click', '.edit-post', function() {
    const postId = $(this).closest('.post-card').data('id');
    const postTitle = $(this).closest('.post-card').find('.card-title').text();
    // Always get the original content from data-full-content
    const encodedContent = $(this).closest('.post-card').find('.card-text').data('full-content');
    // Sanitize the HTML to plain text for editing
    const postContent = encodedContent ? sanitizeHtmlToText(decodeURIComponent(encodedContent)) : '';

    $('#edit-post-id').val(postId);
    $('#edit-title').val(postTitle);
    $('#edit-content').val(postContent);

    // Populate categories - would require an additional API call to get current categories
    // For now we're just showing all available categories

    $('#editPostModal').modal('show');
});
    
    // Save edited post handler
    $('#save-edit-post').click(function() {
        const postId = $('#edit-post-id').val();
        const title = $('#edit-title').val();
        // Sanitize content before saving
        const content = sanitizeHtmlToText($('#edit-content').val());
        const category_ids = $('#edit-category-ids').val();
        
        if (title && content) {
            $.ajax({
                url: `${API_BASE_URL}/api/posts/${postId}/`,
                type: 'PATCH',
                data: JSON.stringify({ 
                    title, 
                    content,
                    category_ids: category_ids || []
                }),
                contentType: 'application/json',
                headers: getToken(),
                success: function(response) {
                    console.log('Post updated successfully:', response);
                    $('#editPostModal').modal('hide');
                    // Ensure posts are reloaded and truncation logic is applied
                    loadPosts();
                    alert('Post updated successfully');
                },
                error: function(xhr, status, error) {
                    console.error('Error updating post:', xhr.responseText);
                    alert('Failed to update post: ' + (xhr.responseJSON?.detail || error));
                }
            });
        }
    });
    
    // Delete post handler
    $(document).on('click', '.delete-post', function() {
        if (confirm('Are you sure you want to delete this post?')) {
            const postId = $(this).closest('.post-card').data('id');
            $.ajax({
                url: `${API_BASE_URL}/api/posts/${postId}/`,
                type: 'DELETE',
                headers: getToken(),
                success: function() {
                    console.log('Post deleted successfully');
                    loadPosts();
                    alert('Post deleted successfully');
                },
                error: function(xhr, status, error) {
                    console.error('Error deleting post:', xhr.responseText);
                    alert('Failed to delete this post: ' + (xhr.responseJSON?.detail || error));
                }
            });
        }
    });
    
    // Category filter
    $('#filter-btn').click(function() {
        const category = $('#category-filter').val();
        loadPosts(category);
    });
    
    // Logout handler - moved from base.html
    $("#logout-link").click(function(e) {
        // Clear any stored tokens before logout
        localStorage.removeItem('token');
        // Continue with the normal link behavior
        return true;
    });

    // Handle search form submission
    $('#search-form').on('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        searchParams = {
            query: $('#search-query').val().trim() || null,
            sortBy: $('#search-sort').val(),
            author: $('#search-author').val().trim() || null,
            dateFrom: $('#search-date-from').val() || null,
            dateTo: $('#search-date-to').val() || null,
        };
        
        // Get selected categories
        const selectedCategories = [];
        $('#search-categories option:selected').each(function() {
            selectedCategories.push($(this).val());
        });
        
        if (selectedCategories.length > 0) {
            searchParams.categories = selectedCategories;
        }
        
        // Update UI to show active filters
        updateActiveFilters();
        
        // Load posts with search parameters
        loadPosts();
    });
    
    // Handle search form reset
    $('#search-reset').on('click', function() {
        searchParams = {};
        updateActiveFilters();
        loadPosts();
        
        // Reset the form fields
        $('#search-form')[0].reset();
    });
    
    // Handle pagination clicks
    $(document).on('click', '.page-link', function(e) {
        e.preventDefault();
        const page = $(this).data('page');
        loadPosts(page);
        
        // Scroll back to top of results
        $('html, body').animate({
            scrollTop: $('#post-list').offset().top - 20
        }, 200);
    });
    
    // Category sidebar filter clicks
    $(document).on('click', '.category-filter', function(e) {
        e.preventDefault();
        const category = $(this).data('category');
        
        // Initialize categories array if it doesn't exist
        if (!searchParams.categories) {
            searchParams.categories = [];
        }
        
        // Add category to search params if not already included
        if (!searchParams.categories.includes(category)) {
            searchParams.categories.push(category);
            
            // Update UI to show active filters
            updateActiveFilters();
            
            // Load posts with updated filters
            loadPosts();
        }
    });
    
$(document).on('click', '.read-more', function(e) {
    e.preventDefault();
    const postCard = $(this).closest('.post-card');
    const postId = postCard.data('id');
    const postTitle = postCard.find('.card-title').text();
    // Decode the encoded content before use
    const encodedContent = postCard.find('.card-text').data('full-content');
    const fullContent = decodeURIComponent(encodedContent);
    const postMeta = postCard.find('small.text-muted').html(); // Get the author and date
    const categories = postCard.find('p:contains("Categories")').html();
    
    console.log('Opening full article for post ID:', postId);
    console.log('Content length:', fullContent ? fullContent.length : 0);
    
    // Populate the modal with post data
    $('#full-post-title').text(postTitle);
    $('#full-post-meta').html(postMeta);
    $('#full-post-categories').html(categories);
    
    // Format the content with proper paragraphs
    const formattedContent = formatPostContentForDisplay(fullContent);
    $('#full-post-content').html(formattedContent);
    
    // Store the post ID for the "View Comments" button
    $('.view-comments-from-post').data('post-id', postId);
    
    // Open the modal
    $('#readPostModal').modal('show');
});
    
    // Handle "View Comments" button in read post modal
    $(document).on('click', '.view-comments-from-post', function() {
        const postId = $(this).data('post-id');
        $('#comment-post-id').val(postId);
        
        // Set comment modal title
        $('#commentModalLabel').text(`Comments on "${$('#full-post-title').text()}"`);
        
        // Load comments
        currentCommentPage = 1;
        loadComments(postId);
        
        // Close the read post modal first
        $('#readPostModal').modal('hide');
    });
});