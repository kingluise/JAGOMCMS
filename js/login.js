// js/login.js - No import needed

// Define API_BASE_URL directly
const API_BASE_URL = 'https://jagomcms-001-site1.ktempurl.com/api';

// Initialize only branch data (no user initialization)
function initDefaults() {
    if (!localStorage.getItem('branches')) {
        localStorage.setItem('branches', JSON.stringify(["Opebi", "Ikorodu", "Otuyelu", "Likosi"]));
    }
    if (!localStorage.getItem('members')) {
        localStorage.setItem('members', JSON.stringify([]));
    }
    if (!localStorage.getItem('attendance')) {
        localStorage.setItem('attendance', JSON.stringify([]));
    }
    if (!localStorage.getItem('usherSubmissions')) {
        localStorage.setItem('usherSubmissions', JSON.stringify([]));
    }
}

initDefaults();

// Check if already logged in
if (localStorage.getItem('token') && localStorage.getItem('isLoggedIn') === 'true') {
    window.location.href = 'dashboard.html';
}

// Load logo
const logo = localStorage.getItem('jagomLogo');
if (logo) {
    const loginLogo = document.getElementById('loginLogo');
    if (loginLogo) {
        loginLogo.innerHTML = `<img src="${logo}" alt="JAGOM Logo" class="w-full h-full object-cover rounded-2xl">`;
    }
}

// Toggle password visibility
const toggleBtn = document.getElementById('togglePassword');
if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
        const pw = document.getElementById('loginPassword');
        const icon = this.querySelector('i');
        if (pw.type === 'password') {
            pw.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            pw.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });
}

// Perform login API call - BACKEND ONLY
async function performLogin(email, password) {
    const loginBtn = document.querySelector('#loginForm button[type="submit"]');
    const originalBtnText = loginBtn.innerHTML;
    
    // Show loading state
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    
    // Hide any previous errors
    const errorDiv = document.getElementById('loginError');
    errorDiv.classList.add('hidden');
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Store session data
            localStorage.setItem('token', result.data.token);
            localStorage.setItem('userRole', result.data.role);
            localStorage.setItem('userName', result.data.name);
            localStorage.setItem('userEmail', result.data.email);
            localStorage.setItem('isLoggedIn', 'true');
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            // Show error from backend
            const errorText = document.getElementById('loginErrorText');
            errorText.textContent = result.message || 'Invalid email or password';
            errorDiv.classList.remove('hidden');
            
            // Shake animation
            const form = document.getElementById('loginForm');
            form.classList.add('shake');
            setTimeout(() => form.classList.remove('shake'), 400);
        }
    } catch (error) {
        console.error('Login error:', error);
        const errorText = document.getElementById('loginErrorText');
        errorText.textContent = `Unable to connect to server. Please ensure the backend is running.`;
        errorDiv.classList.remove('hidden');
    } finally {
        // Reset button
        loginBtn.disabled = false;
        loginBtn.innerHTML = originalBtnText;
    }
}

// Form submit - BACKEND ONLY
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        let valid = true;

        // Validate email
        if (!email) {
            document.getElementById('emailError').classList.remove('hidden');
            valid = false;
        } else {
            document.getElementById('emailError').classList.add('hidden');
        }

        // Validate password
        if (!password) {
            document.getElementById('passwordError').classList.remove('hidden');
            valid = false;
        } else {
            document.getElementById('passwordError').classList.add('hidden');
        }

        if (!valid) {
            loginForm.classList.add('shake');
            setTimeout(() => loginForm.classList.remove('shake'), 400);
            return;
        }

        // Call backend API
        await performLogin(email, password);
    });
}

// Clear error on input
const emailInput = document.getElementById('loginEmail');
const passwordInput = document.getElementById('loginPassword');

if (emailInput) {
    emailInput.addEventListener('input', () => {
        document.getElementById('emailError').classList.add('hidden');
        document.getElementById('loginError').classList.add('hidden');
    });
}

if (passwordInput) {
    passwordInput.addEventListener('input', () => {
        document.getElementById('passwordError').classList.add('hidden');
        document.getElementById('loginError').classList.add('hidden');
    });
}