    // --- GESTIÓN DE USUARIOS (RRHH Daniel) ---
    const btnOpenUserModal = document.getElementById('btn-open-user-modal');
    const userModal = document.getElementById('user-modal');
    const btnCloseUserModal = document.getElementById('btn-close-user-modal');
    const btnCancelUser = document.getElementById('btn-cancel-user');
    const userForm = document.getElementById('user-form');
    const editUserId = document.getElementById('edit-user-id');
    const userFullname = document.getElementById('user-fullname');
    const userNameInput = document.getElementById('user-name-input');
    const userPasswordInput = document.getElementById('user-password-input');
    const userPasswordHelp = document.getElementById('user-password-help');
    const userRangoMaximoHorasInput = document.getElementById('user-rango-maximo-horas-input');
    const userTarifaExtraInput = document.getElementById('user-tarifa-extra-input');
    const userRoleSelect = document.getElementById('user-role-select');
    const userGroupSelect = document.getElementById('user-group-select');
    const userRateDiurnaInput = document.getElementById('user-rate-diurna-input');
    const userRateNocturnaInput = document.getElementById('user-rate-nocturna-input');
    const userFrequencySelect = document.getElementById('user-frequency-select');
    const userRateGroup = document.getElementById('user-rate-group');
    const adminUsersTable = document.getElementById('admin-users-table');
    const userModalTitle = document.getElementById('user-modal-title');
    const userTipoPagoSelect = document.getElementById('user-tipo-pago-select');
    const userHorasNormalesInput = document.getElementById('user-horas-normales-max-input');
    const userCompanySelect = document.getElementById('user-company-select');

    // Escuchar cambios de rol para ocultar/mostrar tarifa por hora
    userRoleSelect.addEventListener('change', () => {
        toggleUserRateInputVisibility();
    });

    if (userCompanySelect) {
        userCompanySelect.addEventListener('change', () => {
            toggleUserRateInputVisibility();
        });
    }

    if (userTipoPagoSelect) {
        userTipoPagoSelect.addEventListener('change', () => {
            toggleUserRateInputVisibility();
        });
    }

    function toggleUserRateInputVisibility() {
        const role = userRoleSelect.value;
        const tipoPago = userTipoPagoSelect ? userTipoPagoSelect.value : 'Por Horas';
        const isWorker = (role === 'usr' || role === 'leader');

        const rateDiurnaWrapper = userRateDiurnaInput ? userRateDiurnaInput.closest('div') : null;
        const rateNocturnaWrapper = userRateNocturnaInput ? userRateNocturnaInput.closest('div') : null;
        const horasNormalesWrapper = userHorasNormalesInput ? userHorasNormalesInput.closest('.form-group') : null;
        const frequencyWrapper = userFrequencySelect ? userFrequencySelect.closest('.form-group') : null;

        const busesGroup = document.getElementById('user-buses-group');
        const companyName = userCompanySelect ? userCompanySelect.value : '';
        if (busesGroup) {
            if (companyName.toUpperCase().includes('BUSES')) {
                busesGroup.style.display = 'block';
            } else {
                busesGroup.style.display = 'none';
            }
        }

        if (isWorker) {
            if (tipoPago === 'Por Horas') {
                userRateGroup.classList.remove('hidden');
                if (rateDiurnaWrapper) rateDiurnaWrapper.style.display = 'block';
                if (rateNocturnaWrapper) rateNocturnaWrapper.style.display = 'block';
                if (horasNormalesWrapper) horasNormalesWrapper.style.display = 'block';
                if (frequencyWrapper) frequencyWrapper.style.display = 'block';

                if (userRateDiurnaInput) userRateDiurnaInput.required = true;
                if (userRateNocturnaInput) userRateNocturnaInput.required = true;

                const diurnaLabel = rateDiurnaWrapper ? rateDiurnaWrapper.querySelector('label') : null;
                if (diurnaLabel) diurnaLabel.textContent = 'Tarifa Diurna (Q) *';
            } else {
                // Destajo: no aparecerán horas normales, tarifa diurna y nocturna. Solo pagos semanales.
                userRateGroup.classList.add('hidden');
                if (horasNormalesWrapper) horasNormalesWrapper.style.display = 'none';
                if (frequencyWrapper) {
                    frequencyWrapper.style.display = 'none';
                    userFrequencySelect.value = 'semanal'; // Forzar pago semanal
                }

                if (userRateDiurnaInput) {
                    userRateDiurnaInput.required = false;
                    userRateDiurnaInput.value = '0';
                }
                if (userRateNocturnaInput) {
                    userRateNocturnaInput.required = false;
                    userRateNocturnaInput.value = '0';
                }
            }
        } else {
            userRateGroup.classList.add('hidden');
            if (horasNormalesWrapper) horasNormalesWrapper.style.display = 'none';
            if (frequencyWrapper) frequencyWrapper.style.display = 'none';
            if (userRateDiurnaInput) {
                userRateDiurnaInput.required = false;
                userRateDiurnaInput.value = '';
            }
            if (userRateNocturnaInput) {
                userRateNocturnaInput.required = false;
                userRateNocturnaInput.value = '';
            }
        }
    }


    // --- MANEJO DINÁMICO DE EMPRESAS ---
    const btnAddCompanyModal = document.getElementById('btn-add-company-modal');
    const btnOpenCompanyModal = document.getElementById('btn-open-company-modal');
    const adminCompaniesTable = document.getElementById('admin-companies-table');

    function renderCompanyDropdowns() {
        if (!userCompanySelect) return;
        const companies = window.AttendanceDB.getCompanies();
        const currentModalValue = userCompanySelect.value || 'N/A';

        userCompanySelect.innerHTML = '';
        companies.forEach(c => {
            const name = typeof c === 'string' ? c : c.name;
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name === 'N/A' ? 'N/A (Ninguna)' : name;
            userCompanySelect.appendChild(opt);
        });

        if (Array.from(userCompanySelect.options).some(opt => opt.value === currentModalValue)) {
            userCompanySelect.value = currentModalValue;
        } else {
            userCompanySelect.value = 'N/A';
        }
    }

    function renderAdminCompaniesTable() {
        if (!adminCompaniesTable) return;
        const companies = window.AttendanceDB.getCompanies();
        const allUsers = window.AttendanceDB.getUsers();

        adminCompaniesTable.innerHTML = '';

        companies.forEach(companyObj => {
            const company = typeof companyObj === 'string' ? companyObj : companyObj.name;
            const managerId = typeof companyObj === 'string' ? null : companyObj.encargadoId;

            let managerName = '<span class="text-muted">Ninguno</span>';
            if (managerId) {
                const manager = allUsers.find(u => u.id === managerId);
                if (manager) {
                    managerName = `<strong>${manager.nombre}</strong>`;
                }
            }

            const workerCount = allUsers.filter(u => u.empresa === company && u.rol === 'usr').length;

            const isSystem = company === 'N/A' || company === 'DCH';
            const editBtn = isSystem
                ? ''
                : `<button class="btn-table-action approve edit-company-btn" data-company="${company}">Editar</button>`;
            const deleteBtn = isSystem
                ? ''
                : `<button class="btn-table-action penalize delete-company-btn" data-company="${company}">Eliminar</button>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${company}</strong></td>
                <td>${managerName}</td>
                <td><span class="role-badge usr" style="width: auto; display: inline-block; padding: 4px 10px;">${workerCount} colaborador${workerCount === 1 ? '' : 'es'}</span></td>
                <td>
                    ${isSystem
                    ? '<span class="text-muted" style="font-size:0.8rem;">Sistema (Solo lectura)</span>'
                    : `
                            <div style="display: flex; gap: 5px;">
                                ${editBtn}
                                ${deleteBtn}
                            </div>
                          `
                }
                </td>
            `;
            adminCompaniesTable.appendChild(tr);
        });

        // Registrar click listeners para los botones de editar empresas
        adminCompaniesTable.querySelectorAll('.edit-company-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const compName = e.target.getAttribute('data-company');
                openCompanyModal(compName);
            });
        });

        // Registrar click listeners para los botones de eliminar empresas
        adminCompaniesTable.querySelectorAll('.delete-company-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const compName = e.target.getAttribute('data-company');
                if (await appConfirm('Confirmación', `¿Estás seguro de que deseas eliminar la empresa "${compName}"?`)) {
                    const result = await window.AttendanceDB.deleteCompany(compName, currentUser.id);
                    if (result.success) {
                        showToast('Empresa Eliminada', `La empresa "${compName}" ha sido borrada del sistema.`, 'info');
                        renderCompanyDropdowns();
                        renderAdminCompaniesTable();
                    } else {
                        showToast('Error', result.message, 'danger');
                    }
                }
            });
        });
    }

    const companyModal = document.getElementById('company-modal');
    const btnCloseCompanyModal = document.getElementById('btn-close-company-modal');
    const btnCancelCompany = document.getElementById('btn-cancel-company');
    const companyForm = document.getElementById('company-form');
    const companyOldName = document.getElementById('company-old-name');
    const companyNameInput = document.getElementById('company-name-input');
    const companyManagerSelect = document.getElementById('company-manager-select');
    const companyEmployeesList = document.getElementById('company-employees-list');

    function openCompanyModal(companyName = null) {
        if (!companyModal) return;

        companyModal.classList.remove('hidden');

        const allUsers = window.AttendanceDB.getUsers();
        if (companyManagerSelect) {
            companyManagerSelect.innerHTML = '<option value="">Ninguno</option>';
            allUsers.filter(u => (u.rol === 'admin' || u.rol === 'superadmin') || u.rol === 'leader').forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = `${u.nombre} (${(u.rol === 'admin' || u.rol === 'superadmin') ? 'Supervisor' : 'Líder'})`;
                companyManagerSelect.appendChild(opt);
            });
        }

        if (companyName) {
            const companies = window.AttendanceDB.getCompanies();
            const companyObj = companies.find(c => c.name === companyName) || { name: companyName };

            if (companyOldName) companyOldName.value = companyName;
            if (companyNameInput) companyNameInput.value = companyName;
            if (companyManagerSelect) companyManagerSelect.value = companyObj.encargadoId || '';

            document.getElementById('company-modal-title').textContent = 'Editar Empresa';
        } else {
            if (companyOldName) companyOldName.value = '';
            if (companyNameInput) companyNameInput.value = '';
            if (companyManagerSelect) companyManagerSelect.value = '';

            document.getElementById('company-modal-title').textContent = 'Crear Empresa';
        }

        if (companyEmployeesList) {
            companyEmployeesList.innerHTML = '';
            const workers = allUsers.filter(u => u.rol === 'usr' || u.rol === 'leader');
            workers.forEach(w => {
                const div = document.createElement('div');
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                div.style.gap = '8px';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = w.id;
                checkbox.id = `comp-emp-${w.id}`;
                if (companyName && w.empresa === companyName) {
                    checkbox.checked = true;
                }

                const label = document.createElement('label');
                label.htmlFor = `comp-emp-${w.id}`;
                label.textContent = `${w.nombre} (@${w.username}) [${w.empresa}]`;
                label.style.marginBottom = '0';
                label.style.fontSize = '0.85rem';

                div.appendChild(checkbox);
                div.appendChild(label);
                companyEmployeesList.appendChild(div);
            });
        }
    }

    const closeCompanyModal = () => {
        if (companyModal) companyModal.classList.add('hidden');
    };

    if (btnCloseCompanyModal) btnCloseCompanyModal.addEventListener('click', closeCompanyModal);
    if (btnCancelCompany) btnCancelCompany.addEventListener('click', closeCompanyModal);
    if (companyModal) {
        companyModal.addEventListener('click', (e) => {
            if (e.target === companyModal) closeCompanyModal();
        });
    }

    if (companyForm) {
        companyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const oldName = companyOldName.value;
            const newName = companyNameInput.value.trim();
            const encargadoId = companyManagerSelect.value ? parseInt(companyManagerSelect.value) : null;

            const employeeIds = [];
            if (companyEmployeesList) {
                companyEmployeesList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    if (cb.checked) {
                        employeeIds.push(parseInt(cb.value));
                    }
                });
            }

            if (!newName) {
                showToast('Error', 'El nombre no puede estar vacío.', 'danger');
                return;
            }

            let result;
            if (oldName) {
                result = await window.AttendanceDB.updateCompany(oldName, newName, encargadoId, employeeIds, currentUser.id);
            } else {
                result = await window.AttendanceDB.createCompany(newName, encargadoId, currentUser.id);
            }

            if (result.success) {
                showToast('Operación EÉxitosa', 'Empresa guardada correctamente.', 'success');
                closeCompanyModal();
                renderCompanyDropdowns();
                renderAdminCompaniesTable();
                renderAdminUsersTable();
            } else {
                showToast('Error', result.message || 'No se pudo guardar la empresa.', 'danger');
            }
        });
    }

    if (btnAddCompanyModal) {
        btnAddCompanyModal.addEventListener('click', () => openCompanyModal());
    }
    if (btnOpenCompanyModal) {
        btnOpenCompanyModal.addEventListener('click', () => openCompanyModal());
    }

    // --- GESTIÓN DE TIENDAS ---
    const adminStoresTable = document.getElementById('admin-stores-table');
    const storeModal = document.getElementById('store-modal');
    const btnOpenStoreModal = document.getElementById('btn-open-store-modal');
    const btnCloseStoreModal = document.getElementById('btn-close-store-modal');
    const btnCancelStore = document.getElementById('btn-cancel-store');
    const storeForm = document.getElementById('store-form');
    const storeOldName = document.getElementById('store-old-name');
    const storeIdInput = document.getElementById('store-id-input');
    const storeNameInput = document.getElementById('store-name-input');

    // --- ASIGNACIÓN DE USUARIOS A TIENDAS ---
    const storeUsersModal = document.getElementById('store-users-modal');
    const btnCloseStoreUsersModal = document.getElementById('btn-close-store-users-modal');
    const btnCancelStoreUsers = document.getElementById('btn-cancel-store-users');
    const storeUsersForm = document.getElementById('store-users-form');
    const storeUsersList = document.getElementById('store-users-list');
    const storeUsersStoreId = document.getElementById('store-users-store-id');

    function renderAdminStoresTable() {
        if (!adminStoresTable) return;
        const stores = window.AttendanceDB._state.stores || [];
        adminStoresTable.innerHTML = '';

        stores.forEach(store => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${store.nombre}</strong></td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn-table-action approve edit-store-btn" data-id="${store.id}" data-nombre="${store.nombre}">Editar</button>
                        <button class="btn-table-action penalize delete-store-btn" data-id="${store.id}" data-nombre="${store.nombre}">Eliminar</button>
                    </div>
                </td>
            `;
            adminStoresTable.appendChild(tr);
        });

        adminStoresTable.querySelectorAll('.edit-store-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                openStoreModal(e.target.getAttribute('data-id'), e.target.getAttribute('data-nombre'));
            });
        });

        adminStoresTable.querySelectorAll('.delete-store-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                const nombre = e.target.getAttribute('data-nombre');
                if (await appConfirm('Confirmación', `¿Estás seguro de que deseas eliminar la tienda "${nombre}"?`)) {
                    const result = await window.AttendanceDB.deleteStore(id);
                    if (result.success) {
                        showToast('Tienda Eliminada', `La tienda ha sido borrada del sistema.`, 'info');
                        renderAdminStoresTable();
                    } else {
                        showToast('Error', result.message, 'danger');
                    }
                }
            });
        });
    }

    function openStoreModal(id = null, nombre = null) {
        if (!storeModal) return;
        storeModal.classList.remove('hidden');
        if (id) {
            const allStores = window.AttendanceDB._state.stores || [];
            const currentStore = allStores.find(s => s.id == id) || {};

            storeIdInput.value = id;
            storeOldName.value = nombre;
            storeNameInput.value = nombre;
            document.getElementById('store-pdf-email').value = currentStore.pdf_email || 'serviciosdch1@gmail.com';
            document.getElementById('store-pdf-telefono').value = currentStore.pdf_telefono || '35656886';
            document.getElementById('store-pdf-direccion').value = currentStore.pdf_direccion || 'Lote 4 c Manzana 57 colonia Marianita Villa Nueva';
            document.getElementById('store-pdf-propietario').value = currentStore.pdf_propietario || 'Daniel Isai Chiguichon Choy';
            document.getElementById('store-modal-title').textContent = 'Editar Tienda';
            
            const previewContainer = document.getElementById('store-logo-preview-container');
            const previewImg = document.getElementById('store-logo-preview');
            if (currentStore.logo_url) {
                previewImg.src = currentStore.logo_url;
                previewContainer.classList.remove('hidden');
            } else {
                previewImg.src = '';
                previewContainer.classList.add('hidden');
            }
        } else {
            storeIdInput.value = '';
            storeOldName.value = '';
            storeNameInput.value = '';
            document.getElementById('store-pdf-email').value = 'serviciosdch1@gmail.com';
            document.getElementById('store-pdf-telefono').value = '35656886';
            document.getElementById('store-pdf-direccion').value = 'Lote 4 c Manzana 57 colonia Marianita Villa Nueva';
            document.getElementById('store-pdf-propietario').value = 'Daniel Isai Chiguichon Choy';
            document.getElementById('store-modal-title').textContent = 'Crear Tienda';
            
            document.getElementById('store-logo-preview').src = '';
            document.getElementById('store-logo-preview-container').classList.add('hidden');
        }

        // Show logo option ONLY for Supervisor, Admin, Leader
        const logoGroup = document.getElementById('store-logo-group');
        if (logoGroup) {
            if (typeof currentUser !== 'undefined' && currentUser && ['Supervisor', 'admin', 'leader'].includes(currentUser.rol)) {
                logoGroup.style.display = 'block';
            } else {
                logoGroup.style.display = 'none';
            }
        }


    }

    const closeStoreModal = () => {
        if (storeModal) storeModal.classList.add('hidden');
    };

    if (btnCloseStoreModal) btnCloseStoreModal.addEventListener('click', closeStoreModal);
    if (btnCancelStore) btnCancelStore.addEventListener('click', closeStoreModal);
    if (storeModal) {
        storeModal.addEventListener('click', (e) => {
            if (e.target === storeModal) closeStoreModal();
        });
    }

    if (storeForm) {
        storeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = storeIdInput.value;
            const newName = storeNameInput.value.trim();
            const pdfEmail = document.getElementById('store-pdf-email').value.trim();
            const pdfTelefono = document.getElementById('store-pdf-telefono').value.trim();
            const pdfDireccion = document.getElementById('store-pdf-direccion').value.trim();
            const pdfPropietario = document.getElementById('store-pdf-propietario').value.trim();
            
            const previewImg = document.getElementById('store-logo-preview');
            let logoBase64 = undefined; // undefined significa no modificar (en PUT) o null (en POST)
            if (typeof currentUser !== 'undefined' && currentUser && ['Supervisor', 'admin', 'leader'].includes(currentUser.rol)) {
                if (previewImg.src && previewImg.src.startsWith('data:image')) {
                    logoBase64 = previewImg.src;
                } else if (!previewImg.src || previewImg.src.endsWith('#')) {
                    logoBase64 = ''; // Vacío significa borrar logo
                }
            }

            if (!newName) {
                showToast('Error', 'El nombre no puede estar vacío.', 'danger');
                return;
            }

            let result;
            if (id) {
                result = await window.AttendanceDB.updateStore(id, newName, pdfEmail, pdfTelefono, pdfDireccion, pdfPropietario, logoBase64);
            } else {
                result = await window.AttendanceDB.createStore(newName, pdfEmail, pdfTelefono, pdfDireccion, pdfPropietario, logoBase64);
            }

            if (result.success) {
                const finalStoreId = id || result.storeId; // Si era crear, AttendanceDB debe devolver el ID o recargarlo.

                // Guardar asignación de personal si existe
                if (finalStoreId) {
                    const assignedUserIds = [];
                    document.querySelectorAll('.store-user-checkbox:checked').forEach(chk => {
                        assignedUserIds.push(parseInt(chk.value));
                    });

                    try {
                        await fetch(`/api/stores/${finalStoreId}/users`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userIds: assignedUserIds })
                        });
                        await window.AttendanceDB.loadStateFromServer(); // Recargar usuarios
                        
                        // Actualizar currentUser global si se modificó a sí mismo
                        if (typeof currentUser !== 'undefined' && currentUser !== null) {
                            const updatedMe = window.AttendanceDB._state.users.find(u => u.id === currentUser.id);
                            if (updatedMe) {
                                Object.assign(currentUser, updatedMe);
                            }
                        }
                    } catch (err) { console.error(err); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger'); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger'); }
                }

                showToast('Operación EÉxitosa', 'Tienda guardada correctamente.', 'success');
                closeStoreModal();
                renderAdminStoresTable();
            } else {
                showToast('Error', result.message || 'No se pudo guardar la tienda.', 'danger');
            }
        });
    }

    if (btnOpenStoreModal) {
        btnOpenStoreModal.addEventListener('click', () => openStoreModal());
    }

    // --- MANEJO DEL INPUT DE FOTO DEL LOGO DE TIENDA ---
    const storeLogoInput = document.getElementById('store-logo-input');
    const storeLogoPreview = document.getElementById('store-logo-preview');
    const storeLogoPreviewContainer = document.getElementById('store-logo-preview-container');
    if (storeLogoInput) {
        storeLogoInput.addEventListener('change', function () {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    storeLogoPreview.src = e.target.result;
                    storeLogoPreviewContainer.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Renderizar listado de usuarios
    function renderAdminUsersTable() {
        const allUsers = window.AttendanceDB.getUsers();
        adminUsersTable.innerHTML = '';

        if (allUsers.length === 0) {
            adminUsersTable.innerHTML = `
                <tr>
                    <td colspan="8" class="text-muted" style="text-align: center; padding: 20px;">
                        No existen usuarios en el sistema.
                    </td>
                </tr>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();

        allUsers.forEach(user => {
            const companyText = user.empresa || 'N/A';
            const rateText = user.rol === 'usr'
                ? `Q${(user.tarifaDiurna || 0).toFixed(2)} (D) / Q${(user.tarifaNocturna || 0).toFixed(2)} (N)`
                : '-';
            const frequencyText = user.rol === 'usr'
                ? (user.frecuenciaPago === 'quincenal' ? 'Quincenal' : 'Semanal')
                : '-';

            // Nombre de rol legible
            let roleLabel = 'Usuario';
            if (user.rol === 'leader') roleLabel = 'Líder de Grupo';
            if (user.rol === 'admin') roleLabel = 'Supervisor';

            const editButton = `<button class="btn-table-action approve edit-user-btn" data-id="${user.id}">Editar</button>`;

            // Botón de eliminar (deshabilitado para sí mismo)
            const isSelf = user.id === currentUser.id;
            const deleteButton = isSelf
                ? `<button class="btn-table-action disabled" disabled title="No se puede eliminar">Eliminar</button>`
                : `<button class="btn-table-action penalize delete-user-btn" data-id="${user.id}">Eliminar</button>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${user.nombre}</strong></td>
                <td><code>@${user.username}</code></td>
                <td><span class="role-badge ${user.rol}">${roleLabel}</span></td>
                <td>${companyText}</td>
                <td><strong style="font-size:0.8rem; white-space:nowrap;">${rateText}</strong></td>
                <td><span class="role-badge ${user.frecuenciaPago || 'semanal'}">${frequencyText}</span></td>
                <td>
                    ${editButton}
                    ${deleteButton}
                </td>
            `;
            fragment.appendChild(tr);
        });

        adminUsersTable.appendChild(fragment);

        // Registrar click listeners para los botones de editar
        adminUsersTable.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.getAttribute('data-id');
                openUserModal(userId);
            });
        });

        // Registrar click listeners para los botones de eliminar
        adminUsersTable.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userId = e.target.getAttribute('data-id');
                const user = window.AttendanceDB.getUserById(userId);
                if (await appConfirm('Confirmación', `¿Estás seguro de que deseas eliminar permanentemente al usuario "${user.nombre}" (@${user.username})?`)) {
                    const result = await window.AttendanceDB.deleteUser(userId, currentUser.id);
                    if (result.success) {
                        showToast('Usuario Eliminado', 'El usuario ha sido borrado del sistema.', 'info');
                        renderAdminUsersTable();
                    } else {
                        showToast('Error', result.message, 'danger');
                    }
                }
            });
        });
    }

    // Modal de usuario
    if (btnOpenUserModal) {
        btnOpenUserModal.addEventListener('click', () => {
            openUserModal();
        });
    }

    const closeUserModal = () => {
        userModal.classList.add('hidden');
    };

    if (btnCloseUserModal) btnCloseUserModal.addEventListener('click', closeUserModal);
    if (btnCancelUser) btnCancelUser.addEventListener('click', closeUserModal);
    if (userModal) {
        userModal.addEventListener('click', (e) => {
            if (e.target === userModal) closeUserModal();
        });
    }

    function openUserModal(userId = null) {
        if (userId) {
            // Modo Edición
            const user = window.AttendanceDB.getUserById(userId);
            editUserId.value = user.id;
            userFullname.value = user.nombre;
            userNameInput.value = user.username;
            userPasswordInput.value = ''; // En blanco por defecto
            userPasswordInput.required = false; // No obligatorio en edición
            userPasswordHelp.classList.remove('hidden');
            userRoleSelect.value = user.rol;
            userCompanySelect.value = user.empresa || 'N/A';
            if (userRateDiurnaInput) userRateDiurnaInput.value = user.tarifaDiurna !== undefined ? user.tarifaDiurna : '';
            if (userRateNocturnaInput) userRateNocturnaInput.value = user.tarifaNocturna !== undefined ? user.tarifaNocturna : '';
            if (userFrequencySelect) userFrequencySelect.value = user.frecuenciaPago || 'semanal';
            if (userTipoPagoSelect) userTipoPagoSelect.value = user.tipoPago || 'Por Horas';
            if (userHorasNormalesInput) userHorasNormalesInput.value = user.horasNormalesMax !== undefined ? user.horasNormalesMax : 8.0;

            const userPrecioDieselInput = document.getElementById('user-precio-diesel-input');
            const userSueldoAcumuladoInput = document.getElementById('user-sueldo-acumulado-input');
            if (userPrecioDieselInput) userPrecioDieselInput.value = user.precioDieselBuses !== undefined ? user.precioDieselBuses : 30.0;
            if (userSueldoAcumuladoInput) userSueldoAcumuladoInput.value = user.sueldoBusesAcumulado !== undefined ? user.sueldoBusesAcumulado : 0;

            // Cargar DPI y Foto DPI
            const userDpiEl = document.getElementById('user-dpi');
            if (userDpiEl) userDpiEl.value = user.dpi || '';

            const dpiPreviewContainer = document.getElementById('user-dpi-foto-preview-container');
            const dpiPreviewLink = document.getElementById('user-dpi-foto-preview-link');
            const dpiFotoInput = document.getElementById('user-dpi-foto');

            if (dpiFotoInput) dpiFotoInput.value = ''; // Limpiar input file

            if (dpiPreviewContainer && dpiPreviewLink) {
                if (user.dpiFotoUrl) {
                    dpiPreviewLink.href = user.dpiFotoUrl;
                    dpiPreviewContainer.classList.remove('hidden');
                } else {
                    dpiPreviewLink.href = '#';
                    dpiPreviewContainer.classList.add('hidden');
                }
            }

            // Cargar préstamos
            const loanTotalEl = document.getElementById('user-loan-total-input');
            const loanCuotaEl = document.getElementById('user-loan-cuota-input');
            const loanSaldoEl = document.getElementById('user-loan-saldo-input');
            const loanStatusEl = document.getElementById('user-loan-status-select');

            if (loanTotalEl) loanTotalEl.value = user.préstamoTotal !== undefined && user.préstamoTotal !== null ? user.préstamoTotal : '';
            if (loanCuotaEl) loanCuotaEl.value = user.préstamoCuota !== undefined && user.préstamoCuota !== null ? user.préstamoCuota : '';
            if (loanSaldoEl) loanSaldoEl.value = user.préstamosaldo !== undefined && user.préstamosaldo !== null ? user.préstamosaldo : '';
            if (loanStatusEl) loanStatusEl.value = user.préstamoEstadoCuota || 'Ninguno';

            // Cargar Permisos
            let userPerms = {};
            if (user.permisos) {
                try {
                    userPerms = typeof user.permisos === 'string' ? JSON.parse(user.permisos) : user.permisos;
                } catch(e) { console.error("Error parsing permisos:", e); }
            }
            const permsKeys = ['control_asistencia', 'mi_historial', 'prestamos', 'vehiculos', 'inventario', 'caja_chica', 'proyectos', 'ingresos_gastos'];
            permsKeys.forEach(key => {
                const chk = document.getElementById('perm-' + key.replace('_', '-'));
                if (chk) {
                    chk.checked = userPerms[key] !== undefined ? userPerms[key] : true;
                }
            });

            userModalTitle.textContent = 'Editar Usuario';

            // Impedir que se cambie el rol a sí mismo para evitar bloqueos
            if (user.id === currentUser.id) {
                userRoleSelect.disabled = true;
            } else {
                userRoleSelect.disabled = false;
            }
        } else {
            // Modo Creación
            editUserId.value = '';
            userPasswordInput.required = true; // Obligatorio en creación
            userPasswordHelp.classList.add('hidden');
            userRoleSelect.value = 'usr';
            userCompanySelect.value = 'N/A';
            if (userGroupSelect) userGroupSelect.value = 'N/A';
            if (userRateDiurnaInput) userRateDiurnaInput.value = '';
            if (userRateNocturnaInput) userRateNocturnaInput.value = '';
            if (userFrequencySelect) userFrequencySelect.value = 'semanal';
            if (userTipoPagoSelect) userTipoPagoSelect.value = 'Por Horas';
            if (userHorasNormalesInput) userHorasNormalesInput.value = 8.0;

            const userPrecioDieselInput = document.getElementById('user-precio-diesel-input');
            const userSueldoAcumuladoInput = document.getElementById('user-sueldo-acumulado-input');
            if (userPrecioDieselInput) userPrecioDieselInput.value = 30.0;
            if (userSueldoAcumuladoInput) userSueldoAcumuladoInput.value = 0;

            // Limpiar DPI y Foto DPI
            const userDpiEl = document.getElementById('user-dpi');
            if (userDpiEl) userDpiEl.value = '';

            const dpiPreviewContainer = document.getElementById('user-dpi-foto-preview-container');
            const dpiPreviewLink = document.getElementById('user-dpi-foto-preview-link');
            const dpiFotoInput = document.getElementById('user-dpi-foto');

            if (dpiFotoInput) dpiFotoInput.value = ''; // Limpiar input file

            if (dpiPreviewContainer && dpiPreviewLink) {
                dpiPreviewLink.href = '#';
                dpiPreviewContainer.classList.add('hidden');
            }

            // Limpiar préstamos
            const loanTotalEl = document.getElementById('user-loan-total-input');
            const loanCuotaEl = document.getElementById('user-loan-cuota-input');
            const loanSaldoEl = document.getElementById('user-loan-saldo-input');
            const loanStatusEl = document.getElementById('user-loan-status-select');

            if (loanTotalEl) loanTotalEl.value = '';
            if (loanCuotaEl) loanCuotaEl.value = '';
            if (loanSaldoEl) loanSaldoEl.value = '';
            if (loanStatusEl) loanStatusEl.value = 'Ninguno';

            // Limpiar Permisos (por defecto todos true)
            const permsKeys = ['control_asistencia', 'mi_historial', 'prestamos', 'vehiculos', 'inventario', 'caja_chica', 'proyectos', 'ingresos_gastos'];
            permsKeys.forEach(key => {
                const chk = document.getElementById('perm-' + key.replace('_', '-'));
                if (chk) chk.checked = true;
            });

            userRoleSelect.disabled = false;
            userModalTitle.textContent = 'Crear Usuario';
        }

        toggleUserRateInputVisibility();
        if (userModal) {
            userModal.classList.remove('hidden');
        }
    }

    // Envío del formulario de gestión de usuario
    if (userForm) {
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = editUserId.value;
            const nombre = userFullname.value.trim();
            const username = userNameInput.value.trim();
            const password = userPasswordInput.value;
            const rol = userRoleSelect.value;
            const empresa = userCompanySelect.value;
            const grupo = 'N/A';
            const tarifaDiurna = parseFloat(userRateDiurnaInput.value) || 0;
            const tarifaNocturna = parseFloat(userRateNocturnaInput.value) || 0;
            const frecuenciaPago = userFrequencySelect.value;
            const tipoPago = userTipoPagoSelect ? userTipoPagoSelect.value : 'Por Horas';
            const horasNormalesMax = userHorasNormalesInput ? parseFloat(userHorasNormalesInput.value) : 8.0;

            const loanTotalEl = document.getElementById('user-loan-total-input');
            const loanCuotaEl = document.getElementById('user-loan-cuota-input');
            const loanSaldoEl = document.getElementById('user-loan-saldo-input');
            const loanStatusEl = document.getElementById('user-loan-status-select');

            const préstamoTotal = loanTotalEl ? (parseFloat(loanTotalEl.value) || 0) : 0;
            const préstamoCuota = loanCuotaEl ? (parseFloat(loanCuotaEl.value) || 0) : 0;
            const préstamosaldo = loanSaldoEl ? (parseFloat(loanSaldoEl.value) || 0) : 0;
            const préstamoEstadoCuota = loanStatusEl ? (loanStatusEl.value || 'Ninguno') : 'Ninguno';

            const userPrecioDieselInput = document.getElementById('user-precio-diesel-input');
            const userSueldoAcumuladoInput = document.getElementById('user-sueldo-acumulado-input');
            const precioDieselBuses = userPrecioDieselInput ? (parseFloat(userPrecioDieselInput.value) || 30.0) : 30.0;
            const sueldoBusesAcumulado = userSueldoAcumuladoInput ? (parseFloat(userSueldoAcumuladoInput.value) || 0) : 0;

            const dpi = document.getElementById('user-dpi') ? document.getElementById('user-dpi').value.trim() : '';
            const dpiFotoInput = document.getElementById('user-dpi-foto');
            let dpiFotoBase64 = null;
            if (dpiFotoInput && dpiFotoInput.files && dpiFotoInput.files.length > 0) {
                const file = dpiFotoInput.files[0];
                dpiFotoBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                });
            }

            // Recoger permisos
            const permisos = {
                control_asistencia: document.getElementById('perm-control-asistencia') ? document.getElementById('perm-control-asistencia').checked : true,
                mi_historial: document.getElementById('perm-mi-historial') ? document.getElementById('perm-mi-historial').checked : true,
                prestamos: document.getElementById('perm-prestamos') ? document.getElementById('perm-prestamos').checked : true,
                vehiculos: document.getElementById('perm-vehiculos') ? document.getElementById('perm-vehiculos').checked : true,
                inventario: document.getElementById('perm-inventario') ? document.getElementById('perm-inventario').checked : true,
                caja_chica: document.getElementById('perm-caja-chica') ? document.getElementById('perm-caja-chica').checked : true,
                proyectos: document.getElementById('perm-proyectos') ? document.getElementById('perm-proyectos').checked : true,
                ingresos_gastos: document.getElementById('perm-ingresos-gastos') ? document.getElementById('perm-ingresos-gastos').checked : true
            };

            // Recoger Ventas
            const hasVentasRole = 0;
            const assignedStores = []; // Ya no se asigna desde el perfil del usuario, pero se manda vacio para compatibilidad

            let result;
            if (id) {
                // Guardar edicion
                result = await window.AttendanceDB.updateUser(id, username, password, nombre, rol, grupo, empresa, tarifaDiurna, tarifaNocturna, frecuenciaPago, currentUser.id, préstamoTotal, préstamoCuota, préstamosaldo, préstamoEstadoCuota, tipoPago, horasNormalesMax, 44.0, 0.0, dpi, dpiFotoBase64, hasVentasRole, assignedStores, precioDieselBuses, sueldoBusesAcumulado, permisos);
            } else {
                // Guardar creacion
                result = await window.AttendanceDB.createUser(username, password, nombre, rol, grupo, empresa, tarifaDiurna, tarifaNocturna, frecuenciaPago, currentUser.id, préstamoTotal, préstamoCuota, préstamosaldo, préstamoEstadoCuota, tipoPago, horasNormalesMax, 44.0, 0.0, dpi, dpiFotoBase64, hasVentasRole, assignedStores, precioDieselBuses, sueldoBusesAcumulado, permisos);
            }

            if (result.success) {
                showToast('Usuario Guardado', `El usuario "${nombre}" ha sido registrado/configurado con éxito.`, 'success');
                closeUserModal();

                // Actualizar según la pestaña en que nos encontremos
                if (activeTab === 'tab-trabajadores-admin') {
                    setupAdminView();
                } else {
                    renderAdminUsersTable();
                }
            } else {
                showToast('Error de Validación', result.message, 'danger');
            }
        });
    }

    // --- CONECTORES DE NAVEGACIÓN Y RENDERERS (TRABAJADORES, Vehículos, PRÉSTAMOS) ---

    // Botón de Crear Trabajador desde el Grid
    const btnCreateWorkerGrid = document.getElementById('btn-create-worker-grid');
    if (btnCreateWorkerGrid) {
        btnCreateWorkerGrid.addEventListener('click', () => {
            openUserModal();
        });
    }

    // --- MANEJO DE EXPORTAR PERMISOS ---
    const btnExportPermits = document.getElementById('btn-export-permits');
    const permitsExportModal = document.getElementById('permits-export-modal');
    const btnClosePermitsModal = document.getElementById('btn-close-permits-modal');
    const btnCancelPermitsModal = document.getElementById('btn-cancel-permits-modal');
    const btnExecutePermitsExport = document.getElementById('btn-execute-permits-export');
    const chkSelectAllEmployees = document.getElementById('permits-select-all-employees');
    const chkSelectAllVehicles = document.getElementById('permits-select-all-vehicles');
    
    // Solo mostrar el botón de exportar permisos a los Supervisores (rol admin)
    // NOTA: Esta visibilidad ahora se manejará dentro de renderAdminWorkersGrid() para asegurar que currentUser ya exista.

    if (btnExportPermits) {
        btnExportPermits.addEventListener('click', () => {
            openPermitsExportModal();
        });
    }

    function openPermitsExportModal() {
        if (!permitsExportModal) return;
        
        const allUsers = window.AttendanceDB.getUsers().filter(u => u.rol !== 'admin');
        const allVehicles = window.AttendanceDB._state.vehicles || [];

        const empContainer = document.getElementById('permits-employees-list');
        const vehContainer = document.getElementById('permits-vehicles-list');
        empContainer.innerHTML = '';
        vehContainer.innerHTML = '';

        allUsers.forEach(u => {
            empContainer.innerHTML += `
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:5px; border-bottom: 1px solid var(--border-color);">
                    <input type="checkbox" class="permit-emp-chk" value="${u.id}" data-nombre="${u.nombre}" data-dpi="${u.dpi || 'N/A'}" data-dpifoto="${u.dpiFotoUrl || ''}">
                    <span style="flex:1;">${u.nombre} (DPI: ${u.dpi || 'N/A'})</span>
                </label>
            `;
        });

        allVehicles.forEach(v => {
            vehContainer.innerHTML += `
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:5px; border-bottom: 1px solid var(--border-color);">
                    <input type="checkbox" class="permit-veh-chk" value="${v.id}" data-marca="${v.marca}" data-modelo="${v.modelo}" data-placas="${v.placa}">
                    <span style="flex:1;">${v.marca} ${v.modelo} (Placas: ${v.placa})</span>
                </label>
            `;
        });

        if (chkSelectAllEmployees) {
            chkSelectAllEmployees.checked = false;
            chkSelectAllEmployees.onchange = function() {
                document.querySelectorAll('.permit-emp-chk').forEach(c => c.checked = this.checked);
            };
        }

        if (chkSelectAllVehicles) {
            chkSelectAllVehicles.checked = false;
            chkSelectAllVehicles.onchange = function() {
                document.querySelectorAll('.permit-veh-chk').forEach(c => c.checked = this.checked);
            };
        }

        const justInput = document.getElementById('permits-justification');
        if (justInput) justInput.value = '';

        permitsExportModal.classList.remove('hidden');
    }

    const closePermitsModal = () => {
        if (permitsExportModal) permitsExportModal.classList.add('hidden');
    };
    if (btnClosePermitsModal) btnClosePermitsModal.addEventListener('click', closePermitsModal);
    if (btnCancelPermitsModal) btnCancelPermitsModal.addEventListener('click', closePermitsModal);

    if (btnExecutePermitsExport) {
        btnExecutePermitsExport.addEventListener('click', () => {
            const justificationText = document.getElementById('permits-justification').value.trim();
            if (!justificationText) {
                showToast('Advertencia', 'Por favor ingresa una justificación para el permiso.', 'warning');
                return;
            }

            const selectedEmployees = Array.from(document.querySelectorAll('.permit-emp-chk:checked')).map(c => ({
                id: c.value,
                nombre: c.getAttribute('data-nombre'),
                dpi: c.getAttribute('data-dpi'),
                dpiFoto: c.getAttribute('data-dpifoto')
            }));

            const selectedVehicles = Array.from(document.querySelectorAll('.permit-veh-chk:checked')).map(c => ({
                id: c.value,
                marca: c.getAttribute('data-marca'),
                modelo: c.getAttribute('data-modelo'),
                placas: c.getAttribute('data-placas')
            }));

            if (selectedEmployees.length === 0 && selectedVehicles.length === 0) {
                showToast('Advertencia', 'Debes seleccionar al menos un empleado o vehículo para exportar.', 'warning');
                return;
            }

            // Usar jsPDF de forma nativa para garantizar que el texto sea seleccionable y copiable
            // Además, previene errores de "pantalla en blanco" que tiene html2canvas en celulares.
            
            if (typeof window.jspdf === 'undefined') {
                showToast('Error', 'Librería jsPDF no disponible.', 'danger');
                return;
            }
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' });
            
            let currentY = 20;
            const marginX = 15;
            const pageWidth = doc.internal.pageSize.getWidth();
            const usableWidth = pageWidth - (marginX * 2);

            // Título
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text("PERMISOS Y ASIGNACIONES", pageWidth / 2, currentY, { align: 'center' });
            
            currentY += 8;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            const dateStr = new Date().toLocaleDateString('es-GT');
            doc.text(`Fecha de Emisión: ${dateStr}`, pageWidth / 2, currentY, { align: 'center' });
            
            currentY += 15;
            
            // Justificación
            if (justificationText) {
                doc.setFontSize(11);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.text("Justificación: ", marginX, currentY);
                
                doc.setFont('helvetica', 'italic');
                // Dividir justificación en varias líneas si es muy larga
                const splitJust = doc.splitTextToSize(justificationText, usableWidth - 30);
                doc.text(splitJust, marginX + 30, currentY);
                
                currentY += (splitJust.length * 5) + 10;
            }

            // Empleados
            if (selectedEmployees.length > 0) {
                doc.setFontSize(14);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.text("Personal Autorizado", marginX, currentY);
                doc.setLineWidth(0.5);
                doc.line(marginX, currentY + 2, pageWidth - marginX, currentY + 2);
                
                currentY += 10;
                
                doc.setFontSize(11);
                selectedEmployees.forEach(emp => {
                    // Control de salto de página
                    let neededSpace = 15; 
                    if (emp.dpiFoto && emp.dpiFoto !== 'null') neededSpace += 45; // Espacio para la imagen
                    
                    if (currentY + neededSpace > 260) {
                        doc.addPage();
                        currentY = 20;
                    }
                    
                    doc.setFont('helvetica', 'bold');
                    doc.text(emp.nombre, marginX, currentY);
                    
                    currentY += 5;
                    doc.setFont('helvetica', 'normal');
                    doc.text(`DPI: ${emp.dpi}`, marginX, currentY);
                    
                    currentY += 5;
                    
                    if (emp.dpiFoto && emp.dpiFoto !== 'null') {
                        try {
                            let format = 'JPEG';
                            if (emp.dpiFoto.includes('image/png')) format = 'PNG';
                            // Ajustar a un tamaño proporcionado
                            doc.addImage(emp.dpiFoto, format, marginX, currentY, 60, 40);
                            currentY += 45;
                        } catch(e) {
                            console.error("No se pudo agregar imagen", e);
                            doc.setTextColor(200, 0, 0);
                            doc.text("Error al cargar foto del DPI", marginX, currentY);
                            doc.setTextColor(0, 0, 0);
                            currentY += 8;
                        }
                    } else {
                        doc.setTextColor(150, 150, 150);
                        doc.setFont('helvetica', 'italic');
                        doc.text("Sin foto de DPI adjunta", marginX, currentY);
                        doc.setTextColor(0, 0, 0);
                        doc.setFont('helvetica', 'normal');
                        currentY += 8;
                    }
                });
                
                currentY += 5;
            }

            // Vehículos
            if (selectedVehicles.length > 0) {
                if (currentY > 230) {
                    doc.addPage();
                    currentY = 20;
                }
                
                doc.setFontSize(14);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.text("Vehículos Autorizados", marginX, currentY);
                doc.setLineWidth(0.5);
                doc.line(marginX, currentY + 2, pageWidth - marginX, currentY + 2);
                
                currentY += 10;
                
                doc.setFontSize(11);
                selectedVehicles.forEach(veh => {
                    if (currentY + 15 > 260) {
                        doc.addPage();
                        currentY = 20;
                    }
                    
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${veh.marca} ${veh.modelo}`, marginX, currentY);
                    
                    currentY += 5;
                    doc.setFont('helvetica', 'normal');
                    doc.text(`Placas: ${veh.placas}`, marginX, currentY);
                    
                    currentY += 10;
                });
            }

            // Generar y descargar el documento
            try {
                doc.save('Permisos_y_Asignaciones.pdf');
                showToast('Éxito', 'El documento se descargó correctamente.', 'success');
                closePermitsModal();
            } catch (err) {
                console.error("Error al guardar PDF:", err);
                showToast('Error', 'No se pudo generar el archivo.', 'danger');
            }
        });
    }

    // Cerrar modal de detalle de trabajador
    const btnCloseWorkerDetail = document.getElementById('btn-close-worker-detail');
    const workerDetailModal = document.getElementById('worker-detail-section');
    if (btnCloseWorkerDetail) {
        btnCloseWorkerDetail.addEventListener('click', () => {
            if (workerDetailModal) workerDetailModal.classList.add('hidden');
        });
    }
    if (workerDetailModal) {
        workerDetailModal.addEventListener('click', (e) => {
            if (e.target === workerDetailModal) {
                workerDetailModal.classList.add('hidden');
            }
        });
    }

    // Renderizar Rejilla de Empleados (Vista RRHH Principal)
    function renderAdminWorkersGrid(allUsers, overallAttendance) {
        const gridContainer = document.getElementById('admin-workers-grid');
        if (!gridContainer) return;
        gridContainer.innerHTML = '';

        const btnExportPermits = document.getElementById('btn-export-permits');
        if (btnExportPermits) {
            if (typeof currentUser !== 'undefined' && currentUser && (currentUser.rol === 'admin' || currentUser.rol === 'superadmin')) {
                btnExportPermits.classList.remove('hidden');
            } else {
                btnExportPermits.classList.add('hidden');
            }
        }

        const companyFilter = document.getElementById('filter-empresa-trabajadores');
        if (companyFilter && companyFilter.options.length <= 1 && window.AttendanceDB._state.companies) {
            const currentVal = companyFilter.value;
            companyFilter.innerHTML = '<option value="">Todas las empresas</option>';
            window.AttendanceDB._state.companies.forEach(c => {
                companyFilter.innerHTML += `<option value="${c.name}">${c.name}</option>`;
            });
            companyFilter.value = currentVal;
            if (!companyFilter.dataset.listener) {
                companyFilter.addEventListener('change', () => {
                    renderAdminWorkersGrid(window.AttendanceDB._state.users, window.AttendanceDB._state.attendance);
                });
                companyFilter.dataset.listener = 'true';
            }
        }

        const filterValue = companyFilter ? companyFilter.value : '';
        let workers = allUsers.filter(u => u.rol === 'usr' || u.rol === 'leader');

        if (filterValue) {
            workers = workers.filter(u => u.empresa === filterValue);
        }

        if (workers.length === 0) {
            gridContainer.innerHTML = `<div class="text-muted" style="grid-column: 1 / -1; text-align: center; padding: 20px;">No hay colaboradores registrados.</div>`;
            return;
        }

        workers.forEach(w => {
            const initials = w.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            // Buscar turno activo
            const activeRecord = overallAttendance.find(a => a.usuarioId === w.id && (!a.horaSalida || a.horaSalida === ''));
            const isOnline = !!activeRecord;

            const card = document.createElement('div');
            card.className = 'worker-card';
            if (isOnline) {
                card.classList.add('active');
            }
            
            card.innerHTML = `
                <div class="worker-cardavatar">${initials}</div>
                <div class="worker-card-info">
                    <h4>${w.nombre}</h4>
                    <p><strong>Rol:</strong> ${w.rol === 'leader' ? 'Líder' : 'Operario'}</p>
                    <p><strong>Empresa:</strong> ${w.empresa || 'N/A'}</p>
                </div>
            `;
            
            card.addEventListener('click', () => {
                selectedWorkerId = w.id;
                showWorkerDetails(w, overallAttendance);
            });

            gridContainer.appendChild(card);
        });
    }

    function showWorkerDetails(worker, overallAttendance) {
        const detailSection = document.getElementById('worker-detail-section');
        if (!detailSection) return;

        detailSection.classList.remove('hidden');

        document.getElementById('detail-worker-name').textContent = worker.nombre;

        const btnTools = document.getElementById('btn-view-worker-tools');
        if (btnTools) {
            btnTools.onclick = () => {
                if (typeof window.showUserToolsModal === 'function') {
                    window.showUserToolsModal(worker.id, worker.nombre);
                }
            };
        }
        let roleText = 'Operario';
        if (worker.rol === 'leader') roleText = 'Líder';
        const roleEl = document.getElementById('detail-worker-role');
        roleEl.textContent = roleText;
        roleEl.className = `role-badge ${worker.rol}`;

        document.getElementById('detail-worker-username').textContent = worker.nombre;
        document.getElementById('detail-worker-company').textContent = worker.empresa;
        document.getElementById('detail-worker-rate-d').textContent = (worker.tarifaDiurna || 0).toFixed(2);
        document.getElementById('detail-worker-rate-n').textContent = (worker.tarifaNocturna || 0).toFixed(2);
        document.getElementById('detail-worker-freq').textContent = worker.frecuenciaPago === 'semanal' ? 'Semanal' : 'Quincenal';

        const dpiEl = document.getElementById('detail-worker-dpi');
        if (dpiEl) {
            dpiEl.textContent = worker.dpi || 'No registrado';
        }
        const dpiFotoContainer = document.getElementById('detail-worker-dpi-foto-container');
        const dpiFotoLink = document.getElementById('detail-worker-dpi-foto-link');
        if (dpiFotoContainer && dpiFotoLink) {
            if (worker.dpiFotoUrl) {
                dpiFotoLink.href = worker.dpiFotoUrl;
                dpiFotoContainer.classList.remove('hidden');
                dpiFotoContainer.style.display = 'flex';
            } else {
                dpiFotoLink.href = '#';
                dpiFotoContainer.classList.add('hidden');
                dpiFotoContainer.style.display = 'none';
            }
        }

        // Resumen de préstamo
        const loanTotal = parseFloat(worker.préstamoTotal) || 0;
        const loanCuota = parseFloat(worker.préstamoCuota) || 0;
        const loanSaldo = parseFloat(worker.préstamosaldo) || 0;
        const freq = worker.frecuenciaPago || 'semanal';

        document.getElementById('detail-worker-loan-total').textContent = loanTotal.toFixed(2);
        document.getElementById('detail-worker-loan-cuota').textContent = loanCuota.toFixed(2);
        document.getElementById('detail-worker-loan-saldo').textContent = loanSaldo.toFixed(2);

        let finEstimado = 'Sin Préstamo Activo';
        if (loanSaldo > 0 && loanCuota > 0) {
            const numPagos = Math.ceil(loanSaldo / loanCuota);
            const endDateObj = new Date();
            if (freq === 'quincenal') {
                endDateObj.setDate(endDateObj.getDate() + numPagos * 15);
            } else {
                endDateObj.setDate(endDateObj.getDate() + numPagos * 7);
            }
            finEstimado = endDateObj.toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' });
        }
        document.getElementById('detail-worker-loan-end').textContent = finEstimado;

        // Filtrar historial
        const workerRecords = overallAttendance.filter(a => a.usuarioId === worker.id);
        const detailTableBody = document.getElementById('detail-worker-attendance-table');
        detailTableBody.innerHTML = '';

        if (workerRecords.length === 0) {
            detailTableBody.innerHTML = `<tr><td colspan="8" class="text-muted" style="text-align:center; padding:15px;">No posee marcajes registrados.</td></tr>`;
        } else {
            workerRecords.forEach(rec => {
                const timeStr = rec.horaSalida ? formatDecimalHours(rec.horasTrabajadas) : '<span class="text-warning">En curso...</span>';
                const brutoStr = rec.horaSalida ? `Q${rec.montoBruto.toFixed(2)}` : '-';
                const descStr = rec.horaSalida ? (rec.descuento > 0 ? `<span class="text-danger">-Q${rec.descuento.toFixed(2)}</span>` : 'Q0.00') : '-';
                const netoStr = rec.horaSalida ? `Q${rec.montoNeto.toFixed(2)}` : '-';
                const statusStr = rec.horaSalida ? (rec.aprobado ? '<span class="text-success">Aprobado</span>' : '<span class="text-warning">Pendiente</span>') : 'Activo';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${rec.fecha}</td>
                    <td>${rec.horaEntrada}</td>
                    <td>${rec.horaSalida || '-'}</td>
                    <td>${timeStr}</td>
                    <td>${brutoStr}</td>
                    <td class="text-danger">${descStr}</td>
                    <td><strong>${netoStr}</strong></td>
                    <td>${statusStr}</td>
                `;
                detailTableBody.appendChild(tr);
            });
        }

        // Editar perfil
        const btnEditProfile = document.getElementById('btn-edit-selected-worker');
        if (btnEditProfile) {
            btnEditProfile.onclick = () => {
                const detailSection = document.getElementById('worker-detail-section');
                if (detailSection) detailSection.classList.add('hidden');
                openUserModal(worker.id);
            };
        }

        // Eliminar perfil
        const btnDeleteProfile = document.getElementById('btn-delete-selected-worker');
        if (btnDeleteProfile) {
            btnDeleteProfile.onclick = async () => {
                if (await appConfirm('Confirmación', `¿Estás seguro de que deseas eliminar permanentemente al usuario "${worker.nombre}" (@${worker.username})?`)) {
                    const result = await window.AttendanceDB.deleteUser(worker.id, currentUser.id);
                    if (result.success) {
                        showToast('Usuario Eliminado', 'El usuario ha sido borrado del sistema.', 'info');
                        if (workerDetailModal) workerDetailModal.classList.add('hidden');
                        setupAdminView();
                    } else {
                        showToast('Error', result.message, 'danger');
                    }
                }
            };
        }

        // Cerrar Marcaje Activo
        const containerBtnCloseMarcaje = document.getElementById('container-btn-close-marcaje');
        const btnCloseWorkerMarcaje = document.getElementById('btn-close-worker-marcaje');
        
        const activeRecord = workerRecords.find(a => !a.horaSalida || a.horaSalida === '');
        if (activeRecord) {
            if (containerBtnCloseMarcaje) containerBtnCloseMarcaje.classList.remove('hidden');
            if (btnCloseWorkerMarcaje) {
                btnCloseWorkerMarcaje.onclick = async () => {
                    // Utiliza location null o vacio y una justificación administrativa
                    const record = await window.AttendanceDB.checkOut(worker.id, null, null, 'Cierre Administrativo', 'Marcaje cerrado manualmente por supervisor/admin.');
                    if (record) {
                        showToast('Marcaje Cerrado', `Se ha cerrado el marcaje de ${worker.nombre} exitosamente.`, 'success');
                        if (workerDetailModal) workerDetailModal.classList.add('hidden');
                        if (typeof setupAdminView === 'function') {
                            setupAdminView();
                        }
                    } else {
                        showToast('Error', 'No se pudo cerrar el marcaje.', 'danger');
                    }
                };
            }
        } else {
            if (containerBtnCloseMarcaje) containerBtnCloseMarcaje.classList.add('hidden');
        }
    }

// Expose openStoreModal for legacy onclicks
window.editStore = openStoreModal;

