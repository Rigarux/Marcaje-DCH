// --- LÓGICA DE EXPORTACIÓN Y NUEVO HISTORIAL DE CORTES ---
    const btnOpenCutsModal = document.getElementById('btn-open-history-modal');
    const btnCloseCutsModal = document.getElementById('btn-close-cuts-modal');
    const btnCancelCuts = document.getElementById('btn-cancel-cuts');
    const cutsModal = document.getElementById('admin-cuts-modal');
    
    const cutDetailsModal = document.getElementById('cut-details-modal');
    const btnCloseCutDetailsModal = document.getElementById('btn-close-cut-details-modal');
    const btnCancelCutDetails = document.getElementById('btn-cancel-cut-details');
    const btnSaveCutConfirmations = document.getElementById('btn-save-cut-confirmations');
    const btnFinalizeExportCut = document.getElementById('btn-finalize-export-cut');
    
    let currentCutId = null;
    let currentCutData = { attendance: [], busRecords: [] };

    if (btnOpenCutsModal) {
        btnOpenCutsModal.addEventListener('click', () => {
            loadCuts();
            cutsModal.classList.remove('hidden');
        });
    }

    if (btnCloseCutsModal) btnCloseCutsModal.addEventListener('click', () => cutsModal.classList.add('hidden'));
    if (btnCancelCuts) btnCancelCuts.addEventListener('click', () => cutsModal.classList.add('hidden'));
    
    if (btnCloseCutDetailsModal) btnCloseCutDetailsModal.addEventListener('click', () => cutDetailsModal.classList.add('hidden'));
    if (btnCancelCutDetails) btnCancelCutDetails.addEventListener('click', () => cutDetailsModal.classList.add('hidden'));

    async function loadCuts() {
        const cutsBody = document.getElementById('cuts-table-body');
        if (!cutsBody) return;
        
        cutsBody.innerHTML = '<tr><td colspan="4" class="text-center">Cargando...</td></tr>';
        try {
            const res = await fetch('/api/attendance/cuts');
            const data = await res.json();
            if (data.success) {
                cutsBody.innerHTML = '';
                if (data.cuts.length === 0) {
                    cutsBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay cortes generados.</td></tr>';
                    return;
                }
                data.cuts.forEach(cut => {
                    const tr = document.createElement('tr');
                    const badgeClass = cut.estado === 'Pendiente' ? 'bg-warning' : 'bg-success';
                    tr.innerHTML = `
                        <td><strong>#${cut.id}</strong></td>
                        <td>${cut.fechaGenerado}</td>
                        <td><span class="role-badge" style="background-color: var(--${cut.estado === 'Pendiente' ? 'warning' : 'success'}); color:white;">${cut.estado}</span></td>
                        <td>
                            <button class="btn-primary btn-sm btn-view-cut" data-id="${cut.id}" data-estado="${cut.estado}">Ver Detalles</button>
                        </td>
                    `;
                    cutsBody.appendChild(tr);
                });
                
                document.querySelectorAll('.btn-view-cut').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const id = e.target.getAttribute('data-id');
                        const estado = e.target.getAttribute('data-estado');
                        openCutDetails(id, estado);
                    });
                });
            }
        } catch (error) {
            console.error('Error cargando cortes:', error);
            cutsBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error al cargar.</td></tr>';
        }
    }

    async function openCutDetails(id, estado) {
        currentCutId = id;
        document.getElementById('current-cut-id').textContent = id;
        
        const badge = document.getElementById('cut-status-badge');
        badge.textContent = estado;
        badge.style.backgroundColor = estado === 'Pendiente' ? 'var(--warning)' : 'var(--success)';
        
        const actionButtons = document.getElementById('cut-action-buttons');
        if (estado === 'Finalizado') {
            btnSaveCutConfirmations.style.display = 'none';
            btnFinalizeExportCut.textContent = 'Exportar';
            btnFinalizeExportCut.setAttribute('data-mode', 'export-only');
        } else {
            btnSaveCutConfirmations.style.display = 'inline-block';
            btnFinalizeExportCut.textContent = 'Guardar y Exportar';
            btnFinalizeExportCut.setAttribute('data-mode', 'finalize');
        }

        const detailsBody = document.getElementById('cut-details-table-body');
        detailsBody.innerHTML = '<tr><td colspan="9" class="text-center">Cargando detalles...</td></tr>';
        cutDetailsModal.classList.remove('hidden');

        try {
            const res = await fetch(`/api/attendance/cuts/${id}/records`);
            const data = await res.json();
            if (data.success) {
                currentCutData = data;
                renderCutDetails(data.attendance, data.busRecords, estado);
            }
        } catch (error) {
            console.error('Error cargando detalles del corte:', error);
            detailsBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error al cargar.</td></tr>';
        }
    }

    function renderCutDetails(attendance, busRecords, estado) {
        const detailsBody = document.getElementById('cut-details-table-body');
        detailsBody.innerHTML = '';
        
        const allUsers = window.AttendanceDB.getUsers();
        const grouped = {};
        
        const initGroup = (uid) => {
            if (!grouped[uid]) {
                const u = allUsers.find(user => user.id === uid);
                grouped[uid] = {
                    userObj: u, userId: uid,
                    userName: u ? u.nombre : 'Desconocido',
                    grupo: u ? u.grupo : 'N/A',
                    attendanceRecords: [], busRecords: [],
                    totalHoras: 0, totalBruto: 0, totalBono: 0, totalDescuento: 0, totalNeto: 0,
                    allApproved: true
                };
            }
        };

        attendance.forEach(rec => {
            initGroup(rec.usuarioId);
            grouped[rec.usuarioId].attendanceRecords.push(rec);
            grouped[rec.usuarioId].totalHoras += rec.horasTrabajadas || 0;
            grouped[rec.usuarioId].totalBruto += rec.montoBruto || 0;
            grouped[rec.usuarioId].totalBono += rec.bono || 0;
            grouped[rec.usuarioId].totalDescuento += rec.descuento || 0;
            grouped[rec.usuarioId].totalNeto += rec.montoNeto || 0;
            if (rec.aprobado === 0) grouped[rec.usuarioId].allApproved = false;
        });

        busRecords.forEach(rec => {
            initGroup(rec.usuarioId);
            grouped[rec.usuarioId].busRecords.push(rec);
            grouped[rec.usuarioId].totalNeto += (rec.ingresoDinero || 0) - (rec.montoGasto || 0);
            if (rec.aprobado === 0) grouped[rec.usuarioId].allApproved = false;
        });

        const userGroups = Object.values(grouped);
        
        if (userGroups.length === 0) {
            detailsBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No hay registros en este corte.</td></tr>';
            return;
        }

        userGroups.forEach(group => {
            let loanCuota = 0;
            if (group.userObj) {
                let isAuth = false;
                Object.keys(group.userObj).forEach(k => {
                    const lowerK = k.toLowerCase();
                    if (lowerK.includes('stamoestadocuota') || lowerK.includes('stamo_estado_cuota')) {
                        if (group.userObj[k] === 'Autorizado') isAuth = true;
                    }
                    if (lowerK.includes('stamocuota') || lowerK.includes('stamo_cuota')) {
                        const val = parseFloat(group.userObj[k]);
                        if (val > 0) loanCuota = val;
                    }
                });
                if (!isAuth) loanCuota = 0;
            }
            const netFinal = group.totalNeto - loanCuota;

            const tr = document.createElement('tr');
            
            // Toggle HTML for Confirmations
            let confirmationHtml = '';
            if (estado === 'Finalizado') {
                confirmationHtml = '<span class="text-success">✅ Confirmado</span>';
            } else {
                confirmationHtml = `
                    <label class="switch" style="display: flex; align-items: center; gap: 5px;">
                        <input type="checkbox" class="chk-confirm-user" data-uid="${group.userId}" ${group.allApproved ? 'checked' : ''}>
                        <span style="font-size: 12px;">Confirmar</span>
                    </label>
                `;
            }

            tr.style.cursor = 'pointer';
            tr.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <svg class="toggle-icon-cut" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" style="transition: transform 0.2s;">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                        <strong>${group.userName}</strong>
                    </div>
                </td>
                <td><span class="role-badge">${group.grupo}</span></td>
                <td>${group.totalHoras.toFixed(2)} h</td>
                <td>Q${group.totalBruto.toFixed(2)}</td>
                <td class="text-success">Q${group.totalBono.toFixed(2)}</td>
                <td class="text-danger">-Q${group.totalDescuento.toFixed(2)}</td>
                <td class="text-danger">-Q${loanCuota.toFixed(2)}</td>
                <td><strong>Q${netFinal.toFixed(2)}</strong></td>
                <td>${confirmationHtml}</td>
            `;

            const trSub = document.createElement('tr');
            trSub.className = 'hidden';
            trSub.style.backgroundColor = 'rgba(0,0,0,0.2)';
            
            let subHtml = `<td colspan="9" style="padding: 10px 20px;">
                <table style="width: 100%; margin: 10px 0; background: var(--bg-card); border-radius: 6px;">
                    <thead>
                        <tr>
                            <th style="font-size: 0.8rem; padding: 6px;">Fecha</th>
                            <th style="font-size: 0.8rem; padding: 6px;">Entrada</th>
                            <th style="font-size: 0.8rem; padding: 6px;">Salida</th>
                            <th style="font-size: 0.8rem; padding: 6px;">Horas</th>
                            <th style="font-size: 0.8rem; padding: 6px;">Monto Bruto</th>
                        </tr>
                    </thead>
                    <tbody>`;
            
            if (group.attendanceRecords.length === 0 && group.busRecords.length === 0) {
                subHtml += `<tr><td colspan="5" style="text-align:center; padding: 10px; font-size: 0.8rem; color: var(--text-muted);">Sin registros individuales.</td></tr>`;
            } else {
                group.attendanceRecords.forEach(a => {
                    subHtml += `<tr>
                        <td style="font-size: 0.8rem; padding: 6px;">${a.fecha}</td>
                        <td style="font-size: 0.8rem; padding: 6px;">${a.horaEntrada || '-'}</td>
                        <td style="font-size: 0.8rem; padding: 6px;">${a.horaSalida || '-'}</td>
                        <td style="font-size: 0.8rem; padding: 6px;">${(a.horasTrabajadas || 0).toFixed(2)} h</td>
                        <td style="font-size: 0.8rem; padding: 6px;">Q${(a.montoBruto || 0).toFixed(2)}</td>
                    </tr>`;
                });
                group.busRecords.forEach(a => {
                    subHtml += `<tr>
                        <td style="font-size: 0.8rem; padding: 6px;">${a.fecha ? a.fecha.split(' ')[0] : '-'}</td>
                        <td style="font-size: 0.8rem; padding: 6px;" colspan="3">Registro de Bus - Turnos: ${a.turno ? a.turno.split(',').length : 1}</td>
                        <td style="font-size: 0.8rem; padding: 6px;">Q${((a.ingresoDinero || 0) - (a.montoGasto || 0)).toFixed(2)} (Neto)</td>
                    </tr>`;
                });
            }
            
            subHtml += `</tbody></table></td>`;
            trSub.innerHTML = subHtml;

            tr.addEventListener('click', (e) => {
                if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'label' || e.target.classList.contains('chk-confirm-user')) return;
                trSub.classList.toggle('hidden');
                const icon = tr.querySelector('.toggle-icon-cut');
                if (icon) {
                    if (trSub.classList.contains('hidden')) {
                        icon.style.transform = 'rotate(0deg)';
                    } else {
                        icon.style.transform = 'rotate(90deg)';
                    }
                }
            });

            detailsBody.appendChild(tr);
            detailsBody.appendChild(trSub);
        });
    }

    if (btnSaveCutConfirmations) {
        btnSaveCutConfirmations.addEventListener('click', async () => {
            await saveConfirmations();
        });
    }

    if (btnFinalizeExportCut) {
        btnFinalizeExportCut.addEventListener('click', async () => {
            const mode = btnFinalizeExportCut.getAttribute('data-mode');
            
            if (mode === 'export-only') {
                btnFinalizeExportCut.disabled = true;
                btnFinalizeExportCut.textContent = 'Exportando PDF...';
                try {
                    const allUsers = window.AttendanceDB.getUsers();
                    await generatePayrollPDF(allUsers, currentCutData.attendance, currentCutData.busRecords);
                } catch (error) {
                    console.error(error);
                    showToast('Error', 'Error generando el PDF', 'danger');
                } finally {
                    btnFinalizeExportCut.disabled = false;
                    btnFinalizeExportCut.textContent = 'Exportar';
                }
                return;
            }
            
            // Primero guardar estado actual de confirmaciones
            const saveOk = await saveConfirmations(true);
            if (!saveOk) return;

            try {
                btnFinalizeExportCut.disabled = true;
                btnFinalizeExportCut.textContent = 'Finalizando...';
                
                const loggedInUser = window.currentUser;
                const res = await fetch(`/api/attendance/cuts/${currentCutId}/finalize`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ adminId: loggedInUser ? loggedInUser.id : 0 })
                });
                
                const data = await res.json();
                if (data.success) {
                    showToast('Corte Finalizado', 'El corte se ha finalizado correctamente.', 'success');
                    
                    // Re-cargar datos de la DB para actualizar los prestamos
                    await window.AttendanceDB.loadStateFromServer();
                    
                    // Refrescar el PDF
                    const allUsers = window.AttendanceDB.getUsers();
                    await generatePayrollPDF(allUsers, currentCutData.attendance, currentCutData.busRecords);
                    
                    cutDetailsModal.classList.add('hidden');
                    loadCuts(); // Refresh list
                } else {
                    showToast('Error', data.message || 'Error al finalizar.', 'danger');
                }
            } catch (error) {
                console.error(error);
                showToast('Error', 'Error de conexión', 'danger');
            } finally {
                btnFinalizeExportCut.disabled = false;
                btnFinalizeExportCut.textContent = 'Guardar y Exportar';
            }
        });
    }

    async function saveConfirmations(silent = false) {
        if (!currentCutId) return false;
        
        const checkboxes = document.querySelectorAll('.chk-confirm-user');
        const approvedUserIds = new Set();
        checkboxes.forEach(chk => {
            if (chk.checked) approvedUserIds.add(parseInt(chk.getAttribute('data-uid')));
        });
        
        const attToApprove = [];
        const busToApprove = [];
        
        currentCutData.attendance.forEach(rec => {
            if (approvedUserIds.has(rec.usuarioId)) {
                attToApprove.push({ id: rec.id, metodoPago: 'Efectivo' });
            }
        });
        currentCutData.busRecords.forEach(rec => {
            if (approvedUserIds.has(rec.usuarioId)) {
                busToApprove.push({ id: rec.id, metodoPago: 'Efectivo' });
            }
        });
        
        try {
            const loggedInUser = window.currentUser;
            const res = await fetch(`/api/attendance/cuts/${currentCutId}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminId: loggedInUser ? loggedInUser.id : 0,
                    attendanceApprovals: attToApprove,
                    busApprovals: busToApprove
                })
            });
            const data = await res.json();
            if (data.success) {
                if (!silent) showToast('Confirmaciones Guardadas', 'Las selecciones se han guardado.', 'success');
                return true;
            } else {
                showToast('Error', data.message || 'Error guardando.', 'danger');
                return false;
            }
        } catch (error) {
            console.error(error);
            showToast('Error', 'Error de conexión al guardar', 'danger');
            return false;
        }
    }


    // --- LÓGICA DE EXPORTACIÓN Y CORTE (MODULARIZADO) ---

    function formatDecimalHours(hoursDec) {
        if (!hoursDec) return '0.0 hrs';
        return hoursDec.toFixed(2) + ' hrs';
    }

    async function generatePayrollPDF(allUsers, filteredAttendance, filteredBuses) {
        const today = new Date();
        const dateString = today.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });

        let logoHtml = '';
        try {
            logoHtml = '<img src="logo.png" style="max-height: 60px;" alt="DCH Logo">';
        } catch(e) {
            logoHtml = '<h2 style="color: #1e3a8a; margin:0;">DCH MULTISERVICIOS</h2>';
        }

        let html = `
            <div style="padding: 20px; box-sizing: border-box;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 20px;">
                    <div>
                        ${logoHtml}
                    </div>
                    <div style="text-align: right;">
                        <h1 style="margin: 0; color: #111827; font-size: 24px;">Reporte de Pago de Planilla (Corte #${currentCutId})</h1>
                        <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Fecha de Generación: ${dateString}</p>
                    </div>
                </div>
        `;

        const grouped = {};
        const initGroup = (uid) => {
            if (!grouped[uid]) {
                const u = allUsers.find(user => user.id === uid);
                grouped[uid] = {
                    userObj: u,
                    userName: u ? u.nombre : 'Usuario Desconocido',
                    tipoPago: u ? u.tipoPago : 'Por Horas',
                    grupo: u ? u.grupo : 'N/A',
                    records: [], busRecords: [],
                    totalDiurnas: 0, totalNocturnas: 0, totalBruto: 0,
                    totalDescuento: 0, totalBono: 0, totalNeto: 0
                };
            }
        };

        filteredAttendance.forEach(rec => {
            initGroup(rec.usuarioId);
            grouped[rec.usuarioId].records.push(rec);
            grouped[rec.usuarioId].totalDiurnas += rec.horasDiurnas || 0;
            grouped[rec.usuarioId].totalNocturnas += rec.horasNocturnas || 0;
            grouped[rec.usuarioId].totalBruto += rec.montoBruto || 0;
            grouped[rec.usuarioId].totalDescuento += rec.descuento || 0;
            grouped[rec.usuarioId].totalBono += rec.bono || 0;
            grouped[rec.usuarioId].totalNeto += rec.montoNeto || 0;
        });

        filteredBuses.forEach(rec => {
            initGroup(rec.usuarioId);
            grouped[rec.usuarioId].busRecords.push(rec);
            grouped[rec.usuarioId].totalNeto += (rec.ingresoDinero || 0) - (rec.montoGasto || 0);
        });

        const userGroups = Object.values(grouped);
        
        if (userGroups.length === 0) {
            html += '<p style="text-align:center; color:#6b7280; margin-top: 50px;">No hay registros de asistencia para esta planilla.</p>';
        }

        userGroups.forEach(group => {
            let loanCuota = 0;
            let saldoActual = 0;
            if (group.userObj) {
                let isAuth = false;
                Object.keys(group.userObj).forEach(k => {
                    const lowerK = k.toLowerCase();
                    if (lowerK.includes('stamoestadocuota') || lowerK.includes('stamo_estado_cuota')) {
                        if (group.userObj[k] === 'Autorizado') isAuth = true;
                    }
                    if (lowerK.includes('stamocuota') || lowerK.includes('stamo_cuota')) {
                        const val = parseFloat(group.userObj[k]);
                        if (val > 0) loanCuota = val;
                    }
                    if (lowerK.includes('stamosaldo') || lowerK.includes('stamo_saldo')) {
                        const val = parseFloat(group.userObj[k]);
                        if (val > 0) saldoActual = val;
                    }
                });
                if (!isAuth) loanCuota = 0;
            }

            const netFinal = group.totalNeto - loanCuota;

            html += `
                <div style="margin-bottom: 30px; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; page-break-inside: avoid;">
                    <div style="background-color: #f3f4f6; padding: 12px 15px; border-bottom: 1px solid #d1d5db; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h3 style="margin: 0; color: #111827; font-size: 16px;">${group.userName}</h3>
                            <span style="font-size: 12px; color: #6b7280;">Grupo: ${group.grupo} &nbsp;|&nbsp; Tipo: ${group.tipoPago}</span>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-size: 12px; color: #6b7280;">Neto a Pagar</span>
                            <div style="font-size: 18px; font-weight: bold; color: #000000;">Q${netFinal.toFixed(2)}</div>
                        </div>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                        <thead>
                            <tr style="background-color: #f9fafb; border-bottom: 1px solid #e5e7eb; color: #374151;">
                                <th style="padding: 8px; text-align: left;">Fecha</th>
                                <th style="padding: 8px; text-align: center;">In/Out</th>
                                <th style="padding: 8px; text-align: center;">H. Diurnas</th>
                                <th style="padding: 8px; text-align: center;">H. Noct.</th>
                                <th style="padding: 8px; text-align: right;">Monto Bruto</th>
                                <th style="padding: 8px; text-align: right;">Bono</th>
                                <th style="padding: 8px; text-align: right;">Descuento</th>
                                <th style="padding: 8px; text-align: right;">Monto Neto</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            group.records.forEach(rec => {
                html += `
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                        <td style="padding: 8px;">${rec.fecha}</td>
                        <td style="padding: 8px; text-align: center;">${rec.horaEntrada} - ${rec.horaSalida || 'N/A'}</td>
                        <td style="padding: 8px; text-align: center;">${rec.horaSalida ? formatDecimalHours(rec.horasDiurnas) : '-'}</td>
                        <td style="padding: 8px; text-align: center;">${rec.horaSalida ? formatDecimalHours(rec.horasNocturnas) : '-'}</td>
                        <td style="padding: 8px; text-align: right;">${rec.horaSalida ? 'Q' + rec.montoBruto.toFixed(2) : '-'}</td>
                        <td style="padding: 8px; text-align: right; color: #000000;">${rec.horaSalida && rec.bono > 0 ? '+Q' + rec.bono.toFixed(2) : 'Q0.00'}</td>
                        <td style="padding: 8px; text-align: right; color: #000000;">${rec.horaSalida && rec.descuento > 0 ? '-Q' + rec.descuento.toFixed(2) : 'Q0.00'}</td>
                        <td style="padding: 8px; text-align: right; font-weight: bold;">${rec.horaSalida ? 'Q' + (rec.montoNeto || 0).toFixed(2) : '-'}</td>
                    </tr>
                `;
            });

            group.busRecords.forEach(rec => {
                const gananciaLocal = (rec.ingresoDinero || 0) - (rec.montoGasto || 0);
                html += `
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                        <td style="padding: 8px;">${rec.fecha}</td>
                        <td style="padding: 8px; text-align: center;" colspan="3">Bus / Ruta (${rec.turno || 'Día'})</td>
                        <td style="padding: 8px; text-align: right;">Q${(rec.ingresoDinero || 0).toFixed(2)}</td>
                        <td style="padding: 8px; text-align: right; color: #000000;">Q0.00</td>
                        <td style="padding: 8px; text-align: right; color: #000000;">${rec.montoGasto > 0 ? '-Q' + rec.montoGasto.toFixed(2) : 'Q0.00'}</td>
                        <td style="padding: 8px; text-align: right; font-weight: bold;">Q${gananciaLocal.toFixed(2)}</td>
                    </tr>
                `;
            });

            if (loanCuota > 0) {
                html += `
                    <tr style="background-color: #fffbeb; border-bottom: 2px solid #e5e7eb;">
                        <td style="padding: 10px 8px; color: #b45309; font-weight: bold;" colspan="6">
                            Préstamo / Adelanto (Saldo Pendiente: Q${saldoActual.toFixed(2)})
                        </td>
                        <td style="padding: 10px 8px; text-align: right; color: #000000; font-weight: bold;">
                            -Q${loanCuota.toFixed(2)}
                        </td>
                        <td style="padding: 10px 8px; text-align: right; color: #000000; font-weight: bold;">
                            -Q${loanCuota.toFixed(2)}
                        </td>
                    </tr>
                `;
            }

            html += `
                        </tbody>
                        <tfoot>
                            <tr style="background-color: #e5e7eb; font-weight: bold; color: #111827;">
                                <td style="padding: 10px 8px;" colspan="2">Suma Final:</td>
                                <td style="padding: 10px 8px; text-align: center;">${formatDecimalHours(group.totalDiurnas)}</td>
                                <td style="padding: 10px 8px; text-align: center;">${formatDecimalHours(group.totalNocturnas)}</td>
                                <td style="padding: 10px 8px; text-align: right;">Q${group.totalBruto.toFixed(2)}</td>
                                <td style="padding: 10px 8px; text-align: right; color: #000000;">${group.totalBono > 0 ? '+Q' + group.totalBono.toFixed(2) : 'Q0.00'}</td>
                                <td style="padding: 10px 8px; text-align: right; color: #000000;">${(group.totalDescuento + loanCuota) > 0 ? '-Q' + (group.totalDescuento + loanCuota).toFixed(2) : 'Q0.00'}</td>
                                <td style="padding: 10px 8px; text-align: right; color: #000000;">Q${netFinal.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
        });

        const opt = {
            margin:       10,
            filename:     `Planilla_DCH_Corte${currentCutId}_${dateString.replace(/\//g, '-')}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const finalHtml = `
            <div id="pdf-report-container" style="font-family: Arial, sans-serif; background: #fff; width: 100%; box-sizing: border-box;">
                <style>
                    #pdf-report-container, #pdf-report-container * {
                        color: #000000 !important;
                    }
                    #pdf-report-container th {
                        background-color: #f3f4f6 !important;
                        border-bottom: 1px solid #d1d5db !important;
                    }
                    #pdf-report-container td {
                        border-bottom: 1px solid #e5e7eb !important;
                    }
                </style>
                ${html}
            </div>
        `;

        await html2pdf().set(opt).from(finalHtml).save();
    }
