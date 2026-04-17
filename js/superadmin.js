// js/superadmin.js - Backend Integrated Version with Branch Support

// API Base URL
const API_BASE_URL = 'https://jagomcms-001-site1.ktempurl.com/api';

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

// ============================================
// INITIALIZATION & GLOBAL VARIABLES
// ============================================

let users = [];
let branches = [];

// ============================================
// AUTHENTICATION & ACCESS CONTROL
// ============================================

async function checkAccess() {
    const token = localStorage.getItem('token');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    if (!token || !isLoggedIn) {
        window.location.href = 'login.html';
        return false;
    }
    
    // Get current user role from backend
    try {
        const result = await apiFetch('/auth/me');
        if (result && result.success) {
            let userRole = result.data.role;
            const isSuperAdmin = (userRole === 'SuperAdmin' || userRole === 'superadmin' || userRole === 3 || userRole === '3');
            
            if (!isSuperAdmin) {
                document.getElementById('accessDenied').classList.remove('hidden');
                document.getElementById('superAdminContent').classList.add('hidden');
                document.getElementById('roleBadge').classList.add('hidden');
                return false;
            }
            
            document.getElementById('accessDenied').classList.add('hidden');
            document.getElementById('superAdminContent').classList.remove('hidden');
            document.getElementById('roleBadge').classList.remove('hidden');
            document.getElementById('roleBadge').textContent = 'Super Admin';
            return true;
        }
    } catch (error) {
        console.error('Error checking access:', error);
        window.location.href = 'login.html';
        return false;
    }
    return false;
}

// ============================================
// DATA LOADING FUNCTIONS
// ============================================

// Load users from backend
async function loadUsers() {
    try {
        const result = await apiFetch('/users');
        if (result && result.success) {
            users = result.data;
            renderUsersTable();
        } else {
            console.error('Failed to load users');
            users = [];
            renderUsersTable();
        }
    } catch (error) {
        console.error('Error loading users:', error);
        users = [];
        renderUsersTable();
    }
}

// Load branches from backend and populate dropdowns
async function loadBranches() {
    try {
        const result = await apiFetch('/branches');
        if (result && result.success) {
            branches = result.data;
            renderBranchesTable();
            populateBranchDropdowns();
        } else {
            console.error('Failed to load branches');
            branches = [];
            renderBranchesTable();
            populateBranchDropdowns();
        }
    } catch (error) {
        console.error('Error loading branches:', error);
        branches = [];
        renderBranchesTable();
        populateBranchDropdowns();
    }
}

// Populate branch dropdowns in create and edit forms
function populateBranchDropdowns() {
    // Populate create user branch dropdown
    const userBranchSelect = document.getElementById('userBranch');
    if (userBranchSelect) {
        userBranchSelect.innerHTML = '<option value="">Select Branch</option>';
        branches.forEach(branch => {
            userBranchSelect.innerHTML += `<option value="${branch.id}">${escapeHtml(branch.name)}</option>`;
        });
    }
    
    // Populate edit user branch dropdown
    const editBranchSelect = document.getElementById('editBranch');
    if (editBranchSelect) {
        editBranchSelect.innerHTML = '<option value="">Select Branch</option>';
        branches.forEach(branch => {
            editBranchSelect.innerHTML += `<option value="${branch.id}">${escapeHtml(branch.name)}</option>`;
        });
    }
}

// ============================================
// UI RENDERING FUNCTIONS
// ============================================

// Render users table with branch column
function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    if (!users || users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-5 py-8 text-center text-gray-400">No users found</td></tr>`;
        return;
    }

    tbody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');

        // Role badge styling
        let roleClass = '';
        let roleText = '';
        switch (user.role) {
            case 'SuperAdmin':
            case 'superadmin':
                roleClass = 'bg-amber-100 text-amber-700';
                roleText = 'Super Admin';
                break;
            case 'Admin':
            case 'admin':
                roleClass = 'bg-green-100 text-green-700';
                roleText = 'Admin';
                break;
            default:
                roleClass = 'bg-indigo-100 text-indigo-700';
                roleText = 'User';
        }

        row.innerHTML = `
            <td class="px-5 py-3 text-sm">${escapeHtml(user.name)}</td>
            <td class="px-5 py-3 text-sm">${escapeHtml(user.email)}</td>
            <td class="px-5 py-3 text-sm">
                <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${roleClass}">${roleText}</span>
            </td>
            <td class="px-5 py-3 text-sm">
                <span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">${escapeHtml(user.branchName || 'No Branch')}</span>
            </td>
            <td class="px-5 py-3 text-sm">
                <div class="flex items-center gap-2">
                    <button onclick="editUser(${user.id})" class="action-btn text-blue-600 hover:text-blue-800 transition" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="resetPassword(${user.id})" class="action-btn text-yellow-600 hover:text-yellow-800 transition" title="Reset Password">
                        <i class="fas fa-key"></i>
                    </button>
                    <button onclick="deleteUser(${user.id})" class="action-btn text-red-600 hover:text-red-800 transition" title="Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Render branches table
function renderBranchesTable() {
    const tbody = document.getElementById('branchesTableBody');
    if (!tbody) return;

    if (!branches || branches.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="px-5 py-8 text-center text-gray-400">No branches found</td></tr>`;
        return;
    }

    tbody.innerHTML = '';

    branches.forEach((branch, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-5 py-3 text-sm">${index + 1}</td>
            <td class="px-5 py-3 text-sm font-medium">${escapeHtml(branch.name)}</td>
            <td class="px-5 py-3 text-sm">
                <button onclick="deleteBranch(${branch.id})" class="action-btn text-red-600 hover:text-red-800 transition" title="Delete Branch">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ============================================
// USER MANAGEMENT FUNCTIONS
// ============================================

async function createUser() {
    const name = document.getElementById('userFullname').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const password = document.getElementById('userPassword').value;
    const role = document.getElementById('userRole').value;
    const branchId = document.getElementById('userBranch').value;

    if (!name || !email || !password) {
        alert('Please fill in all required fields');
        return;
    }

    if (!email.includes('@')) {
        alert('Please enter a valid email address');
        return;
    }

    if (password.length < 4) {
        alert('Password must be at least 4 characters');
        return;
    }

    // For Super Admin role, branch is optional
    // For Admin and User roles, branch is required
    if (role !== 'superadmin' && !branchId) {
        alert('Please select a branch for this user');
        return;
    }

    const createBtn = document.getElementById('createUserBtn');
    const originalText = createBtn.innerHTML;
    createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    createBtn.disabled = true;

    try {
        const requestBody = {
            name: name,
            email: email,
            password: password,
            role: role
        };
        
        // Only include branchId if provided
        if (branchId) {
            requestBody.branchId = parseInt(branchId);
        }
        
        const result = await apiFetch('/users', {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });

        if (result && result.success) {
            // Clear form
            document.getElementById('userFullname').value = '';
            document.getElementById('userEmail').value = '';
            document.getElementById('userPassword').value = '';
            document.getElementById('userRole').value = 'user';
            document.getElementById('userBranch').value = '';

            await loadUsers();
            showToast('User created successfully!', 'success');
        } else {
            alert(result?.message || 'Failed to create user');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        alert('Error creating user. Please try again.');
    } finally {
        createBtn.innerHTML = originalText;
        createBtn.disabled = false;
    }
}

async function editUser(userId) {
    try {
        const result = await apiFetch(`/users/${userId}`);
        if (result && result.success) {
            const user = result.data;
            
            document.getElementById('editUserId').value = user.id;
            document.getElementById('editFullname').value = user.name;
            document.getElementById('editEmail').value = user.email;
            
            // Map role for select
            let roleValue = 'user';
            if (user.role === 'SuperAdmin' || user.role === 'superadmin') roleValue = 'superadmin';
            else if (user.role === 'Admin' || user.role === 'admin') roleValue = 'admin';
            else roleValue = 'user';
            
            document.getElementById('editRole').value = roleValue;
            document.getElementById('editPassword').value = '';
            
            // Set branch if exists
            if (user.branchId) {
                document.getElementById('editBranch').value = user.branchId;
            } else {
                document.getElementById('editBranch').value = '';
            }

            document.getElementById('editUserModal').classList.remove('hidden');
            document.getElementById('editUserModal').style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading user for edit:', error);
        alert('Error loading user data');
    }
}

async function saveUserEdit() {
    const userId = document.getElementById('editUserId').value;
    const newName = document.getElementById('editFullname').value.trim();
    const newEmail = document.getElementById('editEmail').value.trim();
    const newRole = document.getElementById('editRole').value;
    const newBranchId = document.getElementById('editBranch').value;
    const newPassword = document.getElementById('editPassword').value;

    if (!newName || !newEmail) {
        alert('Name and email are required');
        return;
    }

    // For Admin and User roles, branch is required
    if (newRole !== 'superadmin' && !newBranchId) {
        alert('Please select a branch for this user');
        return;
    }

    const saveBtn = document.getElementById('saveUserBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;

    try {
        const updateData = {
            name: newName,
            email: newEmail,
            role: newRole
        };
        
        if (newBranchId) {
            updateData.branchId = parseInt(newBranchId);
        }
        
        if (newPassword) {
            updateData.password = newPassword;
        }

        const result = await apiFetch(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });

        if (result && result.success) {
            await loadUsers();
            closeModal();
            showToast('User updated successfully!', 'success');
        } else {
            alert(result?.message || 'Failed to update user');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        alert('Error updating user. Please try again.');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

async function resetPassword(userId) {
    try {
        const result = await apiFetch(`/users/${userId}`);
        if (result && result.success) {
            const user = result.data;
            
            document.getElementById('resetUserId').value = user.id;
            document.getElementById('resetUserName').textContent = user.name;
            document.getElementById('resetNewPassword').value = '';

            document.getElementById('resetPasswordModal').classList.remove('hidden');
            document.getElementById('resetPasswordModal').style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading user for reset:', error);
        alert('Error loading user data');
    }
}

async function confirmResetPassword() {
    const userId = document.getElementById('resetUserId').value;
    const newPassword = document.getElementById('resetNewPassword').value;

    if (!newPassword || newPassword.length < 4) {
        alert('Please enter a password with at least 4 characters');
        return;
    }

    const resetBtn = document.getElementById('confirmResetBtn');
    const originalText = resetBtn.innerHTML;
    resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
    resetBtn.disabled = true;

    try {
        const result = await apiFetch(`/users/${userId}/reset-password`, {
            method: 'POST',
            body: JSON.stringify({ newPassword: newPassword })
        });

        if (result && result.success) {
            closeResetModal();
            showToast('Password reset successfully!', 'success');
        } else {
            alert(result?.message || 'Failed to reset password');
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        alert('Error resetting password. Please try again.');
    } finally {
        resetBtn.innerHTML = originalText;
        resetBtn.disabled = false;
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        const result = await apiFetch(`/users/${userId}`, {
            method: 'DELETE'
        });

        if (result && result.success) {
            await loadUsers();
            showToast('User deleted successfully!', 'success');
        } else {
            alert(result?.message || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user. Please try again.');
    }
}

// ============================================
// BRANCH MANAGEMENT FUNCTIONS
// ============================================

async function addBranch() {
    const newBranchName = document.getElementById('newBranchName').value.trim();

    if (!newBranchName) {
        alert('Please enter a branch name');
        return;
    }

    const addBtn = document.getElementById('addBranchBtn');
    const originalText = addBtn.innerHTML;
    addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    addBtn.disabled = true;

    try {
        const result = await apiFetch('/branches', {
            method: 'POST',
            body: JSON.stringify({
                name: newBranchName,
                location: null
            })
        });

        if (result && result.success) {
            document.getElementById('newBranchName').value = '';
            await loadBranches();
            showToast(`Branch "${newBranchName}" added successfully!`, 'success');
            
            // Dispatch event to update other pages
            window.dispatchEvent(new CustomEvent('branchesUpdated', { detail: branches }));
        } else {
            alert(result?.message || 'Failed to add branch');
        }
    } catch (error) {
        console.error('Error adding branch:', error);
        alert('Error adding branch. Please try again.');
    } finally {
        addBtn.innerHTML = originalText;
        addBtn.disabled = false;
    }
}

async function deleteBranch(branchId) {
    // Get branch name for confirmation
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;
    
    if (branches.length <= 1) {
        alert('Cannot delete the only branch. There must be at least one branch.');
        return;
    }

    if (!confirm(`Are you sure you want to delete branch "${branch.name}"?`)) return;

    try {
        const result = await apiFetch(`/branches/${branchId}`, {
            method: 'DELETE'
        });

        if (result && result.success) {
            await loadBranches();
            showToast(`Branch "${branch.name}" deleted!`, 'success');
            
            // Dispatch event to update other pages
            window.dispatchEvent(new CustomEvent('branchesUpdated', { detail: branches }));
        } else {
            alert(result?.message || 'Failed to delete branch');
        }
    } catch (error) {
        console.error('Error deleting branch:', error);
        alert('Error deleting branch. Please try again.');
    }
}

// ============================================
// SYSTEM SETTINGS FUNCTIONS
// ============================================

function exportAllData() {
    // Get all data from localStorage (for now) or fetch from API
    const allData = {
        exportDate: new Date().toISOString(),
        note: "This export includes data from the backend system"
    };
    
    // Fetch current data from API
    Promise.all([
        apiFetch('/users'),
        apiFetch('/branches'),
        apiFetch('/attendance/members'),
        apiFetch('/ushers/submissions')
    ]).then(([users, branches, members, submissions]) => {
        allData.users = users?.data || [];
        allData.branches = branches?.data || [];
        allData.members = members?.data || [];
        allData.usherSubmissions = submissions?.data || [];
        
        const dataStr = JSON.stringify(allData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jagom_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Data exported successfully!', 'success');
    }).catch(error => {
        console.error('Error exporting data:', error);
        alert('Error exporting data');
    });
}

function clearAllData() {
    if (confirm('WARNING: This will delete ALL system data. This action cannot be undone. Are you ABSOLUTELY sure?')) {
        const confirmation = prompt('Type "DELETE" to confirm data deletion:');
        if (confirmation === 'DELETE') {
            alert('This feature is disabled for production safety. Please use backend database management tools.');
        } else {
            alert('Confirmation cancelled. Data was not deleted.');
        }
    }
}

// ============================================
// UI HELPER FUNCTIONS
// ============================================

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast-notification fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
        type === 'success' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
    }`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i> ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function closeModal() {
    document.getElementById('editUserModal').classList.add('hidden');
    document.getElementById('editUserModal').style.display = 'none';
}

function closeResetModal() {
    document.getElementById('resetPasswordModal').classList.add('hidden');
    document.getElementById('resetPasswordModal').style.display = 'none';
}

// ============================================
// TAB SWITCHING
// ============================================

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.add('hidden'));

            btn.classList.add('active');
            document.getElementById(`${tabId}Tab`).classList.remove('hidden');
        });
    });
}

// ============================================
// LOGO UPLOAD FUNCTIONALITY
// ============================================

function initLogoUpload() {
    const sidebarLogo = document.getElementById('sidebarLogo');
    const mobileLogo = document.getElementById('mobileLogo');
    const logoUpload = document.getElementById('logoUpload');

    const savedLogo = localStorage.getItem('jagomLogo');
    if (savedLogo) {
        const logoImg = document.createElement('img');
        logoImg.src = savedLogo;
        logoImg.className = 'w-full h-full object-cover';
        if (sidebarLogo) {
            sidebarLogo.innerHTML = '';
            sidebarLogo.appendChild(logoImg.cloneNode());
        }
        if (mobileLogo) {
            mobileLogo.innerHTML = '';
            mobileLogo.appendChild(logoImg.cloneNode());
        }
    }

    const handleLogoClick = () => {
        logoUpload.click();
    };

    if (sidebarLogo) sidebarLogo.addEventListener('click', handleLogoClick);
    if (mobileLogo) mobileLogo.addEventListener('click', handleLogoClick);

    logoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const logoData = event.target.result;
                localStorage.setItem('jagomLogo', logoData);

                const logoImg = document.createElement('img');
                logoImg.src = logoData;
                logoImg.className = 'w-full h-full object-cover';

                if (sidebarLogo) {
                    sidebarLogo.innerHTML = '';
                    sidebarLogo.appendChild(logoImg.cloneNode());
                }
                if (mobileLogo) {
                    mobileLogo.innerHTML = '';
                    mobileLogo.appendChild(logoImg.cloneNode());
                }

                showToast('Logo uploaded successfully!', 'success');
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please select a valid image file');
        }
    });
}

// ============================================
// SIDEBAR & MOBILE FUNCTIONALITY
// ============================================

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const sidebarToggle = document.getElementById('sidebarToggle');

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
}

// ============================================
// LOGOUT FUNCTION
// ============================================

function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();

            localStorage.removeItem('token');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userName');
            localStorage.removeItem('userEmail');

            window.location.href = 'login.html';
        });
    }
}

// ============================================
// EVENT LISTENERS & INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    const hasAccess = await checkAccess();
    if (!hasAccess) return;

    await loadBranches(); // Load branches first to populate dropdowns
    await loadUsers();
    
    initTabs();
    initLogoUpload();
    initSidebar();
    initLogout();

    // Button event listeners
    const createUserBtn = document.getElementById('createUserBtn');
    if (createUserBtn) createUserBtn.addEventListener('click', createUser);

    const addBranchBtn = document.getElementById('addBranchBtn');
    if (addBranchBtn) addBranchBtn.addEventListener('click', addBranch);

    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) exportDataBtn.addEventListener('click', exportAllData);

    const clearDataBtn = document.getElementById('clearDataBtn');
    if (clearDataBtn) clearDataBtn.addEventListener('click', clearAllData);

    const saveUserBtn = document.getElementById('saveUserBtn');
    if (saveUserBtn) saveUserBtn.addEventListener('click', saveUserEdit);

    const confirmResetBtn = document.getElementById('confirmResetBtn');
    if (confirmResetBtn) confirmResetBtn.addEventListener('click', confirmResetPassword);

    // Modal close buttons
    document.querySelectorAll('.closeModal').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    document.querySelectorAll('.closeResetModal').forEach(btn => {
        btn.addEventListener('click', closeResetModal);
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        const editModal = document.getElementById('editUserModal');
        const resetModal = document.getElementById('resetPasswordModal');

        if (e.target === editModal) closeModal();
        if (e.target === resetModal) closeResetModal();
    });
});

// Make functions globally accessible for onclick handlers
window.editUser = editUser;
window.resetPassword = resetPassword;
window.deleteUser = deleteUser;
window.deleteBranch = deleteBranch;