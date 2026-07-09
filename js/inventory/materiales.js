    // ==================== LÓGICA DE BARRA LATERAL (MÓVIL) ====================
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (btnToggleSidebar && sidebar && sidebarOverlay) {
        btnToggleSidebar.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
            sidebarOverlay.classList.toggle('active');
        });

        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            sidebarOverlay.classList.remove('active');
        });

        // Cerrar sidebar al seleccionar un item de menú en móvil
        document.getElementById('sidebar-menu')?.addEventListener('click', (e) => {
            if (e.target.closest('li') && window.innerWidth <= 768) {
                sidebar.classList.remove('mobile-open');
                sidebarOverlay.classList.remove('active');
            }
        });
    }

    // --- ALERTA DE MATERIALES ---
    async function checkMaterialAlerts() {
        try {
            const res = await fetch('/api/materials/alerts');
            const data = await res.json();
            if (data.success && data.data.length > 0) {
                let count = data.data.length;
                showToast('¡Alerta de Inventario!', `Hay ${count} material(es) con stock bajo. Revise el panel de Materiales.`, 'warning');
            }
        } catch (error) { console.error(error); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger'); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger'); }
    }



    // --- CIERRE GLOBAL DE MODALES DE MATERIAL Y TIENDA ---
    const materialModalEl = document.getElementById('material-modal');
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('#btn-close-material-modal') || e.target.closest('#btn-cancel-material')) {
            if (materialModalEl) materialModalEl.classList.add('hidden');
        }
        if (e.target === materialModalEl) {
            if (materialModalEl) materialModalEl.classList.add('hidden');
        }
    });

    // --- LÓGICA DE MATERIALES ---
    async function setupMaterialsView() {
        const companySelect = document.getElementById('materials-company-select');
        const btnAddMaterial = document.getElementById('btn-open-add-material-modal');
        const modal = document.getElementById('material-modal');
        const btnCloseModal = document.getElementById('btn-close-material-modal');
        const btnCancelModal = document.getElementById('btn-cancel-material');
        const form = document.getElementById('material-form');
        const photoInput = document.getElementById('material-foto');
        const photoPreviewContainer = document.getElementById('material-photo-preview-container');
        const photoPreview = document.getElementById('material-photo-preview');

        // Mostrar botón de añadir solo para administradores
        if (currentUser.rol === 'admin') {
            if (btnAddMaterial) btnAddMaterial.classList.remove('hidden');
        }

        // Cargar tiendas (stores) en lugar de empresas
        try {
            const res = await fetch('/api/stores');
            const data = await res.json();
            
            if (Array.isArray(data)) {
                companySelect.innerHTML = '<option value="">-- Seleccionar Tienda --</option>';
                let matchedStoreId = null;
                data.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.nombre; // En stores se usa 'nombre'
                    companySelect.appendChild(opt);

                    if (currentUser && currentUser.empresa && c.nombre && c.nombre.trim().toLowerCase() === currentUser.empresa.trim().toLowerCase()) {
                        matchedStoreId = c.id;
                    }
                });

                if (currentUser.rol === 'usr' || currentUser.rol === 'leader') {
                    const wrapper = companySelect.closest('.form-group');
                    if (wrapper) {
                        wrapper.style.display = 'none';
                    }
                    if (matchedStoreId) {
                        companySelect.value = matchedStoreId;
                    } else {
                        companySelect.value = '';
                    }
                    const storeName = currentUser.empresa || 'N/A';
                    viewSubtitle.textContent = `Control de inventario de materiales para la tienda ${storeName}.`;
                }
            }
        } catch (e) { console.error(e); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger'); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger'); }

        // EventListeners que solo deben agregarse una vez
        if (!companySelect.hasAttribute('data-events-bound')) {
            companySelect.setAttribute('data-events-bound', 'true');

            companySelect.addEventListener('change', () => {
                loadMaterialsGrid(companySelect.value);
            });

            if (btnAddMaterial) {
                btnAddMaterial.addEventListener('click', () => {
                    if (!companySelect.value) {
                        showToast('Atención', 'Seleccione una tienda primero', 'warning');
                        return;
                    }
                    form.reset();
                    document.getElementById('edit-material-id').value = '';
                    photoPreviewContainer.classList.add('hidden');
                    document.getElementById('material-foto-group').classList.remove('hidden');
                    document.getElementById('material-modal-title').textContent = 'Añadir Material';
                    modal.classList.remove('hidden');
                });
            }

            if (photoInput) {
                photoInput.addEventListener('change', function () {
                    const file = this.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = function (e) {
                            photoPreview.src = e.target.result;
                            photoPreviewContainer.classList.remove('hidden');
                        };
                        reader.readAsDataURL(file);
                    } else {
                        photoPreviewContainer.classList.add('hidden');
                    }
                });
            }

            const inputCosto = document.getElementById('material-costo');
            const inputGanancia = document.getElementById('material-ganancia');
            const inputPrecio = document.getElementById('material-precio');

            if (inputCosto && inputGanancia && inputPrecio) {
                const calculatePrice = () => {
                    const costo = parseFloat(inputCosto.value) || 0;
                    const ganancia = parseFloat(inputGanancia.value) || 0;
                    const precio = costo * (1 + (ganancia / 100));
                    inputPrecio.value = precio.toFixed(2);
                };
                
                const calculateGanancia = () => {
                    const costo = parseFloat(inputCosto.value) || 0;
                    const precio = parseFloat(inputPrecio.value) || 0;
                    if (costo > 0) {
                        const ganancia = ((precio / costo) - 1) * 100;
                        inputGanancia.value = ganancia.toFixed(2);
                    } else {
                        inputGanancia.value = '';
                    }
                };

                inputCosto.addEventListener('input', calculatePrice);
                inputGanancia.addEventListener('input', calculatePrice);
                inputPrecio.addEventListener('input', calculateGanancia);
            }

            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const btnSubmit = form.querySelector('button[type="submit"]');
                    const originalText = btnSubmit.textContent;
                    btnSubmit.textContent = 'Guardando...';
                    btnSubmit.disabled = true;

                    try {
                        const id = document.getElementById('edit-material-id').value;
                        const payload = {
                            store_id: companySelect.value,
                            nombre: document.getElementById('material-nombre').value,
                            limite_alerta: document.getElementById('material-alerta').value,
                            costo: document.getElementById('material-costo') ? document.getElementById('material-costo').value : 0,
                            precio: document.getElementById('material-precio') ? document.getElementById('material-precio').value : 0
                        };

                        if (photoPreview.src && !photoPreview.src.endsWith('#')) {
                            payload.fotoBase64 = photoPreview.src;
                        }

                        let url = '/api/materials';
                        let method = 'POST';

                        if (id) {
                            url = `/api/materials/${id}`;
                            method = 'PUT';
                        }

                        const res = await fetch(url, {
                            method: method,
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        const data = await res.json();

                        if (data.success) {
                            showToast('Éxito', id ? 'Material actualizado' : 'Material registrado', 'success');
                            closeModal();
                            loadMaterialsGrid(companySelect.value);
                        } else {
                            throw new Error(data.message || 'Error al guardar material');
                        }
                    } catch (err) {
                        showToast('Error', err.message, 'danger');
                    } finally {
                        btnSubmit.textContent = originalText;
                        btnSubmit.disabled = false;
                    }
                });
            }
        }

        // Cargar vista inicial vacía o con la empresa ya seleccionada
        loadMaterialsGrid(companySelect.value);
    }


    async function loadMaterialsGrid(storeId) {
        const grid = document.getElementById('materials-grid');
        if (!grid) return;

        if (!storeId) {
            grid.innerHTML = '<div class="text-muted text-center" style="grid-column: 1 / -1; padding: 3rem; background: rgba(0,0,0,0.1); border-radius: 8px; border: 1px dashed rgba(255,255,255,0.05);">Seleccione una tienda para ver los materiales.</div>';
            return;
        }

        grid.innerHTML = '<div class="text-muted text-center" style="grid-column: 1 / -1; padding: 3rem;">Cargando inventario...</div>';

        try {
            const res = await fetch(`/api/materials?store_id=${storeId}`);
            const data = await res.json();

            if (data.success) {
                grid.innerHTML = '';
                if (data.data.length === 0) {
                    grid.innerHTML = '<div class="text-muted text-center" style="grid-column: 1 / -1; padding: 3rem; background: rgba(0,0,0,0.1); border-radius: 8px; border: 1px dashed rgba(255,255,255,0.05);">No hay materiales registrados para esta tienda.</div>';
                    return;
                }

                data.data.forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'card';
                    card.style.display = 'flex';
                    card.style.flexDirection = 'column';
                    card.style.borderRadius = '8px';
                    card.style.overflow = 'hidden';
                    card.style.border = '1px solid rgba(255, 255, 255, 0.05)';
                    card.style.background = 'var(--bg-card)';

                    const isLowStock = item.cantidad <= item.limite_alerta;
                    const badgeHtml = isLowStock
                        ? '<span class="status-tag status-offline" style="background-color: var(--danger-glow); color: var(--danger); font-size: 0.75rem; padding: 2px 8px; border-radius: 4px;">Stock Bajo</span>'
                        : '<span class="status-tag status-online" style="font-size: 0.75rem; padding: 2px 8px; border-radius: 4px;">Normal</span>';

                    card.innerHTML = `
                        ${item.fotoUrl
                            ? `<div style="height: 140px; overflow: hidden; border-bottom: 1px solid rgba(255,255,255,0.05);"><img src="${item.fotoUrl}" style="width: 100%; height: 100%; object-fit: cover;"></div>`
                            : `<div style="height: 140px; background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(15, 22, 38, 0.4) 100%); display: flex; align-items: center; justify-content: center; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--text-muted); opacity: 0.75;"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`}
                        <div class="card-header" style="padding: 15px 15px 10px 15px; display: flex; justify-content: space-between; align-items: center; gap: 10px; border: none; background: none;">
                            <h4 style="margin: 0; font-size: 1.05rem; font-weight: 600; color: #ffffff; letter-spacing: 0.2px;">${item.nombre}</h4>
                            ${badgeHtml}
                        </div>
                        <div class="card-body" style="padding: 0 15px 15px 15px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                            <div style="margin-bottom: 12px; display: flex; flex-direction: column; gap: 6px;">
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                    <span style="font-size: 0.8rem; color: var(--text-muted);">Mínimo requerido: <strong class="material-limit-val" style="color: #fff;">${item.limite_alerta}</strong></span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                    <span style="font-size: 0.8rem; color: var(--text-muted);">Precio de Venta: <strong style="color: #fff;">Q${parseFloat(item.precio || 0).toFixed(2)}</strong></span>
                                </div>
                            </div>
                            
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; background: rgba(0,0,0,0.15); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.03);">
                                <span style="font-size: 0.85rem; font-weight: 500; color: var(--text-muted);">Stock actual:</span>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    ${(currentUser.rol === 'admin') ? `
                                    <button class="btn-secondary" onclick="updateMaterialCantidad(${item.id}, -1)" style="padding: 0; width: 28px !important; height: 28px !important; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #fff;">-</button>
                                    <input type="number" id="qty-${item.id}" value="${item.cantidad}" onchange="saveMaterialCantidadSilent(${item.id})" class="form-control material-qty-input" style="text-align: center; margin: 0; font-weight: 700; width: 48px !important; height: 28px !important; background: rgba(0,0,0,0.2) !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 4px !important; color: #ffffff !important; padding: 0 !important; font-size: 0.9rem !important;">
                                    <button class="btn-secondary" onclick="updateMaterialCantidad(${item.id}, 1)" style="padding: 0; width: 28px !important; height: 28px !important; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #fff;">+</button>
                                    ` : `
                                    <span style="font-weight: 700; color: #ffffff; padding: 0 10px; font-size: 1.1rem;">${item.cantidad}</span>
                                    `}
                                </div>
                            </div>
                        </div>
                        ${(currentUser.rol === 'admin') ? `
                        <div class="card-footer" style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding: 10px 15px; background: rgba(0,0,0,0.08); border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
                            <button class="btn-secondary btn-sm" onclick="editMaterial(${item.id}, '${item.nombre.replace(/'/g, "\\'")}', ${item.limite_alerta}, ${item.costo || 0}, ${item.precio || 0})" title="Editar" style="height: 28px !important; padding: 0 10px !important;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                            <button class="btn-danger btn-sm" onclick="deleteMaterial(${item.id})" title="Eliminar" style="height: 28px !important; padding: 0 10px !important;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                        </div>
                        ` : ''}
                    `;
                    grid.appendChild(card);
                });
            }
        } catch (e) {
            console.error('Error cargando materiales:', e);
            grid.innerHTML = '<div class="text-danger text-center" style="grid-column: 1 / -1; padding: 2rem;">Error al cargar el inventario.</div>';
        }
    }

    window.updateMaterialCantidad = function (id, change) {
        const input = document.getElementById(`qty-${id}`);
        if (!input) return;
        let newQty = parseInt(input.value) + change;
        if (isNaN(newQty) || newQty < 0) newQty = 0;
        input.value = newQty;
        saveMaterialCantidadSilent(id);
    };

    window.saveMaterialCantidadSilent = async function (id) {
        const input = document.getElementById(`qty-${id}`);
        if (!input) return;
        const cantidad = parseInt(input.value);
        if (isNaN(cantidad) || cantidad < 0) return;

        input.classList.remove('qty-flash-success', 'qty-flash-error');

        try {
            const res = await fetch(`/api/materials/${id}/cantidad`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cantidad })
            });
            const data = await res.json();
            if (data.success) {
                void input.offsetWidth; // Force reflow
                input.classList.add('qty-flash-success');

                // Update badge state dynamically in DOM
                const card = input.closest('.card');
                if (card) {
                    const badge = card.querySelector('.status-tag');
                    const minEl = card.querySelector('.material-limit-val');
                    const minVal = minEl ? parseInt(minEl.textContent) : 0;

                    if (badge) {
                        if (cantidad <= minVal) {
                            badge.className = 'status-tag status-offline';
                            badge.style.backgroundColor = 'var(--danger-glow)';
                            badge.style.color = 'var(--danger)';
                            badge.textContent = 'Stock Bajo';
                        } else {
                            badge.className = 'status-tag status-online';
                            badge.style.backgroundColor = '';
                            badge.style.color = '';
                            badge.textContent = 'Normal';
                        }
                    }
                }
            } else {
                throw new Error(data.message || 'Error');
            }
        } catch (e) {
            void input.offsetWidth;
            input.classList.add('qty-flash-error');
            showToast('Error de Autoguardado', e.message, 'danger');
        }
    };

    window.editMaterial = function (id, nombre, limite_alerta, costo, precio) {
        document.getElementById('edit-material-id').value = id;
        document.getElementById('material-nombre').value = nombre;
        document.getElementById('material-alerta').value = limite_alerta;
        document.getElementById('material-foto-group').classList.remove('hidden');
        document.getElementById('material-photo-preview-container').classList.add('hidden');
        document.getElementById('material-photo-preview').src = '';
        if (document.getElementById('material-costo')) {
            document.getElementById('material-costo').value = costo;
        }
        if (document.getElementById('material-precio')) {
            document.getElementById('material-precio').value = precio;
        }
        
        document.getElementById('material-modal-title').textContent = 'Editar Material';
        document.getElementById('material-modal').classList.remove('hidden');
    };

    window.deleteMaterial = async function (id) {
        if (!(await appConfirm('Confirmación', '¿Estás seguro de eliminar este insumo? Se borrará todo su historial.'))) return;
        try {
            const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                showToast('Éxito', 'Insumo eliminado', 'success');
                loadMaterialsGrid(document.getElementById('materials-company-select').value);
            } else {
                throw new Error(data.message || 'Error al eliminar');
            }
        } catch (e) {
            showToast('Error', e.message, 'danger');
        }
    };

