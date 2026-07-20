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
            const currentComp = window.AttendanceDB.currentCompany || 'Todas';
            const res = await fetch(`/api/attendance/cuts?empresa=${encodeURIComponent(currentComp)}`);
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
                    
                    let dateDisplay = cut.fechaGenerado;
                    if(dateDisplay) {
                        const p = dateDisplay.split(/[- :]/);
                        if(p.length >= 3) {
                            dateDisplay = p[2] + '/' + p[1] + '/' + p[0] + (p[3] ? ' ' + p[3] + ':' + p[4] : '');
                        }
                    }

                    tr.innerHTML = `
                        <td><strong>#${cut.id}</strong></td>
                        <td>${dateDisplay}</td>
                        <td><span class="role-badge" style="background-color: var(--${cut.estado === 'Pendiente' ? 'warning' : 'success'}); color:white;">${cut.estado}</span></td>
                        <td>
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                <button class="btn-primary btn-sm btn-view-cut" data-id="${cut.id}" data-estado="${cut.estado}">Ver Detalles</button>
                                <button class="btn-secondary btn-sm btn-export-pdf-direct" data-id="${cut.id}">Exportar a PDF</button>
                            </div>
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

                document.querySelectorAll('.btn-export-pdf-direct').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.target.getAttribute('data-id');
                        const originalText = e.target.textContent;
                        e.target.textContent = 'Generando...';
                        e.target.disabled = true;
                        try {
                            const res = await fetch(`/api/attendance/cuts/${id}/records`);
                            const data = await res.json();
                            
                            let signatures = [];
                            try {
                                const sigRes = await fetch(`/api/attendance/cuts/${id}/signatures`);
                                const sigData = await sigRes.json();
                                if (sigData.success) signatures = sigData.signatures;
                            } catch(err) { console.error('Error signatures:', err); }
                            
                            if (data.success) {
                                const allUsers = window.AttendanceDB.getUsers();
                                const oldId = currentCutId;
                                currentCutId = id; 
                                await generatePayrollPDF(allUsers, data.attendance, data.busRecords, signatures);
                                currentCutId = oldId;
                                showToast('PDF Generado', 'El PDF se ha descargado.', 'success');
                            }
                        } catch (err) {
                            console.error(err);
                            showToast('Error', 'Error al generar el PDF.', 'danger');
                        } finally {
                            e.target.textContent = originalText;
                            e.target.disabled = false;
                        }
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
            
            let signatures = [];
            try {
                const sigRes = await fetch(`/api/attendance/cuts/${id}/signatures`);
                if (sigRes.ok) {
                    const sigData = await sigRes.json();
                    signatures = sigData.success ? sigData.signatures : [];
                }
            } catch (e) {
                console.warn("No se pudieron cargar las firmas:", e);
            }
            
            if (data.success) {
                currentCutData = data;
                currentCutData.signatures = signatures;
                renderCutDetails(data.attendance, data.busRecords, estado, signatures);
            }
        } catch (error) {
            console.error('Error cargando detalles del corte:', error);
            detailsBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error al cargar.</td></tr>';
        }
    }

    function renderCutDetails(attendance, busRecords, estado, signatures = []) {
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

        const currentComp = window.AttendanceDB.currentCompany || 'Todas';

        attendance.forEach(rec => {
            const u = allUsers.find(user => user.id === rec.usuarioId);
            if (currentComp !== 'Todas' && u && u.empresa !== currentComp) return;
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
            const u = allUsers.find(user => user.id === rec.usuarioId);
            if (currentComp !== 'Todas' && u && u.empresa !== currentComp) return;
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
            
            // Toggle HTML for Confirmations / Signatures
            let confirmationHtml = '';
            if (estado === 'Finalizado') {
                const userSignature = signatures.find(s => s.user_id === group.userId);
                if (userSignature) {
                    const dateStr = new Date(userSignature.created_at).toLocaleString();
                    confirmationHtml = `
                        <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-start;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span class="text-success" style="font-size: 0.8rem;" title="Firmado el ${dateStr}">✅ Pago Firmado</span>
                                <button class="btn-table-action penalize" onclick="window.openPenalizeModal(${group.userId});" style="padding: 2px 6px; font-size: 0.7rem; width: auto; background-color: var(--danger); border-color: var(--danger); display: inline-block;">Descuento</button>
                            </div>
                            <img src="${userSignature.signature_base64}" alt="Firma" style="height: 40px; width: auto; max-width: 120px; object-fit: contain; background: white; border: 1px solid #ccc; border-radius: 4px;" />
                        </div>
                    `;
                } else {
                    confirmationHtml = `
                        <div style="display:flex; align-items:center; gap:8px;">
                            <button class="btn-table-action btn-sign-payment" data-uid="${group.userId}" data-cid="${currentCutId}" style="padding: 2px 6px; font-size: 0.7rem; width: auto; background-color: var(--success); border-color: var(--success); display: inline-block;">Firmar Pago</button>
                            <button class="btn-table-action penalize" onclick="window.openPenalizeModal(${group.userId});" style="padding: 2px 6px; font-size: 0.7rem; width: auto; background-color: var(--danger); border-color: var(--danger); display: inline-block;">Descuento</button>
                        </div>
                    `;
                }
            } else {
                confirmationHtml = `
                    <label class="switch" style="display: flex; align-items: center; gap: 5px; margin-bottom: 5px;">
                        <input type="checkbox" class="chk-confirm-user" data-uid="${group.userId}" ${group.allApproved ? 'checked' : ''}>
                        <span style="font-size: 12px;">Confirmar</span>
                    </label>
                    <button class="btn-table-action penalize" onclick="window.openPenalizeModal(${group.userId});" style="padding: 2px 6px; font-size: 0.7rem; width: auto; background-color: var(--danger); border-color: var(--danger); display: inline-block;">Descuento</button>
                `;
            }

            tr.style.cursor = 'pointer';
            tr.innerHTML = `
                <td data-label="Colaborador">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <svg class="toggle-icon-cut" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" style="transition: transform 0.2s;">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                        <strong>${group.userName}</strong>
                    </div>
                </td>
                <td data-label="Grupo"><span class="role-badge">${group.grupo}</span></td>
                <td data-label="H. Totales">${group.totalHoras.toFixed(2)} h</td>
                <td data-label="Bruto">Q${group.totalBruto.toFixed(2)}</td>
                <td class="text-success" data-label="Bonos">Q${group.totalBono.toFixed(2)}</td>
                <td class="text-danger" data-label="Descuentos">-Q${group.totalDescuento.toFixed(2)}</td>
                <td class="text-danger" data-label="Préstamo">-Q${loanCuota.toFixed(2)}</td>
                <td data-label="Neto Final"><strong>Q${netFinal.toFixed(2)}</strong></td>
                <td data-label="Confirmación">${confirmationHtml}</td>
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
                            <th style="font-size: 0.8rem; padding: 6px; text-align: center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>`;
            
            if (group.attendanceRecords.length === 0 && group.busRecords.length === 0) {
                subHtml += `<tr><td colspan="6" style="text-align:center; padding: 10px; font-size: 0.8rem; color: var(--text-muted);">Sin registros individuales.</td></tr>`;
            } else {
                let currentDay = '';
                group.attendanceRecords.forEach(a => {
                    const formattedDate = typeof formatDateDDMMYYYY === 'function' ? formatDateDDMMYYYY(a.fecha) : a.fecha;
                    if (formattedDate !== currentDay) {
                        currentDay = formattedDate;
                        subHtml += `<tr class="day-group-header" style="background-color: rgba(255, 255, 255, 0.05); font-weight: bold; color: var(--primary-color); border-bottom: 1px solid var(--border-color);"><td colspan="6" style="padding: 4px 10px; font-size: 0.9rem;">${currentDay}</td></tr>`;
                    }

                    let photosHtml = '';
                    if (a.fotoEntrada) {
                        photosHtml += `<a href="${a.fotoEntrada}" target="_blank" style="margin-right:4px;"><img src="${a.fotoEntrada}" style="width:24px; height:24px; border-radius:4px; object-fit:cover; display:inline-block;" title="Foto Entrada"></a>`;
                    }
                    if (a.fotoSalida) {
                        photosHtml += `<a href="${a.fotoSalida}" target="_blank"><img src="${a.fotoSalida}" style="width:24px; height:24px; border-radius:4px; object-fit:cover; display:inline-block;" title="Foto Salida"></a>`;
                    }
                    
                    const isPiecework = group.userObj && (group.userObj.tipoPago === 'Destajo' || group.userObj.tipoPago === 'Por Trato');
                    if (isPiecework) {
                        subHtml += `<tr>
                            <td data-label="Fecha" style="font-size: 0.8rem; padding: 6px;">${formattedDate}</td>
                            <td data-label="Trabajo" style="font-size: 0.8rem; padding: 6px;" colspan="2">${a.trabajoDescripcion || 'N/A'}</td>
                            <td data-label="Cantidad" style="font-size: 0.8rem; padding: 6px;">${a.trabajoCantidad || 0} Und.</td>
                            <td data-label="Total" style="font-size: 0.8rem; padding: 6px;">Q${(a.montoBruto || 0).toFixed(2)}</td>
                            <td data-label="Acciones" style="font-size: 0.8rem; padding: 6px; text-align: center;">
                                <div style="display:flex; justify-content:flex-end; align-items:center; gap:6px; flex-wrap:wrap;">
                                    ${photosHtml}
                                    <button class="btn-table-action warning btn-correct-record" data-rectype="attendance" data-recid="${a.id}" style="padding: 2px 6px; font-size: 0.7rem; width: auto; background-color: var(--warning); border-color: var(--warning); color: black;">Corrección</button>
                                </div>
                            </td>
                        </tr>`;
                    } else {
                        subHtml += `<tr>
                            <td data-label="Fecha" style="font-size: 0.8rem; padding: 6px;">${formattedDate}</td>
                            <td data-label="Entrada" style="font-size: 0.8rem; padding: 6px;">${a.horaEntrada || '-'}</td>
                            <td data-label="Salida" style="font-size: 0.8rem; padding: 6px;">${a.horaSalida || '-'}</td>
                            <td data-label="Horas" style="font-size: 0.8rem; padding: 6px;">${(a.horasTrabajadas || 0).toFixed(2)} h</td>
                            <td data-label="Monto Bruto" style="font-size: 0.8rem; padding: 6px;">Q${(a.montoBruto || 0).toFixed(2)}</td>
                            <td data-label="Acciones" style="font-size: 0.8rem; padding: 6px; text-align: center;">
                                <div style="display:flex; justify-content:flex-end; align-items:center; gap:6px; flex-wrap:wrap;">
                                    ${photosHtml}
                                    <button class="btn-table-action warning btn-correct-record" data-rectype="attendance" data-recid="${a.id}" style="padding: 2px 6px; font-size: 0.7rem; width: auto; background-color: var(--warning); border-color: var(--warning); color: black;">Corrección</button>
                                </div>
                            </td>
                        </tr>`;
                    }
                });
                group.busRecords.forEach(a => {
                    subHtml += `<tr>
                        <td data-label="Fecha" style="font-size: 0.8rem; padding: 6px;">${a.fecha ? a.fecha.split(' ')[0] : '-'}</td>
                        <td data-label="Detalle" style="font-size: 0.8rem; padding: 6px;" colspan="3">Registro de Bus - Turnos: ${a.turno ? a.turno.split(',').length : 1}</td>
                        <td data-label="Neto" style="font-size: 0.8rem; padding: 6px;">Q${((a.ingresoDinero || 0) - (a.montoGasto || 0)).toFixed(2)} (Neto)</td>
                        <td data-label="Acciones" style="font-size: 0.8rem; padding: 6px;"></td>
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
                    await generatePayrollPDF(allUsers, currentCutData.attendance, currentCutData.busRecords, currentCutData.signatures || []);
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
                    await generatePayrollPDF(allUsers, currentCutData.attendance, currentCutData.busRecords, currentCutData.signatures || []);
                    
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

    const pdfFormatDate = (dateStr) => {
        if(!dateStr) return '';
        let f = dateStr.split('T')[0];
        let p = f.split('-');
        if(p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
        return f;
    };

    async function generatePayrollPDF(allUsers, filteredAttendance, filteredBuses, signatures = []) {
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

        const currentComp = window.AttendanceDB.currentCompany || 'Todas';

        filteredAttendance.forEach(rec => {
            const u = allUsers.find(user => user.id === rec.usuarioId);
            if (currentComp !== 'Todas' && u && u.empresa !== currentComp) return;
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
            const u = allUsers.find(user => user.id === rec.usuarioId);
            if (currentComp !== 'Todas' && u && u.empresa !== currentComp) return;
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
                            <h3 style="margin: 0; color: #111827; font-size: 16px;">${group.userName} ${group.userObj && group.userObj.descuentaAlmuerzo == 1 ? '<span style="color:#b91c1c; font-size: 12px; margin-left: 10px;">(Descuento de Almuerzo)</span>' : ''}</h3>
                            <span style="font-size: 12px; color: #6b7280;">Grupo: ${group.grupo} &nbsp;|&nbsp; Tipo: ${group.tipoPago}</span>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-size: 12px; color: #6b7280;">Neto a Pagar</span>
                            <div style="font-size: 18px; font-weight: bold; color: #000000;">Q${netFinal.toFixed(2)}</div>
                        </div>
                    </div>`;
            let tableHtml = '';
            const isPiecework = group.tipoPago === 'Destajo' || group.tipoPago === 'Por Trato';

            if (isPiecework) {
                tableHtml += `
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; margin-bottom: 0;">
                        <thead>
                            <tr style="background-color: #f3f4f6; border-bottom: 2px solid #d1d5db; color: #1f2937; font-weight: bold;">
                                <th style="padding: 10px 8px; text-align: left; width: 14%;">Fecha</th>
                                <th style="padding: 10px 8px; text-align: left; width: 36%;">Trabajo Justificado</th>
                                <th style="padding: 10px 8px; text-align: center; width: 14%;">Cantidad</th>
                                <th style="padding: 10px 8px; text-align: right; width: 12%;">Bono</th>
                                <th style="padding: 10px 8px; text-align: right; width: 12%;">Descuento</th>
                                <th style="padding: 10px 8px; text-align: right; width: 12%;">Total Trabajo</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                group.records.forEach((rec, idx) => {
                    const bg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
                    tableHtml += `
                        <tr style="background-color: ${bg}; border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 8px;">${pdfFormatDate(rec.fecha)}</td>
                            <td style="padding: 8px; text-align: left; color: #4b5563;">${rec.trabajoDescripcion || 'N/A'}</td>
                            <td style="padding: 8px; text-align: center; color: #4b5563;">${rec.trabajoCantidad || 0} Und.</td>
                            <td style="padding: 8px; text-align: right; color: #047857;">${rec.horaSalida && rec.bono > 0 ? '+Q' + rec.bono.toFixed(2) : '-'}</td>
                            <td style="padding: 8px; text-align: right; color: #b91c1c;">${rec.horaSalida && rec.descuento > 0 ? '-Q' + rec.descuento.toFixed(2) : '-'}</td>
                            <td style="padding: 8px; text-align: right; font-weight: bold; color: #111827;">Q${(rec.montoBruto || 0).toFixed(2)}</td>
                        </tr>
                    `;
                });

                if (loanCuota > 0) {
                    tableHtml += `
                        <tr style="background-color: #fffbeb; border-bottom: 2px solid #e5e7eb;">
                            <td style="padding: 10px 8px; color: #b45309; font-weight: bold;" colspan="2">Préstamo / Adelanto</td>
                            <td style="padding: 10px 8px; color: #b45309; text-align: center;" colspan="2">(Saldo: Q${saldoActual.toFixed(2)})</td>
                            <td style="padding: 10px 8px; text-align: right; color: #b91c1c; font-weight: bold;">-Q${loanCuota.toFixed(2)}</td>
                            <td style="padding: 10px 8px; text-align: right; color: #111827; font-weight: bold;">-Q${loanCuota.toFixed(2)}</td>
                        </tr>
                    `;
                }

                tableHtml += `
                        </tbody>
                        <tfoot>
                            <tr style="background-color: #e5e7eb; font-weight: bold; color: #111827; border-top: 2px solid #9ca3af;">
                                <td style="padding: 12px 8px;">Suma Final:</td>
                                <td></td>
                                <td></td>
                                <td style="padding: 12px 8px; text-align: right; color: #047857;">${group.totalBono > 0 ? '+Q' + group.totalBono.toFixed(2) : 'Q0.00'}</td>
                                <td style="padding: 12px 8px; text-align: right; color: #b91c1c;">${(group.totalDescuento + loanCuota) > 0 ? '-Q' + (group.totalDescuento + loanCuota).toFixed(2) : 'Q0.00'}</td>
                                <td style="padding: 12px 8px; text-align: right; font-size: 13px;">Q${netFinal.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                `;
            } else {
                tableHtml += `
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; margin-bottom: 0;">
                        <thead>
                            <tr style="background-color: #f3f4f6; border-bottom: 2px solid #d1d5db; color: #1f2937; font-weight: bold;">
                                <th style="padding: 10px 8px; text-align: left; width: 14%;">Fecha</th>
                                <th style="padding: 10px 8px; text-align: center; width: 16%;">In/Out</th>
                                <th style="padding: 10px 8px; text-align: center; width: 10%;">H. Diurnas</th>
                                <th style="padding: 10px 8px; text-align: center; width: 10%;">H. Noct.</th>
                                <th style="padding: 10px 8px; text-align: right; width: 12%;">Monto Bruto</th>
                                <th style="padding: 10px 8px; text-align: right; width: 12%;">Bono</th>
                                <th style="padding: 10px 8px; text-align: right; width: 12%;">Descuento</th>
                                <th style="padding: 10px 8px; text-align: right; width: 14%;">Monto Neto</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                let rowCount = 0;
                group.records.forEach(rec => {
                    const bg = rowCount % 2 === 0 ? '#ffffff' : '#f9fafb';
                    rowCount++;
                    tableHtml += `
                        <tr style="background-color: ${bg}; border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 8px;">${pdfFormatDate(rec.fecha)}</td>
                            <td style="padding: 8px; text-align: center; color: #4b5563;">${rec.horaEntrada} - ${rec.horaSalida || 'N/A'}</td>
                            <td style="padding: 8px; text-align: center; color: #4b5563;">${rec.horaSalida ? formatDecimalHours(rec.horasDiurnas) : '-'}</td>
                            <td style="padding: 8px; text-align: center; color: #4b5563;">${rec.horaSalida ? formatDecimalHours(rec.horasNocturnas) : '-'}</td>
                            <td style="padding: 8px; text-align: right; color: #111827;">${rec.horaSalida ? 'Q' + rec.montoBruto.toFixed(2) : '-'}</td>
                            <td style="padding: 8px; text-align: right; color: #047857;">${rec.horaSalida && rec.bono > 0 ? '+Q' + rec.bono.toFixed(2) : '-'}</td>
                            <td style="padding: 8px; text-align: right; color: #b91c1c;">${rec.horaSalida && rec.descuento > 0 ? '-Q' + rec.descuento.toFixed(2) : '-'}</td>
                            <td style="padding: 8px; text-align: right; font-weight: bold; color: #111827;">${rec.horaSalida ? 'Q' + (rec.montoNeto || 0).toFixed(2) : '-'}</td>
                        </tr>
                    `;
                });

                group.busRecords.forEach(rec => {
                    const bg = rowCount % 2 === 0 ? '#ffffff' : '#f9fafb';
                    rowCount++;
                    const gananciaLocal = (rec.ingresoDinero || 0) - (rec.montoGasto || 0);
                    tableHtml += `
                        <tr style="background-color: ${bg}; border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 8px;">${pdfFormatDate(rec.fecha)}</td>
                            <td style="padding: 8px; text-align: center; color: #4b5563;" colspan="3">Bus / Ruta (${rec.turno || 'Día'})</td>
                            <td style="padding: 8px; text-align: right; color: #111827;">Q${(rec.ingresoDinero || 0).toFixed(2)}</td>
                            <td style="padding: 8px; text-align: right; color: #047857;">-</td>
                            <td style="padding: 8px; text-align: right; color: #b91c1c;">${rec.montoGasto > 0 ? '-Q' + rec.montoGasto.toFixed(2) : '-'}</td>
                            <td style="padding: 8px; text-align: right; font-weight: bold; color: #111827;">Q${gananciaLocal.toFixed(2)}</td>
                        </tr>
                    `;
                });

                if (loanCuota > 0) {
                    tableHtml += `
                        <tr style="background-color: #fffbeb; border-bottom: 2px solid #e5e7eb;">
                            <td style="padding: 10px 8px; color: #b45309; font-weight: bold;" colspan="2">Préstamo / Adelanto</td>
                            <td style="padding: 10px 8px; color: #b45309; text-align: center;" colspan="4">(Saldo Pendiente: Q${saldoActual.toFixed(2)})</td>
                            <td style="padding: 10px 8px; text-align: right; color: #b91c1c; font-weight: bold;">-Q${loanCuota.toFixed(2)}</td>
                            <td style="padding: 10px 8px; text-align: right; color: #111827; font-weight: bold;">-Q${loanCuota.toFixed(2)}</td>
                        </tr>
                    `;
                }

                tableHtml += `
                        </tbody>
                        <tfoot>
                            <tr style="background-color: #e5e7eb; font-weight: bold; color: #111827; border-top: 2px solid #9ca3af;">
                                <td style="padding: 12px 8px;">Suma Final:</td>
                                <td></td>
                                <td style="padding: 12px 8px; text-align: center;">${formatDecimalHours(group.totalDiurnas)}</td>
                                <td style="padding: 12px 8px; text-align: center;">${formatDecimalHours(group.totalNocturnas)}</td>
                                <td style="padding: 12px 8px; text-align: right;">Q${group.totalBruto.toFixed(2)}</td>
                                <td style="padding: 12px 8px; text-align: right; color: #047857;">${group.totalBono > 0 ? '+Q' + group.totalBono.toFixed(2) : 'Q0.00'}</td>
                                <td style="padding: 12px 8px; text-align: right; color: #b91c1c;">${(group.totalDescuento + loanCuota) > 0 ? '-Q' + (group.totalDescuento + loanCuota).toFixed(2) : 'Q0.00'}</td>
                                <td style="padding: 12px 8px; text-align: right; font-size: 13px;">Q${netFinal.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                `;
            }

            html += tableHtml;

            const userSig = signatures.find(s => s.user_id === group.userObj?.id);
            if (userSig && userSig.signature_base64) {
                const dateStr = new Date(userSig.created_at).toLocaleString();
                html += `
                    <div style="background-color: #f9fafb; padding: 10px 15px; border-top: 1px solid #d1d5db; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 12px; color: #166534; font-weight: bold;">✅ Firmado el ${dateStr}</span>
                        <img src="${userSig.signature_base64}" alt="Firma" style="height: 40px; width: auto; max-width: 150px; object-fit: contain; background: white; border: 1px solid #ccc; border-radius: 4px;" />
                    </div>
                `;
            }

            html += `
                </div>
            `;
        });

        const opt = {
            margin:       10,
            filename:     `Planilla_DCH_Corte${currentCutId}_${dateString.replace(/\//g, '-')}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, windowWidth: 1024 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        const finalHtml = `
            <div id="pdf-report-container" style="font-family: Arial, sans-serif; background: #fff; width: 1024px; max-width: 1024px; box-sizing: border-box;">
                <style>
                    #pdf-report-container, #pdf-report-container * {
                        color: #000000 !important;
                    }
                    #pdf-report-container table {
                        border-collapse: collapse !important;
                        border-spacing: 0 !important;
                        width: 100% !important;
                        table-layout: fixed !important;
                        background-color: transparent !important;
                    }
                    #pdf-report-container tr {
                        display: table-row !important;
                        background-color: transparent !important;
                        border: none !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    #pdf-report-container td, #pdf-report-container th {
                        display: table-cell !important;
                        border: none !important;
                        border-bottom: 1px solid #e5e7eb !important;
                        border-radius: 0 !important;
                        background-color: transparent !important;
                    }
                </style>
                ${html}
            </div>
        `;

        await html2pdf().set(opt).from(finalHtml).save();
    }

    // --- SIGNATURE PAD LOGIC ---
    // Inyectar el modal dinámicamente si no existe (evita problemas de caché en index.html)
    if (!document.getElementById('signature-modal')) {
        const modalHtml = `
        <!-- ==================== SIGNATURE MODAL ==================== -->
        <div id="signature-modal" class="modal-overlay hidden" style="z-index: 3000;">
            <div class="modal-card" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Firma de Recibo de Pago</h2>
                    <span class="close" onclick="document.getElementById('signature-modal').classList.add('hidden')">&times;</span>
                </div>
                <div class="modal-body" style="text-align: center;">
                    <p class="text-muted" style="margin-bottom: 10px;">Por favor, dibuje su firma en el recuadro para confirmar la recepción del pago.</p>
                    <div style="border: 2px solid var(--border-color); border-radius: 8px; background-color: #fff; display: inline-block;">
                        <canvas id="signature-pad" width="400" height="200" style="touch-action: none; cursor: crosshair;"></canvas>
                    </div>
                    <input type="hidden" id="signature-cut-id">
                    <input type="hidden" id="signature-user-id">
                </div>
                <div class="modal-footer" style="display: flex; justify-content: space-between; margin-top: 15px;">
                    <button class="btn-secondary" id="btn-clear-signature">Limpiar</button>
                    <div>
                        <button class="btn-secondary" onclick="document.getElementById('signature-modal').classList.add('hidden')">Cancelar</button>
                        <button class="btn-primary" id="btn-save-signature" style="background-color: var(--success); border-color: var(--success);">Guardar Firma</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    let signaturePadCanvas = document.getElementById('signature-pad');
    let signatureCtx = signaturePadCanvas ? signaturePadCanvas.getContext('2d') : null;
    let isDrawing = false;
    let lastX = 0, lastY = 0;

    if (signaturePadCanvas) {
        const getXY = (e) => {
            const rect = signaturePadCanvas.getBoundingClientRect();
            let clientX = e.clientX, clientY = e.clientY;
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            }
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        };

        const drawStart = (e) => {
            e.preventDefault();
            isDrawing = true;
            const pos = getXY(e);
            lastX = pos.x;
            lastY = pos.y;
        };

        const drawMove = (e) => {
            if (!isDrawing) return;
            e.preventDefault();
            const pos = getXY(e);
            signatureCtx.beginPath();
            signatureCtx.moveTo(lastX, lastY);
            signatureCtx.lineTo(pos.x, pos.y);
            signatureCtx.strokeStyle = "#000";
            signatureCtx.lineWidth = 2;
            signatureCtx.lineCap = "round";
            signatureCtx.stroke();
            lastX = pos.x;
            lastY = pos.y;
        };

        const drawEnd = (e) => {
            if (isDrawing) e.preventDefault();
            isDrawing = false;
        };

        signaturePadCanvas.addEventListener('mousedown', drawStart);
        signaturePadCanvas.addEventListener('mousemove', drawMove);
        signaturePadCanvas.addEventListener('mouseup', drawEnd);
        signaturePadCanvas.addEventListener('mouseout', drawEnd);
        
        signaturePadCanvas.addEventListener('touchstart', drawStart, {passive: false});
        signaturePadCanvas.addEventListener('touchmove', drawMove, {passive: false});
        signaturePadCanvas.addEventListener('touchend', drawEnd);
    }

    const btnClearSignature = document.getElementById('btn-clear-signature');
    if (btnClearSignature) {
        btnClearSignature.addEventListener('click', () => {
            if (signatureCtx && signaturePadCanvas) {
                signatureCtx.clearRect(0, 0, signaturePadCanvas.width, signaturePadCanvas.height);
            }
        });
    }

    const btnSaveSignature = document.getElementById('btn-save-signature');
    if (btnSaveSignature) {
        btnSaveSignature.addEventListener('click', async () => {
            if (!signaturePadCanvas) return;
            
            const blank = document.createElement('canvas');
            blank.width = signaturePadCanvas.width;
            blank.height = signaturePadCanvas.height;
            if (signaturePadCanvas.toDataURL() === blank.toDataURL()) {
                alert('Debe realizar una firma antes de guardar.');
                return;
            }
            
            const dataUrl = signaturePadCanvas.toDataURL('image/png');
            const cutId = document.getElementById('signature-cut-id').value;
            const userId = document.getElementById('signature-user-id').value;
            
            btnSaveSignature.disabled = true;
            btnSaveSignature.textContent = 'Guardando...';
            
            try {
                const res = await fetch(`/api/attendance/cuts/${cutId}/signatures`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId, signature_base64: dataUrl })
                });
                const data = await res.json();
                if (data.success) {
                    alert('Firma guardada correctamente.');
                    document.getElementById('signature-modal').classList.add('hidden');
                    openCutDetails(cutId, 'Finalizado'); 
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (error) {
                console.error(error);
                alert('Error guardando firma.');
            } finally {
                btnSaveSignature.disabled = false;
                btnSaveSignature.textContent = 'Guardar Firma';
            }
        });
    }

    document.addEventListener('click', (e) => {
        const signBtn = e.target.closest('.btn-sign-payment');
        if (signBtn) {
            e.stopPropagation();
            const userId = signBtn.getAttribute('data-uid');
            const cutId = signBtn.getAttribute('data-cid');
            
            document.getElementById('signature-user-id').value = userId;
            document.getElementById('signature-cut-id').value = cutId;
            
            if (signatureCtx && signaturePadCanvas) {
                signatureCtx.clearRect(0, 0, signaturePadCanvas.width, signaturePadCanvas.height);
            }
            
            const sigModal = document.getElementById('signature-modal');
            if (sigModal) {
                sigModal.classList.remove('hidden');
            }
        }
    });
