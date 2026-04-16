// js/attendance.js - Backend Integrated Version

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
let currentUserRole = '';

// Load user role and setup UI
async function loadUserRole() {
    try {
        const result = await apiFetch('/auth/me');
        if (result && result.success) {
            let userRole = result.data.role;
            
            // Convert role to display format
            if (userRole === 'SuperAdmin' || userRole === 'superadmin' || userRole === 3 || userRole === '3') {
                currentUserRole = 'superadmin';
                document.getElementById('roleBadge').textContent = 'Super Admin';
            } else if (userRole === 'Admin' || userRole === 'admin' || userRole === 2 || userRole === '2') {
                currentUserRole = 'admin';
                document.getElementById('roleBadge').textContent = 'Admin';
            } else {
                currentUserRole = 'user';
                document.getElementById('roleBadge').textContent = 'User';
            }
            
            // Show branch filter only for Super Admin
            if (currentUserRole === 'superadmin') {
                document.getElementById('branchFilterSection').classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Error loading user role:', error);
        const role = localStorage.getItem('userRole') || 'user';
        currentUserRole = role;
        document.getElementById('roleBadge').textContent = role.charAt(0).toUpperCase() + role.slice(1);
        
        if (currentUserRole === 'superadmin') {
            document.getElementById('branchFilterSection').classList.remove('hidden');
        }
    }
}

// Load branches from backend
async function loadBranches() {
    try {
        const result = await apiFetch('/branches');
        if (result && result.success && result.data) {
            branches = result.data.map(b => b.name);
        } else {
            // Fallback to default branches
            branches = ["Opebi", "Ikorodu", "Otuyelu", "Likosi"];
        }
    } catch (error) {
        console.error('Error loading branches:', error);
        branches = ["Opebi", "Ikorodu", "Otuyelu", "Likosi"];
    }
    
    populateBranchDropdowns();
}

// Populate branch dropdowns
function populateBranchDropdowns() {
    const selects = ['branchFilter', 'memberBranch', 'attendeeBranch'];
    
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        
        const currentValue = select.value;
        
        if (id === 'branchFilter') {
            select.innerHTML = '<option value="all">All Branches</option>';
            branches.forEach(b => {
                select.innerHTML += `<option value="${b}">${b}</option>`;
            });
        } else {
            select.innerHTML = '';
            branches.forEach(b => {
                select.innerHTML += `<option value="${b}">${b}</option>`;
            });
        }
        
        if (currentValue && branches.includes(currentValue)) {
            select.value = currentValue;
        }
    });
}

// Load members from backend
async function loadMembers(filterBranch = 'all') {
    const tbody = document.getElementById('memberTableBody');
    const noMembers = document.getElementById('noMembers');
    
    // Show loading state
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>`;
    
    try {
        let url = '/attendance/members';
        if (filterBranch !== 'all' && currentUserRole === 'superadmin') {
            // Get branch ID first
            const branchResult = await apiFetch('/branches');
            if (branchResult && branchResult.success) {
                const branch = branchResult.data.find(b => b.name === filterBranch);
                if (branch) {
                    url += `?branchId=${branch.id}`;
                }
            }
        }
        
        const result = await apiFetch(url);
        
        if (result && result.success && result.data && result.data.length > 0) {
            tbody.innerHTML = result.data.map(m => `
                <tr class="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td class="px-5 py-3 font-medium text-gray-900">${escapeHtml(m.name)}</td>
                    <td class="px-5 py-3 text-gray-600">${escapeHtml(m.phoneNumber)}</td>
                    <td class="px-5 py-3 text-gray-600">${escapeHtml(m.unit || '-')}</td>
                    <td class="px-5 py-3"><span class="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">${escapeHtml(m.branchName)}</span></td>
                </tr>
            `).join('');
            noMembers.classList.add('hidden');
            tbody.parentElement.classList.remove('hidden');
        } else {
            tbody.innerHTML = '';
            noMembers.classList.remove('hidden');
            tbody.parentElement.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error loading members:', error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-red-400">Error loading members</td></tr>`;
    }
}

// Save new member to backend
async function saveMember() {
    const name = document.getElementById('memberName').value.trim();
    const phone = document.getElementById('memberPhone').value.trim();
    const unit = document.getElementById('memberUnit').value.trim();
    const branchName = document.getElementById('memberBranch').value;
    
    if (!name || !phone) {
        alert('Please fill in all required fields (Name and Phone)');
        return;
    }
    
    // Get branch ID
    let branchId = null;
    try {
        const branchesResult = await apiFetch('/branches');
        if (branchesResult && branchesResult.success) {
            const branch = branchesResult.data.find(b => b.name === branchName);
            if (branch) {
                branchId = branch.id;
            }
        }
    } catch (error) {
        console.error('Error getting branch ID:', error);
    }
    
    if (!branchId) {
        alert('Please select a valid branch');
        return;
    }
    
    const saveBtn = document.getElementById('saveMemberBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;
    
    try {
        const result = await apiFetch('/attendance/members', {
            method: 'POST',
            body: JSON.stringify({
                name: name,
                phoneNumber: phone,
                unit: unit || null,
                branchId: branchId
            })
        });
        
        if (result && result.success) {
            alert('Member added successfully!');
            
            // Clear form
            document.getElementById('memberName').value = '';
            document.getElementById('memberPhone').value = '';
            document.getElementById('memberUnit').value = '';
            document.getElementById('addMemberForm').classList.add('hidden');
            
            // Reload members
            const filter = document.getElementById('branchFilter').value;
            await loadMembers(filter);
        } else {
            alert(result?.message || 'Failed to add member');
        }
    } catch (error) {
        console.error('Error saving member:', error);
        alert('Error saving member. Please try again.');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Mark attendance
async function markAttendance(e) {
    e.preventDefault();
    
    const name = document.getElementById('attendeeName').value.trim();
    const branchName = document.getElementById('attendeeBranch').value;
    
    if (!name) {
        alert('Please enter a name');
        return;
    }
    
    // Get member by name (find first matching member)
    let memberId = null;
    let branchId = null;
    
    try {
        // First get branch ID
        const branchesResult = await apiFetch('/branches');
        if (branchesResult && branchesResult.success) {
            const branch = branchesResult.data.find(b => b.name === branchName);
            if (branch) {
                branchId = branch.id;
            }
        }
        
        // Get members to find matching ID
        const membersResult = await apiFetch('/attendance/members');
        if (membersResult && membersResult.success && membersResult.data) {
            const member = membersResult.data.find(m => 
                m.name.toLowerCase() === name.toLowerCase() || 
                m.phoneNumber === name
            );
            if (member) {
                memberId = member.id;
            }
        }
        
        if (!memberId) {
            alert('Member not found. Please register the member first.');
            return;
        }
        
        const submitBtn = document.querySelector('#attendanceForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Marking...';
        submitBtn.disabled = true;
        
        const result = await apiFetch('/attendance/mark', {
            method: 'POST',
            body: JSON.stringify({
                memberId: memberId,
                branchId: branchId,
                date: new Date().toISOString()
            })
        });
        
        if (result && result.success) {
            document.getElementById('attendeeName').value = '';
            await loadAttendance();
            alert('Attendance marked successfully!');
        } else {
            alert(result?.message || 'Failed to mark attendance');
        }
        
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    } catch (error) {
        console.error('Error marking attendance:', error);
        alert('Error marking attendance. Please try again.');
    }
}

// Load today's attendance from backend
async function loadAttendance() {
    const list = document.getElementById('attendanceList');
    const today = new Date().toISOString().split('T')[0];
    
    list.innerHTML = '<div class="text-center py-6 text-gray-400"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    
    try {
        let url = `/attendance/records?date=${today}`;
        const filterBranch = document.getElementById('branchFilter').value;
        
        if (filterBranch !== 'all' && currentUserRole === 'superadmin') {
            const branchesResult = await apiFetch('/branches');
            if (branchesResult && branchesResult.success) {
                const branch = branchesResult.data.find(b => b.name === filterBranch);
                if (branch) {
                    url += `&branchId=${branch.id}`;
                }
            }
        }
        
        const result = await apiFetch(url);
        
        document.getElementById('todayCount').textContent = `${result?.data?.length || 0} record${result?.data?.length !== 1 ? 's' : ''}`;
        
        if (result && result.success && result.data && result.data.length > 0) {
            list.innerHTML = result.data.map(a => `
                <div class="attendance-item flex items-center justify-between p-3 rounded-xl bg-primary-light/30 border border-primary/10">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <i class="fas fa-user text-primary text-xs"></i>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-gray-900">${escapeHtml(a.memberName)}</p>
                            <p class="text-xs text-gray-400">${escapeHtml(a.branchName)} · ${new Date(a.date).toLocaleTimeString()}</p>
                        </div>
                    </div>
                    <span class="text-xs font-medium text-primary"><i class="fas fa-check-circle mr-1"></i>Present</span>
                </div>
            `).join('');
        } else {
            list.innerHTML = `<div class="text-center py-6 text-gray-400">
                <p class="text-sm">No attendance records for today</p>
            </div>`;
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
        list.innerHTML = `<div class="text-center py-6 text-red-400">
            <p class="text-sm">Error loading attendance records</p>
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
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    window.location.href = 'login.html';
});

// Logo upload
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

// Add Member Form Toggle
document.getElementById('addMemberBtn').addEventListener('click', () => {
    document.getElementById('addMemberForm').classList.toggle('hidden');
});

document.getElementById('cancelMemberBtn').addEventListener('click', () => {
    document.getElementById('addMemberForm').classList.add('hidden');
    document.getElementById('memberName').value = '';
    document.getElementById('memberPhone').value = '';
    document.getElementById('memberUnit').value = '';
});

// Save Member Button
document.getElementById('saveMemberBtn').addEventListener('click', saveMember);

// Branch filter change
document.getElementById('branchFilter').addEventListener('change', (e) => {
    loadMembers(e.target.value);
    loadAttendance();
});

// Attendance Form Submit
document.getElementById('attendanceForm').addEventListener('submit', markAttendance);

// Initialize page
async function init() {
    await loadUserRole();
    await loadBranches();
    await loadMembers();
    await loadAttendance();
}

init();