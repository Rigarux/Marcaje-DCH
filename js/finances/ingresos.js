    // --- LÓGICA DE INGRESOS GLOBALES ---
    async function setupGlobalIncomesView() {
        const form = document.getElementById('global-income-form');
        const fileInput = document.getElementById('global-income-foto');
        const photoPreview = document.getElementById('global-income-photo-preview');
        const photoPreviewContainer = document.getElementById('global-income-photo-preview-container');
        const projectsGroup = document.getElementById('global-income-projects-group');
        const projectSelect = document.getElementById('global-income-project-select');

        // Fetch projects to populate the list
        const currentComp = window.AttendanceDB?.currentCompany || 'Todas';
        fetch(`/api/projects?empresa=${encodeURIComponent(currentComp)}`).then(r => r.json()).then(data => {
            let projects = [];
            if (Array.isArray(data)) projects = data;
            else if (data && data.success && Array.isArray(data.data)) projects = data.data;

            if (projectSelect) {
                projectSelect.innerHTML = '<option value="">-- Ninguno --</option>';
                if (projects.length === 0) {
                    projectSelect.innerHTML = '<option value="">No hay proyectos disponibles</option>';
                } else {
                    projects.forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p.id;
                        opt.textContent = p.nombre;
                        projectSelect.appendChild(opt);
                    });
                }
            }
        }).catch(err => {
            if(projectSelect) projectSelect.innerHTML = '<option value="">Error al cargar proyectos</option>';
        });
        
        // Tab buttons
        const btnTabIngreso = document.getElementById('btn-tab-ingreso');
        const btnTabGasto = document.getElementById('btn-tab-gasto');
        
        // Labels to change dynamically
        const labelMotivo = document.getElementById('label-motivo');
        const labelMonto = document.getElementById('label-monto');
        const labelFoto = document.getElementById('label-foto');
        const btnSubmitGlobal = document.getElementById('btn-submit-global-income');

        if (btnTabIngreso && !btnTabIngreso.dataset.bound) {
            btnTabIngreso.dataset.bound = "true";
            btnTabIngreso.addEventListener('click', () => {
                form.dataset.mode = 'Ingreso';
                btnTabIngreso.className = 'btn-primary';
                btnTabGasto.className = 'btn-secondary';
                btnTabGasto.style.background = 'var(--surface)';
                btnTabGasto.style.color = 'var(--text)';
                
                labelMotivo.textContent = 'Motivo del Ingreso *';
                labelMonto.textContent = 'Monto del Ingreso (Q) *';
                labelFoto.textContent = 'Fotografía (Cheque o Efectivo) - Opcional';
                fileInput.required = false;
                btnSubmitGlobal.textContent = 'ENVIAR INGRESO';
                if (projectsGroup) projectsGroup.classList.add('hidden');
            });
            
            btnTabGasto.dataset.bound = "true";
            btnTabGasto.addEventListener('click', () => {
                form.dataset.mode = 'Gasto';
                btnTabGasto.className = 'btn-primary';
                btnTabGasto.style.background = '';
                btnTabGasto.style.color = '';
                btnTabIngreso.className = 'btn-secondary';
                btnTabIngreso.style.background = 'var(--surface)';
                btnTabIngreso.style.color = 'var(--text)';
                
                labelMotivo.textContent = 'Motivo del Gasto *';
                labelMonto.textContent = 'Monto del Gasto (Q) *';
                labelFoto.textContent = 'Factura (Obligatorio) *';
                fileInput.required = true;
                btnSubmitGlobal.textContent = 'ENVIAR GASTO';
                if (projectsGroup) projectsGroup.classList.remove('hidden');
            });
        }

        // Handle image preview
        if (fileInput && !fileInput.dataset.previewBound) {
            fileInput.dataset.previewBound = "true";
            fileInput.addEventListener('change', () => {
                const file = fileInput.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        photoPreview.src = e.target.result;
                        photoPreviewContainer.classList.remove('hidden');
                    }
                    reader.readAsDataURL(file);
                } else {
                    photoPreviewContainer.classList.add('hidden');
                    photoPreview.src = '';
                }
            });
        }

        // Handle form submit
        if (form && !form.dataset.submitBound) {
            form.dataset.submitBound = "true";
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const motivo = document.getElementById('global-income-motivo').value.trim();
                const monto = parseFloat(document.getElementById('global-income-monto').value);
                const btnSubmit = document.getElementById('btn-submit-global-income');
                const tipo = form.dataset.mode || 'Ingreso';

                let fotoBase64 = null;
                if (photoPreview.src && photoPreview.src.startsWith('data:image')) {
                    fotoBase64 = photoPreview.src;
                }

                if (tipo === 'Gasto' && !fotoBase64) {
                    showToast('Error', 'La factura es obligatoria para registrar un gasto.', 'warning');
                    return;
                }

                btnSubmit.disabled = true;
                btnSubmit.textContent = 'Enviando...';

                try {
                    const res = await fetch('/api/global-incomes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            usuarioId: currentUser.id,
                            motivo,
                            monto,
                            fotoBase64,
                            tipo,
                            projectIds: document.getElementById('global-income-project-select') && document.getElementById('global-income-project-select').value ? [parseInt(document.getElementById('global-income-project-select').value)] : []
                        })
                    });

                    if (res.ok) {
                        showToast('Éxito', `${tipo} reportado correctamente.`, 'success');
                        form.reset();
                        photoPreviewContainer.classList.add('hidden');
                        photoPreview.src = '';
                        loadGlobalIncomesTable();
                    } else {
                        throw new Error('Error al enviar.');
                    }
                } catch (error) {
                    console.error(error); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
                    showToast('Error', `No se pudo reportar el ${tipo.toLowerCase()}.`, 'danger');
                } finally {
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = `ENVIAR ${tipo.toUpperCase()}`;
                }
            });
        }

        loadGlobalIncomesTable();
    }

    async function loadGlobalIncomesTable() {
        const tbody = document.getElementById('global-incomes-table-body');
        const userCol = document.querySelector('.global-income-user-col');
        const titleEl = document.getElementById('global-incomes-table-title');
        if (!tbody) return;

        const isAdmin = (currentUser.rol === 'admin' || currentUser.rol === 'superadmin');
        if (titleEl) {
            titleEl.textContent = isAdmin ? 'Historial de Ingresos y Gastos' : 'Mis Ingresos y Gastos Recientes (Últimas 24h)';
        }

        tbody.innerHTML = `<tr><td colspan="${isAdmin ? 6 : 5}" class="text-center text-muted">Cargando ingresos...</td></tr>`;

        try {
            const res = await fetch('/api/global-incomes');
            let data = await res.json();

            if (data.success) {
                let incomes = data.data;

                if (isAdmin) {
                    userCol.classList.remove('hidden');
                    const currentComp = window.AttendanceDB?.currentCompany;
                    if (currentComp && currentComp !== 'Todas') {
                        const allUsers = window.AttendanceDB.getUsers();
                        const allowedUserIds = allUsers.filter(u => u.empresa === currentComp || u.empresas_asignadas?.includes(currentComp)).map(u => u.id);
                        incomes = incomes.filter(i => allowedUserIds.includes(i.usuarioId));
                    }
                } else {
                    userCol.classList.add('hidden');
                    // Filter to only user's incomes from the last 24 hours
                    const now = new Date();
                    incomes = incomes.filter(i => {
                        if (i.usuarioId !== currentUser.id) return false;
                        const incomeDate = new Date(i.fecha.replace(' ', 'T')); // Handle YYYY-MM-DD HH:MM:SS
                        const diffHours = (now - incomeDate) / (1000 * 60 * 60);
                        return diffHours <= 24;
                    });
                }

                if (incomes.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="${isAdmin ? 6 : 5}" class="text-center text-muted">No se encontraron registros de ingresos.</td></tr>`;
                    return;
                }

                tbody.innerHTML = '';
                incomes.forEach(inc => {
                    const tr = document.createElement('tr');

                    let userTd = '';
                    if (isAdmin) {
                        userTd = `<td><strong>${inc.nombreUsuario || 'Usuario Desconocido'}</strong></td>`;
                    }

                    let fotoHtml = '-';
                    if (inc.fotoUrl) {
                        fotoHtml = `<a href="${inc.fotoUrl}" target="_blank" class="btn-icon" title="Ver Fotografía" style="background-color: var(--primary); padding: 5px; border-radius: 4px; color: white; display: inline-block;"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></a>`;
                    }

                    let estadoHtml = inc.estado || 'Pendiente';
                    if (isAdmin && estadoHtml !== 'Pagado') {
                        estadoHtml = `<button class="btn-primary btn-sm btn-mark-paid" data-id="${inc.id}" style="padding: 4px 8px; font-size: 0.8rem; background-color: var(--success); border-color: var(--success);">PAGADO</button>`;
                    } else if (estadoHtml === 'Pagado') {
                        estadoHtml = `<span class="badge bg-success" style="background-color: var(--success); color: white; padding: 4px 8px; border-radius: 4px;">Pagado</span>`;
                    } else {
                        estadoHtml = `<span class="badge bg-warning" style="background-color: var(--warning); color: black; padding: 4px 8px; border-radius: 4px;">Pendiente</span>`;
                    }

                    const tipoText = inc.tipo || 'Ingreso';
                    const tipoBadge = tipoText === 'Gasto' 
                        ? `<span class="badge bg-danger" style="background-color: var(--danger, #dc3545); color: white; padding: 4px 8px; border-radius: 4px;">Gasto</span>`
                        : `<span class="badge bg-success" style="background-color: var(--success, #28a745); color: white; padding: 4px 8px; border-radius: 4px;">Ingreso</span>`;
                    
                    const amountColor = tipoText === 'Gasto' ? 'text-danger' : 'text-success';
                    const amountPrefix = tipoText === 'Gasto' ? '-' : '+';

                    tr.innerHTML = `
                        ${userTd}
                        <td>${typeof formatDateDDMMYYYY === 'function' ? formatDateDDMMYYYY(inc.fecha) : inc.fecha}</td>
                        <td>${inc.motivo}</td>
                        <td style="text-align: center;">${tipoBadge}</td>
                        <td class="${amountColor}"><strong>${amountPrefix} Q${Number(inc.monto).toFixed(2)}</strong></td>
                        <td style="text-align: center;">${fotoHtml}</td>
                        <td style="text-align: center;">${estadoHtml}</td>
                    `;
                    tbody.appendChild(tr);
                });

                // Asignar eventos a los botones PAGADO
                document.querySelectorAll('.btn-mark-paid').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.currentTarget.dataset.id;
                        if (await appConfirm('Confirmación', '¿Confirmas que este ingreso ha sido recibido / pagado?')) {
                            try {
                                const response = await fetch(`/api/global-incomes/${id}/pay`, { method: 'PUT' });
                                if (response.ok) {
                                    showToast('Éxito', 'El ingreso ha sido marcado como pagado.', 'success');
                                    loadGlobalIncomesTable();
                                } else {
                                    showToast('Error', 'No se pudo actualizar el estado.', 'danger');
                                }
                            } catch (err) {
                                console.error(err); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
                                showToast('Error', 'No se pudo comunicar con el servidor.', 'danger');
                            }
                        }
                    });
                });
            }
        } catch (error) {
            console.error(error); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar ingresos</td></tr>';
        }
    }


