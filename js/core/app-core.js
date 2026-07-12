// --- ESTADO DE LA APLICACIÓN ---
let currentUser = null;
let timerInterval = null;
let activeTab = 'tab-trabajadores-admin';
let selectedWorkerId = null;
let editVehicleIdVal = null;
let expandedUserId = null;

// Helper para formatear horas decimales detalladas al segundo
function formatDecimalHours(decimalHours) {
    if (decimalHours === null || decimalHours === undefined || isNaN(decimalHours)) return '-';
    const totalSeconds = Math.round(decimalHours * 3600);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ') + ` (${decimalHours.toFixed(4)}h)`;
}

// Helper global para formatear fecha de YYYY-MM-DD a DD-MM-YYYY
function formatDateDDMMYYYY(dateString) {
    if (!dateString) return '-';
    // dateString puede venir como "YYYY-MM-DD HH:MM:SS" o "YYYY-MM-DD"
    const parts = dateString.split(' ')[0].split('-');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString;
}

// --- ELEMENTOS DEL DOM ---
// Contenedores Principales
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');

// Formulario de Login
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// Perfil y Header del Dashboard
const userAvatar = document.getElementById('user-avatar');
const userDisplayName = document.getElementById('user-display-name');
const userRoleBadge = document.getElementById('user-role-badge');
const sidebarMenu = document.getElementById('sidebar-menu');
const viewTitle = document.getElementById('view-title');
const viewSubtitle = document.getElementById('view-subtitle');
const currentTimeSpan = document.getElementById('current-date-time');
const btnLogout = document.getElementById('btn-logout');
let bottomNavMenu = document.getElementById('bottom-nav-menu');

// Vistas de Roles
const viewUser = document.getElementById('view-user');
const viewLeader = document.getElementById('view-leader');
const viewAdmin = document.getElementById('view-admin');

// Botones Globales
const btnResetDb = document.getElementById('btn-reset-db');

// --- INICIALIZACIÓN ---
initApp();

async function initApp() {
    // Iniciar reloj en tiempo real
    startClock();

    // Configurar navegación de sidebar en móviles
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    const toggleSidebar = () => {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('hidden');
    };

    const closeSidebar = () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.add('hidden');
    };

    if (btnToggleSidebar) btnToggleSidebar.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    if (sidebarMenu) {
        sidebarMenu.addEventListener('click', (e) => {
            const navLink = e.target.closest('.sidebar-nav-link');
            if (navLink) {
                if (window.innerWidth <= 900) {
                    closeSidebar();
                }
                const subview = navLink.getAttribute('data-subview');
                if (subview && subview !== 'undefined' && subview !== '') {
                    window.location.hash = subview;
                }
            }
        });
    }

    // Verificar sesión existente en sessionStorage
    const savedUser = sessionStorage.getItem('dch_current_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        await window.AttendanceDB.loadStateFromServer();
        showDashboard();
    } else {
        showLogin();
    }

    // Event listener para hashchange
    window.addEventListener('hashchange', handleHashChange);
}

function handleHashChange() {
    if (!currentUser) return;
    const hash = decodeURIComponent(window.location.hash.substring(1));
    if (hash) {
        activeTab = hash;

        // Si es un tab del admin, activar el botón correspondiente
        if (hash.startsWith('tab-')) {
            const tabBtns = document.querySelectorAll('.tab-btn');
            const tabContents = document.querySelectorAll('.tab-content');
            if (tabBtns.length > 0) {
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                const matchingBtn = document.querySelector(`.tab-btn[data-tab="${hash}"]`);
                if (matchingBtn) matchingBtn.classList.add('active');
                const matchingContent = document.getElementById(hash);
                if (matchingContent) matchingContent.classList.add('active');
            }
        }

        loadRoleView();

        // Actualizar vista activa en sidebar (visual)
        document.querySelectorAll('.sidebar-nav-item').forEach(item => item.classList.remove('active'));
        const activeLink = document.querySelector(`.sidebar-nav-link[data-subview="${hash}"]`);
        if (activeLink && activeLink.parentElement) {
            activeLink.parentElement.classList.add('active');
        }

        // Actualizar vista activa en bottom nav
        document.querySelectorAll('.bottom-nav-item').forEach(item => item.classList.remove('active'));
        const activeBottomLink = document.querySelector(`.bottom-nav-link[data-subview="${hash}"]`);
        if (activeBottomLink && activeBottomLink.parentElement) {
            activeBottomLink.parentElement.classList.add('active');
        }

        // Actualizar vista activa en more nav list
        document.querySelectorAll('.more-nav-list a').forEach(item => item.classList.remove('active'));
        const activeMoreLink = document.querySelector(`.more-nav-list a[data-subview="${hash}"]`);
        if (activeMoreLink) {
            activeMoreLink.classList.add('active');
        }
    }
}

// --- RELOJ EN TIEMPO REAL ---
function startClock() {
    const updateClock = () => {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        currentTimeSpan.textContent = now.toLocaleDateString('es-GT', options);
    };
    updateClock();
    setInterval(updateClock, 1000);
}

// --- MANEJO DE NAVEGACIÓN Y PANTALLAS ---
function showLogin() {
    loginContainer.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
    currentUser = null;
    sessionStorage.removeItem('dch_current_user');
    clearInterval(timerInterval);
}

function showDashboard() {
    loginContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');

    // Configurar perfil en sidebar
    userDisplayName.textContent = currentUser.nombre;
    userAvatar.textContent = currentUser.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    // Asignar etiqueta de rol legible
    let roleText = 'Usuario';
    if (currentUser.rol === 'leader') roleText = 'Líder de Grupo';
    if ((currentUser.rol === 'admin' || currentUser.rol === 'superadmin')) roleText = 'Supervisor';
    userRoleBadge.textContent = roleText;
    userRoleBadge.className = `role-badge ${currentUser.rol}`;

    // Renderizar menú de navegación lateral y configurar vistas
    setupSidebarMenu();

    // Establecer activeTab por defecto según rol
    let defaultTab = 'view-user';
    if (currentUser.rol === 'leader') defaultTab = 'view-leader';
    else if ((currentUser.rol === 'admin' || currentUser.rol === 'superadmin')) defaultTab = 'tab-trabajadores-admin';

    if (!window.location.hash || window.location.hash === '#') {
        window.location.replace('#' + defaultTab);
    } else {
        handleHashChange();
    }

    if ((currentUser.rol === 'admin' || currentUser.rol === 'superadmin')) {
        renderCompanyDropdowns();
    }
}


function setupSidebarMenu() {
    sidebarMenu.innerHTML = '';
    if (bottomNavMenu) bottomNavMenu.innerHTML = '';
    const menuItems = [];

    let userPerms = {};
    if (currentUser && currentUser.permisos) {
        try {
            userPerms = typeof currentUser.permisos === 'string' ? JSON.parse(currentUser.permisos) : currentUser.permisos;
        } catch(e) {}
    }

    if (currentUser.rol === 'usr' || currentUser.rol === 'leader') {
        if (userPerms.control_asistencia !== false) menuItems.push({ id: 'nav-control-asistencia', label: 'Control de Asistencia', icon: '<polygon points="5 3 19 12 5 21 5 3"></polygon>', subView: 'view-user' });
        if (userPerms.mi_historial !== false) menuItems.push({ id: 'nav-user-history', label: 'Mi Historial', icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>', subView: 'view-user-history' });
        if (userPerms.prestamos !== false) menuItems.push({ id: 'nav-user-loan', label: 'Mi Préstamo', icon: '<circle cx="12" cy="12" r="10"></circle><path d="M12 8v8M9 12h6"></path>', subView: 'view-user-loan' });
        if (userPerms.vehiculos !== false) menuItems.push({ id: 'nav-user-vehicles', label: 'Encargados de Vehículos', icon: '<rect x="1" y="3" width="22" height="13" rx="2" ry="2"></rect><path d="M7 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"></path>', subView: 'view-user-vehicles' });
        if (userPerms.inventario !== false) menuItems.push({ id: 'nav-user-inventory', label: 'Mi Inventario', icon: '<path d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>', subView: 'view-user-inventory' });
        if (userPerms.caja_chica !== false) menuItems.push({ id: 'nav-user-cajachica', label: 'Caja Chica', icon: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>', subView: 'view-petty-cash' });

        if (currentUser.rol === 'leader') {
            menuItems.push({ id: 'nav-leader', label: 'Mi Subgrupo', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>', subView: 'view-leader' });
        }
    } else if ((currentUser.rol === 'admin' || currentUser.rol === 'superadmin')) {
        menuItems.push({ id: 'nav-admin-trabajadores', label: 'Trabajadores', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle>', subView: 'tab-trabajadores-admin' });
        menuItems.push({ id: 'nav-admin-descuentos', label: 'Descuentos', icon: '<circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line>', subView: 'tab-descuentos' });
        menuItems.push({ id: 'nav-admin-empresas', label: 'Empresas', icon: '<rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect><path d="M10 22V14h4v8"></path><path d="M8 6h2v2H8V6zm8 0h2v2H8V6zm-8 4h2v2H8v-2zm8 0h2v2h-2v-2zm-8 4h2v2H8v-2zm8 0h2v2h-2v-2z"></path>', subView: 'tab-empresas' });
        if (userPerms.vehiculos !== false) menuItems.push({ id: 'nav-admin-vehículos', label: 'Vehículos', icon: '<rect x="1" y="3" width="22" height="13" rx="2" ry="2"></rect><path d="M7 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"></path>', subView: 'tab-vehículos' });
        if (userPerms.prestamos !== false) menuItems.push({ id: 'nav-admin-préstamos', label: 'Préstamos', icon: '<circle cx="12" cy="12" r="10"></circle><path d="M12 8v8M9 12h6"></path>', subView: 'tab-préstamos' });
        if (userPerms.proyectos !== false) menuItems.push({ id: 'nav-admin-proyectos', label: 'Proyectos', icon: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>', subView: 'tab-proyectos' });
        if (userPerms.proyectos !== false) menuItems.push({ id: 'nav-admin-finanzas', label: 'Finanzas', icon: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>', subView: 'tab-finanzas' });
        if (userPerms.caja_chica !== false) menuItems.push({ id: 'nav-admin-cajachica', label: 'Caja Chica', icon: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>', subView: 'view-petty-cash' });
        // Botón de Día de Pago destacado
        menuItems.push({ id: 'nav-admin-diapago', label: 'Día de Pago', icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M12 14l2 2 4-4"></path>', subView: 'tab-asistencia', isSpecial: true });
    }

    // Todos los roles tienen acceso a Ingresos Globales
    if (userPerms.ingresos_gastos !== false) menuItems.push({ id: 'nav-global-incomes', label: 'Ingresos y Gastos', icon: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>', subView: 'view-global-incomes' });

    const maxBottomItems = 4;
    let bottomItemsAdded = 0;
    const moreMenuItems = [];
    const totalItems = menuItems.length;

    menuItems.forEach((item, index) => {
        const li = document.createElement('li');
        const isActive = (item.subView === activeTab);

        if (item.isSpecial) {
            li.className = "sidebar-nav-item special-payroll-btn " + (isActive ? 'active' : '');
            li.innerHTML = `
                    <a id="${item.id}" class="sidebar-nav-link special-payroll-link" data-subview="${item.subView}">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            ${item.icon}
                        </svg>
                        <span>${item.label}</span>
                    </a>
                `;
        } else {
            li.className = "sidebar-nav-item " + (isActive ? 'active' : '');
            li.innerHTML = `
                    <a id="${item.id}" class="sidebar-nav-link" data-subview="${item.subView}">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            ${item.icon}
                        </svg>
                        <span>${item.label}</span>
                    </a>
                `;
        }
        sidebarMenu.appendChild(li);

        // Populate Bottom Nav
        if (bottomNavMenu) {
            if (totalItems <= 4 || bottomItemsAdded < maxBottomItems) {
                const bLi = document.createElement('li');
                bLi.className = "bottom-nav-item " + (isActive ? 'active' : '');
                bLi.innerHTML = `
                        <a id="bottom-${item.id}" class="bottom-nav-link" data-subview="${item.subView}">
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                ${item.icon}
                            </svg>
                            <span>${item.label.split(' ')[0]}</span>
                        </a>
                    `;
                bottomNavMenu.appendChild(bLi);
                bottomItemsAdded++;
            } else {
                moreMenuItems.push(item);
            }
        }
    });

    // Populate Más Menu
    if (bottomNavMenu && moreMenuItems.length > 0) {
        const moreLi = document.createElement('li');
        moreLi.className = "bottom-nav-item";
        moreLi.innerHTML = `
                <a id="bottom-nav-more" class="bottom-nav-link" href="javascript:void(0)" onclick="document.getElementById('bottom-nav-more-modal').classList.remove('hidden')">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="19" cy="12" r="1"></circle>
                        <circle cx="5" cy="12" r="1"></circle>
                    </svg>
                    <span>Más</span>
                </a>
            `;
        bottomNavMenu.appendChild(moreLi);
        
        const moreList = document.getElementById('bottom-nav-more-list');
        if (moreList) {
            moreList.innerHTML = '';
            moreMenuItems.forEach(item => {
                const isActive = (item.subView === activeTab);
                const li = document.createElement('li');
                li.innerHTML = `
                    <a href="javascript:void(0)" class="${isActive ? 'active' : ''}" data-subview="${item.subView}" onclick="document.getElementById('bottom-nav-more-modal').classList.add('hidden')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            ${item.icon}
                        </svg>
                        ${item.label}
                    </a>
                `;
                moreList.appendChild(li);
            });
            
            // Agregar botón de Cerrar Sesión al final del menú Más
            const logoutLi = document.createElement('li');
            logoutLi.innerHTML = `
                <a href="javascript:void(0)" class="text-danger" onclick="showLogin(); document.getElementById('bottom-nav-more-modal').classList.add('hidden'); window.location.reload();">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Cerrar Sesión
                </a>
            `;
            moreList.appendChild(logoutLi);
            
            // Delegate clicks for more menu list
            const newMoreList = moreList.cloneNode(true);
            moreList.parentNode.replaceChild(newMoreList, moreList);
            newMoreList.addEventListener('click', (e) => {
                const link = e.target.closest('a[data-subview]');
                if (link) {
                    const subview = link.getAttribute('data-subview');
                    if (subview) window.location.hash = subview;
                }
            });
        }
    } else if (bottomNavMenu) {
        // No hay menú Más, agregamos el botón de Salir directo a la barra inferior
        const logoutLi = document.createElement('li');
        logoutLi.className = "bottom-nav-item";
        logoutLi.innerHTML = `
            <a id="bottom-nav-logout" class="bottom-nav-link text-danger" href="javascript:void(0)" onclick="showLogin(); window.location.reload();">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Salir</span>
            </a>
        `;
        bottomNavMenu.appendChild(logoutLi);
    }

    // Delegate bottom nav clicks
    if (bottomNavMenu) {
        // Remove old listener if exists
        const newBottomNav = bottomNavMenu.cloneNode(true);
        bottomNavMenu.parentNode.replaceChild(newBottomNav, bottomNavMenu);
        bottomNavMenu = newBottomNav;
        newBottomNav.addEventListener('click', (e) => {
            const navLink = e.target.closest('.bottom-nav-link');
            if (navLink) {
                const subview = navLink.getAttribute('data-subview');
                if (subview && subview !== 'undefined' && subview !== '') {
                    window.location.hash = subview;
                }
            }
        });
    }
}

// Cargar la vista correspondiente al rol
function loadRoleView() {
    // Ocultar todas las vistas
    const views = document.querySelectorAll('.role-view');
    views.forEach(v => v.classList.add('hidden'));

    // Si la vista es Ingresos Globales
    if (activeTab === 'view-global-incomes') {
        document.getElementById('view-global-incomes').classList.remove('hidden');
        viewTitle.textContent = 'Ingresos y Gastos';
        viewSubtitle.textContent = 'Reporte de ingresos y gastos de la empresa.';
        setupGlobalIncomesView();
        return;
    }

    // Si la vista es Materiales
    if (activeTab === 'view-materials') {
        document.getElementById('view-materials').classList.remove('hidden');
        viewTitle.textContent = 'Materiales e Insumos';
        viewSubtitle.textContent = 'Control de inventario de materiales por empresa.';
        setupMaterialsView();
        return;
    }


    // Si la vista es caja chica
    if (activeTab === 'view-petty-cash') {
        document.getElementById('view-petty-cash').classList.remove('hidden');
        viewTitle.textContent = 'Caja Chica';
        viewSubtitle.textContent = 'Asignación de fondos para compras específicas y registro de gastos.';
        renderPettyCashView();
        return;
    }

    // Si la vista es inventarios (Admin), cargamos
    if (activeTab === 'view-inventories') {
        document.getElementById('view-inventories').classList.remove('hidden');
        viewTitle.textContent = 'Inventario por Empleado';
        viewSubtitle.textContent = 'Asignación de herramientas y revisión de auditorías fotográficas semanales.';
        loadInventoriesView();
        return;
    }

    // Si la vista es inventario de usuario (Empleado)
    if (activeTab === 'view-user-inventory') {
        document.getElementById('view-user-inventory').classList.remove('hidden');
        viewTitle.textContent = 'Mi Inventario';
        viewSubtitle.textContent = 'Revisa tus herramientas asignadas y envía tu fotografía semanal de revisión.';
        loadUserInventoryView();
        return;
    }

    if (currentUser.rol === 'usr' || currentUser.rol === 'leader') {
        if (activeTab === 'tab-tiendas' && currentUser.rol === 'leader') {
            const adminView = document.getElementById('view-admin');
            if (adminView) adminView.classList.remove('hidden');
            document.querySelectorAll('#view-admin .tab-content').forEach(c => c.classList.remove('active'));
            const targetTabContent = document.getElementById('tab-tiendas');
            if (targetTabContent) targetTabContent.classList.add('active');
            viewTitle.textContent = 'Gestión de Tiendas';
            viewSubtitle.textContent = 'Administra tiendas, asigna personal y gestiona el inventario principal.';
            const tabHeader = document.querySelector('.tab-header');
            if (tabHeader) tabHeader.style.display = 'none'; // Ocultar barra superior del admin
            renderAdminStoresTable();
        } else if (activeTab === 'view-user-history') {
            const historyView = document.getElementById('view-user-history');
            if (historyView) historyView.classList.remove('hidden');
            viewTitle.textContent = 'Historiales';
            viewSubtitle.textContent = 'Historial completo de tus marcajes, pagos, bonificaciones y deducciones.';
            renderUserStatsAndTable();
        } else if (activeTab === 'view-user-loan') {
            const loanView = document.getElementById('view-user-loan');
            if (loanView) loanView.classList.remove('hidden');
            viewTitle.textContent = 'Mi Préstamo';
            viewSubtitle.textContent = 'Estado de amortización y saldo pendiente de tu préstamo.';
            if (typeof setupUserLoanView === 'function') setupUserLoanView();
        } else if (activeTab === 'view-user-vehicles') {
            const vehiclesView = document.getElementById('view-user-vehicles');
            if (vehiclesView) vehiclesView.classList.remove('hidden');
            viewTitle.textContent = 'Encargados de Vehículos';
            viewSubtitle.textContent = 'Asignación de vehículos de la flotilla y motivos de uso.';
            if (typeof setupUserVehiclesView === 'function') setupUserVehiclesView();
        } else if (activeTab === 'view-user-penalties') {
            const penaltiesView = document.getElementById('view-user-penalties');
            if (penaltiesView) penaltiesView.classList.remove('hidden');
            viewTitle.textContent = 'Descuentos y Bonos';
            viewSubtitle.textContent = 'Detalle de deducciones aplicadas a tu pago actual.';
            if (typeof loadUserPenaltiesView === 'function') {
                loadUserPenaltiesView();
            }
        } else if (currentUser.rol === 'usr') {
            viewUser.classList.remove('hidden');
            viewTitle.textContent = 'Control de Asistencia';
            viewSubtitle.textContent = 'Registra tus marcas diarias y visualiza tus ingresos calculados en Quetzales (Q).';
            setupUserView();
        } else {
            viewLeader.classList.remove('hidden');
            viewTitle.textContent = `Panel de Control - ${currentUser.grupo}`;
            viewSubtitle.textContent = 'Monitoreo de horas de trabajo y pagos devengados por los miembros de tu subgrupo.';
            setupLeaderView();
        }
    } else if ((currentUser.rol === 'admin' || currentUser.rol === 'superadmin')) {
        viewAdmin.classList.remove('hidden');

        // Título y subtítulo dinámico según pestaña
        if (activeTab === 'tab-trabajadores-admin') {
            viewTitle.textContent = 'Fichas y Resumen de Trabajadores';
            viewSubtitle.textContent = 'Listado principal de empleados, métricas de pago e historial detallado de marcajes.';
        } else if (activeTab === 'tab-asistencia') {
            viewTitle.textContent = 'Aprobación de Pagos (Día de Pago)';
            viewSubtitle.textContent = 'Liquidaciones y control horario de colaboradores.';
        } else if (activeTab === 'tab-usuarios') {
            viewTitle.textContent = 'Gestión de Cuentas';
            viewSubtitle.textContent = 'Administración de personal, tarifas por hora y asignación de grupos.';
        } else if (activeTab === 'tab-descuentos') {
            viewTitle.textContent = 'Deducciones y Descuentos';
            viewSubtitle.textContent = 'Historial y registro de descuentos aplicados a colaboradores.';
        } else if (activeTab === 'tab-empresas') {
            viewTitle.textContent = 'Control de Empresas';
            viewSubtitle.textContent = 'Administración de las empresas registradas en el sistema.';
        } else if (activeTab === 'tab-vehículos') {
            viewTitle.textContent = 'Flotilla de Vehículos';
            viewSubtitle.textContent = 'Control de transporte asignado a colaboradores.';
        } else if (activeTab === 'tab-préstamos') {
            viewTitle.textContent = 'Gestión de Préstamos';
            viewSubtitle.textContent = 'Control de créditos otorgados y cobro de cuotas semanales.';
        } else if (activeTab === 'tab-finanzas') {
            viewTitle.textContent = 'Resumen Financiero';
            viewSubtitle.textContent = 'Histórico consolidado mensual de nóminas, ingresos, egresos y proyectos.';
        } else if (activeTab === 'tab-proyectos') {
            viewTitle.textContent = 'Gastos de Proyectos';
            viewSubtitle.textContent = 'Registro de facturas y viáticos por proyecto.';
        } else {
            viewTitle.textContent = 'Consola del Supervisor';
            viewSubtitle.textContent = 'Gestión general de planillas.';
        }

        setupAdminView();
    }
}

// --- GESTIÓN DE ESTADO Y VISTAS ---

// Configurar clic en el widget de perfil del usuario en el menú lateral
document.addEventListener('DOMContentLoaded', () => {
    const userProfileWidget = document.querySelector('.user-profile-widget');
    if (userProfileWidget) {
        userProfileWidget.style.cursor = 'pointer';
        userProfileWidget.addEventListener('click', () => {
            if (!currentUser) return;

            // Si es un usuario normal o lider, enviarlo a su vista de descuentos
            if (currentUser.rol === 'usr' || currentUser.rol === 'leader') {
                window.location.hash = 'view-user-penalties';
            }
            // Si es un administrador, enviarlo al panel de descuentos general
            else if ((currentUser.rol === 'admin' || currentUser.rol === 'superadmin')) {
                window.location.hash = 'tab-descuentos';
            }

            // Cerrar el menú en móviles
            document.getElementById('sidebar').classList.remove('mobile-open');
        });
    }
});



// --- MANEJO DE NOTIFICACIONES Y ALERTAS (SWEETALERT2) ---
window.showToast = function (title, message, type = 'info') {
    // Las notificaciones flotantes han sido desactivadas por petición del usuario.
    return;
}

window.appConfirm = async function (title, text = '') {
    if (typeof Swal === 'undefined') return confirm(`${title}\n${text}`);
    const result = await Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
    });
    return result.isConfirmed;
}

window.appPrompt = async function (title, text = '', inputType = 'text') {
    if (typeof Swal === 'undefined') return prompt(`${title}\n${text}`);
    const result = await Swal.fire({
        title: title,
        text: text,
        input: inputType,
        showCancelButton: true,
        confirmButtonText: 'Aceptar',
        cancelButtonText: 'Cancelar'
    });
    // Return null instead of undefined if canceled, like native prompt
    return result.isConfirmed ? result.value : null;
}

window.appAlert = async function (title, text = '', icon = 'info') {
    if (typeof Swal === 'undefined') {
        alert(`${title}\n${text}`);
        return;
    }
    await Swal.fire({
        title: title,
        text: text,
        icon: icon,
        confirmButtonText: 'Aceptar'
    });
}

/*
    ,d88b.d88b,
    88888888888
    `Y8 N + B 8P'
      `Y888P'  
        `Y'    
*/

