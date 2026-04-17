// js/finance.js - Full Version with Charts

// API Base URL
const API_BASE_URL = 'https://jagomcms-001-site1.ktempurl.com/api';

// Global variables
let branches = [];
let currentUserRole = '';
let allSubmissions = [];
let financeTrendChart = null;
let branchComparisonChart = null;

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

// Auth check
(function checkAuth() {
    const token = localStorage.getItem('token');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    if (!token || !isLoggedIn) {
        window.location.href = 'login.html';
        return;
    }
})();

// Load user role and check access
async function loadUserRole() {
    try {
        const result = await apiFetch('/auth/me');
        if (result && result.success) {
            let userRole = result.data.role;
            
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
            
            // Check access - only Admin and Super Admin can view finance
            if (currentUserRole !== 'admin' && currentUserRole !== 'superadmin') {
                document.getElementById('accessDenied').classList.remove('hidden');
                document.getElementById('financeContent').classList.add('hidden');
                return false;
            } else {
                document.getElementById('accessDenied').classList.add('hidden');
                document.getElementById('financeContent').classList.remove('hidden');
                document.getElementById('printBtn').classList.remove('hidden');
                return true;
            }
        }
    } catch (error) {
        console.error('Error loading user role:', error);
        const role = localStorage.getItem('userRole') || 'user';
        currentUserRole = role.toLowerCase();
        document.getElementById('roleBadge').textContent = role.charAt(0).toUpperCase() + role.slice(1);
        
        if (currentUserRole !== 'admin' && currentUserRole !== 'superadmin') {
            document.getElementById('accessDenied').classList.remove('hidden');
            document.getElementById('financeContent').classList.add('hidden');
            return false;
        }
        return true;
    }
    return false;
}

// Load branches from backend
async function loadBranches() {
    try {
        const result = await apiFetch('/branches');
        if (result && result.success && result.data) {
            branches = result.data;
        } else {
            branches = [{ id: 1, name: "Opebi" }, { id: 2, name: "Ikorodu" }, { id: 3, name: "Otuyelu" }, { id: 4, name: "Likosi" }];
        }
    } catch (error) {
        console.error('Error loading branches:', error);
        branches = [{ id: 1, name: "Opebi" }, { id: 2, name: "Ikorodu" }, { id: 3, name: "Otuyelu" }, { id: 4, name: "Likosi" }];
    }
    
    populateBranchFilter();
}

// Populate branch filter
function populateBranchFilter() {
    const select = document.getElementById('financeBranchFilter');
    if (!select) return;
    
    select.innerHTML = '<option value="all">All Branches</option>';
    branches.forEach(b => {
        select.innerHTML += `<option value="${b.name}">${b.name}</option>`;
    });
}

// Get period parameters
function getPeriodParams() {
    const period = document.getElementById('financePeriod')?.value || 'monthly';
    let startDate = null;
    let endDate = null;
    
    if (period === 'custom') {
        startDate = document.getElementById('financeStartDate')?.value;
        endDate = document.getElementById('financeEndDate')?.value;
        
        if (!startDate || !endDate) {
            const today = new Date();
            endDate = today.toISOString().split('T')[0];
            const defaultStart = new Date(today);
            defaultStart.setDate(today.getDate() - 30);
            startDate = defaultStart.toISOString().split('T')[0];
        }
    }
    
    return { period, startDate, endDate };
}

// Show/hide custom date picker
function initPeriodSelector() {
    const periodSelect = document.getElementById('financePeriod');
    const customDateRange = document.getElementById('financeCustomDateRange');
    
    if (periodSelect) {
        periodSelect.addEventListener('change', () => {
            if (periodSelect.value === 'custom') {
                customDateRange?.classList.remove('hidden');
            } else {
                customDateRange?.classList.add('hidden');
                refreshAllFinanceData();
            }
        });
    }
    
    const applyBtn = document.getElementById('applyFinanceRange');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            refreshAllFinanceData();
        });
    }
    
    const refreshBtn = document.getElementById('refreshFinanceBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshAllFinanceData();
        });
    }
}

// Load performance rating cards
async function loadPerformanceRatings() {
    const container = document.getElementById('performanceRatings');
    const recommendationSpan = document.getElementById('recommendationText');
    if (!container) return;
    
    const { period, startDate, endDate } = getPeriodParams();
    
    container.innerHTML = '<div class="col-span-full text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin"></i> Loading ratings...</div>';
    
    try {
        let url = `/analytics/finance-performance-rating`;
        if (startDate && endDate) {
            url += `?startDate=${startDate}&endDate=${endDate}`;
        }
        
        const result = await apiFetch(url);
        
        if (result && result.success && result.data && result.data.branchRatings) {
            const ratings = result.data.branchRatings;
            
            if (recommendationSpan && result.data.recommendation) {
                recommendationSpan.innerHTML = `<i class="fas fa-lightbulb text-amber-500 mr-1"></i> ${result.data.recommendation}`;
            }
            
            container.innerHTML = ratings.map(r => {
                const stars = '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars);
                const trendIcon = r.trend === 'Up' ? '📈' : (r.trend === 'Down' ? '📉' : '➡️');
                const trendColor = r.trend === 'Up' ? 'text-green-500' : (r.trend === 'Down' ? 'text-red-500' : 'text-gray-500');
                const changeColor = r.percentageChange >= 0 ? 'text-green-500' : 'text-red-500';
                
                return `
                    <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition">
                        <div class="flex items-center justify-between mb-3">
                            <h4 class="font-bold text-gray-900">${escapeHtml(r.branchName)}</h4>
                            <span class="text-2xl text-amber-400">${stars}</span>
                        </div>
                        <div class="space-y-2">
                            <div class="flex justify-between items-center">
                                <span class="text-xs text-gray-500">Total Giving</span>
                                <span class="font-semibold text-primary">₦${formatNumber(r.totalGiving)}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-xs text-gray-500">Trend</span>
                                <span class="text-sm ${trendColor}">${trendIcon} ${r.trend}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-xs text-gray-500">Change</span>
                                <span class="text-sm ${changeColor}">${r.percentageChange >= 0 ? '+' : ''}${r.percentageChange.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<div class="col-span-full text-center py-8 text-gray-400">No rating data available</div>';
        }
    } catch (error) {
        console.error('Error loading performance ratings:', error);
        container.innerHTML = '<div class="col-span-full text-center py-8 text-red-400">Error loading ratings</div>';
    }
}

// Load finance trend chart
async function loadFinanceTrendChart() {
    const { period, startDate, endDate } = getPeriodParams();
    
    const chartCanvas = document.getElementById('financeTrendChart');
    const emptyDiv = document.getElementById('financeChartEmpty');
    
    if (!chartCanvas) return;
    
    chartCanvas.style.display = 'block';
    emptyDiv?.classList.add('hidden');
    
    try {
        let url = `/analytics/finance-trend?period=${period}`;
        if (startDate && endDate) {
            url += `&startDate=${startDate}&endDate=${endDate}`;
        }
        
        const result = await apiFetch(url);
        
        if (result && result.success && result.data && result.data.data && result.data.data.length > 0) {
            const labels = result.data.data.map(d => d.period);
            const titheData = result.data.data.map(d => d.tithe);
            const offeringData = result.data.data.map(d => d.offering);
            const specialSeedData = result.data.data.map(d => d.specialSeed);
            
            // Update summary totals
            if (result.data.summary) {
                document.getElementById('totalTithe').textContent = `₦${formatNumber(result.data.summary.totalTithe)}`;
                document.getElementById('totalOffering').textContent = `₦${formatNumber(result.data.summary.totalOffering)}`;
                document.getElementById('totalSpecialSeed').textContent = `₦${formatNumber(result.data.summary.totalSpecialSeed)}`;
                document.getElementById('grandTotal').textContent = `₦${formatNumber(result.data.summary.grandTotal)}`;
            }
            
            if (financeTrendChart) {
                financeTrendChart.destroy();
            }
            
            const ctx = chartCanvas.getContext('2d');
            financeTrendChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Tithe',
                            data: titheData,
                            backgroundColor: 'rgba(5, 150, 105, 0.7)',
                            borderColor: '#059669',
                            borderWidth: 1,
                            borderRadius: 6
                        },
                        {
                            label: 'Offering',
                            data: offeringData,
                            backgroundColor: 'rgba(59, 130, 246, 0.7)',
                            borderColor: '#3b82f6',
                            borderWidth: 1,
                            borderRadius: 6
                        },
                        {
                            label: 'Special Seed',
                            data: specialSeedData,
                            backgroundColor: 'rgba(245, 158, 11, 0.7)',
                            borderColor: '#f59e0b',
                            borderWidth: 1,
                            borderRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ₦${context.raw.toLocaleString()}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Amount (₦)'
                            },
                            ticks: {
                                callback: function(value) {
                                    return '₦' + value.toLocaleString();
                                }
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: period === 'weekly' ? 'Week' : (period === 'monthly' ? 'Month' : (period === 'quarterly' ? 'Quarter' : 'Year'))
                            }
                        }
                    }
                }
            });
            
            chartCanvas.classList.remove('hidden');
            if (emptyDiv) emptyDiv.classList.add('hidden');
        } else {
            chartCanvas.classList.add('hidden');
            if (emptyDiv) emptyDiv.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading finance trend:', error);
        chartCanvas.classList.add('hidden');
        if (emptyDiv) emptyDiv.classList.remove('hidden');
    }
}

// Load branch comparison chart
async function loadBranchComparisonChart() {
    const { period, startDate, endDate } = getPeriodParams();
    
    const chartCanvas = document.getElementById('branchComparisonChart');
    const emptyDiv = document.getElementById('branchComparisonEmpty');
    
    if (!chartCanvas) return;
    
    try {
        let url = `/analytics/branch-finance-comparison?period=${period}`;
        if (startDate && endDate) {
            url += `&startDate=${startDate}&endDate=${endDate}`;
        }
        
        const result = await apiFetch(url);
        
        if (result && result.success && result.data && result.data.branches && result.data.branches.length > 0) {
            const branchNames = result.data.branches.map(b => b.branchName);
            const givingData = result.data.branches.map(b => b.totalGiving);
            const percentages = result.data.branches.map(b => b.percentageOfTotal.toFixed(1));
            
            // Update top branch message
            const topBranchMsg = document.getElementById('topBranchMessage');
            if (topBranchMsg && result.data.topBranch) {
                topBranchMsg.innerHTML = `🏆 <strong>${escapeHtml(result.data.topBranch.branchName)}</strong> is the top performing branch with <strong>₦${formatNumber(result.data.topBranch.totalGiving)}</strong> (${result.data.topBranch.percentageOfTotal.toFixed(1)}% of total)`;
            }
            
            if (branchComparisonChart) {
                branchComparisonChart.destroy();
            }
            
            const ctx = chartCanvas.getContext('2d');
            branchComparisonChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: branchNames,
                    datasets: [
                        {
                            label: 'Total Giving (₦)',
                            data: givingData,
                            backgroundColor: 'rgba(5, 150, 105, 0.8)',
                            borderColor: '#059669',
                            borderWidth: 1,
                            borderRadius: 8
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const index = context.dataIndex;
                                    return [
                                        `Amount: ₦${context.raw.toLocaleString()}`,
                                        `Percentage: ${percentages[index]}% of total`
                                    ];
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Amount (₦)'
                            },
                            ticks: {
                                callback: function(value) {
                                    return '₦' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
            
            chartCanvas.classList.remove('hidden');
            if (emptyDiv) emptyDiv.classList.add('hidden');
        } else {
            chartCanvas.classList.add('hidden');
            if (emptyDiv) emptyDiv.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading branch comparison:', error);
        chartCanvas.classList.add('hidden');
        if (emptyDiv) emptyDiv.classList.remove('hidden');
    }
}

// Load branch performance cards
async function loadBranchPerformance() {
    const container = document.getElementById('branchPerformance');
    if (!container) return;
    
    container.innerHTML = '<div class="col-span-full text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin"></i> Loading performance...</div>';
    
    try {
        const result = await apiFetch('/finance/branch-performance');
        
        if (result && result.success && result.data) {
            const colors = ['from-primary to-emerald-600', 'from-emerald-500 to-teal-600', 'from-teal-500 to-cyan-600', 'from-cyan-500 to-primary'];
            const icons = ['fa-building', 'fa-location-dot', 'fa-map-pin', 'fa-map-marker-alt'];
            
            container.innerHTML = result.data.map((branch, i) => `
                <div class="branch-card bg-gradient-to-br ${colors[i % colors.length]} rounded-2xl p-5 text-white transition-all duration-300 shadow-sm">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <i class="fas ${icons[i % icons.length]}"></i>
                        </div>
                        <div>
                            <p class="font-bold">${escapeHtml(branch.branchName)}</p>
                            <p class="text-xs text-white/70">Branch</p>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-white/70 text-sm">Total Giving</span>
                            <span class="font-bold">₦${formatNumber(branch.grandTotal)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-white/70 text-sm">Total Attendance</span>
                            <span class="font-bold">${formatNumber(branch.totalAttendance)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-white/70 text-sm">Submissions</span>
                            <span class="font-bold">${branch.submissionCount}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="col-span-full text-center py-8 text-gray-400">No performance data available</div>';
        }
    } catch (error) {
        console.error('Error loading branch performance:', error);
        container.innerHTML = '<div class="col-span-full text-center py-8 text-red-400">Error loading performance data</div>';
    }
}

// Load finance table
async function loadFinanceTable(filterBranch = 'all') {
    const tbody = document.getElementById('financeTableBody');
    const noSubmissions = document.getElementById('noSubmissions');
    
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin"></i> Loading submissions...</td></tr>`;
    
    try {
        const result = await apiFetch('/ushers/submissions');
        
        if (result && result.success && result.data) {
            let submissions = result.data;
            
            if (filterBranch !== 'all') {
                submissions = submissions.filter(s => s.branchName === filterBranch);
            }
            
            if (submissions.length === 0) {
                tbody.innerHTML = '';
                noSubmissions.classList.remove('hidden');
                tbody.parentElement.classList.add('hidden');
                return;
            }
            
            noSubmissions.classList.add('hidden');
            tbody.parentElement.classList.remove('hidden');
            
            tbody.innerHTML = submissions.map(s => `
                <tr class="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td class="px-4 py-3 text-gray-600 whitespace-nowrap">${new Date(s.date).toLocaleDateString()}</td>
                    <td class="px-4 py-3"><span class="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">${escapeHtml(s.branchName)}</span></td>
                    <td class="px-4 py-3 font-medium text-gray-900">${escapeHtml(s.preacher)}</td>
                    <td class="px-4 py-3 text-gray-600">${s.totalAttendance || 0}</td>
                    <td class="px-4 py-3 text-right text-gray-600">₦${formatNumber(s.tithe)}</td>
                    <td class="px-4 py-3 text-right text-gray-600">₦${formatNumber(s.offering)}</td>
                    <td class="px-4 py-3 text-right text-gray-600">₦${formatNumber(s.specialSeed)}</td>
                    <td class="px-4 py-3 text-right font-bold text-primary">₦${formatNumber(s.total)}</td>
                    <td class="px-4 py-3 text-center">
                        <span class="text-xs font-medium px-2.5 py-1 rounded-full ${getStatusClass(s.status)}">${s.status.charAt(0).toUpperCase() + s.status.slice(1)}</span>
                    </td>
                    <td class="px-4 py-3 text-center">
                        ${s.status === 'Pending' || s.status === 'pending' ? `
                            <div class="flex items-center justify-center gap-2">
                                <button onclick="approveSubmission(${s.id})" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1">
                                    <i class="fas fa-check"></i>Approve
                                </button>
                                <button onclick="rejectSubmission(${s.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1">
                                    <i class="fas fa-times"></i>Reject
                                </button>
                            </div>
                        ` : `<span class="text-xs text-gray-400">${s.status === 'Approved' || s.status === 'approved' ? '✓ Approved' : '✗ Rejected'}</span>`}
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '';
            noSubmissions.classList.remove('hidden');
            tbody.parentElement.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error loading submissions:', error);
        tbody.innerHTML = `<td><td colspan="10" class="text-center py-8 text-red-400">Error loading submissions</td></tr>`;
    }
}

// Approve submission
async function approveSubmission(id) {
    if (!confirm('Are you sure you want to approve this submission?')) return;
    
    const approveBtn = event.target.closest('button');
    const originalText = approveBtn.innerHTML;
    approveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    approveBtn.disabled = true;
    
    try {
        const result = await apiFetch(`/finance/approve/${id}`, {
            method: 'POST'
        });
        
        if (result && result.success) {
            alert('Submission approved successfully!');
            await refreshAllFinanceData();
        } else {
            alert(result?.message || 'Failed to approve submission');
        }
    } catch (error) {
        console.error('Error approving submission:', error);
        alert('Error approving submission. Please try again.');
    } finally {
        approveBtn.innerHTML = originalText;
        approveBtn.disabled = false;
    }
}

// Reject submission
async function rejectSubmission(id) {
    if (!confirm('Are you sure you want to reject this submission?')) return;
    
    const rejectBtn = event.target.closest('button');
    const originalText = rejectBtn.innerHTML;
    rejectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    rejectBtn.disabled = true;
    
    try {
        const result = await apiFetch(`/finance/reject/${id}`, {
            method: 'POST'
        });
        
        if (result && result.success) {
            alert('Submission rejected successfully!');
            await refreshAllFinanceData();
        } else {
            alert(result?.message || 'Failed to reject submission');
        }
    } catch (error) {
        console.error('Error rejecting submission:', error);
        alert('Error rejecting submission. Please try again.');
    } finally {
        rejectBtn.innerHTML = originalText;
        rejectBtn.disabled = false;
    }
}

// Generate financial report
async function generateReport() {
    const startDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    
    try {
        const result = await apiFetch(`/finance/reports?startDate=${startDate}&endDate=${endDate}`);
        
        if (result && result.success) {
            let printContent = '<h2 style="margin-bottom:20px;">Branch Performance Summary</h2>';
            printContent += '<table style="width:100%;border-collapse:collapse;margin-bottom:30px;">';
            printContent += '<tr style="background:#059669;color:white;"><th style="padding:10px;border:1px solid #ddd;">Branch</th><th style="padding:10px;border:1px solid #ddd;">Total Giving</th><th style="padding:10px;border:1px solid #ddd;">Total Attendance</th><th style="padding:10px;border:1px solid #ddd;">Submissions</th></tr>';
            
            result.data.branchPerformances.forEach(branch => {
                printContent += `<tr><td style="padding:8px;border:1px solid #ddd;">${branch.branchName}</td>
                    <td style="padding:8px;border:1px solid #ddd;">₦${formatNumber(branch.grandTotal)}</td>
                    <td style="padding:8px;border:1px solid #ddd;">${formatNumber(branch.totalAttendance)}</td>
                    <td style="padding:8px;border:1px solid #ddd;">${branch.submissionCount}</td>
                </tr>`;
            });
            printContent += '</table>';
            
            printContent += `<p style="margin-top:20px;"><strong>Overall Total:</strong> ₦${formatNumber(result.data.overallTotal)}</p>`;
            printContent += `<p><strong>Total Submissions:</strong> ${result.data.totalSubmissions}</p>`;
            
            document.getElementById('printDate').textContent = new Date().toLocaleDateString();
            document.getElementById('printContent').innerHTML = printContent;
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html><head><title>JAGOM Finance Report</title>
                <style>body{font-family:Inter,sans-serif;padding:30px;}table{width:100%;border-collapse:collapse;}th,td{padding:8px;border:1px solid #ddd;text-align:left;}h1{color:#059669;}h2{color:#374151;}</style>
                </head><body>
                <div style="text-align:center;border-bottom:2px solid #059669;padding-bottom:20px;margin-bottom:30px;">
                    <h1>JAGOM Church Management System</h1>
                    <p style="color:#6b7280;">Financial Report - ${new Date().toLocaleDateString()}</p>
                </div>
                ${printContent}
                </body></html>
            `);
            printWindow.document.close();
            printWindow.print();
        } else {
            alert('Failed to generate report');
        }
    } catch (error) {
        console.error('Error generating report:', error);
        alert('Error generating report');
    }
}

// Refresh all finance data
async function refreshAllFinanceData() {
    await loadPerformanceRatings();
    await loadFinanceTrendChart();
    await loadBranchComparisonChart();
    await loadBranchPerformance();
    const filter = document.getElementById('financeBranchFilter')?.value || 'all';
    await loadFinanceTable(filter);
    
    const lastUpdated = document.getElementById('financeLastUpdated');
    if (lastUpdated) {
        lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }
}

// Helper function to format numbers
function formatNumber(num) {
    if (num === undefined || num === null) return '0.00';
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

// Branch filter event
const branchFilter = document.getElementById('financeBranchFilter');
if (branchFilter) {
    branchFilter.addEventListener('change', (e) => {
        loadFinanceTable(e.target.value);
    });
}

// Print button event
const printBtn = document.getElementById('printBtn');
if (printBtn) {
    printBtn.addEventListener('click', generateReport);
}

// Initialize page
async function init() {
    const hasAccess = await loadUserRole();
    if (!hasAccess) return;
    
    await loadBranches();
    initPeriodSelector();
    await refreshAllFinanceData();
}

init();

// Make functions globally available for onclick handlers
window.approveSubmission = approveSubmission;
window.rejectSubmission = rejectSubmission;