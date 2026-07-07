    // --- MÓDULO Vehículos ---
    const vehicleModal = document.getElementById('vehicle-modal');
    const btnOpenVehicleModal = document.getElementById('btn-open-vehicle-modal');
    const btnCloseVehicleModal = document.getElementById('btn-close-vehicle-modal');
    const btnCancelVehicle = document.getElementById('btn-cancel-vehicle');
    const vehicleForm = document.getElementById('vehicle-form');
    const editVehicleId = document.getElementById('edit-vehicle-id');
    const vehiclePlaca = document.getElementById('vehicle-placa');
    const vehicleMarca = document.getElementById('vehicle-marca');
    const vehicleModelo = document.getElementById('vehicle-modelo');
    const vehicleDriverSelect = document.getElementById('vehicle-driver-select');
    const vehicleStatusSelect = document.getElementById('vehicle-status-select');
    const adminVehiclesTable = document.getElementById('admin-vehicles-table');

    const vehicleAssigneesModal = document.getElementById('vehicle-assignees-modal');
    const btnOpenVehicleAssignees = document.getElementById('btn-open-vehicle-assignees');
    const btnCloseVehicleAssignees = document.getElementById('btn-close-vehicle-assignees');
    const btnCloseVehicleAssigneesFooter = document.getElementById('btn-close-vehicle-assignees-footer');
    const vehicleAssigneesTableBody = document.getElementById('vehicle-assignees-table-body');

    function populateDriversSelect() {
        if (!vehicleDriverSelect) return;
        const users = window.AttendanceDB.getUsers();
        vehicleDriverSelect.innerHTML = '<option value="">Ninguno (Disponible)</option>';
        users.filter(u => u.rol === 'usr' || u.rol === 'leader').forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = `${u.nombre} (@${u.username})`;
            vehicleDriverSelect.appendChild(opt);
        });
    }

    function renderAdminVehiclesTable() {
        if (!adminVehiclesTable) return;
        const vehicles = window.AttendanceDB.getVehicles();
        adminVehiclesTable.innerHTML = '';

        if (vehicles.length === 0) {
            adminVehiclesTable.innerHTML = `<tr><td colspan="8" class="text-muted" style="text-align:center; padding:20px;">No hay vehículos registrados.</td></tr>`;
            return;
        }

        vehicles.forEach(v => {
            const driverName = v.nombreEmpleado || '<span class="text-muted">Ninguno (Disponible)</span>';
            const motivoText = v.motivoUso || '<span class="text-muted">-</span>';
            const fechaText = v.fechaAsignación ? new Date(v.fechaAsignación).toLocaleString('es-GT') : '<span class="text-muted">-</span>';

            let statusClass = 'pending';
            if (v.estado === 'Disponible') statusClass = 'approved';
            if (v.estado === 'Mantenimiento') statusClass = 'rejected';

            const editBtn = `<button class="btn-table-action approve edit-vehicle-btn" data-id="${v.id}">Editar</button>`;
            const deleteBtn = `<button class="btn-table-action penalize delete-vehicle-btn" data-id="${v.id}">Eliminar</button>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${v.placa}</strong></td>
                <td>${v.marca}</td>
                <td>${v.modelo}</td>
                <td>${driverName}</td>
                <td><span class="table-badge ${statusClass}">${v.estado}</span></td>
                <td>${motivoText}</td>
                <td>${fechaText}</td>
                <td>
                    <div style="display:flex; gap:5px;">
                        ${editBtn}
                        ${deleteBtn}
                    </div>
                </td>
            `;
            adminVehiclesTable.appendChild(tr);
        });

        // Listeners tabla
        adminVehiclesTable.querySelectorAll('.edit-vehicle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const vId = parseInt(e.target.getAttribute('data-id'));
                openVehicleModal(vId);
            });
        });

        adminVehiclesTable.querySelectorAll('.delete-vehicle-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const vId = parseInt(e.target.getAttribute('data-id'));
                if (await appConfirm('Confirmación', '¿Estás seguro de que deseas eliminar este vehículo?')) {
                    const success = await window.AttendanceDB.deleteVehicle(vId, currentUser.id);
                    if (success) {
                        showToast('Vehículo Eliminado', 'El vehículo ha sido borrado.', 'info');
                        renderAdminVehiclesTable();
                    } else {
                        showToast('Error', 'No se pudo eliminar el vehículo.', 'danger');
                    }
                }
            });
        });
    }

    if (btnOpenVehicleModal) {
        btnOpenVehicleModal.addEventListener('click', () => {
            openVehicleModal();
        });
    }

    const closeVehicleModal = () => {
        if (vehicleModal) vehicleModal.classList.add('hidden');
    };

    if (btnCloseVehicleModal) btnCloseVehicleModal.addEventListener('click', closeVehicleModal);
    if (btnCancelVehicle) btnCancelVehicle.addEventListener('click', closeVehicleModal);

    if (btnOpenVehicleAssignees) {
        btnOpenVehicleAssignees.addEventListener('click', () => {
            openVehicleAssigneesModal();
        });
    }
    const closeVehicleAssigneesModal = () => {
        if (vehicleAssigneesModal) vehicleAssigneesModal.classList.add('hidden');
    };
    if (btnCloseVehicleAssignees) btnCloseVehicleAssignees.addEventListener('click', closeVehicleAssigneesModal);
    if (btnCloseVehicleAssigneesFooter) btnCloseVehicleAssigneesFooter.addEventListener('click', closeVehicleAssigneesModal);
    if (vehicleAssigneesModal) {
        vehicleAssigneesModal.addEventListener('click', (e) => {
            if (e.target === vehicleAssigneesModal) closeVehicleAssigneesModal();
        });
    }

    function openVehicleAssigneesModal() {
        if (!vehicleAssigneesModal) return;
        vehicleAssigneesModal.classList.remove('hidden');

        const vehicles = window.AttendanceDB.getVehicles();
        const users = window.AttendanceDB.getUsers().filter(u => u.rol === 'usr' || u.rol === 'leader');

        if (!vehicleAssigneesTableBody) return;
        vehicleAssigneesTableBody.innerHTML = '';

        if (vehicles.length === 0) {
            vehicleAssigneesTableBody.innerHTML = `<tr><td colspan="4" class="text-muted" style="text-align:center; padding:15px;">No hay vehículos registrados.</td></tr>`;
            return;
        }

        vehicles.forEach(v => {
            let userOptions = '<option value="">-- Disponible --</option>';
            users.forEach(u => {
                userOptions += `<option value="${u.id}" ${v.empleadoAsignadoId === u.id ? 'selected' : ''}>${u.nombre} (@${u.username})</option>`;
            });

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${v.marca} ${v.modelo}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${v.placa}</span></td>
                <td>
                    <select class="form-control assignee-driver-select" data-id="${v.id}" style="font-size:0.8rem; padding: 4px 8px; height:auto;">
                        ${userOptions}
                    </select>
                </td>
                <td>
                    <input type="text" class="form-control assignee-reason-input" data-id="${v.id}" value="${v.motivoUso || ''}" placeholder="Motivo de uso" style="font-size:0.8rem; padding: 4px 8px; height:auto;">
                </td>
                <td>
                    <button class="btn-table-action approve save-assignee-btn" data-id="${v.id}" style="padding: 4px 8px; font-size: 0.75rem; width: auto;">Guardar</button>
                </td>
            `;
            vehicleAssigneesTableBody.appendChild(tr);
        });

        vehicleAssigneesTableBody.querySelectorAll('.save-assignee-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const vid = parseInt(e.target.getAttribute('data-id'));
                const tr = e.target.closest('tr');
                const driverSelect = tr.querySelector('.assignee-driver-select');
                const reasonInput = tr.querySelector('.assignee-reason-input');

                const driverId = driverSelect.value ? parseInt(driverSelect.value) : null;
                const reason = reasonInput.value.trim();

                const vehicleObj = vehicles.find(item => item.id === vid);
                if (!vehicleObj) return;

                const newEstado = driverId ? 'En Uso' : 'Disponible';
                const newFecha = driverId ? new Date().toISOString() : null;

                const result = await window.AttendanceDB.updateVehicle(
                    vehicleObj.id,
                    vehicleObj.placa,
                    vehicleObj.marca,
                    vehicleObj.modelo,
                    driverId,
                    newEstado,
                    driverId ? reason : null,
                    newFecha,
                    currentUser.id
                );

                if (result.success) {
                    showToast('Asignación Actualizada', `Vehículo ${vehicleObj.placa} guardado correctamente.`, 'success');
                    openVehicleAssigneesModal();
                    renderAdminVehiclesTable();
                } else {
                    showToast('Error', result.message, 'danger');
                }
            });
        });
    }

    function openVehicleModal(vehicleId = null) {
        populateDriversSelect();
        if (vehicleModal) vehicleModal.classList.remove('hidden');
        if (vehicleForm) vehicleForm.reset();

        const modalTitle = document.getElementById('vehicle-modal-title');

        if (vehicleId) {
            const vehicles = window.AttendanceDB.getVehicles();
            const v = vehicles.find(item => item.id === vehicleId);
            if (v) {
                editVehicleId.value = v.id;
                vehiclePlaca.value = v.placa;
                vehicleMarca.value = v.marca;
                vehicleModelo.value = v.modelo;
                vehicleDriverSelect.value = v.empleadoAsignadoId || '';
                vehicleStatusSelect.value = v.estado;
                if (modalTitle) modalTitle.textContent = 'Editar Vehículo';
            }
        } else {
            editVehicleId.value = '';
            vehicleStatusSelect.value = 'Disponible';
            if (modalTitle) modalTitle.textContent = 'Registrar Vehículo';
        }
    }

    if (vehicleForm) {
        vehicleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = editVehicleId.value;
            const placa = vehiclePlaca.value.trim();
            const marca = vehicleMarca.value.trim();
            const modelo = vehicleModelo.value.trim();
            const driverId = vehicleDriverSelect.value ? parseInt(vehicleDriverSelect.value) : null;
            const estado = vehicleStatusSelect.value;

            let result;
            if (id) {
                const existingVehicles = window.AttendanceDB.getVehicles();
                const existing = existingVehicles.find(item => item.id === parseInt(id));
                const existingMotivo = existing ? existing.motivoUso : null;
                const existingFecha = existing ? existing.fechaAsignación : null;
                result = await window.AttendanceDB.updateVehicle(id, placa, marca, modelo, driverId, estado, existingMotivo, existingFecha, currentUser.id);
            } else {
                result = await window.AttendanceDB.createVehicle(placa, marca, modelo, driverId, estado, currentUser.id);
            }

            if (result.success) {
                showToast('Vehículo Guardado', `El vehículo Placa ${placa} ha sido registrado/guardado.`, 'success');
                closeVehicleModal();
                renderAdminVehiclesTable();
            } else {
                showToast('Error', result.message, 'danger');
            }
        });
    }
