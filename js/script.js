// Initialize localStorage with defaults
function initDefaults() {
    if (!localStorage.getItem('branches')) {
        localStorage.setItem('branches', JSON.stringify(["Opebi", "Ikorodu", "Otuyelu", "Likosi"]));
    }
    if (!localStorage.getItem('users')) {
        localStorage.setItem('users', JSON.stringify([
            { username: "superadmin", email: "super@jagom.com", password: "admin123", role: "superadmin" }
        ]));
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

// Load branch cards
function loadBranches() {
    const branches = JSON.parse(localStorage.getItem('branches') || '["Opebi", "Ikorodu", "Otuyelu", "Likosi"]');
    const container = document.getElementById('branchCards');
    const icons = ['fa-map-marker-alt', 'fa-map-pin', 'fa-location-dot', 'fa-location-crosshairs'];
    const images = [
        'http://static.photos/office/640x360/1',
        'http://static.photos/cityscape/640x360/2',
        'http://static.photos/minimal/640x360/3',
        'http://static.photos/indoor/640x360/4'
    ];

    container.innerHTML = branches.map((branch, i) => `
        <div class="branch-card bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 transition-all duration-300 animate-fade-in-up animate-delay-${i+1}">
            <div class="h-40 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center relative">
                <img src="${images[i % images.length]}" alt="${branch}" class="w-full h-full object-cover opacity-70 absolute inset-0" onerror="this.style.display='none'">
                <div class="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent"></div>
                <div class="relative z-10 w-14 h-14 bg-white rounded-2xl shadow-lg flex items-center justify-center">
                    <i class="fas ${icons[i % icons.length]} text-primary text-xl"></i>
                </div>
            </div>
            <div class="p-6 text-center">
                <h3 class="text-lg font-bold text-gray-900 mb-1">${branch} Branch</h3>
                <p class="text-sm text-gray-400">JAGOM Church</p>
            </div>
        </div>
    `).join('');
}

// Set footer year
document.getElementById('footerYear').textContent = new Date().getFullYear();

// Load logo
function loadLogo() {
    const logo = localStorage.getItem('jagomLogo');
    if (logo) {
        const navLogo = document.getElementById('navLogo');
        navLogo.innerHTML = `<img src="${logo}" alt="JAGOM Logo" class="w-full h-full object-cover rounded-lg">`;
    }
}

// Initialize
initDefaults();
loadBranches();
loadLogo();
