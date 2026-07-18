    // --- LÓGICA DE PROYECTOS Y GASTOS (Supervisor) ---
    let currentDetailedProjectId = null;
    window.projectsList = [];

    async function renderProjectsView() {
        // Asegurarse de que esté en vista de listado
        document.getElementById('project-list-view').classList.remove('hidden');
        document.getElementById('project-detail-view').classList.add('hidden');

        const container = document.getElementById('projects-cards-container');
        if (!container) return;
        container.innerHTML = '<p class="text-muted">Cargando proyectos...</p>';

        try {
            const currentComp = window.AttendanceDB?.currentCompany;
            if (currentUser.rol !== 'superadmin' && (!currentComp || currentComp === 'Todas')) {
                container.innerHTML = '<p class="text-muted" style="grid-column: 1/-1;">Debes seleccionar una empresa para ver sus proyectos.</p>';
                window.projectsList = [];
                return;
            }

            const compToFetch = currentComp || 'Todas';
            const res = await fetch(`/api/projects?empresa=${encodeURIComponent(compToFetch)}`);
            const projects = await res.json();
            window.projectsList = projects; // Guardar en lista global

            container.innerHTML = '';
            if (projects.length === 0) {
                container.innerHTML = '<p class="text-muted" style="grid-column: 1/-1;">No hay proyectos registrados.</p>';
            }

            projects.forEach(p => {
                const percent = p.presupuesto > 0 ? (p.totalGastos / p.presupuesto) * 100 : 0;
                const isOverBudget = p.totalGastos > p.presupuesto;
                const barWidth = Math.min(percent, 100);
                
                const statusBadge = p.estado === 'Cerrado' ? `<span class="badge bg-danger" style="font-size: 0.7rem; margin-left: 8px;">Cerrado</span>` : `<span class="badge bg-success" style="font-size: 0.7rem; margin-left: 8px;">Activo</span>`;
                const closeBtnHtml = p.estado === 'Cerrado' ? '' : `
                            <button type="button" class="btn-close-project" data-id="${p.id}" title="Cerrar Proyecto" style="background:none; border:none; color:var(--text-muted); cursor:pointer; padding:4px;">
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            </button>`;

                const card = document.createElement('div');
                card.className = 'project-card';
                card.innerHTML = `
                    <div class="project-card-header">
                        <span class="project-card-title">${p.nombre} ${statusBadge}</span>
                        <div style="display: flex; gap: 8px;">
                            ${closeBtnHtml}
                            <button type="button" class="btn-edit-project" data-id="${p.id}" title="Editar Proyecto" style="background:none; border:none; color:var(--text-muted); cursor:pointer; padding:4px;">
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button type="button" class="btn-delete-project" data-id="${p.id}" title="Eliminar Proyecto">
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                        </div>
                    </div>
                    <div class="project-card-dates">
                        Inicio: ${p.fechaInicio} | Fin: ${p.fechaFin}
                    </div>
                    <div class="project-card-budget-row">
                        <span>Presupuesto:</span>
                        <span class="project-card-budget-val">Q${p.presupuesto.toFixed(2)}</span>
                    </div>
                    <div class="project-card-budget-row">
                        <span>Gastado:</span>
                        <span class="project-card-expenses-val">Q${p.totalGastos.toFixed(2)}</span>
                    </div>
                    <div class="project-card-progress-bar">
                        <div class="project-card-progress-fill ${isOverBudget ? 'over-budget' : ''}" style="width: ${barWidth}%"></div>
                    </div>
                `;

                // Clic en la tarjeta para ver detalles
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.btn-delete-project') || e.target.closest('.btn-edit-project') || e.target.closest('.btn-close-project')) return;
                    currentDetailedProjectId = p.id;
                    renderProjectDetails(p.id);
                });

                container.appendChild(card);
            });

            // Enlazar botón de edición (seguro usando la lista global)
            container.querySelectorAll('.btn-edit-project').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    const p = window.projectsList.find(proj => proj.id == id);
                    if (!p) return;

                    document.getElementById('edit-project-id').value = p.id;
                    document.getElementById('project-name').value = p.nombre;
                    document.getElementById('project-description').value = p.descripcion || "";
                    document.getElementById('project-start-date').value = p.fechaInicio;
                    document.getElementById('project-end-date').value = p.fechaFin;
                    document.getElementById('project-budget').value = p.presupuesto;

                    document.getElementById('project-form-title').textContent = "Editar Proyecto";
                    document.getElementById('btn-save-project').textContent = "Actualizar Proyecto";
                    document.getElementById('btn-cancel-project-edit').classList.remove('hidden');
                });
            });

            // Enlazar botón de eliminación
            container.querySelectorAll('.btn-delete-project').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    if (await appConfirm('Confirmación', '¿Estás seguro de eliminar este proyecto y todos sus gastos asociados?')) {
                        const delRes = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
                        const delData = await delRes.json();
                        if (delData.success) {
                            showToast('Proyecto Eliminado', 'El proyecto se eliminó correctamente.', 'success');
                            renderProjectsView();
                        } else {
                            showToast('Error', delData.message || 'Error al eliminar.', 'error');
                        }
                    }
                });
            });

            // Enlazar botón de cerrar proyecto
            container.querySelectorAll('.btn-close-project').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    if (await appConfirm('Confirmación', '¿Estás seguro de CERRAR este proyecto? Ya no se podrán agregar más gastos.')) {
                        const closeRes = await fetch(`/api/projects/${id}/close`, { method: 'PUT' });
                        const closeData = await closeRes.json();
                        if (closeData.success) {
                            showToast('Proyecto Cerrado', 'El proyecto ha sido cerrado exitosamente.', 'success');
                            renderProjectsView();
                        } else {
                            showToast('Error', closeData.message || 'Error al cerrar.', 'error');
                        }
                    }
                });
            });
        } catch (err) {
            console.error(err); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
            container.innerHTML = '<p class="text-danger">Error al cargar proyectos.</p>';
        }
    }

    async function renderProjectDetails(projectId) {
        document.getElementById('project-list-view').classList.add('hidden');
        document.getElementById('project-detail-view').classList.remove('hidden');

        try {
            const res = await fetch(`/api/projects/${projectId}`);
            const data = await res.json();
            if (!data.success) {
                showToast('Error', 'No se pudo cargar el proyecto.', 'danger');
                return;
            }

            const project = data.project;
            const expenses = data.expenses;
            const attendances = data.attendances || [];

            // Actualizar vista título dinámico para simular redirección
            const viewTitle = document.getElementById('view-title');
            viewTitle.textContent = 'Detalles del Proyecto: ' + project.nombre;

            const incomes = data.incomes || [];
            const totalIngresos = incomes.reduce((sum, i) => sum + Number(i.monto), 0);
            const totalGastosMateriales = expenses.reduce((sum, e) => sum + (Number(e.monto) * (Number(e.cantidad) || 1)), 0);
            const totalPlanilla = attendances.reduce((sum, a) => sum + Number(a.pago), 0);
            const totalGastos = totalGastosMateriales + totalPlanilla;
            const balancePresupuesto = project.presupuesto - totalGastos;
            const gananciaReal = totalIngresos - totalGastos;

            document.getElementById('detail-project-budget').textContent = 'Q' + project.presupuesto.toFixed(2);
            document.getElementById('detail-project-expenses').textContent = 'Q' + totalGastos.toFixed(2);
            document.getElementById('detail-project-incomes').textContent = 'Q' + totalIngresos.toFixed(2);

            const profitEl = document.getElementById('detail-project-real-profit');
            profitEl.textContent = 'Q' + gananciaReal.toFixed(2);
            profitEl.className = gananciaReal < 0 ? 'value text-danger' : 'value text-success';

            const balanceEl = document.getElementById('detail-project-balance');
            balanceEl.textContent = 'Q' + balancePresupuesto.toFixed(2);
            balanceEl.className = balancePresupuesto < 0 ? 'value text-danger' : 'value text-success';

            // Render table
            const tbody = document.getElementById('project-expenses-container') || document.getElementById('project-expenses-table-body');
            tbody.innerHTML = '';
            if (expenses.length === 0) {
                tbody.innerHTML = `
                    <div class="text-muted" style="text-align: center; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                        No hay gastos registrados para este proyecto.
                    </div>
                `;
            } else {
                const fragmentExpenses = document.createDocumentFragment();
                expenses.forEach(e => {
                    const cardDiv = document.createElement('div');
                    cardDiv.className = 'card';
                    cardDiv.style.padding = '0';
                    cardDiv.style.marginBottom = '15px';
                    cardDiv.style.overflow = 'hidden';

                    // Limpieza del prefijo [Motivo] para mostrar en la interfaz
                    let descClean = e.descripcion || '';
                    if (descClean.startsWith('[')) {
                        const closingBracket = descClean.indexOf(']');
                        if (closingBracket !== -1) {
                            descClean = descClean.substring(closingBracket + 1).trim();
                        }
                    }

                    const invoiceHtml = e.fotoFacturaUrl
                        ? `<a href="${e.fotoFacturaUrl}" target="_blank" class="badge badge-success" style="padding: 4px 8px; text-decoration: none; font-size: 0.75rem;">Ver Factura</a>`
                        : '-';
                        
                    const displayDate = typeof formatDateDDMMYYYY === 'function' ? formatDateDDMMYYYY(e.fecha) : e.fecha;

                    cardDiv.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 0.9em;">
                            <span style="color: var(--text-muted); padding-right: 15px;">Fecha</span>
                            <span style="color: var(--text-color); text-align: right;">${displayDate}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 0.9em;">
                            <span style="color: var(--text-muted); padding-right: 15px;">Descripción</span>
                            <span style="color: var(--text-color); text-align: right;">${descClean}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 0.9em;">
                            <span style="color: var(--text-muted); padding-right: 15px;">Cantidad</span>
                            <span style="color: var(--text-color); text-align: right;">${e.cantidad || 1}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 0.9em;">
                            <span style="color: var(--text-muted); padding-right: 15px;">Monto</span>
                            <span style="color: var(--danger); font-weight: 500; text-align: right;">Q${Number(e.monto).toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 0.9em;">
                            <span style="color: var(--text-muted); padding-right: 15px;">Comprobante</span>
                            <span style="text-align: right;">${invoiceHtml}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 15px;">
                            <span style="color: var(--text-muted); padding-right: 15px;">Acciones</span>
                            <span style="text-align: right;">
                                <button type="button" class="btn-table-action delete-expense-btn" data-id="${e.id}" style="padding: 4px 10px; font-size: 0.75rem; width: auto; background-color: var(--danger); border-color: var(--danger);">
                                    Eliminar
                                </button>
                            </span>
                        </div>
                    `;
                    fragmentExpenses.appendChild(cardDiv);
                });
                tbody.appendChild(fragmentExpenses);

                tbody.querySelectorAll('.delete-expense-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = btn.getAttribute('data-id');
                        if (await appConfirm('Confirmación', '¿Estás seguro de eliminar este gasto?')) {
                            const delRes = await fetch(`/api/projects/expenses/${id}`, { method: 'DELETE' });
                            const delData = await delRes.json();
                            if (delData.success) {
                                showToast('Gasto Eliminado', 'El gasto fue de baja correctamente.', 'success');
                                renderProjectDetails(projectId);
                            }
                        }
                    });
                });
            }

            // Render table for Attendances
            const containerAttendances = document.getElementById('project-attendances-container') || document.getElementById('project-attendances-table-body');
            const payrollBadge = document.getElementById('project-total-payroll-badge');
            if (payrollBadge) {
                payrollBadge.textContent = 'Total: Q' + totalPlanilla.toFixed(2);
            }

            if (containerAttendances) {
                containerAttendances.innerHTML = '';
                if (attendances.length === 0) {
                    containerAttendances.innerHTML = `
                        <div class="text-muted" style="text-align: center; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                            No hay empleados registrados en este proyecto.
                        </div>
                    `;
                } else {
                    // Group attendances by date
                    const attByDate = {};
                    attendances.forEach(a => {
                        const date = a.fecha || 'Sin fecha';
                        if (!attByDate[date]) attByDate[date] = { records: [], total: 0 };
                        attByDate[date].records.push(a);
                        attByDate[date].total += Number(a.pago) || 0;
                    });

                    // Sort dates (descending)
                    const sortedDates = Object.keys(attByDate).sort((a,b) => {
                        const parseDate = (dStr) => {
                            if (!dStr) return 0;
                            if (dStr.includes('/')) {
                                const parts = dStr.split('/');
                                return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
                            }
                            return new Date(dStr).getTime();
                        };
                        return parseDate(b) - parseDate(a); // Descending
                    });

                    const fragmentAttendances = document.createDocumentFragment();
                    sortedDates.forEach(date => {
                        // Add daily card
                        const dayCard = document.createElement('div');
                        dayCard.className = 'card';
                        dayCard.style.padding = '0';
                        dayCard.style.marginBottom = '15px';
                        dayCard.style.overflow = 'hidden';

                        // Day Header
                        const dayHeader = document.createElement('div');
                        dayHeader.style.padding = '15px';
                        dayHeader.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
                        dayHeader.style.borderBottom = '2px solid rgba(255,255,255,0.1)';
                        const headerDisplayDate = typeof formatDateDDMMYYYY === 'function' ? formatDateDDMMYYYY(date) : date;
                        dayHeader.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight: 700; color: var(--text-muted); font-size: 0.9em; text-transform: uppercase;">Día / Fecha</span>
                                <span style="font-weight: 700; color: #fff; font-size: 1.1em;">${headerDisplayDate}</span>
                            </div>
                        `;
                        dayCard.appendChild(dayHeader);

                        // Records for the day
                        attByDate[date].records.forEach((a, index) => {
                            const recordDiv = document.createElement('div');
                            
                            recordDiv.innerHTML = `
                                <div style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: center; background-color: rgba(0, 0, 0, 0.2);">
                                    <span style="font-weight: 600; color: var(--text-color);">${a.empleadoNombre}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 0.9em;">
                                    <span style="color: var(--text-muted); padding-right: 15px;">Tiempo</span>
                                    <span style="color: var(--text-color); text-align: right;">${Number(a.horasTrabajadas).toFixed(2)} hrs</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 15px; ${index < attByDate[date].records.length - 1 ? 'border-bottom: 1px solid rgba(255,255,255,0.1);' : ''}">
                                    <span style="color: var(--text-muted); font-size: 0.9em; padding-right: 15px;">Pago</span>
                                    <span style="font-weight: 500; color: var(--danger); text-align: right;">Q${Number(a.pago).toFixed(2)}</span>
                                </div>
                            `;
                            
                            dayCard.appendChild(recordDiv);
                        });

                        // Day Footer
                        const dayFooter = document.createElement('div');
                        dayFooter.style.padding = '15px';
                        dayFooter.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
                        dayFooter.style.borderTop = '2px solid rgba(255,255,255,0.1)';
                        dayFooter.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight: 700; color: var(--text-muted); font-size: 0.9em; text-transform: uppercase;">Total Día</span>
                                <span style="font-weight: 700; color: #fff; font-size: 1.1em;">Q${attByDate[date].total.toFixed(2)}</span>
                            </div>
                        `;
                        dayCard.appendChild(dayFooter);
                        
                        fragmentAttendances.appendChild(dayCard);
                    });
                    containerAttendances.appendChild(fragmentAttendances);
                }
            }

            // Render table for Incomes
            const tbodyIncomes = document.getElementById('project-incomes-table-body');
            if (tbodyIncomes) {
                tbodyIncomes.innerHTML = '';
                if (incomes.length === 0) {
                    tbodyIncomes.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-muted" style="text-align: center; padding: 20px;">
                                No hay pagos de clientes registrados.
                            </td>
                        </tr>
                    `;
                } else {
                    const fragmentIncomes = document.createDocumentFragment();
                    incomes.forEach(inc => {
                        const tr = document.createElement('tr');
                        const invoiceHtml = inc.fotoComprobanteUrl
                            ? `<a href="${inc.fotoComprobanteUrl}" target="_blank" class="badge badge-success" style="padding: 4px 8px; text-decoration: none; font-size: 0.75rem; background-color: var(--success);">Ver Comprobante</a>`
                            : '-';
                        tr.innerHTML = `
                            <td>${typeof formatDateDDMMYYYY === 'function' ? formatDateDDMMYYYY(inc.fecha) : inc.fecha}</td>
                            <td>${inc.descripcion}</td>
                            <td style="text-align: right; font-weight: 500; color: var(--success);">Q${Number(inc.monto).toFixed(2)}</td>
                            <td style="text-align: center;">${invoiceHtml}</td>
                            <td style="text-align: center;">
                                <button type="button" class="btn-table-action delete-income-btn" data-id="${inc.id}" style="padding: 2px 6px; font-size: 0.7rem; width: auto; background-color: var(--danger); border-color: var(--danger);">
                                    Eliminar
                                </button>
                            </td>
                        `;
                        fragmentIncomes.appendChild(tr);
                    });
                    tbodyIncomes.appendChild(fragmentIncomes);

                    tbodyIncomes.querySelectorAll('.delete-income-btn').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            const id = btn.getAttribute('data-id');
                            if (await appConfirm('Confirmación', '¿Estás seguro de eliminar este pago/ingreso?')) {
                                const delRes = await fetch(`/api/projects/incomes/${id}`, { method: 'DELETE' });
                                const delData = await delRes.json();
                                if (delData.success) {
                                    showToast('Pago Eliminado', 'El pago fue eliminado correctamente.', 'success');
                                    renderProjectDetails(projectId);
                                }
                            }
                        });
                    });
                }
            }

            // Agrupamiento por fecha para las exportaciones
            const groups = {};
            expenses.forEach(e => {
                const date = e.fecha || 'Sin fecha';
                if (!groups[date]) groups[date] = [];
                groups[date].push(e);
            });

            // Ordenar las fechas de forma ascendente
            const sortedDates = Object.keys(groups).sort((a, b) => {
                const parseDate = (dStr) => {
                    if (!dStr) return 0;
                    if (dStr.includes('/')) {
                        const parts = dStr.split('/');
                        return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
                    }
                    return new Date(dStr).getTime();
                };
                return parseDate(a) - parseDate(b);
            });

            // Configurar botón exportar Excel (Estilo fusionado similar a cotización)
            document.getElementById('btn-export-project-excel').onclick = () => {
                try {
                    const wsData = [
                        ["DCH MULTISERVICIOS"],
                        ["REPORTE FINANCIERO DE PROYECTO"],
                        [],
                        ["Proyecto:", project.nombre],
                        ["Descripción:", project.descripcion || 'N/A'],
                        ["Presupuesto Aprobado:", 'Q ' + Number(project.presupuesto).toFixed(2)],
                        [],
                        ["FECHA", "MONTO DE GASTO", "RAZÓN / DESCRIPCIÓN", "CANTIDAD"]
                    ];

                    const merges = [
                        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // DCH MULTISERVICIOS
                        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // REPORTE FINANCIERO
                        { s: { r: 3, c: 1 }, e: { r: 3, c: 3 } }, // Nombre de proyecto
                        { s: { r: 4, c: 1 }, e: { r: 4, c: 3 } }  // Descripción
                    ];

                    let currentRowIndex = 8; // La fila 8 es la que sigue después de los encabezados (índice 0)

                    if (expenses.length === 0) {
                        wsData.push(["No hay gastos registrados para este proyecto.", "", "", ""]);
                        merges.push({ s: { r: currentRowIndex, c: 0 }, e: { r: currentRowIndex, c: 3 } });
                        currentRowIndex++;
                    } else {
                        sortedDates.forEach(date => {
                            const items = groups[date];
                            const startRow = currentRowIndex;

                            items.forEach((item, index) => {
                                let descClean = item.descripcion || '';
                                if (descClean.startsWith('[')) {
                                    const closingBracket = descClean.indexOf(']');
                                    if (closingBracket !== -1) {
                                        descClean = descClean.substring(closingBracket + 1).trim();
                                    }
                                }

                                const dateVal = index === 0 ? date : "";
                                wsData.push([
                                    dateVal,
                                    'Q ' + Number(item.monto).toFixed(2),
                                    descClean,
                                    Number(item.cantidad) || 1
                                ]);
                                currentRowIndex++;
                            });

                            const endRow = currentRowIndex - 1;
                            if (endRow > startRow) {
                                // Combinar las celdas de la fecha para que abarque todos los gastos del da
                                merges.push({ s: { r: startRow, c: 0 }, e: { r: endRow, c: 0 } });
                            }
                        });
                    }

                    // Añadir resumen final
                    wsData.push([]);
                    wsData.push(["RESUMEN FINANCIERO", "", "", ""]);
                    wsData.push(["Presupuesto Inicial:", "", "", 'Q ' + Number(project.presupuesto).toFixed(2)]);
                    wsData.push(["Pagos (Ingresos):", "", "", 'Q ' + Number(totalIngresos).toFixed(2)]);
                    wsData.push(["Total Gastado:", "", "", 'Q ' + Number(totalGastos).toFixed(2)]);
                    wsData.push(["Ganancia Real:", "", "", 'Q ' + Number(gananciaReal).toFixed(2)]);
                    wsData.push(["Balance Presupuesto:", "", "", 'Q ' + Number(balancePresupuesto).toFixed(2)]);

                    // Combinar celdas del resumen
                    const summaryStart = currentRowIndex + 1;
                    merges.push({ s: { r: summaryStart, c: 0 }, e: { r: summaryStart, c: 3 } });
                    merges.push({ s: { r: summaryStart + 1, c: 0 }, e: { r: summaryStart + 1, c: 2 } });
                    merges.push({ s: { r: summaryStart + 2, c: 0 }, e: { r: summaryStart + 2, c: 2 } });
                    merges.push({ s: { r: summaryStart + 3, c: 0 }, e: { r: summaryStart + 3, c: 2 } });
                    merges.push({ s: { r: summaryStart + 4, c: 0 }, e: { r: summaryStart + 4, c: 2 } });
                    merges.push({ s: { r: summaryStart + 5, c: 0 }, e: { r: summaryStart + 5, c: 2 } });

                    const wb = XLSX.utils.book_new();
                    const ws = XLSX.utils.aoa_to_sheet(wsData);

                    ws['!merges'] = merges;
                    ws['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 45 }, { wch: 12 }]; // Ancho de columnas

                    XLSX.utils.book_append_sheet(wb, ws, "Gastos_Proyecto");

                    // Generar archivo
                    const safeName = (project.nombre || 'Proyecto').replace(/[^a-zA-Z0-9]/g, '_');
                    XLSX.writeFile(wb, 'Reporte_' + safeName + '.xlsx');

                    showToast('Exportación EÉxitosa', 'El archivo Excel se ha descargado.', 'success');
                } catch (err) {
                    console.error("Error al exportar a Excel:", err);
                    showToast('Error', 'No se pudo generar el Excel. Revisa la consola.', 'danger');
                }
            };

            // Configurar botón exportar PDF (A4 estricto, clonando plantilla en blanco y negro con rowspan de Fecha)
            document.getElementById('btn-export-project-pdf').onclick = () => {
                try {
                    const printTemplate = document.getElementById('project-print-template');
                    if (!printTemplate) {
                        showToast('Error', 'No se encontró la plantilla de impresión.', 'danger');
                        return;
                    }

                    // Rellenar datos en la plantilla de impresión original
                    document.getElementById('print-project-name').textContent = project.nombre;
                    document.getElementById('print-project-description').textContent = project.descripcion || "Sin descripción del proyecto.";
                    document.getElementById('print-budget-val').textContent = "Q" + Number(project.presupuesto).toFixed(2);
                    document.getElementById('print-incomes-val').textContent = "Q" + Number(totalIngresos).toFixed(2);
                    document.getElementById('print-expenses-val').textContent = "Q" + Number(totalGastos).toFixed(2);
                    document.getElementById('print-real-profit-val').textContent = "Q" + Number(gananciaReal).toFixed(2);
                    document.getElementById('print-balance-val').textContent = "Q" + Number(balancePresupuesto).toFixed(2);

                    const printTbody = document.getElementById('print-expenses-tbody');
                    printTbody.innerHTML = '';

                    if (expenses.length === 0) {
                        printTbody.innerHTML = `
                            <tr>
                                <td colspan="4" style="border: 1px solid #000; padding: 12px; text-align: center; color: #64748b;">
                                    No hay gastos registrados para este proyecto.
                                </td>
                            </tr>
                        `;
                    } else {
                        sortedDates.forEach(date => {
                            const items = groups[date];
                            items.forEach((item, index) => {
                                const tr = document.createElement('tr');

                                // Celda de Fecha fusionada
                                if (index === 0) {
                                    const tdDate = document.createElement('td');
                                    tdDate.setAttribute('rowspan', items.length);
                                    tdDate.style.border = '1px solid #000';
                                    tdDate.style.padding = '8px';
                                    tdDate.style.textAlign = 'center';
                                    tdDate.style.verticalAlign = 'middle';
                                    tdDate.style.fontWeight = 'bold';
                                    tdDate.textContent = date;
                                    tr.appendChild(tdDate);
                                }

                                // Gasto
                                const tdAmount = document.createElement('td');
                                tdAmount.style.border = '1px solid #000';
                                tdAmount.style.padding = '8px';
                                tdAmount.style.textAlign = 'left';
                                tdAmount.textContent = 'Q ' + Number(item.monto).toFixed(2);
                                tr.appendChild(tdAmount);

                                // Razón (limpia)
                                const tdReason = document.createElement('td');
                                tdReason.style.border = '1px solid #000';
                                tdReason.style.padding = '8px';
                                tdReason.style.textAlign = 'left';

                                let descClean = item.descripcion || '';
                                if (descClean.startsWith('[')) {
                                    const closingBracket = descClean.indexOf(']');
                                    if (closingBracket !== -1) {
                                        descClean = descClean.substring(closingBracket + 1).trim();
                                    }
                                }
                                tdReason.textContent = descClean;
                                tr.appendChild(tdReason);

                                // Cantidad
                                const tdQty = document.createElement('td');
                                tdQty.style.border = '1px solid #000';
                                tdQty.style.padding = '8px';
                                tdQty.style.textAlign = 'center';
                                tdQty.textContent = item.cantidad || 1;
                                tr.appendChild(tdQty);

                                printTbody.appendChild(tr);
                            });
                        });
                    }

                    // Clonar el contenedor para que lo dibuje html2pdf de manera visible en el viewport
                    const clone = printTemplate.cloneNode(true);

                    // Crear un wrapper invisible para asegurar que el navegador lo renderice
                    const wrapper = document.createElement('div');
                    wrapper.style.position = 'fixed';
                    wrapper.style.top = '0';
                    wrapper.style.left = '0';
                    wrapper.style.width = '800px';
                    wrapper.style.opacity = '0';
                    wrapper.style.pointerEvents = 'none';
                    wrapper.style.zIndex = '-9999';

                    clone.style.position = 'relative';
                    clone.style.display = 'block';
                    clone.style.left = '0';
                    clone.style.top = '0';
                    clone.style.width = '100%';

                    wrapper.appendChild(clone);
                    document.body.appendChild(wrapper);

                    const opt = {
                        margin: [15, 15, 15, 15],
                        filename: 'Reporte_' + (project.nombre || 'Proyecto').replace(/[^a-zA-Z0-9]/g, '_') + '.pdf',
                        image: { type: 'jpeg', quality: 1.0 },
                        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };

                    html2pdf().set(opt).from(clone).save().then(() => {
                        document.body.removeChild(wrapper); // Limpieza
                        showToast('Exportación EÉxitosa', 'El archivo PDF se ha descargado.', 'success');
                    }).catch(err => {
                        console.error("Error html2pdf:", err);
                        if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
                        showToast('Error', 'No se pudo exportar a PDF.', 'danger');
                    });
                } catch (err) {
                    console.error("Error al exportar a PDF:", err);
                    showToast('Error', 'No se pudo exportar a PDF. Intente de nuevo.', 'danger');
                }
            };

        } catch (err) {
            console.error(err); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
            showToast('Error', 'Ocurrió un error al cargar el proyecto.', 'danger');
        }
    }

    // Configurar controladores de formularios una sola vez
    const newProjectForm = document.getElementById('new-project-form');
    if (newProjectForm) {
        newProjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('project-name').value.trim();
            const descripcion = document.getElementById('project-description').value.trim();
            const fechaInicio = document.getElementById('project-start-date').value;
            const fechaFin = document.getElementById('project-end-date').value;
            const presupuesto = parseFloat(document.getElementById('project-budget').value) || 0;

            const editId = document.getElementById('edit-project-id').value;
            const url = editId ? `/api/projects/${editId}` : '/api/projects';
            const method = editId ? 'PUT' : 'POST';
            const empresa = window.AttendanceDB?.currentCompany || 'N/A';

            try {
                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, descripcion, fechaInicio, fechaFin, presupuesto, empresa })
                });
                const data = await res.json();
                if (data.success) {
                    const actionWord = editId ? 'actualizó' : 'registró';
                    showToast('Proyecto Guardado', `El proyecto se ${actionWord} correctamente.`, 'success');
                    newProjectForm.reset();
                    document.getElementById('edit-project-id').value = "";
                    document.getElementById('project-form-title').textContent = "Registrar Proyecto";
                    document.getElementById('btn-save-project').textContent = "Guardar Proyecto";
                    document.getElementById('btn-cancel-project-edit').classList.add('hidden');
                    renderProjectsView();
                } else {
                    showToast('Error', data.message || 'No se pudo guardar el proyecto', 'danger');
                }
            } catch (err) {
                console.error(err); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
                showToast('Error', 'Error al guardar el proyecto.', 'danger');
            }
        });
    }

    const btnCancelProjectEdit = document.getElementById('btn-cancel-project-edit');
    if (btnCancelProjectEdit) {
        btnCancelProjectEdit.addEventListener('click', () => {
            document.getElementById('edit-project-id').value = "";
            document.getElementById('new-project-form').reset();
            document.getElementById('project-form-title').textContent = "Registrar Proyecto";
            document.getElementById('btn-save-project').textContent = "Guardar Proyecto";
            btnCancelProjectEdit.classList.add('hidden');
        });
    }

    // Formulario de Nuevo Ingreso (Pagos)
    const newIncomeForm = document.getElementById('new-income-form');
    if (newIncomeForm) {
        newIncomeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentDetailedProjectId) return;
            
            const fecha = document.getElementById('income-date').value;
            const monto = parseFloat(document.getElementById('income-amount').value) || 0;
            const desc = document.getElementById('income-desc').value.trim();
            const photoInput = document.getElementById('income-photo');
            let fotoBase64 = null;

            if (photoInput.files && photoInput.files[0]) {
                const reader = new FileReader();
                reader.readAsDataURL(photoInput.files[0]);
                await new Promise(r => reader.onload = r);
                fotoBase64 = reader.result;
            }
            
            try {
                const res = await fetch(`/api/projects/${currentDetailedProjectId}/incomes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fecha, monto, descripcion: desc, fotoBase64 })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Pago Registrado', 'El pago de cliente se registró correctamente.', 'success');
                    newIncomeForm.reset();
                    renderProjectDetails(currentDetailedProjectId);
                } else {
                    showToast('Error', data.message || 'No se pudo guardar el pago', 'danger');
                }
            } catch (err) {
                console.error(err); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
                showToast('Error', 'Error al guardar el pago.', 'danger');
            }
        });
    }

    // --- MANEJO DINÁMICO DEL FORMULARIO DE GASTOS ---
    let isRangeActive = false;
    const btnToggleDateRange = document.getElementById('btn-toggle-date-range');
    const singleDateContainer = document.getElementById('expense-single-date-container');
    const rangeDateContainer = document.getElementById('expense-range-date-container');
    const singleDateInput = document.getElementById('expense-date');
    const rangeStartInput = document.getElementById('expense-range-start');
    const rangeEndInput = document.getElementById('expense-range-end');
    const btnAddExpenseItem = document.getElementById('btn-add-expense-item');
    const expenseItemsContainer = document.getElementById('expense-items-container');

    if (btnToggleDateRange) {
        btnToggleDateRange.addEventListener('click', () => {
            isRangeActive = !isRangeActive;
            if (isRangeActive) {
                btnToggleDateRange.textContent = "Fecha Única";
                singleDateContainer.classList.add('hidden');
                rangeDateContainer.classList.remove('hidden');
                singleDateInput.removeAttribute('required');
                rangeStartInput.setAttribute('required', 'true');
                rangeEndInput.setAttribute('required', 'true');
            } else {
                btnToggleDateRange.textContent = "Rango (De tal fecha a tal fecha)";
                singleDateContainer.classList.remove('hidden');
                rangeDateContainer.classList.add('hidden');
                singleDateInput.setAttribute('required', 'true');
                rangeStartInput.removeAttribute('required');
                rangeEndInput.removeAttribute('required');
            }
        });
    }

    if (btnAddExpenseItem && expenseItemsContainer) {
        btnAddExpenseItem.addEventListener('click', () => {
            const row = document.createElement('div');
            row.className = 'expense-item-row';
            row.style.display = 'flex';
            row.style.gap = '10px';
            row.style.alignItems = 'center';
            row.style.marginTop = '10px';
            row.innerHTML = `
                <input type="text" class="form-control item-desc" placeholder="Descripción (ej: Cemento)" required style="padding-left:16px; flex: 2;">
                <div class="currency-input-wrapper" style="flex: 1; margin: 0;">
                    <span class="currency-symbol">Q</span>
                    <input type="number" class="form-control item-amount" min="0.01" step="0.01" placeholder="0.00" required>
                </div>
                <input type="number" class="form-control item-qty" min="1" value="1" placeholder="Cant." required style="padding-left:10px; flex: 0.5;">
                <button type="button" class="btn-delete-item-row btn-secondary" style="width: auto; padding: 10px;" title="Eliminar fila">X</button>
            `;
            expenseItemsContainer.appendChild(row);
            updateDeleteButtons();
        });

        expenseItemsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-delete-item-row');
            if (btn) {
                btn.closest('.expense-item-row').remove();
                updateDeleteButtons();
            }
        });
    }

    function updateDeleteButtons() {
        const rows = expenseItemsContainer.querySelectorAll('.expense-item-row');
        rows.forEach((row) => {
            const btn = row.querySelector('.btn-delete-item-row');
            if (btn) {
                btn.style.display = rows.length > 1 ? 'block' : 'none';
            }
        });
    }

    const newExpenseForm = document.getElementById('new-expense-form');
    if (newExpenseForm) {
        newExpenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentDetailedProjectId) return;

            const motivo = document.getElementById('expense-motivo').value.trim();
            const rows = expenseItemsContainer.querySelectorAll('.expense-item-row');

            // Obtener fecha o rango
            let fechaVal = "";
            if (isRangeActive) {
                const start = rangeStartInput.value;
                const end = rangeEndInput.value;
                fechaVal = start + ' al ' + end;
            } else {
                fechaVal = singleDateInput.value;
            }

            try {
                // Registrar cada ítem en la base de datos
                for (const row of rows) {
                    const descVal = row.querySelector('.item-desc').value.trim();
                    const amountVal = parseFloat(row.querySelector('.item-amount').value) || 0;
                    const qtyVal = parseInt(row.querySelector('.item-qty').value) || 1;

                    const fullDescription = '[' + motivo + '] ' + descVal;

                    await fetch(`/api/projects/${currentDetailedProjectId}/expenses`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ descripcion: fullDescription, monto: amountVal, fecha: fechaVal, cantidad: qtyVal })
                    });
                }

                showToast('Gastos Guardados', 'Los gastos se registraron correctamente.', 'success');
                newExpenseForm.reset();

                // Reiniciar el contenedor de ítems a una sola fila con la nueva columna Cant.
                expenseItemsContainer.innerHTML = `
                    <div class="expense-item-row" style="display: flex; gap: 10px; align-items: center;">
                        <input type="text" class="form-control item-desc" placeholder="Descripción (ej: Cemento)" required style="padding-left:16px; flex: 2;">
                        <div class="currency-input-wrapper" style="flex: 1; margin: 0;">
                            <span class="currency-symbol">Q</span>
                            <input type="number" class="form-control item-amount" min="0.01" step="0.01" placeholder="0.00" required>
                        </div>
                        <input type="number" class="form-control item-qty" min="1" value="1" placeholder="Cant." required style="padding-left:10px; flex: 0.5;">
                        <button type="button" class="btn-delete-item-row btn-secondary" style="width: auto; padding: 10px; display: none;" title="Eliminar fila">X</button>
                    </div>
                `;

                if (isRangeActive) {
                    btnToggleDateRange.click();
                }

                renderProjectDetails(currentDetailedProjectId);

            } catch (err) {
                console.error(err); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
                showToast('Error', 'Error al guardar los gastos.', 'danger');
            }
        });
    }

    document.getElementById('btn-back-to-projects')?.addEventListener('click', () => {
        const viewTitle = document.getElementById('view-title');
        viewTitle.textContent = 'Control de Proyectos';
        renderProjectsView();
    });
