// Global variables
let currentUser = null;

// Navigation function
function navigateTo(hash) {
    window.location.hash = hash;
}

// Main routing logic
function handleRouting() {
    const hash = window.location.hash.slice(1) || '/';
    let route = hash.startsWith('/') ? hash.slice(1) : hash;

    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Protected routes
    const protectedRoutes = ['profile', 'requests'];
    const adminRoutes = ['employees', 'departments', 'accounts'];

    // Check authentication
    if (protectedRoutes.includes(route) && !currentUser) {
        showToast('Please login to access this page', 'warning');
        navigateTo('#/login');
        return;
    }

    // Check admin access
    if (adminRoutes.includes(route) && (!currentUser || currentUser.role !== 'admin')) {
        showToast('Access denied. Admin privileges required.', 'danger');
        navigateTo('#/');
        return;
    }

    // Route to page
    let pageId = route === '' || route === '/' ? 'home' : route;
    const targetPage = document.getElementById(`${pageId}-page`);

    if (targetPage) {
        targetPage.classList.add('active');

        // Call render functions for specific pages
        switch(pageId) {
            case 'verify-email':
                renderVerifyEmail();
                break;
            case 'profile':
                renderProfile();
                break;
            case 'employees':
                renderEmployeesTable();
                break;
            case 'accounts':
                renderAccountsList();
                break;
            case 'departments':
                renderDepartmentsList();
                break;
            case 'requests':
                renderRequestsList();
                break;
        }
    }
}

// Set authentication state
function setAuthState(isAuthenticated, user = null) {
    currentUser = user;

    const body = document.body;

    if (isAuthenticated && user) {
        body.classList.remove('not-authenticated');
        body.classList.add('authenticated');
        document.getElementById('username-display').textContent = user.firstName;

        if (user.role === 'admin') {
            body.classList.add('is-admin');
        } else {
            body.classList.remove('is-admin');
        }
    } else {
        body.classList.remove('authenticated', 'is-admin');
        body.classList.add('not-authenticated');
        currentUser = null;
    }
}

// ==================== AUTH FUNCTIONS ====================

// Handle Registration
async function handleRegister(e) {
    e.preventDefault();

    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName = document.getElementById('reg-lastname').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            sessionStorage.setItem('unverified_email', email);
            showToast(data.message, 'success');
            navigateTo('#/verify-email');
            document.getElementById('register-form').reset();
        } else {
            showToast(data.message, 'danger');
        }
    } catch (error) {
        showToast('Registration failed. Please try again.', 'danger');
        console.error('Registration error:', error);
    }
}

// Handle Email Verification
async function handleVerifyEmail() {
    const email = sessionStorage.getItem('unverified_email');

    if (!email) {
        showToast('No email to verify', 'danger');
        return;
    }

    try {
        const response = await fetch('/api/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            sessionStorage.removeItem('unverified_email');
            showToast(data.message, 'success');
            navigateTo('#/login');
        } else {
            showToast(data.message, 'danger');
        }
    } catch (error) {
        showToast('Verification failed. Please try again.', 'danger');
        console.error('Verification error:', error);
    }
}

// Render Verify Email Page
function renderVerifyEmail() {
    const email = sessionStorage.getItem('unverified_email');
    if (email) {
        const display = document.getElementById('verify-email-display');
        if (display) {
            display.textContent = email;
        }
    }
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Store token and user in sessionStorage
            sessionStorage.setItem('authToken', data.token);
            sessionStorage.setItem('currentUser', JSON.stringify(data.user));

            setAuthState(true, data.user);
            showToast(`Welcome back, ${data.user.firstName}!`, 'success');
            navigateTo('#/profile');
            document.getElementById('login-form').reset();
        } else {
            showToast(data.message, 'danger');
        }
    } catch (error) {
        showToast('Login failed. Please try again.', 'danger');
        console.error('Login error:', error);
    }
}

// Handle Logout
function handleLogout() {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('currentUser');
    setAuthState(false);
    showToast('Logged out successfully', 'info');
    navigateTo('#/');
}

// ==================== PROFILE ====================

async function renderProfile() {
    const token = sessionStorage.getItem('authToken');
    
    if (!token) {
        navigateTo('#/login');
        return;
    }

    try {
        const response = await fetch('/api/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            const profileContent = document.getElementById('profile-content');
            profileContent.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>First Name:</strong> ${data.firstName}</p>
                        <p><strong>Last Name:</strong> ${data.lastName}</p>
                        <p><strong>Email:</strong> ${data.email}</p>
                        <p><strong>Role:</strong>
                            <span class="badge bg-${data.role === 'admin' ? 'danger' : 'primary'}">
                                ${data.role}
                            </span>
                        </p>
                        <p><strong>Account Created:</strong>
                            ${new Date(data.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            `;
        } else {
            showToast('Failed to load profile', 'danger');
            sessionStorage.clear();
            navigateTo('#/login');
        }
    } catch (error) {
        showToast('Error loading profile', 'danger');
        console.error('Profile error:', error);
    }
}

// ==================== ADMIN ROUTES ====================

async function renderAccountsList() {
    const token = sessionStorage.getItem('authToken');

    try {
        const response = await fetch('/api/admin/accounts', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            const container = document.getElementById('accounts-table-container');
            if (data.accounts.length === 0) {
                container.innerHTML = '<p class="text-muted">No accounts found.</p>';
                return;
            }

            let html = `
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Verified</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.accounts.forEach(account => {
                html += `
                    <tr>
                        <td>${account.firstName} ${account.lastName}</td>
                        <td>${account.email}</td>
                        <td><span class="badge bg-${account.role === 'admin' ? 'danger' : 'primary'}">${account.role}</span></td>
                        <td>${account.verified ? '✅' : '❌'}</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;

            container.innerHTML = html;
        } else {
            showToast(data.message, 'danger');
        }
    } catch (error) {
        showToast('Error loading accounts', 'danger');
        console.error('Accounts error:', error);
    }
}

async function renderDepartmentsList() {
    const token = sessionStorage.getItem('authToken');

    try {
        const response = await fetch('/api/admin/departments', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            const container = document.getElementById('departments-table-container');
            
            if (data.departments.length === 0) {
                container.innerHTML = '<p class="text-muted">No departments found.</p>';
                return;
            }

            let html = '<div class="list-group">';

            data.departments.forEach(dept => {
                html += `
                    <div class="list-group-item">
                        <h5>${dept.name}</h5>
                        <p class="mb-0 text-muted">${dept.description}</p>
                    </div>
                `;
            });

            html += '</div>';

            container.innerHTML = html;
        } else {
            showToast(data.message, 'danger');
        }
    } catch (error) {
        showToast('Error loading departments', 'danger');
        console.error('Departments error:', error);
    }
}

async function renderEmployeesTable() {
    const token = sessionStorage.getItem('authToken');

    try {
        const response = await fetch('/api/admin/employees', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            const container = document.getElementById('employees-table-container');
            
            if (data.employees.length === 0) {
                container.innerHTML = '<p class="text-muted">No employees found.</p>';
                return;
            }

            // Render employees table here
            container.innerHTML = '<p class="text-muted">Employees feature coming soon.</p>';
        } else {
            showToast(data.message, 'danger');
        }
    } catch (error) {
        showToast('Error loading employees', 'danger');
        console.error('Employees error:', error);
    }
}

function renderRequestsList() {
    const container = document.getElementById('requests-table-container');
    container.innerHTML = '<p class="text-muted">Requests feature coming soon.</p>';
}

// ==================== UTILITY FUNCTIONS ====================

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
        console.warn('Toast container not found');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// ==================== INITIALIZATION ====================

function initializeEventListeners() {
    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Verify email button
    const verifyBtn = document.getElementById('simulate-verify-btn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', handleVerifyEmail);
    }

    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Navigation links
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const hash = link.getAttribute('href');
            navigateTo(hash);
        });
    });
}

// Initialize app
function init() {
    console.log('Initializing app...');

    // Check for existing session
    const authToken = sessionStorage.getItem('authToken');
    const userStr = sessionStorage.getItem('currentUser');

    if (authToken && userStr) {
        try {
            const user = JSON.parse(userStr);
            setAuthState(true, user);
        } catch (error) {
            sessionStorage.clear();
        }
    }

    // Set up event listeners
    initializeEventListeners();

    // Handle routing
    window.addEventListener('hashchange', handleRouting);
    handleRouting();

    console.log('App initialized!');
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);