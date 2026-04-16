// js/ushers-register.js - Backend Integrated Version

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

// Auth check - Check token instead of just isLoggedIn
(function checkAuth() {
    const token = localStorage.getItem('token');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    if (!token || !isLoggedIn) {
        window.location.href = 'login.html';
        return;
    }
})();

// Global variables
let branches = [];

// Load user role and display
async function loadUserRole() {
    try {
        const result = await apiFetch('/auth/me');
        if (result && result.success) {
            let userRole = result.data.role;
            
            if (userRole === 'SuperAdmin' || userRole === 'superadmin' || userRole === 3 || userRole === '3') {
                document.getElementById('roleBadge').textContent = 'Super Admin';
            } else if (userRole === 'Admin' || userRole === 'admin' || userRole === 2 || userRole === '2') {
                document.getElementById('roleBadge').textContent = 'Admin';
            } else {
                document.getElementById('roleBadge').textContent = 'User';
            }
        }
    } catch (error) {
        console.error('Error loading user role:', error);
        const role = localStorage.getItem('userRole') || 'User';
        document.getElementById('roleBadge').textContent = role.charAt(0).toUpperCase() + role.slice(1);
    }
}

// Load branches from backend
async function loadBranches() {
    try {
        const result = await apiFetch('/branches');
        if (result && result.success && result.data) {
            branches = result.data.map(b => b.name);
        } else {
            branches = ["Opebi", "Ikorodu", "Otuyelu", "Likosi"];
        }
    } catch (error) {
        console.error('Error loading branches:', error);
        branches = ["Opebi", "Ikorodu", "Otuyelu", "Likosi"];
    }
    
    populateBranchDropdown();
}

// Populate branch dropdown
function populateBranchDropdown() {
    const select = document.getElementById('usherBranch');
    if (!select) return;
    
    select.innerHTML = branches.map(b => `<option value="${b}">${b}</option>`).join('');
}

// Set today's date
const dateInput = document.getElementById('usherDate');
if (dateInput) {
    dateInput.valueAsDate = new Date();
}

// Auto-calculate total
const financeInputs = document.querySelectorAll('.finance-input');
const totalField = document.getElementById('usherTotal');

function calculateTotal() {
    const tithe = parseFloat(document.getElementById('usherTithe')?.value) || 0;
    const offering = parseFloat(document.getElementById('usherOffering')?.value) || 0;
    const seed = parseFloat(document.getElementById('usherSeed')?.value) || 0;
    const total = tithe + offering + seed;
    if (totalField) {
        totalField.value = total.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return total;
}

if (financeInputs) {
    financeInputs.forEach(input => {
        input.addEventListener('input', calculateTotal);
    });
}
calculateTotal();

// Get branch ID from branch name
async function getBranchId(branchName) {
    try {
        const result = await apiFetch('/branches');
        if (result && result.success && result.data) {
            const branch = result.data.find(b => b.name === branchName);
            return branch ? branch.id : null;
        }
    } catch (error) {
        console.error('Error getting branch ID:', error);
    }
    return null;
}

// Submit usher report to backend
async function submitUsherReport(e) {
    e.preventDefault();
    
    const branch = document.getElementById('usherBranch')?.value;
    const date = document.getElementById('usherDate')?.value;
    const attendance = parseInt(document.getElementById('usherAttendance')?.value) || 0;
    const preacher = document.getElementById('usherPreacher')?.value.trim();
    const message = document.getElementById('usherMessage')?.value.trim();
    const tithe = parseFloat(document.getElementById('usherTithe')?.value) || 0;
    const offering = parseFloat(document.getElementById('usherOffering')?.value) || 0;
    const seed = parseFloat(document.getElementById('usherSeed')?.value) || 0;
    const total = tithe + offering + seed;
    
    // Validation
    if (!branch || !date || !preacher) {
        alert('Please fill in all required fields (Branch, Date, and Preacher)');
        return;
    }
    
    if (attendance <= 0) {
        alert('Please enter total attendance');
        return;
    }
    
    // Get branch ID
    const branchId = await getBranchId(branch);
    if (!branchId) {
        alert('Invalid branch selected');
        return;
    }
    
    const submitBtn = document.querySelector('#usherForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;
    
    try {
        const result = await apiFetch('/ushers/submit', {
            method: 'POST',
            body: JSON.stringify({
                branchId: branchId,
                date: new Date(date).toISOString(),
                totalAttendance: attendance,
                preacher: preacher,
                messageTitle: message || null,
                tithe: tithe,
                offering: offering,
                specialSeed: seed,
                total: total,
                receiptUrl: null
            })
        });
        
        if (result && result.success) {
            // Show success animation
            const form = document.getElementById('usherForm');
            form.classList.add('success-pulse');
            setTimeout(() => form.classList.remove('success-pulse'), 400);
            
            // Reset form
            document.getElementById('usherForm').reset();
            if (dateInput) dateInput.valueAsDate = new Date();
            document.getElementById('usherTithe').value = '0';
            document.getElementById('usherOffering').value = '0';
            document.getElementById('usherSeed').value = '0';
            calculateTotal();
            
            // Reload recent submissions
            await loadRecentSubmissions();
            
            alert('Report submitted successfully!');
        } else {
            alert(result?.message || 'Failed to submit report');
        }
    } catch (error) {
        console.error('Error submitting report:', error);
        alert('Error submitting report. Please try again.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Load recent submissions from backend
async function loadRecentSubmissions() {
    const container = document.getElementById('recentUsherSubmissions');
    if (!container) return;
    
    container.innerHTML = `<div class="text-center py-8 text-gray-400">
        <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
        <p class="text-sm">Loading submissions...</p>
    </div>`;
    
    try {
        const result = await apiFetch('/ushers/submissions');
        
        if (result && result.success && result.data && result.data.length > 0) {
            const recent = result.data.slice(-5).reverse();
            
            container.innerHTML = `<div class="space-y-3">${recent.map(s => `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition gap-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <i class="fas fa-file-lines text-primary text-sm"></i>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-gray-900">${escapeHtml(s.preacher)} - ${escapeHtml(s.messageTitle) || 'No title'}</p>
                            <p class="text-xs text-gray-400">${escapeHtml(s.branchName)} · ${new Date(s.date).toLocaleDateString()} · ${s.totalAttendance} attendees</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 sm:shrink-0">
                        <span class="text-sm font-bold text-primary">₦${formatNumber(s.total)}</span>
                        <span class="text-xs font-medium px-2.5 py-1 rounded-full ${getStatusClass(s.status)}">${s.status.charAt(0).toUpperCase() + s.status.slice(1)}</span>
                    </div>
                </div>
            `).join('')}</div>`;
        } else {
            container.innerHTML = `<div class="text-center py-8 text-gray-400">
                <i class="fas fa-inbox text-3xl mb-3"></i>
                <p class="text-sm">No submissions yet</p>
                <p class="text-xs text-gray-400 mt-1">Submit a report to see it here</p>
            </div>`;
        }
    } catch (error) {
        console.error('Error loading submissions:', error);
        container.innerHTML = `<div class="text-center py-8 text-gray-400">
            <i class="fas fa-exclamation-circle text-3xl mb-3 text-amber-400"></i>
            <p class="text-sm">Unable to load submissions</p>
        </div>`;
    }
}

// Helper function to format numbers
function formatNumber(num) {
    return num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

// Sidebar toggle
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

// Logout
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

// Logo upload
const logoUpload = document.getElementById('logoUpload');
const sidebarLogo = document.getElementById('sidebarLogo');
const mobileLogo = document.getElementById('mobileLogo');

if (sidebarLogo) {
    sidebarLogo.addEventListener('click', () => logoUpload?.click());
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

// Form submission
const usherForm = document.getElementById('usherForm');
if (usherForm) {
    usherForm.addEventListener('submit', submitUsherReport);
}

// Initialize page
async function init() {
    await loadUserRole();
    await loadBranches();
    await loadRecentSubmissions();
}

init();