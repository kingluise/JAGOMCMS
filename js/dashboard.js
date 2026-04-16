// js/dashboard.js - Modified with Backend API Integration

// API Base URL
const API_BASE_URL = 'https://localhost:7015/api';

// Helper function for authenticated API calls
async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        });
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userName');
            localStorage.removeItem('userEmail');
            window.location.href = 'login.html';
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Auth check - Modified to check token instead of just isLoggedIn
(function checkAuth() {
    const token = localStorage.getItem('token');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    if (!token || !isLoggedIn) {
        window.location.href = 'login.html';
        return;
    }
})();

// Initialize defaults - Keep only branch data, remove user initialization
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

// Display role badge - FIXED VERSION (handles both string and number roles)
async function loadRoleBadge() {
    try {
        const result = await apiFetch('/auth/me');
        const roleBadge = document.getElementById('roleBadge');
        
        if (result && result.success) {
            let userRole = result.data.role;
            
            // Convert role to display format (handles both string and number)
            if (userRole === 'SuperAdmin' || userRole === 'superadmin' || userRole === 3 || userRole === '3') {
                roleBadge.textContent = 'Super Admin';
            } else if (userRole === 'Admin' || userRole === 'admin' || userRole === 2 || userRole === '2') {
                roleBadge.textContent = 'Admin';
            } else {
                roleBadge.textContent = 'User';
            }
            
            // Store for quick access
            localStorage.setItem('userRole', roleBadge.textContent);
        } else {
            // Fallback to localStorage
            let role = localStorage.getItem('userRole') || 'User';
            if (role === '3' || role === 'superadmin' || role === 'SuperAdmin') role = 'Super Admin';
            if (role === '2' || role === 'admin' || role === 'Admin') role = 'Admin';
            if (role === '1' || role === 'user' || role === 'User') role = 'User';
            roleBadge.textContent = role;
        }
    } catch (error) {
        console.error('Error loading role:', error);
        const roleBadge = document.getElementById('roleBadge');
        roleBadge.textContent = 'User';
    }
}

// Sidebar toggle (mobile)
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
    });
}

if (overlay) {
    overlay.addEventListener('click', () => {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    });
}

// Logout - Clear all session data including token
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        window.location.href = 'login.html';
    });
}

// Logo upload (keeping your existing code)
const logoUpload = document.getElementById('logoUpload');
const sidebarLogo = document.getElementById('sidebarLogo');
const mobileLogo = document.getElementById('mobileLogo');

if (sidebarLogo) {
    sidebarLogo.addEventListener('click', () => logoUpload.click());
}

if (logoUpload) {
    logoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                localStorage.setItem('jagomLogo', ev.target.result);
                loadLogo(ev.target.result);
            };
            reader.readAsDataURL(file);
        }
    });
}

function loadLogo(src) {
    if (src) {
        if (sidebarLogo) {
            sidebarLogo.innerHTML = `<img src="${src}" alt="Logo" class="w-full h-full object-cover rounded-xl">`;
        }
        if (mobileLogo) {
            mobileLogo.innerHTML = `<img src="${src}" alt="Logo" class="w-full h-full object-cover rounded-lg">`;
        }
    }
}

const savedLogo = localStorage.getItem('jagomLogo');
if (savedLogo) loadLogo(savedLogo);

// Dashboard stats - Modified to fetch from backend API
async function updateStats() {
    // Get elements
    const totalMembersEl = document.getElementById('totalMembers');
    const attendanceTodayEl = document.getElementById('attendanceToday');
    const totalBranchesEl = document.getElementById('totalBranches');
    const pendingApprovalsEl = document.getElementById('pendingApprovals');
    
    // Show loading states
    if (totalMembersEl) totalMembersEl.innerHTML = '<i class="fas fa-spinner fa-spin text-primary text-sm"></i>';
    if (attendanceTodayEl) attendanceTodayEl.innerHTML = '<i class="fas fa-spinner fa-spin text-primary text-sm"></i>';
    if (totalBranchesEl) totalBranchesEl.innerHTML = '<i class="fas fa-spinner fa-spin text-primary text-sm"></i>';
    if (pendingApprovalsEl) pendingApprovalsEl.innerHTML = '<i class="fas fa-spinner fa-spin text-primary text-sm"></i>';
    
    try {
        // Fetch dashboard summary from backend
        const summaryResult = await apiFetch('/dashboard/summary');
        
        if (summaryResult && summaryResult.success) {
            if (totalMembersEl) totalMembersEl.textContent = summaryResult.data.totalMembers || 0;
            if (attendanceTodayEl) attendanceTodayEl.textContent = summaryResult.data.todaysAttendance || 0;
            if (totalBranchesEl) totalBranchesEl.textContent = summaryResult.data.totalBranches || 0;
            if (pendingApprovalsEl) pendingApprovalsEl.textContent = summaryResult.data.pendingFinanceApprovals || 0;
        } else {
            throw new Error('Failed to load summary');
        }
    } catch (error) {
        console.error('Error loading dashboard summary:', error);
        if (totalMembersEl) totalMembersEl.innerHTML = '<span class="text-red-500">Error</span>';
        if (attendanceTodayEl) attendanceTodayEl.innerHTML = '<span class="text-red-500">Error</span>';
        if (totalBranchesEl) totalBranchesEl.innerHTML = '<span class="text-red-500">Error</span>';
        if (pendingApprovalsEl) pendingApprovalsEl.innerHTML = '<span class="text-red-500">Error</span>';
    }
    
    // Load recent submissions from backend
    await loadRecentSubmissions();
}

// Load recent usher submissions from backend
async function loadRecentSubmissions() {
    const recentDiv = document.getElementById('recentSubmissions');
    if (!recentDiv) return;
    
    try {
        const result = await apiFetch('/ushers/submissions?status=pending');
        
        if (result && result.success && result.data && result.data.length > 0) {
            const recent = result.data.slice(-5).reverse();
            
            recentDiv.innerHTML = `<div class="space-y-3">${recent.map(s => `
                <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <i class="fas fa-file-invoice text-primary text-sm"></i>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-gray-900">${escapeHtml(s.preacher) || 'Unknown'}</p>
                            <p class="text-xs text-gray-400">${escapeHtml(s.branchName)} · ${new Date(s.date).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <span class="text-xs font-medium px-2.5 py-1 rounded-full ${getStatusClass(s.status)}">${s.status.charAt(0).toUpperCase() + s.status.slice(1)}</span>
                </div>
            `).join('')}</div>`;
        } else {
            recentDiv.innerHTML = `<div class="text-center py-8 text-gray-400">
                <i class="fas fa-inbox text-3xl mb-3"></i>
                <p class="text-sm">No submissions yet</p>
                <p class="text-xs text-gray-400 mt-1">Submit a usher report to see it here</p>
            </div>`;
        }
    } catch (error) {
        console.error('Error loading submissions:', error);
        recentDiv.innerHTML = `<div class="text-center py-8 text-gray-400">
            <i class="fas fa-exclamation-circle text-3xl mb-3 text-amber-400"></i>
            <p class="text-sm">Unable to load submissions</p>
        </div>`;
    }
}

// Helper function to escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Helper function for status colors
function getStatusClass(status) {
    if (!status) return 'bg-gray-100 text-gray-600';
    switch(status.toLowerCase()) {
        case 'pending':
            return 'bg-amber-50 text-amber-600';
        case 'approved':
            return 'bg-primary-light text-primary';
        case 'rejected':
            return 'bg-red-50 text-red-500';
        default:
            return 'bg-gray-100 text-gray-600';
    }
}

// Load user welcome message
async function loadUserWelcome() {
    try {
        const result = await apiFetch('/auth/me');
        if (result && result.success) {
            const userName = result.data.name;
            const welcomeBanner = document.querySelector('.bg-gradient-to-r p');
            if (welcomeBanner) {
                welcomeBanner.textContent = `Welcome back, ${userName}! Manage your church operations seamlessly across all branches.`;
            }
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

// Initialize everything
async function init() {
    await loadRoleBadge();
    await loadUserWelcome();
    await updateStats();
}

// Call init on page load
init();