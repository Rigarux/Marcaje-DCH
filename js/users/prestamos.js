    // --- MÓDULO PRÉSTAMOS ---
    const loanModal = document.getElementById('loan-modal');
    const btnOpenLoanModal = document.getElementById('btn-open-loan-modal');
    const btnCloseLoanModal = document.getElementById('btn-close-loan-modal');
    const btnCancelLoan = document.getElementById('btn-cancel-loan');
    const loanForm = document.getElementById('loan-form');
    const loanUserSelect = document.getElementById('loan-user-select');
    const loanAmountInput = document.getElementById('loan-amount');
    const loanInstallmentsSelect = document.getElementById('loan-installments');
    const adminLoansTable = document.getElementById('admin-loans-table');

    function populateLoansUsersSelect() {
        if (!loanUserSelect) return;
        let users = window.AttendanceDB.getUsers();
        
        const currentComp = window.AttendanceDB.currentCompany;
        if (currentUser.rol === 'superadmin') {
            if (currentComp && currentComp !== 'Todas') {
                users = users.filter(u => u.empresa === currentComp || u.empresas_asignadas?.includes(currentComp));
            }
        } else {
            if (currentComp && currentComp !== 'Todas') {
                users = users.filter(u => u.empresa === currentComp || u.empresas_asignadas?.includes(currentComp));
            } else {
                users = [];
            }
        }
        
        loanUserSelect.innerHTML = '<option value="" disabled selected>Seleccione un colaborador...</option>';
        users.filter(u => u.rol === 'usr' || u.rol === 'leader').forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = `${u.nombre} (@${u.username})`;
            loanUserSelect.appendChild(opt);
        });
    }

    function renderAdminLoansTable() {
        if (!adminLoansTable) return;
        let loans = window.AttendanceDB.getLoans();
        
        const currentComp = window.AttendanceDB.currentCompany;
        const allUsers = window.AttendanceDB.getUsers();
        
        if (currentUser.rol === 'superadmin') {
            if (currentComp && currentComp !== 'Todas') {
                const usersInCompany = allUsers.filter(u => u.empresa === currentComp || u.empresas_asignadas?.includes(currentComp)).map(u => u.id);
                loans = loans.filter(l => usersInCompany.includes(l.usuarioId));
            }
        } else {
            if (currentComp && currentComp !== 'Todas') {
                const usersInCompany = allUsers.filter(u => u.empresa === currentComp || u.empresas_asignadas?.includes(currentComp)).map(u => u.id);
                loans = loans.filter(l => usersInCompany.includes(l.usuarioId));
            } else {
                loans = [];
            }
        }

        adminLoansTable.innerHTML = '';

        if (loans.length === 0) {
            adminLoansTable.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align:center; padding:20px;">No hay solicitudes de préstamos registradas.</td></tr>`;
            return;
        }

        loans.forEach(l => {
            let statusClass = 'pending';
            if (l.estado === 'Aprobado') statusClass = 'approved';
            if (l.estado === 'Rechazado') statusClass = 'rejected';

            let actions = '';
            if (l.estado === 'Pendiente') {
                actions = `
                    <button class="btn-table-action approve approve-loan-btn" data-id="${l.id}">Aprobar</button>
                    <button class="btn-table-action penalize reject-loan-btn" data-id="${l.id}">Rechazar</button>
                `;
            } else {
                actions = `<span class="text-muted" style="font-size:0.8rem;">Procesado</span>
                           <button class="btn-table-action penalize delete-loan-btn" data-id="${l.id}" style="margin-left:5px; padding:2px 6px; font-size:0.75rem;">Eliminar</button>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Colaborador"><strong>${l.nombreEmpleado || 'Colaborador'}</strong></td>
                <td data-label="Fecha">${typeof formatDateDDMMYYYY === 'function' ? formatDateDDMMYYYY(l.fecha) : l.fecha}</td>
                <td data-label="Monto Solicitado">Q${(l.monto || 0).toFixed(2)}</td>
                <td data-label="Cuota Sugerida">Q${(l.cuotaMonto || (l.monto / l.cuotas)).toFixed(2)} / pago</td>
                <td data-label="Estado"><span class="table-badge ${statusClass}">${l.estado}</span></td>
                <td data-label="Acciones">
                    <div style="display:flex; align-items:center; gap:5px;">
                        ${actions}
                    </div>
                </td>
            `;
            adminLoansTable.appendChild(tr);
        });

        // Listeners tabla préstamos
        adminLoansTable.querySelectorAll('.approve-loan-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const lId = parseInt(e.target.getAttribute('data-id'));
                const success = await window.AttendanceDB.approveLoan(lId, currentUser.id);
                if (success) {
                    showToast('Préstamo Aprobado', 'La solicitud de préstamo fue aprobada con éxito.', 'success');
                    renderAdminLoansTable();
                } else {
                    showToast('Error', 'No se pudo aprobar la solicitud.', 'danger');
                }
            });
        });

        adminLoansTable.querySelectorAll('.reject-loan-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const lId = parseInt(e.target.getAttribute('data-id'));
                const success = await window.AttendanceDB.rejectLoan(lId, currentUser.id);
                if (success) {
                    showToast('Préstamo Rechazado', 'La solicitud de préstamo fue denegada.', 'info');
                    renderAdminLoansTable();
                } else {
                    showToast('Error', 'No se pudo procesar la acción.', 'danger');
                }
            });
        });

        adminLoansTable.querySelectorAll('.delete-loan-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const lId = parseInt(e.target.getAttribute('data-id'));
                if (await appConfirm('Confirmación', '¿Estás seguro de que deseas eliminar este registro de préstamo?')) {
                    const success = await window.AttendanceDB.deleteLoan(lId, currentUser.id);
                    if (success) {
                        showToast('Registro Eliminado', 'Se ha eliminado el registro del préstamo.', 'info');
                        renderAdminLoansTable();
                    }
                }
            });
        });

        // --- SECCIÓN: PRÉSTAMOS ACTIVOS ---
        const activeLoansTable = document.getElementById('admin-active-loans-table');
        if (activeLoansTable) {
            activeLoansTable.innerHTML = '';
            const allUsers = window.AttendanceDB.getUsers();
            let usersWithLoans = allUsers.filter(u => (u.préstamoTotal > 0 || u.préstamosaldo > 0));
            
            const currentComp = window.AttendanceDB.currentCompany;
            if (currentComp && currentComp !== 'Todas') {
                usersWithLoans = usersWithLoans.filter(u => u.empresa === currentComp);
            }

            if (usersWithLoans.length === 0) {
                activeLoansTable.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align:center; padding:20px;">No hay colaboradores con préstamos activos configurados.</td></tr>`;
            } else {
                usersWithLoans.forEach(u => {
                    let statusClass = 'pending';
                    if (u.préstamoEstadoCuota === 'Autorizado') statusClass = 'approved';
                    if (u.préstamoEstadoCuota === 'Ninguno') statusClass = 'rejected';

                    let actions = '';
                    if (u.préstamoEstadoCuota === 'Pendiente de Autorizar') {
                        actions = `<button class="btn-table-action approve authorize-cuota-btn" data-userid="${u.id}">Autorizar Cobro</button>`;
                    } else if (u.préstamoEstadoCuota === 'Autorizado') {
                        actions = `<button class="btn-table-action penalize reset-cuota-btn" data-userid="${u.id}">Restablecer</button>`;
                    } else {
                        actions = `<span class="text-muted">-</span>`;
                    }

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td data-label="Colaborador"><strong>${u.nombre}</strong></td>
                        <td data-label="Préstamo Total">Q${(u.préstamoTotal || 0).toFixed(2)}</td>
                        <td data-label="Saldo Pendiente"><strong>Q${(u.préstamosaldo || 0).toFixed(2)}</strong></td>
                        <td data-label="Cuota de Cobro">Q${(u.préstamoCuota || 0).toFixed(2)}</td>
                        <td data-label="Estado del Cobro"><span class="table-badge ${statusClass}">${u.préstamoEstadoCuota || 'Ninguno'}</span></td>
                        <td data-label="Acciones">${actions}</td>
                    `;
                    activeLoansTable.appendChild(tr);
                });

                // Listeners para autorizar/restablecer cuotas
                activeLoansTable.querySelectorAll('.authorize-cuota-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const uid = parseInt(btn.getAttribute('data-userid'));
                        const res = await window.AttendanceDB.authorizeLoanCuota(uid, currentUser.id);
                        if (res.success) {
                            showToast('Cuota Autorizada', 'La cuota semanal de cobro ha sido autorizada y descontada del saldo del colaborador.', 'success');
                            renderAdminLoansTable();
                        } else {
                            showToast('Error', res.message, 'danger');
                        }
                    });
                });

                activeLoansTable.querySelectorAll('.reset-cuota-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const uid = parseInt(btn.getAttribute('data-userid'));
                        const res = await window.AttendanceDB.resetLoanCuota(uid, currentUser.id);
                        if (res.success) {
                            showToast('Cuota Restablecida', 'El estado de la cuota semanal ha regresado a Pendiente de Autorizar.', 'info');
                            renderAdminLoansTable();
                        } else {
                            showToast('Error', res.message, 'danger');
                        }
                    });
                });
            }
        }
    }

    window.renderAdminVacationsTable = function() {
        const adminVacationsTable = document.getElementById('admin-vacations-table');
        if (!adminVacationsTable) return;
        
        let allUsers = window.AttendanceDB.getUsers().filter(u => u.rol !== 'superadmin' && u.rol !== 'admin');
        const currentComp = window.AttendanceDB.currentCompany;
        if (currentComp && currentComp !== 'Todas') {
            allUsers = allUsers.filter(u => u.empresa === currentComp);
        }

        const container = document.getElementById('admin-vacations-container');
        if (container) {
            container.style.display = (typeof currentUser !== 'undefined' && currentUser && currentUser.rol === 'leader') ? 'none' : 'block';
        }

        if (adminVacationsTable) {
            adminVacationsTable.innerHTML = '';
            
            if (allUsers.length === 0) {
                adminVacationsTable.innerHTML = `<tr><td colspan="5" class="text-muted" style="text-align:center; padding:20px;">No hay usuarios.</td></tr>`;
            }
            
            let attendanceRecords = window.AttendanceDB.getAttendance();

            allUsers.forEach(u => {
                let statusClass = u.descansoEstado === 'Pendiente de Autorizar' ? 'pending' : 'approved';
                let actions = '';
                
                if (u.descansoEstado === 'Pendiente de Autorizar') {
                    actions = `
                        <div style="display:flex; flex-direction:column; gap:5px; align-items:center;">
                            <button class="btn-table-action approve authorize-vacation-btn" data-userid="${u.id}" style="width: 100%;">Autorizar (Con Goce)</button>
                            <button class="btn-table-action authorize-sin-goce-btn" data-userid="${u.id}" style="background-color: var(--warning); color: black; border-color: var(--warning); width: 100%;">Autorizar (Sin Goce)</button>
                            <button class="btn-table-action penalize reject-vacation-btn" data-userid="${u.id}" style="width: 100%;">Rechazar</button>
                        </div>
                    `;
                } else {
                    actions = `<span class="text-muted">-</span>`;
                }

                let userPastVacations = attendanceRecords.filter(a => a.usuarioId === u.id && a.justificacionMotivoEntrada === 'Descanso (Vacaciones)');
                let datesEnjoyed = userPastVacations.map((a, idx) => `${idx + 1}. ${typeof formatDateDDMMYYYY === 'function' ? formatDateDDMMYYYY(a.fecha) : a.fecha}`).join('<br>');
                let daysEnjoyedHtml = userPastVacations.length > 0 ? `<strong>${userPastVacations.length} Días</strong><div style="font-size:0.75em; color:var(--text-muted); margin-top:5px;">${datesEnjoyed}</div>` : '0 Días';

                let datesRequestedHtml = '-';
                if (u.descansoFechas) {
                    let requestedDates = u.descansoFechas.split(',').map(f => f.trim()).filter(f => f);
                    datesRequestedHtml = requestedDates.map((d, idx) => `${idx + 1}. ${typeof formatDateDDMMYYYY === 'function' ? formatDateDDMMYYYY(d) : d}`).join('<br>');
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="Colaborador"><strong>${u.nombre}</strong></td>
                    <td data-label="Descanso Restante">${u.vacacionesRestantes !== undefined ? u.vacacionesRestantes : 0} Días</td>
                    <td data-label="Días Gozados">${daysEnjoyedHtml}</td>
                    <td data-label="Días Solicitados">${u.descansoDiasSolicitados || 0} Días</td>
                    <td data-label="Fechas Solicitadas" style="max-width:200px; white-space:normal; font-size:0.85em;">${datesRequestedHtml}</td>
                    <td data-label="Estado"><span class="table-badge ${statusClass}">${u.descansoEstado || 'Ninguno'}</span></td>
                    <td data-label="Acciones">${actions}</td>
                `;
                // Highlight row if pending
                if (u.descansoEstado === 'Pendiente de Autorizar') {
                    tr.style.backgroundColor = 'rgba(255, 152, 0, 0.1)';
                }
                adminVacationsTable.appendChild(tr);
            });
        }

        const historyTable = document.getElementById('admin-vacations-history-table');
        if (historyTable) {
            historyTable.innerHTML = '';
            let attendance = window.AttendanceDB.getAttendance();
            const allowedUserIds = allUsers.map(u => u.id); // Filtered by company already
            let vacationRecords = attendance.filter(a => a.justificacionMotivoEntrada === 'Descanso (Vacaciones)' && allowedUserIds.includes(a.usuarioId));
            
            // Sort by date descending
            vacationRecords.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

            if (vacationRecords.length === 0) {
                historyTable.innerHTML = `<tr><td colspan="4" class="text-muted" style="text-align:center; padding:20px;">No hay descansos registrados.</td></tr>`;
            } else {
                vacationRecords.forEach(rec => {
                    const usr = allUsers.find(u => u.id === rec.usuarioId);
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td data-label="Colaborador"><strong>${usr ? usr.nombre : 'Desconocido'}</strong></td>
                        <td data-label="Empresa">${usr ? usr.empresa : '-'}</td>
                        <td data-label="Fecha Gozada">${typeof formatDateDDMMYYYY === 'function' ? formatDateDDMMYYYY(rec.fecha) : rec.fecha}</td>
                        <td data-label="Monto Pagado">Q${parseFloat(rec.montoNeto || 0).toFixed(2)}</td>
                    `;
                    historyTable.appendChild(tr);
                });
            }
        }

        adminVacationsTable.querySelectorAll('.authorize-vacation-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const uid = parseInt(btn.getAttribute('data-userid'));
                
                const confirmAdmin = confirm("¿Estás seguro de autorizar esta solicitud? Esto generará automáticamente 8 horas de asistencia para cada día solicitado.");
                if (!confirmAdmin) return;
                
                const loggedInUserStr = sessionStorage.getItem('dch_current_user');
                const loggedInUser = loggedInUserStr ? JSON.parse(loggedInUserStr) : null;
                const adminId = loggedInUser ? loggedInUser.id : 0;

                try {
                    const res = await fetch(`/api/users/${uid}/descansos/autorizar`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ adminId })
                    });
                    const data = await res.json();
                    if (data.success) {
                        alert('Se han autorizado las vacaciones y creado los marcajes automáticos.');
                        window.location.reload();
                    } else {
                        alert('Error al autorizar: ' + (data.message || ''));
                    }
                } catch(err) {
                    console.error(err);
                    showToast('Error', 'Error de red', 'danger');
                }
            });
        });

        adminVacationsTable.querySelectorAll('.authorize-sin-goce-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const uid = parseInt(btn.getAttribute('data-userid'));
                
                const confirmAdmin = confirm("¿Estás seguro de autorizar esta solicitud SIN GOCE DE SALARIO? Solo dejará constancia y no pagará el día.");
                if (!confirmAdmin) return;
                
                const loggedInUserStr = sessionStorage.getItem('dch_current_user');
                const loggedInUser = loggedInUserStr ? JSON.parse(loggedInUserStr) : null;
                const adminId = loggedInUser ? loggedInUser.id : 0;

                try {
                    const res = await fetch(`/api/users/${uid}/descansos/autorizar-sin-goce`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ adminId })
                    });
                    const data = await res.json();
                    if (data.success) {
                        alert('Se ha autorizado el permiso sin goce de salario.');
                        window.location.reload();
                    } else {
                        alert('Error al autorizar: ' + (data.message || ''));
                    }
                } catch(err) {
                    console.error(err);
                    showToast('Error', 'Error de red', 'danger');
                }
            });
        });

        adminVacationsTable.querySelectorAll('.reject-vacation-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const uid = parseInt(btn.getAttribute('data-userid'));
                
                const confirmAdmin = confirm("¿Estás seguro de RECHAZAR esta solicitud?");
                if (!confirmAdmin) return;
                
                const loggedInUserStr = sessionStorage.getItem('dch_current_user');
                const loggedInUser = loggedInUserStr ? JSON.parse(loggedInUserStr) : null;
                const adminId = loggedInUser ? loggedInUser.id : 0;

                try {
                    const res = await fetch(`/api/users/${uid}/descansos/rechazar`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ adminId })
                    });
                    const data = await res.json();
                    if (data.success) {
                        alert('Solicitud rechazada.');
                        window.location.reload();
                    } else {
                        alert('Error al rechazar: ' + (data.message || ''));
                    }
                } catch(err) {
                    console.error(err);
                    showToast('Error', 'Error de red', 'danger');
                }
            });
        });

        // Configurar formulario de asignación manual de vacaciones por el Gerente
        const adminAssignForm = document.getElementById('admin-assign-vacation-form');
        const adminUserSelect = document.getElementById('admin-vacation-user');
        const adminDateInput = document.getElementById('admin-vacation-date');
        const adminBtnAddDate = document.getElementById('admin-btn-add-vacation-date');
        const adminDatesListEl = document.getElementById('admin-vacation-dates-list');

        if (adminAssignForm && adminUserSelect) {
            // Poblar select
            adminUserSelect.innerHTML = '<option value="">Seleccionar...</option>';
            allUsers.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id;
                let textContent = `${u.nombre} (Restantes: ${u.vacacionesRestantes !== undefined ? u.vacacionesRestantes : 0})`;
                if (u.descansoEstado === 'Pendiente de Autorizar') {
                    textContent += ' - PENDIENTE';
                }
                opt.textContent = textContent;
                adminUserSelect.appendChild(opt);
            });

            if (!window.adminVacationDatesArr) window.adminVacationDatesArr = [];

            const renderAdminDatesList = () => {
                if (!adminDatesListEl) return;
                adminDatesListEl.innerHTML = '';
                window.adminVacationDatesArr.forEach((date, index) => {
                    const badge = document.createElement('span');
                    badge.style.cssText = 'background: var(--primary); color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.8rem; display: flex; align-items: center; gap: 5px;';
                    badge.innerHTML = `
                        ${date}
                        <span style="cursor: pointer; font-weight: bold; margin-left: 5px;" data-index="${index}">&times;</span>
                    `;
                    adminDatesListEl.appendChild(badge);
                });
                
                adminDatesListEl.querySelectorAll('span[data-index]').forEach(closeBtn => {
                    closeBtn.addEventListener('click', (e) => {
                        const idx = parseInt(e.target.getAttribute('data-index'));
                        window.adminVacationDatesArr.splice(idx, 1);
                        renderAdminDatesList();
                    });
                });
            };

            if (adminBtnAddDate && !adminBtnAddDate.hasAttribute('data-listener-attached')) {
                adminBtnAddDate.setAttribute('data-listener-attached', 'true');
                adminBtnAddDate.addEventListener('click', () => {
                    const startStr = adminDateInput.value;
                    const endInput = document.getElementById('admin-vacation-date-end');
                    const endStr = endInput ? endInput.value : '';

                    if (!startStr) {
                        showToast('Aviso', 'Debe seleccionar al menos la fecha de inicio.', 'warning');
                        return;
                    }

                    let datesToAdd = [];
                    if (endStr && endStr >= startStr) {
                        let current = new Date(startStr + 'T12:00:00Z');
                        const end = new Date(endStr + 'T12:00:00Z');
                        while (current <= end) {
                            datesToAdd.push(current.toISOString().split('T')[0]);
                            current.setDate(current.getDate() + 1);
                        }
                    } else if (endStr && endStr < startStr) {
                        showToast('Aviso', 'La fecha de fin no puede ser anterior a la de inicio.', 'warning');
                        return;
                    } else {
                        datesToAdd.push(startStr);
                    }

                    let addedCount = 0;
                    datesToAdd.forEach(d => {
                        if (!window.adminVacationDatesArr.includes(d)) {
                            window.adminVacationDatesArr.push(d);
                            addedCount++;
                        }
                    });

                    if (addedCount > 0) {
                        renderAdminDatesList();
                        adminDateInput.value = '';
                        if (endInput) endInput.value = '';
                    } else {
                        showToast('Aviso', 'Las fechas seleccionadas ya están en la lista.', 'warning');
                    }
                });
            }
            renderAdminDatesList();

            if (!adminAssignForm.hasAttribute('data-listener-attached')) {
                adminAssignForm.setAttribute('data-listener-attached', 'true');
                adminAssignForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const targetUserId = adminUserSelect.value;
                    if (!targetUserId) {
                        showToast('Aviso', 'Debe seleccionar un colaborador.', 'warning');
                        return;
                    }
                    if (window.adminVacationDatesArr.length === 0) {
                        showToast('Aviso', 'Debe seleccionar al menos una fecha.', 'warning');
                        return;
                    }
                    
                    const fechas = window.adminVacationDatesArr.join(',');
                    
                    try {
                        const res = await fetch(`/api/users/${targetUserId}/descansos/solicitar`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ fechas })
                        });
                        const data = await res.json();
                        if (data.success) {
                            alert('Descanso asignado. Se requiere autorización.');
                            window.location.reload();
                        } else {
                            alert('Error al asignar: ' + (data.message || ''));
                        }
                    } catch (err) {
                        console.error(err);
                        showToast('Error', 'Error de red', 'danger');
                    }
                });
            }
        }
    };


    if (btnOpenLoanModal) {
        btnOpenLoanModal.addEventListener('click', () => {
            openLoanModal();
        });
    }

    const closeLoanModal = () => {
        if (loanModal) loanModal.classList.add('hidden');
    };

    if (btnCloseLoanModal) btnCloseLoanModal.addEventListener('click', closeLoanModal);
    if (btnCancelLoan) btnCancelLoan.addEventListener('click', closeLoanModal);
    if (loanModal) {
        loanModal.addEventListener('click', (e) => {
            if (e.target === loanModal) closeLoanModal();
        });
    }

    function openLoanModal() {
        populateLoansUsersSelect();
        if (loanModal) loanModal.classList.remove('hidden');
        if (loanForm) loanForm.reset();
    }

    if (loanForm) {
        loanForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const wId = parseInt(loanUserSelect.value);
            const monto = parseFloat(loanAmountInput.value);
            const cuotaMonto = parseFloat(loanInstallmentsSelect.value);
            const cuotas = Math.ceil(monto / cuotaMonto);

            if (!wId || isNaN(wId)) {
                showToast('Error', 'Debe seleccionar un colaborador.', 'danger');
                return;
            }

            const success = await window.AttendanceDB.createLoan(wId, monto, cuotas, cuotaMonto);
            if (success) {
                showToast('Solicitud Enviada', 'Se ha registrado la solicitud de préstamo.', 'success');
                closeLoanModal();
                renderAdminLoansTable();
            } else {
                showToast('Error', 'No se pudo guardar la solicitud.', 'danger');
            }
        });
    }

    window.setupUserLoanView = function() {
        if (!currentUser) return;
        
        const loans = window.AttendanceDB.getLoans().filter(l => l.usuarioId === currentUser.id);
        const activeLoan = loans.find(l => l.estado === 'Aprobado');
        
        const usrLoanTotalVal = document.getElementById('usr-loan-total-val');
        const usrLoanSaldoVal = document.getElementById('usr-loan-saldo-val');
        const usrLoanCuotaVal = document.getElementById('usr-loan-cuota-val');
        const usrLoanStatusVal = document.getElementById('usr-loan-status-val');
        const usrLoanEndDate = document.getElementById('usr-loan-end-date');
        const userLoansTable = document.getElementById('user-loans-table');
        
        if (currentUser && currentUser.préstamosaldo > 0) {
            if (usrLoanTotalVal) usrLoanTotalVal.textContent = `Q${(parseFloat(currentUser.préstamoTotal) || 0).toFixed(2)}`;
            if (usrLoanSaldoVal) usrLoanSaldoVal.textContent = `Q${(parseFloat(currentUser.préstamosaldo) || 0).toFixed(2)}`;
            if (usrLoanCuotaVal) usrLoanCuotaVal.textContent = `Q${(parseFloat(currentUser.préstamoCuota) || 0).toFixed(2)}`;
            if (usrLoanStatusVal) usrLoanStatusVal.textContent = currentUser.préstamoEstadoCuota || 'Ninguno';
            if (usrLoanEndDate) usrLoanEndDate.textContent = 'Pendiente';
        } else {
            if (usrLoanTotalVal) usrLoanTotalVal.textContent = 'Q0.00';
            if (usrLoanSaldoVal) usrLoanSaldoVal.textContent = 'Q0.00';
            if (usrLoanCuotaVal) usrLoanCuotaVal.textContent = 'Q0.00';
            if (usrLoanStatusVal) usrLoanStatusVal.textContent = 'Ninguno';
            if (usrLoanEndDate) usrLoanEndDate.textContent = '-';
        }
        
        if (userLoansTable) {
            userLoansTable.innerHTML = '';
            if (loans.length === 0) {
                userLoansTable.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No tienes solicitudes de préstamo.</td></tr>';
            } else {
                loans.forEach(l => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${typeof formatDateDDMMYYYY === 'function' ? formatDateDDMMYYYY(l.fecha) : l.fecha}</td>
                        <td>Q${(l.monto || 0).toFixed(2)}</td>
                        <td>Q${(l.cuotaMonto || (l.monto / l.cuotas)).toFixed(2)}</td>
                        <td>${l.estado}</td>
                    `;
                    userLoansTable.appendChild(tr);
                });
            }
        }
        
        const userVacationsHistoryTable = document.getElementById('user-vacations-history-table');
        if (userVacationsHistoryTable) {
            userVacationsHistoryTable.innerHTML = '';
            let attendance = window.AttendanceDB.getAttendance();
            let myVacations = attendance.filter(a => a.usuarioId === currentUser.id && a.justificacionMotivoEntrada === 'Descanso (Vacaciones)');
            myVacations.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            
            if (myVacations.length === 0) {
                userVacationsHistoryTable.innerHTML = '<tr><td colspan="2" class="text-center text-muted">No tienes descansos registrados.</td></tr>';
            } else {
                myVacations.forEach(v => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${typeof formatDateDDMMYYYY === 'function' ? formatDateDDMMYYYY(v.fecha) : v.fecha}</td>
                        <td>Q${(v.montoNeto || 0).toFixed(2)}</td>
                    `;
                    userVacationsHistoryTable.appendChild(tr);
                });
            }
        }
        
        const formRequestLoan = document.getElementById('form-request-loan');
        if (formRequestLoan && !formRequestLoan.hasAttribute('data-listener-attached')) {
            formRequestLoan.setAttribute('data-listener-attached', 'true');
            formRequestLoan.addEventListener('submit', async (e) => {
                e.preventDefault();
                const amountInput = document.getElementById('request-loan-amount');
                const installmentsInput = document.getElementById('request-loan-installments');
                const amount = parseFloat(amountInput.value);
                const cuotaMonto = parseFloat(installmentsInput.value);
                const installments = Math.ceil(amount / cuotaMonto);
                
                const success = await window.AttendanceDB.createLoan(currentUser.id, amount, installments, cuotaMonto);
                if (success) {
                    showToast('Solicitud Enviada', 'Tu solicitud de préstamo ha sido enviada.', 'success');
                    amountInput.value = '';
                    installmentsInput.value = '';
                    window.setupUserLoanView();
                } else {
                    showToast('Error', 'Hubo un error al enviar tu solicitud.', 'danger');
                }
            });
        }
    };


window.setupUserVacationsView = function() {

        const usrVacationsVal = document.getElementById('usr-vacations-val');
        const usrVacationsStatus = document.getElementById('usr-vacations-status');
        if (usrVacationsVal) {
            usrVacationsVal.textContent = `${currentUser.vacacionesRestantes !== undefined ? currentUser.vacacionesRestantes : 0} Días`;
            if (currentUser.descansoEstado === 'Pendiente de Autorizar') {
                usrVacationsStatus.textContent = `Tienes una solicitud de ${currentUser.descansoDiasSolicitados || 1} día(s) pendiente`;
                usrVacationsStatus.style.color = 'var(--warning)';
            } else {
                usrVacationsStatus.textContent = 'Ninguna solicitud pendiente';
                usrVacationsStatus.style.color = '';
            }
        }

        const formRequestVacation = document.getElementById('form-request-vacation');
        const dateInput = document.getElementById('request-vacation-date');
        const btnAddDate = document.getElementById('btn-add-vacation-date');
        const datesListEl = document.getElementById('vacation-dates-list');
        
        // Use a persistent array attached to the form or module scope
        if (!window.vacationDatesArr) window.vacationDatesArr = [];
        
        const renderDatesList = () => {
            if (!datesListEl) return;
            datesListEl.innerHTML = '';
            window.vacationDatesArr.forEach((date, index) => {
                const badge = document.createElement('span');
                badge.style.cssText = 'background: var(--primary); color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.8rem; display: flex; align-items: center; gap: 5px;';
                badge.innerHTML = `
                    ${date}
                    <span style="cursor: pointer; font-weight: bold; margin-left: 5px;" data-index="${index}">&times;</span>
                `;
                datesListEl.appendChild(badge);
            });
            
            datesListEl.querySelectorAll('span[data-index]').forEach(closeBtn => {
                closeBtn.addEventListener('click', (e) => {
                    const idx = parseInt(e.target.getAttribute('data-index'));
                    window.vacationDatesArr.splice(idx, 1);
                    renderDatesList();
                });
            });
        };
        
        if (btnAddDate && !btnAddDate.hasAttribute('data-listener-attached')) {
            btnAddDate.setAttribute('data-listener-attached', 'true');
            btnAddDate.addEventListener('click', () => {
                const startStr = dateInput.value;
                const endInput = document.getElementById('request-vacation-date-end');
                const endStr = endInput ? endInput.value : '';

                if (!startStr) {
                    showToast('Aviso', 'Debe seleccionar al menos la fecha de inicio.', 'warning');
                    return;
                }

                let datesToAdd = [];
                if (endStr && endStr >= startStr) {
                    let current = new Date(startStr + 'T12:00:00Z');
                    const end = new Date(endStr + 'T12:00:00Z');
                    while (current <= end) {
                        datesToAdd.push(current.toISOString().split('T')[0]);
                        current.setDate(current.getDate() + 1);
                    }
                } else if (endStr && endStr < startStr) {
                    showToast('Aviso', 'La fecha de fin no puede ser anterior a la de inicio.', 'warning');
                    return;
                } else {
                    datesToAdd.push(startStr);
                }

                let addedCount = 0;
                datesToAdd.forEach(d => {
                    if (!window.vacationDatesArr.includes(d)) {
                        window.vacationDatesArr.push(d);
                        addedCount++;
                    }
                });

                if (addedCount > 0) {
                    renderDatesList();
                    dateInput.value = '';
                    if (endInput) endInput.value = '';
                } else {
                    showToast('Aviso', 'Las fechas seleccionadas ya están en la lista.', 'warning');
                }
            });
        }
        renderDatesList();

        if (formRequestVacation && !formRequestVacation.hasAttribute('data-listener-attached')) {
            formRequestVacation.setAttribute('data-listener-attached', 'true');
            formRequestVacation.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (currentUser.descansoEstado === 'Pendiente de Autorizar') {
                    showToast('Aviso', 'Ya tienes una solicitud pendiente.', 'warning');
                    return;
                }
                if (window.vacationDatesArr.length === 0) {
                    showToast('Aviso', 'Debe seleccionar al menos una fecha.', 'warning');
                    return;
                }
                const days = window.vacationDatesArr.length;
                const fechas = window.vacationDatesArr.join(',');
                
                try {
                    const res = await fetch(`/api/users/${currentUser.id}/descansos/solicitar`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ dias: days, fechas: fechas })
                    });
                    const data = await res.json();
                    if (data.success) {
                        alert('Tu solicitud de descanso ha sido enviada.');
                        window.location.reload();
                    } else {
                        alert('Error al enviar solicitud: ' + (data.message || ''));
                    }
                } catch(err) {
                    console.error(err);
                    showToast('Error', 'Error de red', 'danger');
                }
            });
        }
};