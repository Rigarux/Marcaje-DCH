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
        const users = window.AttendanceDB.getUsers();
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
        const loans = window.AttendanceDB.getLoans();
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
                <td>${l.cuotas} pago(s)</td>
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
            const usersWithLoans = allUsers.filter(u => (u.préstamoTotal > 0 || u.préstamosaldo > 0));

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
            const cuotas = parseInt(loanInstallmentsSelect.value);

            if (!wId || isNaN(wId)) {
                showToast('Error', 'Debe seleccionar un colaborador.', 'danger');
                return;
            }

            const success = await window.AttendanceDB.createLoan(wId, monto, cuotas);
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
        
        const loans = window.AttendanceDB.getLoans().filter(l => l.empleadoId === currentUser.id);
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
                        <td>${l.cuotas}</td>
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
                const installments = parseInt(installmentsInput.value);
                
                const success = await window.AttendanceDB.createLoan(currentUser.id, amount, installments);
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
