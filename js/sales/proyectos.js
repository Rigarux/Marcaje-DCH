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
            const res = await fetch('/api/projects');
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

                const card = document.createElement('div');
                card.className = 'project-card';
                card.innerHTML = `
                    <div class="project-card-header">
                        <span class="project-card-title">${p.nombre}</span>
                        <div style="display: flex; gap: 8px;">
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
                    if (e.target.closest('.btn-delete-project') || e.target.closest('.btn-edit-project')) return;
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

            const totalGastosMateriales = expenses.reduce((sum, e) => sum + (Number(e.monto) * (Number(e.cantidad) || 1)), 0);
            const totalPlanilla = attendances.reduce((sum, a) => sum + Number(a.pago), 0);
            const totalGastos = totalGastosMateriales + totalPlanilla;
            const balance = project.presupuesto - totalGastos;

            document.getElementById('detail-project-budget').textContent = 'Q' + project.presupuesto.toFixed(2);
            document.getElementById('detail-project-expenses').textContent = 'Q' + totalGastos.toFixed(2);

            const balanceEl = document.getElementById('detail-project-balance');
            balanceEl.textContent = 'Q' + balance.toFixed(2);
            if (balance < 0) {
                balanceEl.className = 'value text-danger';
            } else {
                balanceEl.className = 'value text-success';
            }

            // Render table
            const tbody = document.getElementById('project-expenses-table-body');
            tbody.innerHTML = '';
            if (expenses.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-muted" style="text-align: center; padding: 20px;">
                            No hay gastos registrados para este proyecto.
                        </td>
                    </tr>
                `;
            } else {
                expenses.forEach(e => {
                    const tr = document.createElement('tr');

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

                    tr.innerHTML = `
                        <td>${e.fecha}</td>
                        <td>${descClean}</td>
                        <td style="text-align: right;">${e.cantidad || 1}</td>
                        <td style="text-align: right; font-weight: 500;">Q${Number(e.monto).toFixed(2)}</td>
                        <td style="text-align: center;">${invoiceHtml}</td>
                        <td style="text-align: center;">
                            <button type="button" class="btn-table-action delete-expense-btn" data-id="${e.id}" style="padding: 2px 6px; font-size: 0.7rem; width: auto; background-color: var(--danger); border-color: var(--danger);">
                                Eliminar
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                tbody.querySelectorAll('.delete-expense-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = btn.getAttribute('data-id');
                        if (await appConfirm('Confirmación', '¿Estás seguro de eliminar este gasto?')) {
                            const delRes = await fetch(`/api/projects/expenses/&id}`.replace('&', id), { method: 'DELETE' });
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
            const tbodyAttendances = document.getElementById('project-attendances-table-body');
            const payrollBadge = document.getElementById('project-total-payroll-badge');
            if (payrollBadge) {
                payrollBadge.textContent = 'Total: Q' + totalPlanilla.toFixed(2);
            }

            if (tbodyAttendances) {
                tbodyAttendances.innerHTML = '';
                if (attendances.length === 0) {
                    tbodyAttendances.innerHTML = `
                        <tr>
                            <td colspan="4" class="text-muted" style="text-align: center; padding: 20px;">
                                No hay empleados registrados en este proyecto.
                            </td>
                        </tr>
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

                    sortedDates.forEach(date => {
                        // Add daily header
                        const trHeader = document.createElement('tr');
                        trHeader.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        trHeader.innerHTML = `
                            <td colspan="3" style="font-weight: 700; color: var(--primary-color);">Día: ${date}</td>
                            <td style="text-align: right; font-weight: 700; color: var(--primary-color);">Total Día: Q${attByDate[date].total.toFixed(2)}</td>
                        `;
                        tbodyAttendances.appendChild(trHeader);

                        // Add records for the day
                        attByDate[date].records.forEach(a => {
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td>${a.fecha}</td>
                                <td style="font-weight: 500;">${a.empleadoNombre}</td>
                                <td style="text-align: right;">${Number(a.horasTrabajadas).toFixed(2)} hrs</td>
                                <td style="text-align: right; font-weight: 500; color: var(--danger);">Q${Number(a.pago).toFixed(2)}</td>
                            `;
                            tbodyAttendances.appendChild(tr);
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
                    wsData.push(["Total Gastado:", "", "", 'Q ' + Number(totalGastos).toFixed(2)]);
                    wsData.push(["Balance Restante:", "", "", 'Q ' + Number(balance).toFixed(2)]);

                    // Combinar celdas del resumen
                    const summaryStart = currentRowIndex + 1;
                    merges.push({ s: { r: summaryStart, c: 0 }, e: { r: summaryStart, c: 3 } });
                    merges.push({ s: { r: summaryStart + 1, c: 0 }, e: { r: summaryStart + 1, c: 2 } });
                    merges.push({ s: { r: summaryStart + 2, c: 0 }, e: { r: summaryStart + 2, c: 2 } });
                    merges.push({ s: { r: summaryStart + 3, c: 0 }, e: { r: summaryStart + 3, c: 2 } });

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
                    document.getElementById('print-expenses-val').textContent = "Q" + Number(totalGastos).toFixed(2);
                    document.getElementById('print-balance-val').textContent = "Q" + Number(balance).toFixed(2);

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

            try {
                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, descripcion, fechaInicio, fechaFin, presupuesto })
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
