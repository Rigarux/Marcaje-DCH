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
        if (currentComp && currentComp !== 'Todas') {
            users = users.filter(u => u.empresa === currentComp);
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
        if (currentComp && currentComp !== 'Todas') {
            const allUsers = window.AttendanceDB.getUsers();
            const usersInCompany = allUsers.filter(u => u.empresa === currentComp).map(u => u.id);
            loans = loans.filter(l => usersInCompany.includes(l.usuarioId));
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
                <td><strong>${l.nombreEmpleado || 'Colaborador'}</strong></td>
                <td>${l.fecha}</td>
                <td>Q${(l.monto || 0).toFixed(2)}</td>
                <td>Q${(l.cuotaMonto || (l.monto / l.cuotas)).toFixed(2)} / pago</td>
                <td><span class="table-badge ${statusClass}">${l.estado}</span></td>
                <td>
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
                        <td><strong>${u.nombre}</strong></td>
                        <td>Q${(u.préstamoTotal || 0).toFixed(2)}</td>
                        <td><strong>Q${(u.préstamosaldo || 0).toFixed(2)}</strong></td>
                        <td>Q${(u.préstamoCuota || 0).toFixed(2)}</td>
                        <td><span class="table-badge ${statusClass}">${u.préstamoEstadoCuota || 'Ninguno'}</span></td>
                        <td>${actions}</td>
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

        adminVacationsTable.innerHTML = '';
        const pendingUsers = allUsers.filter(u => u.descansoEstado === 'Pendiente de Autorizar');
        
        if (allUsers.length === 0) {
            adminVacationsTable.innerHTML = `<tr><td colspan="5" class="text-muted" style="text-align:center; padding:20px;">No hay usuarios.</td></tr>`;
            return;
        }

        allUsers.forEach(u => {
            let statusClass = u.descansoEstado === 'Pendiente de Autorizar' ? 'pending' : 'approved';
            let actions = '';
            
            if (u.descansoEstado === 'Pendiente de Autorizar') {
                actions = `<button class="btn-table-action approve authorize-vacation-btn" data-userid="${u.id}">Autorizar</button>`;
            } else {
                actions = `<span class="text-muted">-</span>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${u.nombre}</strong></td>
                <td>${u.vacacionesRestantes !== undefined ? u.vacacionesRestantes : 15} Días</td>
                <td>${u.descansoDiasSolicitados || 0} Días</td>
                <td><span class="table-badge ${statusClass}">${u.descansoEstado || 'Ninguno'}</span></td>
                <td>${actions}</td>
            `;
            // Highlight row if pending
            if (u.descansoEstado === 'Pendiente de Autorizar') {
                tr.style.backgroundColor = 'rgba(255, 152, 0, 0.1)';
            }
            adminVacationsTable.appendChild(tr);
        });

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
                        showToast('Vacaciones Autorizadas', 'Se han autorizado las vacaciones y creado los marcajes automáticos.', 'success');
                        window.AttendanceDB.fetchInitialData().then(() => {
                            window.renderAdminVacationsTable();
                            if (typeof renderAdminLoansTable === 'function') renderAdminLoansTable();
                        });
                    } else {
                        showToast('Error', data.message || 'Error al autorizar', 'danger');
                    }
                } catch(err) {
                    console.error(err);
                    showToast('Error', 'Error de red', 'danger');
                }
            });
        });
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
                        <td>${l.fecha}</td>
                        <td>Q${(l.monto || 0).toFixed(2)}</td>
                        <td>Q${(l.cuotaMonto || (l.monto / l.cuotas)).toFixed(2)}</td>
                        <td>${l.estado}</td>
                    `;
                    userLoansTable.appendChild(tr);
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

        const usrVacationsVal = document.getElementById('usr-vacations-val');
        const usrVacationsStatus = document.getElementById('usr-vacations-status');
        if (usrVacationsVal) {
            usrVacationsVal.textContent = `${currentUser.vacacionesRestantes !== undefined ? currentUser.vacacionesRestantes : 15} Días`;
            if (currentUser.descansoEstado === 'Pendiente de Autorizar') {
                usrVacationsStatus.textContent = `Tienes una solicitud de ${currentUser.descansoDiasSolicitados || 1} día(s) pendiente`;
                usrVacationsStatus.style.color = 'var(--warning)';
            } else {
                usrVacationsStatus.textContent = 'Ninguna solicitud pendiente';
                usrVacationsStatus.style.color = '';
            }
        }

        const formRequestVacation = document.getElementById('form-request-vacation');
        if (formRequestVacation && !formRequestVacation.hasAttribute('data-listener-attached')) {
            formRequestVacation.setAttribute('data-listener-attached', 'true');
            formRequestVacation.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (currentUser.descansoEstado === 'Pendiente de Autorizar') {
                    showToast('Aviso', 'Ya tienes una solicitud pendiente.', 'warning');
                    return;
                }
                const daysInput = document.getElementById('request-vacation-days');
                const days = parseInt(daysInput.value) || 1;
                
                try {
                    const res = await fetch(`/api/users/${currentUser.id}/descansos/solicitar`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ dias: days })
                    });
                    const data = await res.json();
                    if (data.success) {
                        showToast('Solicitud Enviada', 'Tu solicitud de descanso ha sido enviada.', 'success');
                        daysInput.value = '';
                        currentUser.descansoEstado = 'Pendiente de Autorizar';
                        currentUser.descansoDiasSolicitados = days;
                        window.setupUserLoanView();
                    } else {
                        showToast('Error', data.message || 'Error al enviar solicitud', 'danger');
                    }
                } catch(err) {
                    console.error(err);
                    showToast('Error', 'Error de red', 'danger');
                }
            });
        }
    };
