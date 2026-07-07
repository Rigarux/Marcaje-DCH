// ==================== LÃ“GICA DE VENTAS (DANIEL CH) ====================
function setupSalesView() {
    // Tab switching logic for unified sales view
    const mainSalesTabs = document.querySelectorAll('.sales-main-tab-btn');
    const mainSalesContents = document.querySelectorAll('.sales-main-tab-content');
    if (mainSalesTabs.length > 0) {
        mainSalesTabs.forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', () => {
                document.querySelectorAll('.sales-main-tab-btn').forEach(b => b.classList.remove('active'));
                newBtn.classList.add('active');

                const targetId = newBtn.getAttribute('data-target');
                mainSalesContents.forEach(c => {
                    if (c.id === targetId) {
                        c.classList.add('active');
                        c.style.display = 'block';
                    } else {
                        c.classList.remove('active');
                        c.style.display = 'none';
                    }
                });

                if (targetId === 'tab-unified-history' && typeof window.renderQuotesView === 'function') {
                    window.renderQuotesView();
                }
            });
        });
    }

    const btnGlobalGestionarInventario = document.getElementById('btn-global-gestionar-inventario');
    if (btnGlobalGestionarInventario) {
        if (currentUser && (currentUser.rol === 'admin' || currentUser.rol === 'superadmin')) {
            btnGlobalGestionarInventario.style.display = 'flex';
            btnGlobalGestionarInventario.onclick = (e) => {
                e.preventDefault();
                window.location.hash = 'view-materials';
            };
        } else {
            btnGlobalGestionarInventario.style.display = 'none';
        }
    }

    const btnVentaLibre = document.getElementById('btn-venta-libre');
    if (btnVentaLibre) {
        btnVentaLibre.onclick = (e) => {
            window.location.hash = 'view-sales/venta-libre';
        };
    }

    const btnBackToUnifiedPos = document.getElementById('btn-back-to-unified-pos');
    if (btnBackToUnifiedPos) {
        btnBackToUnifiedPos.onclick = (e) => {
            e.preventDefault();
            window.location.hash = 'view-sales';
        };
    }

    // Asegurarnos de mostrar la vista principal y ocultar la de inventario
    document.getElementById('sales-companies-view')?.classList.remove('hidden');
    document.getElementById('tab-unified-pos')?.classList.remove('hidden');
    document.getElementById('sales-inventory-view')?.classList.add('hidden');

    loadSalesCompanies();
    if (typeof window.renderQuotesView === 'function') {
        window.renderQuotesView();
    }

    const btnManageStores = document.getElementById('btn-manage-stores');
    if (btnManageStores) {
        if (currentUser.rol === 'admin' || currentUser.rol === 'superadmin' || currentUser.rol === 'leader') {
            btnManageStores.style.display = 'flex';
            const newBtnManageStores = btnManageStores.cloneNode(true);
            btnManageStores.parentNode.replaceChild(newBtnManageStores, btnManageStores);
            newBtnManageStores.addEventListener('click', () => {
                window.location.hash = 'tab-tiendas';
            });
        } else {
            btnManageStores.style.display = 'none';
        }
    }

    const btnBack = document.getElementById('btn-back-to-sales-companies');
    if (btnBack) {
        // Eliminar listener anterior si lo hubiera para evitar duplicados
        const newBtnBack = btnBack.cloneNode(true);
        btnBack.parentNode.replaceChild(newBtnBack, btnBack);
        newBtnBack.addEventListener('click', () => {
            document.getElementById('sales-inventory-view').classList.add('hidden');
            document.getElementById('sales-companies-view')?.classList.remove('hidden');
            document.getElementById('tab-unified-pos')?.classList.remove('hidden');
        });
    }

    const materialFoto = document.getElementById('material-foto');
    const materialPhotoPreview = document.getElementById('material-photo-preview');
    const materialPhotoContainer = document.getElementById('material-photo-preview-container');
    if (materialFoto && materialPhotoPreview && !materialFoto.hasAttribute('data-bound')) {
        materialFoto.setAttribute('data-bound', 'true');
        materialFoto.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (evt) {
                    materialPhotoPreview.src = evt.target.result;
                    if (materialPhotoContainer) materialPhotoContainer.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            } else {
                materialPhotoPreview.src = '';
                if (materialPhotoContainer) materialPhotoContainer.classList.add('hidden');
            }
        });
    }

    // The material form is handled exclusively by materiales.js
    
    // Si el usuario es supervisor o superior, cargar el dashboard de supervisor de ventas
    if (currentUser && (currentUser.rol === 'leader' || currentUser.rol === 'admin' || currentUser.rol === 'superadmin')) {
        const supDash = document.getElementById('supervisor-sales-dashboard');
        if (supDash) {
            supDash.classList.remove('hidden');
            renderSupervisorSalesDashboard();
        }
    }
}

function loadSalesCompanies() {
    const grid = document.getElementById('sales-companies-grid');
    if (!grid) return;

    grid.innerHTML = '<div class="text-muted text-center" style="grid-column: 1 / -1; padding: 2rem;">Cargando tiendas...</div>';

    // Obtener tiendas de la DB
    const allStores = window.AttendanceDB._state.stores || [];
    const assignedStoreIds = currentUser.assignedStores || [];

    // Filtrar tiendas a las que el usuario tiene acceso
    const userStores = currentUser.rol === 'superadmin' || currentUser.rol === 'admin'
        ? allStores // admin ve todo
        : allStores.filter(s => assignedStoreIds.includes(s.id));

    if (userStores.length === 0) {
        grid.innerHTML = '<div class="text-muted text-center" style="grid-column: 1 / -1; padding: 2rem;">No tienes tiendas asignadas. Contacta al supervisor.</div>';
        return;
    }

    grid.innerHTML = '';
    userStores.forEach(store => {
        const card = document.createElement('div');
        card.className = 'company-sale-card';

        const firstLetter = store.nombre ? store.nombre.charAt(0).toUpperCase() : 'T';

        let adminActions = '';
        if (currentUser.rol === 'admin' || currentUser.rol === 'superadmin' || currentUser.rol === 'leader') {
            adminActions = `
                    <div style="display: flex; gap: 5px; margin-top: 15px;">
                        <button class="btn-secondary" onclick="event.stopPropagation(); window.editStore(${store.id}, '${store.nombre.replace(/'/g, "\\'")}')" style="flex:1; padding: 4px; font-size: 0.8rem;">Editar</button>
                    </div>
                `;
        }

        let iconHtml = `
                <div class="company-icon-wrapper">
                    ${firstLetter}
                </div>`;
        if (store.logo_url) {
            iconHtml = `
                <div class="company-icon-wrapper" style="background: transparent;">
                    <img src="${store.logo_url}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 50%;">
                </div>`;
        }

        card.innerHTML = `
                ${iconHtml}
                <h4>${store.nombre}</h4>
                <p>Tienda</p>
                <button class="btn-primary" style="margin-top: 10px; padding: 6px; font-size: 0.85rem;" onclick="event.stopPropagation(); window.openWorkTypeModal(${store.id}, '${store.nombre.replace(/'/g, "\\'")}')">Acceder / Ventas</button>
                ${adminActions}
            `;

        card.addEventListener('click', () => {
            window.openWorkTypeModal(store.id, store.nombre);
        });

        grid.appendChild(card);
    });
}

// --- LÃ“GICA DEL NUEVO FLUJO DE SELECCIÃ“N DE TRABAJO ---
window.currentTransactionStore = null;
window.currentTransactionClient = null;
window.currentTransactionType = null;

window.openWorkTypeModal = async function (storeId, storeName) {
    const storeSelectGroup = document.getElementById('store-selector-group');
    const storeSelect = document.getElementById('store-work-type-store-select');

    if (storeId === null) {
        if (storeSelectGroup) storeSelectGroup.style.display = 'block';
        if (storeSelect) {
            storeSelect.innerHTML = '<option value="">-- Selecciona una Tienda --</option>';
            const allStores = window.AttendanceDB._state.stores || [];
            const assignedStoreIds = currentUser.assignedStores || [];
            const userStores = currentUser.rol === 'superadmin' || currentUser.rol === 'admin'
                ? allStores
                : allStores.filter(s => assignedStoreIds.includes(s.id));
            userStores.forEach(s => {
                storeSelect.innerHTML += `<option value="${s.id}">${s.nombre}</option>`;
            });
        }
        window.currentTransactionStore = { id: null, name: '' };
    } else {
        if (storeSelectGroup) storeSelectGroup.style.display = 'none';
        window.currentTransactionStore = { id: storeId, name: storeName };
    }

    const modal = document.getElementById('store-work-type-modal');
    if (modal) {
        const select = document.getElementById('store-quote-client-select');
        const searchInput = document.getElementById('store-quote-client-search');
        if (searchInput) searchInput.value = '';

        if (select) {
            try {
                const res = await fetch('/api/clients');
                const data = await res.json();

                if (Array.isArray(data)) {
                    window._cachedClients = data;
                } else if (data.success) {
                    window._cachedClients = data.data;
                } else {
                    window._cachedClients = [];
                }

                const resultsContainer = document.getElementById('store-quote-client-results');
                const renderClients = (filterText) => {
                    select.innerHTML = '<option value="">Seleccione un cliente...</option><option value="Consumidor Final" ' + (!filterText ? 'selected' : '') + '>Consumidor Final</option>';
                    if (resultsContainer) resultsContainer.innerHTML = '';

                    const term = (filterText || '').toLowerCase();
                    let found = false;

                    // Agregar Consumidor Final
                    if (!term || 'consumidor final'.includes(term)) {
                        if (resultsContainer) {
                            const div = document.createElement('div');
                            div.style = 'padding: 10px; border-bottom: 1px solid var(--border-color); cursor: pointer;';
                            div.textContent = 'Consumidor Final';
                            div.addEventListener('click', () => {
                                select.value = 'Consumidor Final';
                                const input = document.getElementById('store-quote-client-search');
                                if (input) input.value = 'Consumidor Final';
                                select.dispatchEvent(new Event('change'));
                            });
                            resultsContainer.appendChild(div);
                        }
                        found = true;
                    }

                    window._cachedClients.forEach(c => {
                        if (c.nombre === 'Consumidor Final') return;
                        const searchStr = `${c.nombre} ${c.nit || 'C/F'}`.toLowerCase();
                        if (term && !searchStr.includes(term)) return;

                        const opt = document.createElement('option');
                        opt.value = c.nombre;
                        opt.dataset.direccion = c.direccion || '';
                        opt.dataset.nit = c.nit || '';
                        opt.dataset.telefono = c.telefono || '';
                        opt.dataset.email = c.email || '';
                        opt.textContent = `${c.nombre} - ${c.nit || 'C/F'}`;
                        select.appendChild(opt);

                        if (resultsContainer) {
                            const div = document.createElement('div');
                            div.style = 'padding: 10px; border-bottom: 1px solid var(--border-color); cursor: pointer;';
                            div.innerHTML = `<div style="font-weight:600;">${c.nombre}</div><div style="font-size:0.8rem; color:var(--text-muted);">NIT: ${c.nit || 'C/F'}</div>`;
                            div.addEventListener('click', () => {
                                select.value = c.nombre;
                                const input = document.getElementById('store-quote-client-search');
                                if (input) input.value = c.nombre;
                                select.dispatchEvent(new Event('change'));
                            });
                            resultsContainer.appendChild(div);
                        }
                        found = true;
                    });

                    if (!found && resultsContainer) {
                        resultsContainer.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 0.9rem;">No se encontraron clientes. Usa "+ Nuevo Cliente".</div>';
                    }
                };

                renderClients('');

                if (searchInput) {
                    const newSearchInput = searchInput.cloneNode(true);
                    searchInput.parentNode.replaceChild(newSearchInput, searchInput);

                    newSearchInput.addEventListener('input', (e) => {
                        renderClients(e.target.value);
                        if (resultsContainer) resultsContainer.style.display = 'block';
                    });

                    newSearchInput.addEventListener('focus', (e) => {
                        renderClients(e.target.value);
                        if (resultsContainer) resultsContainer.style.display = 'block';
                    });
                }
            } catch (e) { console.error(e); if (typeof window.showToast === 'function') window.showToast('Error', 'OcurriÃ³ un problema de conexiÃ³n', 'danger'); }
        }
        modal.classList.remove('hidden');
    }
};

document.getElementById('btn-close-work-type-modal')?.addEventListener('click', () => {
    document.getElementById('store-work-type-modal').classList.add('hidden');
});

document.getElementById('store-work-type-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
});

document.querySelectorAll('.work-type-btn').forEach(btn => {
    btn.onclick = async (e) => {
        try {
            const storeSelectGroup = document.getElementById('store-selector-group');
            if (storeSelectGroup && storeSelectGroup.style.display !== 'none') {
                const storeSelect = document.getElementById('store-work-type-store-select');
                if (!storeSelect.value) {
                    if (typeof window.showToast === 'function') window.showToast('AtenciÃ³n', 'Debe seleccionar una tienda primero', 'warning');
                    return;
                }
                window.currentTransactionStore = {
                    id: storeSelect.value,
                    name: storeSelect.options[storeSelect.selectedIndex].text
                };
            }

            const clientSelect = document.getElementById('store-quote-client-select');
            if (!clientSelect.value && !document.getElementById('store-quote-new-client-fields').classList.contains('hidden') === false) {
                showToast('AtenciÃ³n', 'Debe seleccionar un cliente', 'warning');
                return;
            }

            let clienteNombre = 'Consumidor Final', clienteDireccion = '', clienteNit = '', clienteTelefono = '', clienteEmail = '';
            const isNewClient = !document.getElementById('store-quote-new-client-fields').classList.contains('hidden');

            if (isNewClient) {
                clienteNombre = document.getElementById('store-new-client-nombre').value;
                clienteDireccion = document.getElementById('store-new-client-direccion').value;
                clienteNit = document.getElementById('store-new-client-nit').value;
                clienteTelefono = document.getElementById('store-new-client-telefono').value;
                clienteEmail = document.getElementById('store-new-client-email').value;
                if (!clienteNombre) {
                    showToast('AtenciÃ³n', 'Ingrese el nombre del cliente', 'warning');
                    return;
                }
            } else {
                clienteNombre = clientSelect.value;
                if (clientSelect.selectedIndex > 1) {
                    const opt = clientSelect.options[clientSelect.selectedIndex];
                    clienteDireccion = opt.dataset.direccion || '';
                    clienteNit = opt.dataset.nit || '';
                    clienteTelefono = opt.dataset.telefono || '';
                    clienteEmail = opt.dataset.email || '';
                }
            }

            window.currentTransactionClient = {
                nombre: clienteNombre,
                direccion: clienteDireccion,
                nit: clienteNit,
                telefono: clienteTelefono,
                email: clienteEmail,
                isNew: isNewClient
            };

            const type = btn.getAttribute('data-type');
            window.currentTransactionType = type;

            // Create client if new before proceeding
            const proceed = () => {
                document.getElementById('store-work-type-modal').classList.add('hidden');
                
                if (type === 'Venta de producto') {
                    window.location.hash = 'view-sales/Venta-productos';
                    window.loadPOSMaterials(window.currentTransactionStore.id, window.currentTransactionStore.name);
                } else if (type === 'Venta libre') {
                    // Start Venta Libre process
                    document.getElementById('tab-unified-pos')?.classList.add('hidden');
                    
                    const client = window.currentTransactionClient;
                    const fecha = new Date().toISOString().split('T')[0];
                    const validoHasta = ''; // Default empty

                    fetch('/api/quotes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            clienteNombre: client.nombre,
                            clienteDireccion: client.direccion,
                            clienteNit: client.nit,
                            clienteTelefono: client.telefono,
                            clienteEmail: client.email,
                            validoHasta,
                            fecha,
                            tipo_documento: 'Venta Libre',
                            creadoPor: window.currentUser ? window.currentUser.id : 1
                        })
                    }).then(res => res.json()).then(data => {
                        if (data.success) {
                            window.isNewQuote = true;
                            if (typeof window.renderVentaLibreView === 'function') window.renderVentaLibreView();
                            if (typeof window.renderQuoteDetails === 'function') window.renderQuoteDetails(data.id);
                            if (typeof window.showToast === 'function') window.showToast('Éxito', 'Venta Libre creada.', 'success');
                        } else {
                            if (typeof window.showToast === 'function') window.showToast('Error', data.message, 'danger');
                        }
                    }).catch(err => {
                        console.error(err);
                        if (typeof window.showToast === 'function') window.showToast('Error', 'Fallo al crear Venta Libre', 'danger');
                    });
                }
            };

            if (isNewClient) {
                fetch('/api/clients', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nombre: clienteNombre,
                        direccion: clienteDireccion,
                        nit: clienteNit,
                        telefono: clienteTelefono,
                        email: clienteEmail
                    })
                }).then(() => proceed()).catch(err => {
                    console.error(err);
                    if (typeof window.showToast === 'function') window.showToast('Error', 'OcurriÃ³ un problema de conexiÃ³n al crear cliente', 'danger');
                    proceed();
                });
            } else {
                proceed();
            }
        } catch (err) {
            console.error('Error in work-type-btn click:', err);
            if (typeof window.showToast === 'function') window.showToast('Error Interno', err.message, 'danger');
        }
    };
});

let isNewClientMode = false;
document.getElementById('btn-store-quote-new-client')?.addEventListener('click', (e) => {
    isNewClientMode = !isNewClientMode;
    const btn = e.target;
    const fields = document.getElementById('store-quote-new-client-fields');
    const select = document.getElementById('store-quote-client-select');
    if (isNewClientMode) {
        btn.textContent = 'Cancelar Nuevo';
        btn.classList.replace('btn-secondary', 'btn-danger');
        if (fields) fields.classList.remove('hidden');
        if (select) {
            select.disabled = true;
            select.required = false;
        }
        const nameInput = document.getElementById('store-new-client-nombre');
        if (nameInput) nameInput.required = true;
    } else {
        btn.textContent = '+ Nuevo Cliente';
        btn.classList.replace('btn-danger', 'btn-secondary');
        if (fields) fields.classList.add('hidden');
        if (select) {
            select.disabled = false;
            select.required = true;
        }
        const nameInput = document.getElementById('store-new-client-nombre');
        if (nameInput) nameInput.required = false;
    }
});

document.getElementById('btn-save-new-store-client')?.addEventListener('click', async () => {
    const nombre = document.getElementById('store-new-client-nombre').value.trim();
    const direccion = document.getElementById('store-new-client-direccion').value.trim();
    const nit = document.getElementById('store-new-client-nit').value.trim();
    const telefono = document.getElementById('store-new-client-telefono').value.trim();
    const email = document.getElementById('store-new-client-email').value.trim();

    if (!nombre) {
        showToast('Error', 'El nombre del cliente es obligatorio.', 'danger');
        return;
    }

    try {
        const btn = document.getElementById('btn-save-new-store-client');
        btn.disabled = true;
        btn.textContent = 'Guardando...';

        const res = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, direccion, nit, telefono, email })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        showToast('Ã‰xito', 'Cliente registrado exitosamente.', 'success');

        // Reload clients in the select dropdown
        const select = document.getElementById('store-quote-client-select');
        if (select) {
            const cRes = await fetch('/api/clients');
            const clients = await cRes.json();

            select.innerHTML = '<option value="">Seleccione un cliente...</option><option value="Consumidor Final">Consumidor Final</option>';
            clients.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.nombre;
                select.appendChild(opt);
            });

            // Assuming the API returns the new client's ID in data.insertId or data.id
            const newId = data.insertId || data.id;
            if (newId) {
                select.value = newId;
            } else {
                // Fallback: match by name
                const matchedOpt = Array.from(select.options).find(opt => opt.textContent === nombre);
                if (matchedOpt) select.value = matchedOpt.value;
            }
        }

        // Hide the form and reset the toggle button
        const toggleBtn = document.getElementById('btn-store-quote-new-client');
        if (toggleBtn && isNewClientMode) {
            toggleBtn.click();
        }
    } catch (err) {
        showToast('Error', err.message, 'danger');
    } finally {
        const btn = document.getElementById('btn-save-new-store-client');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Guardar Cliente';
        }
    }
});


// ============================================================================
// PUNTO DE VENTA (POS) LOGIC
// ============================================================================

window.posCart = {};
window.posCurrentStoreId = null;

window.loadPOSMaterials = async function (storeId, storeName) {
    window.posCurrentStoreId = storeId;
    window.posCart = {};
    updatePOSCartUI();

    const titleEl = document.getElementById('sales-pos-title');
    if (titleEl) titleEl.textContent = `Punto de Venta - ${storeName}`;

    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;

    grid.innerHTML = '<div class="text-muted text-center" style="grid-column: 1 / -1; padding: 3rem;">Cargando productos...</div>';

    try {
        const res = await fetch(`/api/materials?store_id=${storeId}`);
        const data = await res.json();
        
        if (data.success) {
            grid.innerHTML = '';
            if (data.data.length === 0) {
                grid.innerHTML = '<div class="text-muted text-center" style="grid-column: 1 / -1; padding: 3rem; background: rgba(0,0,0,0.1); border-radius: 8px; border: 1px dashed rgba(255,255,255,0.05);">No hay productos registrados para esta tienda.</div>';
                return;
            }

            data.data.forEach(item => {
                const card = document.createElement('div');
                card.className = 'pos-product-card';
                card.style.display = 'flex';
                card.style.flexDirection = 'column';
                card.style.borderRadius = '8px';
                card.style.overflow = 'hidden';
                card.style.border = '1px solid rgba(255, 255, 255, 0.05)';
                card.style.background = 'var(--bg-card)';
                card.style.cursor = 'pointer';
                card.style.transition = 'transform 0.1s, box-shadow 0.1s';
                
                // Efecto hover
                card.onmouseover = () => { card.style.transform = 'translateY(-2px)'; card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'; };
                card.onmouseout = () => { card.style.transform = 'translateY(0)'; card.style.boxShadow = 'none'; };

                const isLowStock = item.cantidad <= item.limite_alerta;
                const badgeColor = isLowStock ? 'var(--danger)' : 'var(--success-color)';

                const itemJson = encodeURIComponent(JSON.stringify(item));

                card.innerHTML = `
                    ${item.fotoUrl
                        ? `<div style="height: 120px; overflow: hidden; border-bottom: 1px solid rgba(255,255,255,0.05);"><img src="${item.fotoUrl}" style="width: 100%; height: 100%; object-fit: cover;"></div>`
                        : `<div style="height: 120px; background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(15, 22, 38, 0.4) 100%); display: flex; align-items: center; justify-content: center; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--text-muted); opacity: 0.75;"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`}
                    <div style="padding: 10px; display: flex; flex-direction: column; flex: 1;">
                        <h4 class="pos-product-title" style="margin: 0 0 5px 0; font-size: 0.95rem; font-weight: 600; color: #ffffff;">${item.nombre}</h4>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">
                            Stock: <strong style="color: ${badgeColor};">${item.cantidad}</strong>
                        </div>
                        <div style="margin-top: auto; font-size: 1.1rem; font-weight: bold; color: var(--primary-color);">
                            Q ${(item.precio || 0).toFixed(2)}
                        </div>
                    </div>
                `;

                // Add to cart on click
                card.addEventListener('click', () => {
                    addToPOSCart(item.id, itemJson);
                });

                grid.appendChild(card);
            });
        }
    } catch (e) {
        console.error('Error cargando productos POS:', e);
        if (grid) grid.innerHTML = '<div class="text-danger text-center" style="grid-column: 1 / -1; padding: 2rem;">Error al cargar el inventario.</div>';
    }
};

window.addToPOSCart = function (id, itemJsonStr) {
    try {
        const item = JSON.parse(decodeURIComponent(itemJsonStr));

        if (!window.posCart[id]) {
            window.posCart[id] = { item, qty: 0 };
        }

        if (window.posCart[id].qty >= item.cantidad) {
            if (typeof showToast === 'function') showToast('Atención', `Stock insuficiente. Máximo: ${item.cantidad}.`, 'warning');
            return;
        }

        window.posCart[id].qty += 1;
        updatePOSCartUI();
        
    } catch (e) { 
        console.error(e); 
    }
};

window.updatePOSCartQty = function(id, change) {
    if (!window.posCart[id]) return;
    
    const item = window.posCart[id].item;
    let newQty = window.posCart[id].qty + change;
    
    if (newQty > item.cantidad) {
        if (typeof showToast === 'function') showToast('Atención', `Stock máximo alcanzado (${item.cantidad}).`, 'warning');
        return;
    }
    
    if (newQty <= 0) {
        delete window.posCart[id];
    } else {
        window.posCart[id].qty = newQty;
    }
    
    updatePOSCartUI();
};

window.removePOSCartItem = function(id) {
    if (window.posCart[id]) {
        delete window.posCart[id];
        updatePOSCartUI();
    }
};

window.updatePOSCartUI = function() {
    const itemsContainer = document.getElementById('pos-cart-items');
    const totalSpan = document.getElementById('pos-cart-total');
    const badgeSpan = document.getElementById('pos-cart-badge');
    const emptyMsg = document.getElementById('pos-cart-empty');
    
    if (!itemsContainer || !totalSpan) return;

    // Limpiar items existentes excepto el mensaje vacío
    Array.from(itemsContainer.children).forEach(child => {
        if (child.id !== 'pos-cart-empty') {
            child.remove();
        }
    });

    let total = 0;
    let totalItems = 0;

    for (let id in window.posCart) {
        const { item, qty } = window.posCart[id];
        if (qty <= 0) continue;
        
        totalItems += qty;
        const subtotal = qty * parseFloat(item.precio || 0);
        total += subtotal;

        const row = document.createElement('div');
        row.style.cssText = 'display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; margin-bottom: 5px;';
        
        row.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <strong style="font-size: 0.95rem; color: #fff; max-width: 70%; word-break: break-word;">${item.nombre}</strong>
                <span style="font-weight: bold; color: var(--primary-color);">Q ${subtotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.8rem; color: var(--text-muted);">Q ${parseFloat(item.precio || 0).toFixed(2)} c/u</span>
                <div style="display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; padding: 2px;">
                    <button class="btn-secondary" onclick="updatePOSCartQty(${id}, -1)" style="padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">-</button>
                    <span style="font-weight: bold; width: 20px; text-align: center;">${qty}</span>
                    <button class="btn-secondary" onclick="updatePOSCartQty(${id}, 1)" style="padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">+</button>
                    <button onclick="removePOSCartItem(${id})" style="background: none; border: none; color: var(--danger); cursor: pointer; padding: 4px; margin-left: 5px;" title="Eliminar">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        `;
        itemsContainer.appendChild(row);
    }

    if (totalItems > 0) {
        if (emptyMsg) emptyMsg.style.display = 'none';
    } else {
        if (emptyMsg) emptyMsg.style.display = 'block';
    }

    totalSpan.textContent = 'Q ' + total.toFixed(2);
    if (badgeSpan) badgeSpan.textContent = totalItems;
};

// --- BUSCADOR DEL POS ---
document.getElementById('pos-search-input')?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;
    
    const cards = grid.querySelectorAll('.pos-product-card');
    cards.forEach(card => {
        const titleEl = card.querySelector('.pos-product-title');
        if (titleEl && titleEl.textContent.toLowerCase().includes(searchTerm)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
});

// --- REGRESAR ---
document.getElementById('btn-pos-back')?.addEventListener('click', () => {
    window.location.hash = 'view-sales';
});

// --- GUARDAR VENTA ---
document.getElementById('btn-pos-save')?.addEventListener('click', async (e) => {
    const items = [];
    for (let id in window.posCart) {
        if (window.posCart[id].qty > 0) {
            let matId = parseInt(id);
            if (isNaN(matId) || matId < 0) matId = null;
            items.push({
                material_id: matId,
                descripcion: window.posCart[id].item.nombre,
                cantidad: window.posCart[id].qty,
                precio: parseFloat(window.posCart[id].item.precio || 0),
                costo: parseFloat(window.posCart[id].item.costo || 0)
            });
        }
    }

    if (items.length === 0) {
        if (typeof showToast === 'function') showToast('Error', 'El carrito está vacío', 'danger');
        return;
    }

    const client = window.currentTransactionClient || {};
    let clienteNombre = client.nombre || 'Consumidor Final';
    let clienteDireccion = client.direccion || '';
    let clienteNit = client.nit || '';
    let clienteTelefono = client.telefono || '';
    let clienteEmail = client.email || '';

    const payload = {
        clienteNombre, clienteDireccion, clienteNit, clienteTelefono, clienteEmail,
        tipo_documento: 'Venta', // Fixed to Venta for this flow
        tipo_pago: document.getElementById('pos-payment-type') ? document.getElementById('pos-payment-type').value : 'Contado',
        creadoPor: currentUser.id,
        items: items
    };

    const btnSubmit = e.target;
    const originalContent = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = 'Procesando...';

    try {
        const res = await fetch('/api/stores/' + window.posCurrentStoreId + '/quotes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            if (typeof showToast === 'function') showToast('Éxito', 'Venta registrada', 'success');
            
            // Generate PDF
            if (typeof window.generatePOSPDF === 'function') {
                await window.generatePOSPDF(payload, data.quoteId);
            }

            // Limpiar POS
            window.posCart = {};
            window.updatePOSCartUI();
            if (document.getElementById('pos-search-input')) document.getElementById('pos-search-input').value = '';
            
            // Recargar productos para actualizar el stock visible
            window.loadPOSMaterials(window.posCurrentStoreId, document.getElementById('sales-pos-title').textContent.replace('Punto de Venta - ', ''));
        } else { 
            throw new Error(data.message || 'Error al procesar'); 
        }
    } catch (err) {
        if (typeof showToast === 'function') showToast('Error', err.message, 'danger');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalContent;
    }
});

window.generatePOSPDF = async function(payload, quoteId) {
    try {
        const pdfContainer = document.createElement('div');
        pdfContainer.style.padding = '0';
        pdfContainer.style.fontFamily = 'Arial, sans-serif';
        pdfContainer.style.backgroundColor = '#fff';
        pdfContainer.style.width = '700px';

        let rowsHtml = '';
        let totalSuma = 0;
        payload.items.forEach(item => {
            const subtotal = item.cantidad * item.precio;
            totalSuma += subtotal;
            rowsHtml += `
                <tr>
                    <td style="border: 1px solid #000; padding: 5px; font-size: 12px;">${item.descripcion.replace(/\n/g, '<br>')}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px;">${item.cantidad}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px;">Unidad</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 12px;">Q${parseFloat(item.precio).toFixed(2)}</td>
                    <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 12px;">Q${subtotal.toFixed(2)}</td>
                </tr>
            `;
        });

        // Rellenar filas vacías
        const minRows = 10;
        if (payload.items.length < minRows) {
            for (let i = 0; i < minRows - payload.items.length; i++) {
                rowsHtml += `
                    <tr>
                        <td style="border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px dotted #000; padding: 15px;"></td>
                        <td style="border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px dotted #000; padding: 15px;"></td>
                        <td style="border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px dotted #000; padding: 15px;"></td>
                        <td style="border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px dotted #000; padding: 15px;"></td>
                        <td style="border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px dotted #000; padding: 15px;"></td>
                    </tr>
                `;
            }
        }

        const fechaStr = new Date().toLocaleDateString('es-GT') + ' ' + new Date().toLocaleTimeString('es-GT', { hour12: false });

        const currentStoreObj = (window.AttendanceDB && window.AttendanceDB._state && window.AttendanceDB._state.stores) 
            ? window.AttendanceDB._state.stores.find(s => s.id == window.posCurrentStoreId) 
            : null;
        const logoUrl = (currentStoreObj && currentStoreObj.logo_url) ? currentStoreObj.logo_url : '/logo.png';

        pdfContainer.innerHTML = `
            <style>
                .pdf-wrapper * { color: #000 !important; }
                .pdf-wrapper table { table-layout: fixed; width: 100%; }
                .pdf-wrapper th, .pdf-wrapper td { word-wrap: break-word; }
            </style>
            <div class="pdf-wrapper">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <div style="width: 30%;">
                        <img src="${logoUrl}" style="max-width: 100%; max-height: 100px; object-fit: contain;">
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px;">
                    <div>
                        <div style="font-weight: bold; font-style: italic; font-size: 1.2rem;">Detalle de Venta</div>
                        <div>Transacción Comercial</div>
                        <div style="margin-top: 5px;"><strong>TIPO DE PAGO:</strong> <span style="text-transform: uppercase;">${payload.tipo_pago}</span></div>
                    </div>
                    <div style="text-align: right;">
                        <div><strong>NÚMERO:</strong> ${quoteId || '-'}</div>
                        <div><strong>FECHA:</strong> ${fechaStr}</div>
                    </div>
                </div>

                <div style="border: 2px solid #000; text-align: center; font-weight: bold; font-style: italic; padding: 5px; margin-bottom: 10px;">
                    Venta de Producto
                </div>

                <div style="font-size: 12px; margin-bottom: 20px;">
                    <div><strong>Nombre:</strong> ${payload.clienteNombre || ''}</div>
                    <div><strong>Dirección:</strong> ${payload.clienteDireccion || ''}</div>
                    <div><strong>NIT:</strong> ${payload.clienteNit || ''}</div>
                    <div><strong>Teléfono:</strong> ${payload.clienteTelefono || ''}</div>
                    <div><strong>E-mail:</strong> ${payload.clienteEmail || ''}</div>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="border: 1px solid #000;">
                            <th style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px; width: 35%;">DESCRIPCIÓN</th>
                            <th style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px; width: 15%;">CANTIDAD</th>
                            <th style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px; width: 15%;">UNIDAD</th>
                            <th style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px; width: 15%;">PRECIO</th>
                            <th style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px; width: 20%;">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3" style="border-top: 1px solid #000;"></td>
                            <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 12px;">SUB-TOTAL</td>
                            <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 12px;">Q${totalSuma.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td colspan="3"></td>
                            <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px;">IVA % INCLUIDO</td>
                            <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px;">-</td>
                        </tr>
                        <tr>
                            <td colspan="3"></td>
                            <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-style: italic; font-size: 12px;">TOTAL</td>
                            <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-style: italic; font-size: 12px;">Q${totalSuma.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;

        const opt = {
            margin: 10,
            filename: `Venta_${payload.clienteNombre || 'Cliente'}_${quoteId || 'Recibo'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
        };

        if (typeof html2pdf !== 'undefined') {
            await html2pdf().set(opt).from(pdfContainer).save();
        } else {
            console.error("html2pdf is not loaded");
        }
    } catch (err) {
        console.error('Error generating PDF:', err);
    }
};

// ==================== DASHBOARD DEL SUPERVISOR ====================
async function renderSupervisorSalesDashboard() {
    try {
        const quotes = window.AttendanceDB.getQuotes() || [];
        const stores = window.AttendanceDB._state.stores || [];
        
        // Configurar fechas
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        let salesToday = 0;
        let salesMonth = 0;
        let pendingQuotes = 0;
        let countSalesMonth = 0;

        // Para gráficas
        const last7Days = [];
        const salesByDay = {};
        for(let i=6; i>=0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            last7Days.push(dStr);
            salesByDay[dStr] = 0;
        }

        const salesByStore = {};
        stores.forEach(s => salesByStore[s.id] = { name: s.nombre, total: 0 });

        const productSales = {};

        // Procesar data
        quotes.forEach(q => {
            if (q.estado === 'Pendiente' || q.estado === 'Borrador') {
                pendingQuotes++;
            }
            
            if (q.estado === 'Aprobada' || q.estado === 'Completada') {
                const qDateStr = q.fecha ? q.fecha.split(' ')[0] : '';
                const qDateParts = qDateStr.split('/');
                let qDateObj = null;
                let qIso = '';
                if(qDateParts.length === 3) {
                    qDateObj = new Date(qDateParts[2], qDateParts[1] - 1, qDateParts[0]);
                    qIso = `${qDateParts[2]}-${String(qDateParts[1]).padStart(2,'0')}-${String(qDateParts[0]).padStart(2,'0')}`;
                }

                if (qIso === todayStr) {
                    salesToday += q.total;
                }

                if (qDateObj && qDateObj >= firstDayOfMonth) {
                    salesMonth += q.total;
                    countSalesMonth++;
                    
                    // Sumar para grafica de linea
                    if(salesByDay[qIso] !== undefined) {
                        salesByDay[qIso] += q.total;
                    }

                    // Sumar para grafica de dona
                    if(q.tiendaId && salesByStore[q.tiendaId]) {
                        salesByStore[q.tiendaId].total += q.total;
                    }

                    // Top Productos
                    if(q.items && Array.isArray(q.items)) {
                        q.items.forEach(item => {
                            if(!productSales[item.materialId]) {
                                productSales[item.materialId] = {
                                    name: item.nombre,
                                    qty: 0,
                                    revenue: 0,
                                    stores: new Set()
                                };
                            }
                            productSales[item.materialId].qty += item.cantidad;
                            productSales[item.materialId].revenue += (item.precioUnitario * item.cantidad);
                            if(q.tiendaId && salesByStore[q.tiendaId]) {
                                productSales[item.materialId].stores.add(salesByStore[q.tiendaId].name);
                            }
                        });
                    }
                }
            }
        });

        // Actualizar KPIs
        const avgTicket = countSalesMonth > 0 ? (salesMonth / countSalesMonth) : 0;
        document.getElementById('sup-kpi-today').textContent = `Q${salesToday.toFixed(2)}`;
        document.getElementById('sup-kpi-month').textContent = `Q${salesMonth.toFixed(2)}`;
        document.getElementById('sup-kpi-pending').textContent = pendingQuotes;
        document.getElementById('sup-kpi-avg').textContent = `Q${avgTicket.toFixed(2)}`;

        // Renderizar Top Products
        const topProductsArr = Object.values(productSales).sort((a,b) => b.qty - a.qty).slice(0, 5);
        const topBody = document.getElementById('sup-top-products-body');
        if(topProductsArr.length === 0) {
            topBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay datos de ventas este mes.</td></tr>';
        } else {
            topBody.innerHTML = '';
            topProductsArr.forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${p.name}</strong></td>
                    <td><span class="badge" style="background:var(--primary-color); padding: 4px 8px; border-radius:12px; color:#fff;">${p.qty}</span></td>
                    <td>Q${p.revenue.toFixed(2)}</td>
                    <td><span class="text-muted" style="font-size:0.85rem;">${Array.from(p.stores).join(', ')}</span></td>
                `;
                topBody.appendChild(tr);
            });
        }

        // Renderizar Chart.js (Line Chart)
        if (window.supChartWeeklyInstance) window.supChartWeeklyInstance.destroy();
        const ctxWeekly = document.getElementById('sup-chart-weekly').getContext('2d');
        window.supChartWeeklyInstance = new Chart(ctxWeekly, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'Ventas Diarias (Q)',
                    data: last7Days.map(d => salesByDay[d]),
                    borderColor: '#2196f3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#2196f3'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });

        // Renderizar Chart.js (Doughnut Chart)
        if (window.supChartStoresInstance) window.supChartStoresInstance.destroy();
        const ctxStores = document.getElementById('sup-chart-stores').getContext('2d');
        const storeLabels = [];
        const storeData = [];
        const storeColors = ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];
        
        Object.values(salesByStore).forEach(s => {
            if(s.total > 0) {
                storeLabels.push(s.name);
                storeData.push(s.total);
            }
        });

        window.supChartStoresInstance = new Chart(ctxStores, {
            type: 'doughnut',
            data: {
                labels: storeLabels.length > 0 ? storeLabels : ['Sin Datos'],
                datasets: [{
                    data: storeData.length > 0 ? storeData : [1],
                    backgroundColor: storeData.length > 0 ? storeColors : ['#333'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#bbb' } }
                }
            }
        });

    } catch (e) {
        console.error('Error rendering Supervisor Dashboard', e);
    }
}
