// js/dashboard.js - Enhanced Version with Analytics

// API Base URL
const API_BASE_URL = 'https://jagomcms-001-site1.ktempurl.com/api';

// Global variables
let attendanceChart = null;
let currentUserRole = '';
let currentUserBranchId = null;
let allBranches = [];

// Helper function for authenticated API calls
async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = 'login.html';
        return null;
    }
    
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
        
        if (response.status === 403) {
            console.warn('Access forbidden for endpoint:', endpoint);
            return null;
        }
        
        const text = await response.text();
        if (!text || text.trim() === '') return null;
        
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Invalid JSON:', text.substring(0, 200));
            return null;
        }
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

// Auth check
(function checkAuth() {
    const token = localStorage.getItem('token');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    if (!token || !isLoggedIn) {
        window.location.href = 'login.html';
        return;
    }
})();

// Load user info and role - FIXED to handle number roles
async function loadUserInfo() {
    try {
        const result = await apiFetch('/auth/me');
        if (result && result.success) {
            const user = result.data;
            const userRoleValue = user.role;
            currentUserBranchId = user.branchId;
            
            // Display role badge - Handle both number and string roles
            const roleBadge = document.getElementById('roleBadge');
            let displayRole = 'User';
            
            // Check if role is a number (enum value) or string
            if (userRoleValue === 3 || userRoleValue === '3' || userRoleValue === 'SuperAdmin' || userRoleValue === 'superadmin') {
                displayRole = 'Super Admin';
                currentUserRole = 'SuperAdmin';
            } else if (userRoleValue === 2 || userRoleValue === '2' || userRoleValue === 'Admin' || userRoleValue === 'admin') {
                displayRole = 'Admin';
                currentUserRole = 'Admin';
            } else if (userRoleValue === 1 || userRoleValue === '1' || userRoleValue === 'User' || userRoleValue === 'user') {
                displayRole = 'User';
                currentUserRole = 'User';
            } else {
                // Fallback: try to use as string
                currentUserRole = userRoleValue;
                displayRole = userRoleValue;
            }
            
            if (roleBadge) {
                roleBadge.textContent = displayRole;
            }
            
            // Store role for quick access
            localStorage.setItem('userRole', displayRole);
            
            // Show/hide branch filter based on role (only Super Admin sees it)
            const branchFilterSection = document.getElementById('branchFilterSection');
            if (branchFilterSection) {
                if (currentUserRole !== 'SuperAdmin') {
                    branchFilterSection.style.display = 'none';
                } else {
                    branchFilterSection.style.display = 'block';
                }
            }
        } else {
            // Fallback to localStorage
            const roleBadge = document.getElementById('roleBadge');
            let role = localStorage.getItem('userRole') || 'User';
            if (role === 'Super Admin') {
                currentUserRole = 'SuperAdmin';
            } else if (role === 'Admin') {
                currentUserRole = 'Admin';
            } else {
                currentUserRole = 'User';
            }
            if (roleBadge) roleBadge.textContent = role;
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        const roleBadge = document.getElementById('roleBadge');
        if (roleBadge) roleBadge.textContent = 'User';
        currentUserRole = 'User';
    }
}

// Load branches for filter dropdown
async function loadBranches() {
    try {
        const result = await apiFetch('/branches');
        if (result && result.success && result.data) {
            allBranches = result.data;
            const filterSelect = document.getElementById('dashboardBranchFilter');
            if (filterSelect) {
                filterSelect.innerHTML = '<option value="all">All Branches</option>';
                allBranches.forEach(branch => {
                    filterSelect.innerHTML += `<option value="${branch.id}">${escapeHtml(branch.name)}</option>`;
                });
            }
        }
    } catch (error) {
        console.error('Error loading branches:', error);
    }
}

// Load branch members breakdown (for Super Admin)
async function loadBranchMembersBreakdown() {
    const breakdownDiv = document.getElementById('branchMembersBreakdown');
    if (!breakdownDiv) return;
    
    try {
        const result = await apiFetch('/attendance/members');
        if (result && result.success && result.data) {
            const members = result.data;
            const branchCounts = {};
            
            members.forEach(member => {
                const branchName = member.branchName || 'Unknown';
                branchCounts[branchName] = (branchCounts[branchName] || 0) + 1;
            });
            
            let html = '<div class="space-y-1">';
            for (const [branch, count] of Object.entries(branchCounts)) {
                html += `<div class="flex justify-between items-center text-xs"><span class="text-gray-500">${escapeHtml(branch)}:</span><span class="font-medium text-gray-700">${count}</span></div>`;
            }
            html += '</div>';
            
            breakdownDiv.innerHTML = html;
            breakdownDiv.classList.remove('hidden');
        } else {
            breakdownDiv.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error loading branch breakdown:', error);
        breakdownDiv.classList.add('hidden');
    }
}

// Load dashboard summary with branch filter
async function loadDashboardSummary() {
    const selectedBranch = document.getElementById('dashboardBranchFilter')?.value || 'all';
    const isSuperAdmin = (currentUserRole === 'SuperAdmin');
    
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
        if (isSuperAdmin && selectedBranch !== 'all') {
            // Fetch members for specific branch
            const membersResult = await apiFetch(`/attendance/members?branchId=${selectedBranch}`);
            if (membersResult && membersResult.success) {
                if (totalMembersEl) totalMembersEl.textContent = membersResult.data.length;
            }
            
            // Fetch attendance for last Sunday for specific branch
            const lastSunday = getLastSunday();
            const attendanceResult = await apiFetch(`/attendance/records?date=${lastSunday}&branchId=${selectedBranch}`);
            if (attendanceResult && attendanceResult.success) {
                if (attendanceTodayEl) attendanceTodayEl.textContent = attendanceResult.data.length;
            }
            
            // Branches count is 1 when filtered
            if (totalBranchesEl) totalBranchesEl.textContent = '1';
            
            // Fetch pending approvals for specific branch
            const submissionsResult = await apiFetch('/ushers/submissions?status=pending');
            if (submissionsResult && submissionsResult.success && submissionsResult.data) {
                const pendingForBranch = submissionsResult.data.filter(s => s.branchId == selectedBranch);
                if (pendingApprovalsEl) pendingApprovalsEl.textContent = pendingForBranch.length;
            }
        } else {
            // Use dashboard summary endpoint
            const summaryResult = await apiFetch('/dashboard/summary');
            if (summaryResult && summaryResult.success) {
                if (totalMembersEl) totalMembersEl.textContent = summaryResult.data.totalMembers || 0;
                if (attendanceTodayEl) attendanceTodayEl.textContent = summaryResult.data.todaysAttendance || 0;
                if (totalBranchesEl) totalBranchesEl.textContent = summaryResult.data.totalBranches || 0;
                if (pendingApprovalsEl) pendingApprovalsEl.textContent = summaryResult.data.pendingFinanceApprovals || 0;
            }
        }
        
        // Load branch members breakdown (for Super Admin only when viewing all branches)
        if (isSuperAdmin && selectedBranch === 'all') {
            await loadBranchMembersBreakdown();
        } else {
            const breakdownDiv = document.getElementById('branchMembersBreakdown');
            if (breakdownDiv) breakdownDiv.classList.add('hidden');
        }
        
        // Update last updated timestamp
        const lastUpdated = document.getElementById('lastUpdated');
        if (lastUpdated) {
            lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        }
    } catch (error) {
        console.error('Error loading dashboard summary:', error);
        if (totalMembersEl) totalMembersEl.innerHTML = '<span class="text-red-500">Error</span>';
        if (attendanceTodayEl) attendanceTodayEl.innerHTML = '<span class="text-red-500">Error</span>';
        if (totalBranchesEl) totalBranchesEl.innerHTML = '<span class="text-red-500">Error</span>';
        if (pendingApprovalsEl) pendingApprovalsEl.innerHTML = '<span class="text-red-500">Error</span>';
    }
}

// Get last Sunday date
function getLastSunday() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysSinceLastSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - daysSinceLastSunday);
    return lastSunday.toISOString().split('T')[0];
}

// Load attendance trend chart with period support
async function loadAttendanceTrend() {
    const period = document.getElementById('attendancePeriod')?.value || 'monthly';
    const selectedBranch = document.getElementById('dashboardBranchFilter')?.value || 'all';
    const isSuperAdmin = (currentUserRole === 'SuperAdmin');
    
    // Handle custom date range
    let startDate = null;
    let endDate = null;
    
    if (period === 'custom') {
        startDate = document.getElementById('startDate')?.value;
        endDate = document.getElementById('endDate')?.value;
        
        if (!startDate || !endDate) {
            // Default to last 30 days if no dates selected
            const today = new Date();
            endDate = today.toISOString().split('T')[0];
            const defaultStart = new Date(today);
            defaultStart.setDate(today.getDate() - 30);
            startDate = defaultStart.toISOString().split('T')[0];
        }
    }
    
    // Show/hide custom date picker
    const customDateRange = document.getElementById('customDateRange');
    if (customDateRange) {
        if (period === 'custom') {
            customDateRange.classList.remove('hidden');
        } else {
            customDateRange.classList.add('hidden');
        }
    }
    
    let branchId = null;
    if (isSuperAdmin && selectedBranch !== 'all') {
        branchId = selectedBranch;
    } else if (!isSuperAdmin && currentUserBranchId) {
        branchId = currentUserBranchId;
    }
    
    try {
        let url = `/analytics/attendance-trend?period=${period}`;
        if (branchId) {
            url += `&branchId=${branchId}`;
        }
        if (startDate) {
            url += `&startDate=${startDate}`;
        }
        if (endDate) {
            url += `&endDate=${endDate}`;
        }
        
        const result = await apiFetch(url);
        
        const chartCanvas = document.getElementById('attendanceChart');
        const emptyDiv = document.getElementById('attendanceChartEmpty');
        
        if (result && result.success && result.data && result.data.data && result.data.data.length > 0) {
            const labels = result.data.data.map(d => d.label);
            const attendanceData = result.data.data.map(d => d.totalAttendance);
            
            if (attendanceChart) {
                attendanceChart.destroy();
            }
            
            const ctx = chartCanvas.getContext('2d');
            attendanceChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Sunday Attendance',
                        data: attendanceData,
                        backgroundColor: 'rgba(5, 150, 105, 0.7)',
                        borderColor: '#059669',
                        borderWidth: 1,
                        borderRadius: 8,
                        barPercentage: 0.7,
                        categoryPercentage: 0.8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    return `Attendance: ${context.raw.toLocaleString()} people`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Attendees'
                            },
                            ticks: {
                                callback: function(value) {
                                    return value.toLocaleString();
                                }
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: getXAxisLabel(period)
                            }
                        }
                    }
                }
            });
            
            if (chartCanvas) chartCanvas.classList.remove('hidden');
            if (emptyDiv) emptyDiv.classList.add('hidden');
        } else {
            if (chartCanvas) chartCanvas.classList.add('hidden');
            if (emptyDiv) emptyDiv.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading attendance trend:', error);
        const chartCanvas = document.getElementById('attendanceChart');
        const emptyDiv = document.getElementById('attendanceChartEmpty');
        if (chartCanvas) chartCanvas.classList.add('hidden');
        if (emptyDiv) emptyDiv.classList.remove('hidden');
    }
}

// Helper to get x-axis label based on period
function getXAxisLabel(period) {
    switch(period) {
        case 'weekly': return 'Week';
        case 'monthly': return 'Month';
        case 'quarterly': return 'Quarter';
        case 'yearly': return 'Year';
        case 'custom': return 'Date Range';
        default: return 'Period';
    }
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

// Refresh all dashboard data
async function refreshDashboard() {
    await loadDashboardSummary();
    await loadAttendanceTrend();
    await loadRecentSubmissions();
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

// Initialize everything
async function init() {
    await loadUserInfo();
    await loadBranches();
    await loadUserWelcome();
    await refreshDashboard();
    
    // Event listeners
    const branchFilter = document.getElementById('dashboardBranchFilter');
    if (branchFilter) {
        branchFilter.addEventListener('change', () => {
            refreshDashboard();
        });
    }
    
    const periodSelect = document.getElementById('attendancePeriod');
    if (periodSelect) {
        periodSelect.addEventListener('change', () => {
            loadAttendanceTrend();
        });
    }
    
    const refreshBtn = document.getElementById('refreshDashboardBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshDashboard();
        });
    }
    
    const refreshChartBtn = document.getElementById('refreshChartBtn');
    if (refreshChartBtn) {
        refreshChartBtn.addEventListener('click', () => {
            loadAttendanceTrend();
        });
    }
    
    // Custom range apply button
    const applyCustomRange = document.getElementById('applyCustomRange');
    if (applyCustomRange) {
        applyCustomRange.addEventListener('click', () => {
            loadAttendanceTrend();
        });
    }
}

// Call init on page load
init();