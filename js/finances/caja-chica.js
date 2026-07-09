    // ====== CAJA CHICA LOGIC ======
    window.openExpensePcModal = function (fondoId) {
        document.getElementById('expense-pc-fund-id').value = fondoId;
        document.getElementById('expense-pc-amount').value = '';
        document.getElementById('expense-pc-note').value = '';
        document.getElementById('expense-pc-invoice').value = '';
        document.getElementById('expense-pc-invoice-name').textContent = 'Seleccionar archivo...';
        document.getElementById('modal-expense-petty-cash').classList.remove('hidden');
    };

    async function renderPettyCashView() {
        const container = document.getElementById('petty-cash-funds-container');
        const headerActions = document.getElementById('pc-header-actions');

        try {
            let url = '/api/petty-cash-funds';
            if (currentUser.rol === 'usr') {
                url += `?usuarioId=${currentUser.id}`;
            }

            const [fundsRes, usersRes] = await Promise.all([
                fetch(url),
                fetch('/api/users')
            ]);

            const funds = await fundsRes.json();
            const users = await usersRes.json();

            const isSupervisor = ['admin', 'leader'].includes(currentUser.rol);

            // Renderizar header actions
            headerActions.innerHTML = '';
            if (isSupervisor) {
                const assignBtn = document.createElement('button');
                assignBtn.className = 'btn-primary';
                assignBtn.textContent = 'Asignar Fondo';
                assignBtn.onclick = () => {
                    const select = document.getElementById('assign-pc-employee');
                    select.innerHTML = '<option value="">Seleccione un empleado...</option>';
                    users.filter(u => u.rol === 'usr' || u.rol === 'leader').forEach(u => {
                        select.innerHTML += `<option value="${u.id}">${u.nombre}</option>`;
                    });

                    fetch('/api/projects').then(r => r.json()).then(projs => {
                        const projSelect = document.getElementById('assign-pc-project');
                        if (projSelect) {
                            projSelect.innerHTML = '<option value="">Ninguno</option>';
                            projs.forEach(p => {
                                projSelect.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
                            });
                        }
                    }).catch(console.error);

                    document.getElementById('modal-assign-petty-cash').classList.remove('hidden');
                };
                headerActions.appendChild(assignBtn);

                const filtersContainer = document.getElementById('petty-cash-filters-container');
                if (filtersContainer) {
                    filtersContainer.classList.remove('hidden');
                    window.pcFilters = window.pcFilters || { status: 'ACTIVO', search: '', userId: '' };
                    
                    filtersContainer.innerHTML = `
                        <div class="form-group" style="margin-bottom: 0; min-width: 150px;">
                            <label style="font-size: 0.8rem;">Estado</label>
                            <select id="pc-filter-status" class="form-control" style="padding: 5px;">
                                <option value="TODOS" ${window.pcFilters.status === 'TODOS' ? 'selected' : ''}>Todos</option>
                                <option value="ACTIVO" ${window.pcFilters.status === 'ACTIVO' ? 'selected' : ''}>Activos</option>
                                <option value="EN REVISIÓN" ${window.pcFilters.status === 'EN REVISIÓN' ? 'selected' : ''}>En Revisión</option>
                                <option value="AGOTADO" ${window.pcFilters.status === 'AGOTADO' ? 'selected' : ''}>Agotados</option>
                                <option value="CERRADO" ${window.pcFilters.status === 'CERRADO' ? 'selected' : ''}>Cerrados</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom: 0; flex: 1; min-width: 200px;">
                            <label style="font-size: 0.8rem;">Buscar por Fondo o Empleado</label>
                            <input type="text" id="pc-filter-search" class="form-control" style="padding: 5px;" placeholder="Buscar..." value="${window.pcFilters.search}">
                        </div>
                        <div class="form-group" id="pc-filter-user-container" style="margin-bottom: 0; min-width: 200px; display: ${window.pcFilters.status === 'CERRADO' ? 'block' : 'none'};">
                            <label style="font-size: 0.8rem;">Empleado (Cajas Cerradas)</label>
                            <select id="pc-filter-user" class="form-control" style="padding: 5px;">
                                <option value="">Todos los empleados</option>
                                ${users.filter(u => u.rol === 'usr' || u.rol === 'leader').map(u => `<option value="${u.id}" ${window.pcFilters.userId == u.id ? 'selected' : ''}>${u.nombre}</option>`).join('')}
                            </select>
                        </div>
                    `;

                    document.getElementById('pc-filter-status').addEventListener('change', (e) => {
                        window.pcFilters.status = e.target.value;
                        document.getElementById('pc-filter-user-container').style.display = (window.pcFilters.status === 'CERRADO') ? 'block' : 'none';
                        if (window.pcFilters.status !== 'CERRADO') window.pcFilters.userId = '';
                        renderPettyCashView();
                    });
                    document.getElementById('pc-filter-search').addEventListener('change', (e) => {
                        window.pcFilters.search = e.target.value.toLowerCase();
                        renderPettyCashView();
                    });
                    document.getElementById('pc-filter-user').addEventListener('change', (e) => {
                        window.pcFilters.userId = e.target.value;
                        renderPettyCashView();
                    });
                }
            }

            // Expose the global functions for submit and close
            window.submitPettyCash = async function(id) {
                if(!(await appConfirm('Confirmación', '¿Estás seguro de enviar esta caja chica a revisión? Ya no podrás agregar más gastos.'))) return;
                try {
                    const res = await fetch(`/api/petty-cash-funds/${id}/submit`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({usuarioId: currentUser.id}) });
                    if ((await res.json()).success) {
                        showToast('Éxito', 'Caja chica enviada a revisión', 'success');
                        renderPettyCashView();
                    }
                } catch(e) {}
            };

            window.closePettyCash = async function(id) {
                if(!(await appConfirm('Confirmación', '¿Estás seguro de cerrar esta caja chica?'))) return;
                try {
                    const res = await fetch(`/api/petty-cash-funds/${id}/close`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({usuarioId: currentUser.id}) });
                    if ((await res.json()).success) {
                        showToast('Éxito', 'Caja chica cerrada', 'success');
                        renderPettyCashView();
                    }
                } catch(e) {}
            };

            window.togglePcGastos = function(id) {
                const el = document.getElementById('pc-gastos-'+id);
                if(el) el.classList.toggle('hidden');
            };

            // Renderizar fondos
            container.innerHTML = '';
            if (funds.length === 0) {
                container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">No tienes fondos de caja chica asignados.</div>';
                return;
            }

            let fundsToRender = 0;

            funds.forEach(fondo => {
                if (isSupervisor) {
                    if (window.pcFilters.status !== 'TODOS' && fondo.estado !== window.pcFilters.status) return;
                    const searchStr = window.pcFilters.search.toLowerCase();
                    const fDesc = (fondo.descripcion || '').toLowerCase();
                    const eName = (fondo.empleadoNombre || '').toLowerCase();
                    if (searchStr && !fDesc.includes(searchStr) && !eName.includes(searchStr)) return;
                    if (window.pcFilters.status === 'CERRADO' && window.pcFilters.userId && fondo.usuario_id != window.pcFilters.userId) return;
                } else {
                    if (fondo.estado !== 'ACTIVO' && fondo.estado !== 'AGOTADO' && fondo.estado !== 'EN REVISIÓN' && fondo.estado !== 'CERRADO') return;
                }

                fundsToRender++;

                const card = document.createElement('div');
                card.className = 'card';
                card.style.cssText = `border: 1px solid ${fondo.estado === 'ACTIVO' ? 'var(--primary)' : 'var(--border-color)'}; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: flex; flex-direction: column;`;

                const isAgotado = fondo.estado === 'AGOTADO';
                let badgeColor = 'badge-success';
                if(fondo.estado === 'EN REVISIÓN') badgeColor = 'badge-warning';
                if(fondo.estado === 'CERRADO') badgeColor = 'badge-secondary';
                if(fondo.estado === 'AGOTADO') badgeColor = 'badge-danger';

                let gastosHtml = '';
                const totalGastado = (fondo.gastos || []).reduce((sum, g) => sum + g.monto, 0);
                const pendiente = fondo.monto_asignado - totalGastado;
                
                let gastosList = (fondo.gastos || []).map(g => {
                    let fotosLinks = '';
                    if(g.foto_factura) {
                        fotosLinks = g.foto_factura.split(',').map((f, i) => `<a href="${f}" target="_blank" style="color:var(--primary); font-size: 0.8rem; margin-right:5px; text-decoration:underline;">Ver Foto ${i+1}</a>`).join('');
                    }
                    const gFechaObj = new Date(g.fecha);
                    const gFechaStr = isNaN(gFechaObj.getTime()) ? '' : gFechaObj.toLocaleString('es-GT', {dateStyle:'short', timeStyle:'short'});
                    return `<div style="border-bottom: 1px solid var(--border-color); padding: 8px 0;">
                        <div style="display:flex; justify-content:space-between;">
                            <strong style="font-size:0.9rem;">${g.descripcion} <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: normal;">(Por: ${g.empleadoNombre || 'Desconocido'})</span></strong>
                            <span style="color:var(--danger); font-weight:bold;">Q${g.monto.toFixed(2)}</span>
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top:2px;">
                            ${gFechaStr ? `<span>Fecha de gasto: ${gFechaStr}</span>` : ''}
                        </div>
                        <div style="font-size: 0.8rem; color:var(--text-secondary); margin-top:4px;">
                            ${fotosLinks}
                        </div>
                    </div>`;
                }).join('');

                if(fondo.gastos && fondo.gastos.length === 0) gastosList = '<div style="font-size:0.8rem; color:var(--text-secondary);">No hay comprobantes.</div>';

                gastosHtml = `
                <div style="margin-top: 15px; border-top: 1px dashed var(--border-color); padding-top: 10px;">
                    <div style="display:flex; justify-content:space-between; font-size: 0.85rem; margin-bottom:5px;">
                        <span>Total Gastado:</span> <strong>Q${totalGastado.toFixed(2)}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size: 0.85rem; color: ${pendiente < 0 ? 'var(--danger)' : 'var(--success)'}; margin-bottom:10px;">
                        <span>Pendiente Devolver:</span> <strong>Q${pendiente.toFixed(2)}</strong>
                    </div>
                    <button class="btn-secondary" style="width:100%; padding: 5px; font-size: 0.8rem; margin-bottom: 10px;" onclick="togglePcGastos(${fondo.id})">Ver Gastos (${(fondo.gastos||[]).length})</button>
                    <div id="pc-gastos-${fondo.id}" class="hidden" style="max-height: 150px; overflow-y:auto; background: var(--bg-color); padding: 10px; border-radius: 5px;">
                        ${gastosList}
                    </div>
                </div>`;

                let buttonsHtml = '';
                if (!isSupervisor) {
                    if (fondo.estado !== 'CERRADO') {
                        buttonsHtml = `
                            <button class="btn-primary" style="width: 100%; margin-bottom: 10px;" onclick="openExpensePcModal(${fondo.id})">
                                Agregar Comprobante/Gasto
                            </button>
                            <button class="btn-primary" style="width: 100%; background-color: var(--warning); border-color: var(--warning); color: #000;" onclick="submitPettyCash(${fondo.id})">
                                Finalizar y Enviar a Revisión
                            </button>
                        `;
                    }
                } else if (fondo.estado === 'EN REVISIÓN' || fondo.estado === 'ACTIVO' || fondo.estado === 'AGOTADO') {
                    buttonsHtml = `
                        <button class="btn-primary" style="width: 100%; background-color: var(--danger); border-color: var(--danger);" onclick="closePettyCash(${fondo.id})">
                            Cerrar Caja Chica
                        </button>
                    `;
                }

                card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div>
                        <span class="badge ${badgeColor}" style="margin-bottom: 5px; display: inline-block;">${fondo.estado}</span>
                        <h4 style="margin: 0; font-size: 1.1rem;">${fondo.descripcion}</h4>
                        ${fondo.proyectoNombre ? `<div style="font-size: 0.8rem; color: var(--primary); margin-top: 5px;">Proyecto: ${fondo.proyectoNombre}</div>` : ''}
                        ${currentUser.rol !== 'usr' ? `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">Asignado a: ${fondo.empleadoNombre}</div>` : ''}
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 5px;">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: text-top; margin-right: 3px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            Fecha de asignación: ${new Date(fondo.fecha).toLocaleDateString('es-GT', {year: 'numeric', month: 'short', day: 'numeric'})}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">Disponible</div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: ${isAgotado ? 'var(--text-secondary)' : 'var(--success)'};">Q${fondo.monto_disponible.toFixed(2)}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">de Q${fondo.monto_asignado.toFixed(2)}</div>
                    </div>
                </div>
                ${gastosHtml}
                <div style="margin-top: auto; padding-top: 15px;">
                    ${buttonsHtml}
                </div>
            `;
                container.appendChild(card);
            });

            if (fundsToRender === 0) {
                container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">No hay fondos para mostrar en esta vista.</div>';
            }

            // Enlazar los botones de eliminar gasto (solo para supervisor)
            if (isSupervisor) {
                container.querySelectorAll('.btn-delete-expense-pc').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const expenseId = btn.getAttribute('data-expense-id');
                        if (await appConfirm('Confirmación', '¿Estás seguro de quitar esta justificación de Caja Chica? Se mantendrá guardado en el Proyecto.')) {
                            try {
                                const res = await fetch(`/api/petty-cash-funds/expenses/${expenseId}`, {
                                    method: 'DELETE'
                                });
                                const data = await res.json();
                                if (data.success) {
                                    showToast('Éxito', 'Gasto removido de Caja Chica. Se mantiene en los gastos del proyecto.', 'success');
                                    renderPettyCashView();
                                } else {
                                    showToast('Error', 'No se pudo eliminar el gasto.', 'danger');
                                }
                            } catch (err) {
                                showToast('Error', 'Error de red.', 'danger');
                            }
                        }
                    });
                });
            }

        } catch (err) { console.error(err); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger'); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger'); }
    }

    document.getElementById('btn-close-assign-pc-modal')?.addEventListener('click', () => {
        document.getElementById('modal-assign-petty-cash').classList.add('hidden');
    });
    document.getElementById('btn-cancel-assign-pc')?.addEventListener('click', () => {
        document.getElementById('modal-assign-petty-cash').classList.add('hidden');
    });

    document.getElementById('btn-close-expense-pc-modal')?.addEventListener('click', () => {
        document.getElementById('modal-expense-petty-cash').classList.add('hidden');
    });
    document.getElementById('btn-cancel-expense-pc')?.addEventListener('click', () => {
        document.getElementById('modal-expense-petty-cash').classList.add('hidden');
    });

    document.getElementById('assign-pc-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const empId = document.getElementById('assign-pc-employee').value;
        const amount = document.getElementById('assign-pc-amount').value;
        const note = document.getElementById('assign-pc-note').value;
        const projectId = document.getElementById('assign-pc-project')?.value;

        if (!empId || !amount || !note) return showToast('Error', 'Debe completar todos los campos obligatorios', 'danger');

        btn.disabled = true;
        btn.textContent = 'Asignando...';
        try {
            const res = await fetch('/api/petty-cash-funds/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario_id: empId,
                    monto: parseFloat(amount),
                    descripcion: note,
                    proyecto_id: projectId ? parseInt(projectId) : null,
                    registrado_por: currentUser.id
                })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Éxito', 'Fondo asignado correctamente', 'success');
                document.getElementById('modal-assign-petty-cash').classList.add('hidden');
                e.target.reset();
                renderPettyCashView();
            } else {
                showToast('Error', data.message || 'Error al asignar', 'danger');
            }
        } catch (err) {
            showToast('Error', 'Error de red', 'danger');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Asignar Fondo';
        }
    });

    document.getElementById('expense-pc-invoice')?.addEventListener('change', function (e) {
        const files = e.target.files;
        if (files.length === 0) {
            document.getElementById('expense-pc-invoice-name').textContent = 'Ningún archivo...';
        } else if (files.length === 1) {
            document.getElementById('expense-pc-invoice-name').textContent = files[0].name;
        } else {
            document.getElementById('expense-pc-invoice-name').textContent = `${files.length} archivos seleccionados`;
        }
    });

    document.getElementById('expense-pc-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');

        const fondoId = document.getElementById('expense-pc-fund-id').value;
        const amount = document.getElementById('expense-pc-amount').value;
        const note = document.getElementById('expense-pc-note').value;
        const fileInput = document.getElementById('expense-pc-invoice');
        const files = fileInput.files;

        if (!fondoId || !amount || !note || files.length === 0) return showToast('Error', 'Debe completar todos los campos y adjuntar factura(s)', 'danger');

        btn.disabled = true;
        btn.textContent = 'Guardando...';

        try {
            const readPromises = Array.from(files).map(file => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });

            const base64Files = await Promise.all(readPromises);

            const res = await fetch(`/api/petty-cash-funds/${fondoId}/expense`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario_id: currentUser.id,
                    monto: parseFloat(amount),
                    descripcion: note,
                    fotosBase64: base64Files
                })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Éxito', 'Gasto agregado correctamente', 'success');
                document.getElementById('modal-expense-petty-cash').classList.add('hidden');
                e.target.reset();
                document.getElementById('expense-pc-invoice-name').textContent = 'Seleccionar archivos...';
                renderPettyCashView();
            } else {
                showToast('Error', data.message || 'Error al enviar gasto', 'danger');
            }
            btn.disabled = false;
            btn.textContent = 'Enviar Gasto';
        } catch (err) {
            showToast('Error', 'Error de red', 'danger');
            btn.disabled = false;
            btn.textContent = 'Enviar Gasto';
        }
    });
