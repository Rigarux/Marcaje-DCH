// ==========================================
    // LÓGICA DE INVENTARIOS
    // ==========================================
    let currentInventories = [];
    async function fetchAdminUserInventory(userId) {
        const tbody = document.getElementById('inventories-table-body');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Cargando inventarios...</td></tr>';
        try {
            const res = await fetch(`/api/inventories?usuarioId=${userId}`);
            currentInventories = await res.json();
            renderInventoriesTable();
        } catch (error) {
            console.error('Error al cargar inventarios', error);
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar inventarios</td></tr>';
        }
    }

    function initInventoryFilters() {
        const empFilter = document.getElementById('filter-empresa-inventarios');
        const usrFilter = document.getElementById('filter-usuario-inventarios');
        const btnNewInv = document.getElementById('btn-open-new-inventory-modal');

        if (empFilter && !empFilter.dataset.init) {
            empFilter.dataset.init = 'true';
            empFilter.innerHTML = '<option value="">1. Selecciona Empresa</option>';
            if (window.AttendanceDB && window.AttendanceDB._state && window.AttendanceDB._state.companies) {
                window.AttendanceDB._state.companies.forEach(c => empFilter.innerHTML += `<option value="${c.name}">${c.name}</option>`);
            }

            empFilter.addEventListener('change', () => {
                usrFilter.innerHTML = '<option value="">2. Selecciona Empleado</option>';
                if (empFilter.value) {
                    usrFilter.disabled = false;
                    const users = window.AttendanceDB._state.users.filter(u => u.empresa === empFilter.value && (u.rol === 'usr' || u.rol === 'leader'));
                    users.forEach(u => usrFilter.innerHTML += `<option value="${u.id}">${u.nombre}</option>`);
                } else {
                    usrFilter.disabled = true;
                }
                usrFilter.value = "";
                usrFilter.dispatchEvent(new Event('change'));
            });

            usrFilter.addEventListener('change', () => {
                if (usrFilter.value) {
                    btnNewInv.disabled = false;
                    fetchAdminUserInventory(usrFilter.value);
                } else {
                    btnNewInv.disabled = true;
                    const tbody = document.getElementById('inventories-table-body');
                    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Selecciona un empleado para ver su inventario</td></tr>';
                }
            });
        }
    }

    async function loadInventoriesView() {
        initInventoryFilters();
        const usrFilter = document.getElementById('filter-usuario-inventarios');
        if (usrFilter && usrFilter.value) {
            fetchAdminUserInventory(usrFilter.value);
        } else {
            const tbody = document.getElementById('inventories-table-body');
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Selecciona un empleado para ver su inventario</td></tr>';
        }
    }

    function renderInventoriesTable() {
        const tbody = document.getElementById('inventories-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (currentInventories.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">El empleado no tiene herramientas asignadas.</td></tr>';
            return;
        }
        currentInventories.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${item.nombre}</strong></td>
                <td>${item.descripcion || '-'}</td>
                <td><span class="badge ${item.cantidad > 0 ? 'bg-success' : 'bg-danger'}">${item.cantidad}</span></td>
                <td>Q${Number(item.precio).toFixed(2)}</td>
                <td>
                    <button class="btn-icon btn-edit-inventory" data-id="${item.id}" title="Editar">Editar</button>
                    <button class="btn-icon btn-delete-inventory text-danger" data-id="${item.id}" title="Eliminar">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.btn-edit-inventory').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const item = currentInventories.find(i => i.id == id);
                if (item) openInventoryModal(item);
            });
        });

        document.querySelectorAll('.btn-delete-inventory').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (await appConfirm('Confirmación', '¿Estás seguro de eliminar este artículo?')) {
                    try {
                        const res = await fetch(`/api/inventories/${id}`, { method: 'DELETE' });
                        if (res.ok) {
                            showToast('ÉÉxito', 'Artículo eliminado', 'success');
                            fetchAdminUserInventory(window.currentToolUserId);
                        } else {
                            const err = await res.json();
                            showToast('Error', err.error || 'No se pudo eliminar', 'danger');
                        }
                    } catch (error) {
                        showToast('Error', 'Error de red', 'danger');
                    }
                }
            });
        });
    }

    const inventoryModal = document.getElementById('new-inventory-modal');
    const formNewInventory = document.getElementById('form-new-inventory');

    let ferreteriaMaterials = [];
    async function loadFerreteriaMaterials() {
        try {
            const res = await fetch('/api/materials?store_id=2');
            const data = await res.json();
            if (data.success) {
                ferreteriaMaterials = data.data;
            }
        } catch (e) {
            console.error('Error al cargar materiales:', e);
        }
    }

    async function openInventoryModal(item = null) {
        document.getElementById('inventory-material-id').value = '';
        
        const groupSelect = document.getElementById('group-material-select');
        const groupName = document.getElementById('group-inventory-name');
        const select = document.getElementById('inventory-material-select');
        const inputName = document.getElementById('inventory-name');
        
        if (item) {
            // Edit mode: Hide select, show text input
            groupSelect.style.display = 'none';
            select.required = false;
            groupName.style.display = 'block';
            inputName.required = true;
            
            document.getElementById('inventory-id').value = item.id;
            inputName.value = item.nombre;
            document.getElementById('inventory-desc').value = item.descripcion || '';
            document.getElementById('inventory-qty').value = item.cantidad;
            document.getElementById('inventory-price').value = item.precio;
        } else {
            // Add mode: Show select, hide text input
            groupSelect.style.display = 'block';
            select.required = true;
            groupName.style.display = 'none';
            inputName.required = false;
            
            document.getElementById('inventory-id').value = '';
            inputName.value = '';
            document.getElementById('inventory-desc').value = '[Ferretería Mi Casa DCH] ';
            document.getElementById('inventory-qty').value = '1';
            document.getElementById('inventory-price').value = '';
            
            // Populate select
            select.innerHTML = '<option value="">Cargando inventario...</option>';
            if (ferreteriaMaterials.length === 0) {
                await loadFerreteriaMaterials();
            }
            
            select.innerHTML = '<option value="">-- Seleccione un artículo --</option>';
            ferreteriaMaterials.forEach(m => {
                if (m.cantidad > 0) {
                    const opt = document.createElement('option');
                    opt.value = m.id;
                    opt.textContent = `${m.nombre} (Disp: ${m.cantidad} | Precio: Q${m.precio.toFixed(2)})`;
                    select.appendChild(opt);
                }
            });
        }
        inventoryModal.classList.remove('hidden');
    }

    const selectMaterial = document.getElementById('inventory-material-select');
    if (selectMaterial) {
        selectMaterial.addEventListener('change', (e) => {
            const matId = e.target.value;
            const mat = ferreteriaMaterials.find(m => m.id == matId);
            if (mat) {
                document.getElementById('inventory-material-id').value = mat.id;
                document.getElementById('inventory-name').value = mat.nombre;
                document.getElementById('inventory-price').value = mat.precio;
                document.getElementById('inventory-qty').max = mat.cantidad;
            } else {
                document.getElementById('inventory-material-id').value = '';
                document.getElementById('inventory-name').value = '';
                document.getElementById('inventory-price').value = '';
                document.getElementById('inventory-qty').removeAttribute('max');
            }
        });
    }

    const btnOpenNewInventory = document.getElementById('btn-open-new-inventory-modal');
    if (btnOpenNewInventory) btnOpenNewInventory.addEventListener('click', () => openInventoryModal());

    const btnCloseInventoryModal = document.getElementById('btn-close-inventory-modal');
    const btnCancelInventoryModal = document.getElementById('btn-cancel-inventory-modal');
    [btnCloseInventoryModal, btnCancelInventoryModal].forEach(btn => {
        if (btn) btn.addEventListener('click', () => inventoryModal.classList.add('hidden'));
    });

    if (formNewInventory) {
        formNewInventory.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('inventory-id').value;
            const usuarioId = window.currentToolUserId;

            if (!usuarioId) {
                showToast('Error', 'Selecciona un empleado primero', 'danger');
                return;
            }

            const payload = {
                usuarioId: usuarioId,
                nombre: document.getElementById('inventory-name').value.trim(),
                descripcion: document.getElementById('inventory-desc').value.trim(),
                cantidad: parseInt(document.getElementById('inventory-qty').value) || 0,
                precio: parseFloat(document.getElementById('inventory-price').value) || 0,
                material_id: document.getElementById('inventory-material-id').value
            };
            const method = id ? 'PUT' : 'POST';
            const url = id ? `/api/inventories/${id}` : '/api/inventories';

            try {
                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    showToast('ÉÉxito', `Artículo ${id ? 'actualizado' : 'guardado'}`, 'success');
                    inventoryModal.classList.remove('hidden');
                    loadInventoriesView();
                } else {
                    throw new Error('Error al guardar');
                }
            } catch (error) {
                console.error(error); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
                showToast('Error', 'No se pudo guardar el artículo', 'danger');
            }
        });
    }

    // Modal de Fotos Semanales (Admin)
    // ==================== TABS DE INVENTARIO ====================
    const btnTabInvAsign = document.getElementById('btn-tab-inv-asign');
    const btnTabInvAudits = document.getElementById('btn-tab-inv-audits');
    const tabInvAsign = document.getElementById('tab-inv-asign');
    const tabInvAudits = document.getElementById('tab-inv-audits');

    if (btnTabInvAsign && btnTabInvAudits) {
        btnTabInvAsign.addEventListener('click', () => {
            tabInvAsign.classList.remove('hidden');
            tabInvAudits.classList.add('hidden');
            btnTabInvAsign.className = 'btn-primary';
            btnTabInvAsign.style.flex = '1';
            btnTabInvAudits.className = 'btn-secondary';
            btnTabInvAudits.style.flex = '1';
        });
        btnTabInvAudits.addEventListener('click', () => {
            tabInvAudits.classList.remove('hidden');
            tabInvAsign.classList.add('hidden');
            btnTabInvAudits.className = 'btn-primary';
            btnTabInvAudits.style.flex = '1';
            btnTabInvAsign.className = 'btn-secondary';
            btnTabInvAsign.style.flex = '1';
            loadAuditsRegistry();
        });
    }

    const btnRefreshAudits = document.getElementById('btn-refresh-audits');
    if (btnRefreshAudits) {
        btnRefreshAudits.addEventListener('click', loadAuditsRegistry);
    }

    async function loadAuditsRegistry() {
        const tbody = document.getElementById('audits-registry-table-body');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Cargando registros...</td></tr>';

        try {
            if (!window.AttendanceDB || !window.AttendanceDB._state || !window.AttendanceDB._state.users) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Datos no disponibles aún.</td></tr>';
                return;
            }

            const res = await fetch('/api/inventory-audits');
            const audits = await res.json();

            const allUsers = window.AttendanceDB._state.users.filter(u => u.rol === 'usr' || u.rol === 'leader');

            const latestAudits = {};
            audits.forEach(a => {
                if (!latestAudits[a.usuarioId]) {
                    latestAudits[a.usuarioId] = a;
                } else {
                    if (new Date(a.fecha) > new Date(latestAudits[a.usuarioId].fecha)) {
                        latestAudits[a.usuarioId] = a;
                    }
                }
            });

            // Consider "Esta Semana" if sent in the last 7 days
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            tbody.innerHTML = '';

            allUsers.sort((a, b) => {
                const eA = a.empresa || '';
                const eB = b.empresa || '';
                if (eA !== eB) return eA.localeCompare(eB);
                return a.nombre.localeCompare(b.nombre);
            });

            allUsers.forEach(user => {
                const audit = latestAudits[user.id];
                let estadoBadge = '<span class="badge bg-danger" style="background-color: var(--danger); padding: 5px 10px; border-radius: 4px; color: white;">Pendiente</span>';
                let ultimaFotoText = '-';
                let actionBtn = `<button class="btn-secondary btn-sm" disabled style="opacity: 0.5; cursor: not-allowed; padding: 5px 10px; font-size: 0.8rem;">Ver Fotos</button>`;

                if (audit) {
                    ultimaFotoText = audit.fecha;
                    const auditDate = new Date(audit.fecha);
                    if (auditDate >= oneWeekAgo) {
                        estadoBadge = '<span class="badge bg-success" style="background-color: var(--success); padding: 5px 10px; border-radius: 4px; color: white;">Enviado</span>';
                    } else {
                        estadoBadge = '<span class="badge bg-warning" style="background-color: var(--warning); padding: 5px 10px; border-radius: 4px; color: black;">Atrasado</span>';
                    }
                    actionBtn = `<button class="btn-primary btn-sm" onclick="window.showAuditsModal(${user.id})" style="padding: 5px 10px; font-size: 0.8rem; background-color: var(--primary);">Ver Fotos</button>`;
                }

                tbody.innerHTML += `
                    <tr>
                        <td><strong>${user.nombre}</strong><br><small class="text-muted">${user.grupo || '-'}</small></td>
                        <td>${user.empresa || 'N/A'}</td>
                        <td>${ultimaFotoText}</td>
                        <td>${estadoBadge}</td>
                        <td>${actionBtn}</td>
                    </tr>
                `;
            });
        } catch (e) {
            console.error(e); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar registros.</td></tr>';
        }
    }

    window.showAuditsModal = async (usuarioId) => {
        const auditsModal = document.getElementById('inventory-audits-modal');
        if (!auditsModal) return;

        auditsModal.classList.remove('hidden');
        const container = document.getElementById('audits-list-container');
        container.innerHTML = '<p class="text-center">Cargando fotos...</p>';

        try {
            const res = await fetch(`/api/inventory-audits?usuarioId=${usuarioId}`);
            const data = await res.json();
            if (data.length === 0) {
                container.innerHTML = '<p class="text-center text-muted">El empleado no ha enviado fotos aún.</p>';
                return;
            }
            container.innerHTML = '';
            data.forEach(audit => {
                container.innerHTML += `
                    <div class="card" style="padding: 15px; margin-bottom: 15px; background: rgba(0,0,0,0.2);">
                        <p style="margin-bottom: 5px;"><strong>Fecha de Envío:</strong> ${audit.fecha}</p>
                        ${audit.comentarios ? `<p style="margin-bottom: 10px;"><strong>Comentarios:</strong> ${audit.comentarios}</p>` : ''}
                        <div style="text-align: center;">
                            <img src="${audit.fotoUrl}" alt="Auditoría" style="max-width: 100%; border-radius: 8px; border: 1px solid var(--border-color);">
                        </div>
                    </div>
                `;
            });
        } catch (e) {
            container.innerHTML = '<p class="text-center text-danger">Error al cargar fotos</p>';
        }
    };

    const btnCloseAudits = document.getElementById('btn-close-audits-modal');
    if (btnCloseAudits) {
        btnCloseAudits.addEventListener('click', () => {
            const auditsModal = document.getElementById('inventory-audits-modal');
            if (auditsModal) auditsModal.classList.add('hidden');
        });
    }

    // Vista de Empleado: Mi Inventario
    async function loadUserInventoryView() {
        const tbody = document.getElementById('user-inventory-table-body');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">Cargando inventario...</td></tr>';
        try {
            const res = await fetch(`/api/inventories?usuarioId=${currentUser.id}`);
            const userInvs = await res.json();
            tbody.innerHTML = '';
            if (userInvs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No tienes herramientas asignadas.</td></tr>';
                return;
            }
            userInvs.forEach(item => {
                tbody.innerHTML += `
                    <tr>
                        <td><strong>${item.nombre}</strong></td>
                        <td>${item.descripcion || '-'}</td>
                        <td><span class="badge ${item.cantidad > 0 ? 'bg-success' : 'bg-danger'}">${item.cantidad}</span></td>
                    </tr>
                `;
            });
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error al cargar inventario</td></tr>';
        }
    }

    // Empleado: Enviar foto
    const userSubmitPhotoModal = document.getElementById('user-submit-photo-modal');
    const btnUserSubmitPhoto = document.getElementById('btn-user-submit-inventory-photo');
    const btnCloseSubmitPhoto = document.getElementById('btn-close-submit-photo-modal');
    const btnCancelSubmitPhoto = document.getElementById('btn-cancel-submit-photo-modal');
    const btnConfirmSubmitPhoto = document.getElementById('btn-confirm-submit-photo');
    const photoInput = document.getElementById('inventory-photo-input');
    const photoPreviewImg = document.getElementById('photo-preview-img');
    const photoPreviewContainer = document.getElementById('photo-preview-container');

    if (btnUserSubmitPhoto) btnUserSubmitPhoto.addEventListener('click', () => {
        photoInput.value = '';
        document.getElementById('inventory-photo-comments').value = '';
        photoPreviewContainer.classList.add('hidden');
        userSubmitPhotoModal.classList.remove('hidden');
    });

    [btnCloseSubmitPhoto, btnCancelSubmitPhoto].forEach(b => {
        if (b) b.addEventListener('click', () => userSubmitPhotoModal.classList.add('hidden'));
    });

    if (photoInput) {
        photoInput.addEventListener('change', () => {
            const file = photoInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    photoPreviewImg.src = e.target.result;
                    photoPreviewContainer.classList.remove('hidden');
                }
                reader.readAsDataURL(file);
            }
        });
    }

    if (btnConfirmSubmitPhoto) {
        btnConfirmSubmitPhoto.addEventListener('click', async () => {
            const base64Str = photoPreviewImg.src;
            if (!base64Str || base64Str === window.location.href) {
                showToast('Atención', 'Debes adjuntar una fotografía', 'warning');
                return;
            }

            const payload = {
                usuarioId: currentUser.id,
                fecha: new Date().toISOString().split('T')[0],
                fotoBase64: base64Str,
                comentarios: document.getElementById('inventory-photo-comments').value
            };

            const originalText = btnConfirmSubmitPhoto.textContent;
            btnConfirmSubmitPhoto.textContent = 'Enviando...';
            btnConfirmSubmitPhoto.disabled = true;
            try {
                const res = await fetch('/api/inventory-audits', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    showToast('ÉÉxito', 'Fotografía enviada correctamente', 'success');
                    userSubmitPhotoModal.classList.add('hidden');
                } else {
                    throw new Error('Error de servidor');
                }
            } catch (e) {
                showToast('Error', 'No se pudo enviar la fotografía', 'danger');
            } finally {
                btnConfirmSubmitPhoto.textContent = originalText;
                btnConfirmSubmitPhoto.disabled = false;
            }
        });
    }

    // Configurar menú de navegación según rol

// --- LÓGICA DE HERRAMIENTAS Y FOTOS EN MODAL DE TRABAJADOR ---
window.showUserToolsModal = async function(userId, userName) {
    document.getElementById('user-tools-modal-title').textContent = 'Herramientas de ' + userName;
    document.getElementById('user-tools-modal').classList.remove('hidden');
    
    // Guardar ID globalmente para el modal de añadir
    window.currentToolUserId = userId;
    
    await fetchAdminUserInventory(userId);
    await fetchUserAudits(userId);
};

async function fetchUserAudits(userId) {
    const tbody = document.getElementById('user-audits-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" class="text-center">Cargando fotos...</td></tr>';
    
    try {
        const res = await fetch('/api/inventory-audits?usuarioId=' + userId);
        const data = await res.json();
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">El empleado no ha enviado fotos aún.</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        data.forEach(audit => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${audit.fecha}</td>
                <td>${audit.comentarios || '-'}</td>
                <td>
                    <a href="${audit.fotoUrl}" target="_blank" style="color: var(--primary);">Ver Foto</a>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error al cargar fotos</td></tr>';
    }
}

document.getElementById('btn-close-user-tools-modal')?.addEventListener('click', () => {
    document.getElementById('user-tools-modal').classList.add('hidden');
});





