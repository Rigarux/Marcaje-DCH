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

        // Filter listener
        const filterSelect = document.getElementById('filter-incomes-period');
        const filterCustomDay = document.getElementById('filter-custom-day');
        const filterCustomMonth = document.getElementById('filter-custom-month');
        const filterCustomYear = document.getElementById('filter-custom-year');

        if (filterSelect && !filterSelect.dataset.bound) {
            filterSelect.dataset.bound = "true";
            
            const updateVisibility = () => {
                if (filterCustomDay) filterCustomDay.classList.toggle('hidden', filterSelect.value !== 'day');
                if (filterCustomMonth) filterCustomMonth.classList.toggle('hidden', filterSelect.value !== 'month');
                if (filterCustomYear) filterCustomYear.classList.toggle('hidden', filterSelect.value !== 'year');
            };

            filterSelect.addEventListener('change', () => {
                updateVisibility();
                loadGlobalIncomesTable();
            });
            
            const now = new Date();
            if (filterCustomDay) {
                filterCustomDay.addEventListener('change', loadGlobalIncomesTable);
                const dd = String(now.getDate()).padStart(2, '0');
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                filterCustomDay.value = `${now.getFullYear()}-${mm}-${dd}`;
            }
            if (filterCustomMonth) {
                filterCustomMonth.addEventListener('change', loadGlobalIncomesTable);
            }
            if (filterCustomYear) {
                filterCustomYear.addEventListener('change', loadGlobalIncomesTable);
                filterCustomYear.value = now.getFullYear();
            }
            
            updateVisibility();
        }

        loadGlobalIncomesTable();
    }

    async function loadGlobalIncomesTable() {
        const isAdmin = currentUser && ['admin', 'superadmin', 'leader'].includes(currentUser.rol);
        const tbody = document.getElementById('global-incomes-table-body');
        const userCol = document.querySelector('.global-income-user-col');
        const titleEl = document.getElementById('global-incomes-table-title');
        if (!tbody) return;

        if (titleEl) {
            titleEl.textContent = isAdmin ? 'Historial de Ingresos y Gastos' : 'Mis Movimientos';
        }

        tbody.innerHTML = `<tr><td colspan="${isAdmin ? 7 : 6}" class="text-center text-muted">Cargando ingresos...</td></tr>`;

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
                    
                    // A los demás no se guarda permanentemente, se borra luego de 24 horas (desde su vista)
                    const limitTime = new Date();
                    limitTime.setHours(limitTime.getHours() - 24);
                    
                    incomes = incomes.filter(i => {
                        // Tratar de usar createdAt si existe, sino fecha
                        let dateStr = i.createdAt || i.fecha;
                        if (!dateStr) return true;
                        
                        // Parsear la fecha teniendo cuidado con el formato (YYYY-MM-DD o ISO)
                        const created = new Date(dateStr);
                        return created >= limitTime;
                    });
                }

                // Populate month filter based on existing records
                const filterCustomMonth = document.getElementById('filter-custom-month');
                if (filterCustomMonth && filterCustomMonth.tagName.toLowerCase() === 'select') {
                    const uniqueMonths = new Set();
                    
                    // Always ensure current month is in there, so they can add to it
                    const now = new Date();
                    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    uniqueMonths.add(currentMonthStr);
                    
                    incomes.forEach(i => {
                        if (!isAdmin && i.usuarioId !== currentUser.id) return;
                        let incDateStr = i.fecha;
                        if (incDateStr.includes(' ')) {
                            incDateStr = incDateStr.split(' ')[0];
                        }
                        const parts = incDateStr.split('-');
                        if (parts.length >= 2) {
                            uniqueMonths.add(`${parts[0]}-${parts[1]}`);
                        }
                    });
                    
                    const currentVal = filterCustomMonth.value;
                    filterCustomMonth.innerHTML = '';
                    const sortedMonths = Array.from(uniqueMonths).sort((a, b) => b.localeCompare(a));
                    
                    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                    
                    sortedMonths.forEach(ym => {
                        const [y, m] = ym.split('-');
                        const monthIndex = parseInt(m) - 1;
                        if (monthIndex >= 0 && monthIndex < 12) {
                            const label = `${monthNames[monthIndex]} ${y}`;
                            const opt = document.createElement('option');
                            opt.value = ym;
                            opt.textContent = label;
                            filterCustomMonth.appendChild(opt);
                        }
                    });
                    
                    if (currentVal && sortedMonths.includes(currentVal)) {
                        filterCustomMonth.value = currentVal;
                    } else if (sortedMonths.length > 0) {
                        filterCustomMonth.value = currentMonthStr;
                    }
                }

                // Filter by date range
                const filterVal = document.getElementById('filter-incomes-period') ? document.getElementById('filter-incomes-period').value : 'month';
                const now = new Date();
                let startDate, endDate;

                if (filterVal === 'day') {
                    const customDayInput = document.getElementById('filter-custom-day');
                    if (customDayInput && customDayInput.value) {
                        const [yy, mm, dd] = customDayInput.value.split('-');
                        startDate = new Date(yy, parseInt(mm) - 1, parseInt(dd));
                        endDate = new Date(yy, parseInt(mm) - 1, parseInt(dd), 23, 59, 59);
                    } else {
                        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                    }
                } else if (filterVal === 'month') {
                    const customMonthInput = document.getElementById('filter-custom-month');
                    if (customMonthInput && customMonthInput.value) {
                        const [yy, mm] = customMonthInput.value.split('-');
                        startDate = new Date(yy, parseInt(mm) - 1, 1);
                        endDate = new Date(yy, parseInt(mm), 0, 23, 59, 59);
                    } else {
                        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                    }
                } else if (filterVal === 'year') {
                    const customYearInput = document.getElementById('filter-custom-year');
                    if (customYearInput && customYearInput.value) {
                        const yy = parseInt(customYearInput.value);
                        startDate = new Date(yy, 0, 1);
                        endDate = new Date(yy, 11, 31, 23, 59, 59);
                    } else {
                        startDate = new Date(now.getFullYear(), 0, 1);
                        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
                    }
                }

                incomes = incomes.filter(i => {
                    if (!isAdmin && i.usuarioId !== currentUser.id) return false;
                    
                    if (filterVal === 'all') return true;
                    
                    let incDateStr = i.fecha;
                    if (incDateStr.includes(' ')) {
                        incDateStr = incDateStr.replace(' ', 'T');
                    }
                    let incDate = new Date(incDateStr);
                    if (isNaN(incDate.getTime())) return true;
                    
                    return incDate >= startDate && incDate <= endDate;
                });

                if (incomes.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="${isAdmin ? 7 : 6}" class="text-center text-muted">No se encontraron registros de ingresos/gastos en este periodo.</td></tr>`;
                    
                    if (document.getElementById('summary-ingresos')) document.getElementById('summary-ingresos').textContent = 'Q0.00';
                    if (document.getElementById('summary-gastos')) document.getElementById('summary-gastos').textContent = 'Q0.00';
                    if (document.getElementById('summary-balance')) {
                        document.getElementById('summary-balance').textContent = 'Q0.00';
                        document.getElementById('summary-balance').style.color = 'white';
                    }
                    return;
                }

                let totalIngresos = 0;
                let totalGastos = 0;

                tbody.innerHTML = '';
                
                // Sort by date descending
                incomes.sort((a, b) => new Date(b.fecha.replace(' ', 'T')) - new Date(a.fecha.replace(' ', 'T')));
                
                // Group by date
                const groupedIncomes = {};
                incomes.forEach(inc => {
                    let dateStr = inc.fecha;
                    if (dateStr.includes(' ')) {
                        dateStr = dateStr.split(' ')[0];
                    }
                    if (!groupedIncomes[dateStr]) groupedIncomes[dateStr] = [];
                    groupedIncomes[dateStr].push(inc);
                    
                    const tipoText = inc.tipo || 'Ingreso';
                    const amount = Number(inc.monto) || 0;
                    if (inc.estado !== 'Rechazado') {
                        if (tipoText === 'Gasto' || tipoText === 'Egreso') {
                            totalGastos += amount;
                        } else {
                            totalIngresos += amount;
                        }
                    }
                });

                Object.keys(groupedIncomes).forEach(dateStr => {
                    const group = groupedIncomes[dateStr];
                    
                    let formattedDate = dateStr;
                    if (typeof formatDateDDMMYYYY === 'function') {
                        formattedDate = formatDateDDMMYYYY(dateStr);
                    }
                    
                    let dailyIngresos = 0;
                    let dailyGastos = 0;
                    group.forEach(inc => {
                        if (inc.estado !== 'Rechazado') {
                             const tipo = inc.tipo || 'Ingreso';
                             const amount = Number(inc.monto) || 0;
                             if (tipo === 'Gasto' || tipo === 'Egreso') dailyGastos += amount;
                             else dailyIngresos += amount;
                        }
                    });
                    
                    const dailyBalance = dailyIngresos - dailyGastos;
                    const balanceColor = dailyBalance >= 0 ? 'var(--success, #28a745)' : 'var(--danger, #dc3545)';
                    const balancePrefix = dailyBalance >= 0 ? '' : '-';
                    
                    const headerTr = document.createElement('tr');
                    headerTr.style.backgroundColor = 'rgba(0,0,0,0.2)';
                    headerTr.innerHTML = `<td colspan="${isAdmin ? 7 : 6}" style="text-align: left; padding: 12px; border-bottom: 2px solid var(--border-color);">
                        <strong style="font-size: 1.1rem; color: var(--primary);">Día - ${formattedDate}</strong>
                    </td>`;
                    tbody.appendChild(headerTr);

                    group.forEach(inc => {
                        const tr = document.createElement('tr');

                        let userTd = '';
                        if (isAdmin) {
                            userTd = `<td data-label="Colaborador"><strong>${inc.nombreUsuario || 'Usuario Desconocido'}</strong></td>`;
                        }

                        let fotoHtml = '-';
                        if (inc.fotoUrl) {
                            fotoHtml = `<a href="${inc.fotoUrl}" target="_blank" class="btn-icon" title="Ver Fotografía" style="background-color: var(--primary); padding: 5px; border-radius: 4px; color: white; display: inline-block;"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></a>`;
                        }

                        let estadoHtml = inc.estado || 'Pendiente';
                        if (isAdmin && estadoHtml !== 'Pagado' && estadoHtml !== 'Confirmado' && estadoHtml !== 'Rechazado') {
                            estadoHtml = `<button class="btn-primary btn-sm btn-mark-paid" data-id="${inc.id}" style="padding: 6px 12px; font-size: 0.85rem; background-color: var(--success); border-color: var(--success);">Confirmar</button>`;
                        } else if (estadoHtml === 'Pagado' || estadoHtml === 'Confirmado') {
                            estadoHtml = `<span class="badge bg-success" style="background-color: var(--success); color: white; padding: 4px 8px; border-radius: 4px;">Confirmado</span>`;
                        } else if (estadoHtml === 'Rechazado') {
                            estadoHtml = `<span class="badge bg-danger" style="background-color: var(--danger); color: white; padding: 4px 8px; border-radius: 4px;">Rechazado</span>`;
                        } else {
                            estadoHtml = `<span class="badge bg-warning" style="background-color: var(--warning); color: black; padding: 4px 8px; border-radius: 4px;">Pendiente</span>`;
                        }

                        const tipoText = inc.tipo || 'Ingreso';
                        const tipoBadge = tipoText === 'Gasto' 
                            ? `<span class="badge bg-danger" style="background-color: var(--danger, #dc3545); color: white; padding: 4px 8px; border-radius: 4px;">Gasto</span>`
                            : `<span class="badge bg-success" style="background-color: var(--success, #28a745); color: white; padding: 4px 8px; border-radius: 4px;">Ingreso</span>`;
                        
                        const amountColor = tipoText === 'Gasto' ? 'text-danger' : 'text-success';
                        const amountPrefixAmount = tipoText === 'Gasto' ? '-' : '+';

                        tr.innerHTML = `
                            ${userTd}
                            <td data-label="Fecha">${typeof formatDateDDMMYYYY === 'function' ? formatDateDDMMYYYY(inc.fecha) : inc.fecha}</td>
                            <td data-label="Motivo">${inc.motivo}</td>
                            <td data-label="Tipo" style="text-align: center;">${tipoBadge}</td>
                            <td data-label="Monto" class="${amountColor}"><strong>${amountPrefixAmount} Q${Number(inc.monto).toFixed(2)}</strong></td>
                            <td data-label="Foto / Factura" style="text-align: center;">${fotoHtml}</td>
                            <td data-label="Estado" style="text-align: center;">${estadoHtml}</td>
                        `;
                        tbody.appendChild(tr);
                    });

                    const footerTr = document.createElement('tr');
                    footerTr.style.backgroundColor = 'rgba(0,0,0,0.1)';
                    footerTr.innerHTML = `<td colspan="${isAdmin ? 7 : 6}" style="text-align: right; padding: 15px; border-top: 1px solid rgba(255,255,255,0.05);">
                        <div style="display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 15px; font-size: 0.95rem;">
                            <span style="color: var(--success, #28a745); font-weight: bold;">Total ingresos: Q${dailyIngresos.toLocaleString('es-GT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            <span style="color: var(--danger, #dc3545); font-weight: bold;">Total gastos: Q${dailyGastos.toLocaleString('es-GT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            <span style="font-weight: bold; color: ${balanceColor}; border-left: 1px solid rgba(255,255,255,0.2); padding-left: 15px; font-size: 1.05rem;">Ganancia final: ${balancePrefix}Q${Math.abs(dailyBalance).toLocaleString('es-GT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                    </td>`;
                    tbody.appendChild(footerTr);
                });

                const summaryIngresos = document.getElementById('summary-ingresos');
                const summaryGastos = document.getElementById('summary-gastos');
                const summaryBalance = document.getElementById('summary-balance');
                
                if (summaryIngresos) summaryIngresos.textContent = `Q${totalIngresos.toLocaleString('es-GT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                if (summaryGastos) summaryGastos.textContent = `Q${totalGastos.toLocaleString('es-GT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                
                const balance = totalIngresos - totalGastos;
                if (summaryBalance) {
                    summaryBalance.textContent = `Q${balance.toLocaleString('es-GT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                    if (balance > 0) {
                        summaryBalance.style.color = 'var(--success, #28a745)';
                    } else if (balance < 0) {
                        summaryBalance.style.color = 'var(--danger, #dc3545)';
                    } else {
                        summaryBalance.style.color = 'white';
                    }
                }

                // Asignar eventos a los botones PAGADO
                document.querySelectorAll('.btn-mark-paid').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.currentTarget.dataset.id;
                        if (await appConfirm('Confirmación', '¿Confirmas que este movimiento ha sido verificado?')) {
                            try {
                                const response = await fetch(`/api/global-incomes/${id}/pay`, { method: 'PUT' });
                                if (response.ok) {
                                    showToast('Éxito', 'El movimiento ha sido marcado como confirmado.', 'success');
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


