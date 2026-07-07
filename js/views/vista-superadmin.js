    // --- VISTA 4: SUPER ADMIN (superadmin) ---
    const superadminStatLogs = document.getElementById('superadmin-stat-logs');
    const superadminLogsTable = document.getElementById('superadmin-logs-table');
    const logSearchInput = document.getElementById('log-search-input');

    function setupSuperAdminView() {
        renderLogsTable();
    }

    function renderLogsTable(searchTerm = '') {
        const logs = window.AttendanceDB.getLogs();
        superadminStatLogs.textContent = logs.length;

        superadminLogsTable.innerHTML = '';

        // Filtrar logs según la barra de búsqueda
        const filteredLogs = logs.filter(log => {
            const term = searchTerm.toLowerCase();
            return (
                log.nombreUsuario.toLowerCase().includes(term) ||
                log.accion.toLowerCase().includes(term) ||
                log.timestamp.includes(term)
            );
        });

        if (filteredLogs.length === 0) {
            superadminLogsTable.innerHTML = `
                <tr>
                    <td colspan="3" class="text-muted" style="text-align: center; padding: 20px;">
                        No se encontraron registros de auditorÃ­a que coincidan con la búsqueda.
                    </td>
                </tr>
            `;
            return;
        }

        filteredLogs.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="white-space: nowrap; font-feature-settings: 'tnum';"><code>${log.timestamp}</code></td>
                <td><strong>${log.nombreUsuario}</strong><br><span class="text-muted" style="font-size:0.75rem;">ID Usuario: ${log.usuarioId || 'N/A'}</span></td>
                <td>${log.accion}</td>
            `;
            superadminLogsTable.appendChild(tr);
        });
    }

    // Buscador interactivo de logs
    logSearchInput.addEventListener('input', (e) => {
        renderLogsTable(e.target.value);
    });

    // Botón de restablecimiento de datos
    btnResetDb.addEventListener('click', async () => {
        if (await appConfirm('Confirmación', 'Â¿Estás seguro de que deseas restablecer los datos de demostración? Se borrará todo el historial actual y se cerrará la sesión.')) {
            await window.AttendanceDB.resetDatabase(currentUser.id);
            showToast('Base de Datos Restablecida', 'Los datos iniciales han sido recargados.', 'info');

            setTimeout(() => {
                showLogin();
            }, 1000);
        }
    });




    function setupUserLoanView() {
        const user = currentUser;
        const loanTotal = parseFloat(user.préstamoTotal) || 0;
        const loanSaldo = parseFloat(user.préstamosaldo) || 0;
        const loanCuota = parseFloat(user.préstamoCuota) || 0;
        const status = user.préstamoEstadoCuota || 'Ninguno';
        const freq = user.frecuenciaPago || 'semanal';

        document.getElementById('usr-loan-total-val').textContent = `Q${loanTotal.toFixed(2)}`;
        document.getElementById('usr-loan-saldo-val').textContent = `Q${loanSaldo.toFixed(2)}`;
        document.getElementById('usr-loan-cuota-val').textContent = `Q${loanCuota.toFixed(2)}`;
        document.getElementById('usr-loan-status-val').textContent = status;

        let finEstimado = 'Sin Préstamo Activo';
        if (loanSaldo > 0 && loanCuota > 0) {
            const numPagos = Math.ceil(loanSaldo / loanCuota);
            const endDateObj = new Date();
            if (freq === 'quincenal') {
                endDateObj.setDate(endDateObj.getDate() + numPagos * 15);
            } else {
                endDateObj.setDate(endDateObj.getDate() + numPagos * 7);
            }
            finEstimado = endDateObj.toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' });
        }
        document.getElementById('usr-loan-end-date').textContent = finEstimado;

        // Render My Requests Table
        const loansTable = document.getElementById('user-loans-table');
        if (loansTable) {
            const myLoans = window.AttendanceDB.getLoans().filter(l => l.usuarioId === user.id);
            loansTable.innerHTML = '';
            if (myLoans.length === 0) {
                loansTable.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No has realizado ninguna solicitud.</td></tr>';
            } else {
                // sort descending by id
                myLoans.sort((a, b) => b.id - a.id).forEach(l => {
                    let badge = '<span class="badge bg-warning" style="background-color: var(--warning); padding: 5px; border-radius: 4px; color: #000;">Pendiente</span>';
                    if (l.estado === 'Aprobado') badge = '<span class="badge bg-success" style="background-color: var(--success); padding: 5px; border-radius: 4px; color: #fff;">Aprobado</span>';
                    if (l.estado === 'Rechazado') badge = '<span class="badge bg-danger" style="background-color: var(--danger); padding: 5px; border-radius: 4px; color: #fff;">Rechazado</span>';

                    loansTable.innerHTML += `
                        <tr>
                            <td>${l.fecha}</td>
                            <td>Q${Number(l.monto).toFixed(2)}</td>
                            <td>${l.cuotas}</td>
                            <td>${badge}</td>
                        </tr>
                    `;
                });
            }
        }

        // Add Event Listener to Form
        const formRequest = document.getElementById('form-request-loan');
        if (formRequest && !formRequest.dataset.bound) {
            formRequest.dataset.bound = 'true';
            formRequest.addEventListener('submit', async (e) => {
                e.preventDefault();
                const monto = document.getElementById('request-loan-amount').value;
                const cuotas = document.getElementById('request-loan-installments').value;

                if (parseFloat(monto) <= 0 || parseInt(cuotas) <= 0) {
                    showToast('Error', 'Monto y cuotas deben ser mayores a cero', 'danger');
                    return;
                }

                // Call existing createLoan method in DB (which hits /api/loans)
                const success = await window.AttendanceDB.createLoan(currentUser.id, parseFloat(monto), parseInt(cuotas));
                if (success) {
                    showToast('ÉÉxito', 'Solicitud de préstamo enviada. Pendiente de aprobación.', 'success');
                    formRequest.reset();
                    // reload view
                    setupUserLoanView();
                } else {
                    showToast('Error', 'No se pudo enviar la solicitud', 'danger');
                }
            });
        }
    }

    function setupUserVehiclesView() {
        const vehicles = window.AttendanceDB.getVehicles();
        const myVehicles = vehicles.filter(v => v.empleadoAsignadoId === currentUser.id);

        const emptyMessage = document.getElementById('user-vehicles-empty');
        const tableContainer = document.getElementById('user-vehicles-table-container');
        const listBody = document.getElementById('user-vehicles-list');

        if (!emptyMessage || !tableContainer || !listBody) return;

        if (myVehicles.length === 0) {
            emptyMessage.style.display = 'block';
            tableContainer.classList.add('hidden');
        } else {
            emptyMessage.style.display = 'none';
            tableContainer.classList.remove('hidden');
            listBody.innerHTML = '';

            myVehicles.forEach(v => {
                let statusBadge = `<span class="badge bg-success" style="padding: 4px 8px; border-radius: 4px; color: white;">${v.estado}</span>`;
                if (v.estado === 'Mantenimiento') {
                    statusBadge = `<span class="badge bg-danger" style="background-color: var(--danger); padding: 4px 8px; border-radius: 4px; color: white;">${v.estado}</span>`;
                } else if (v.estado === 'En Servicio') {
                    statusBadge = `<span class="badge bg-warning" style="background-color: var(--warning); padding: 4px 8px; border-radius: 4px; color: black;">${v.estado}</span>`;
                }

                listBody.innerHTML += `
                    <tr>
                        <td><strong>${v.placa}</strong></td>
                        <td>${v.marca || '-'}</td>
                        <td>${v.modelo || '-'}</td>
                        <td>${statusBadge}</td>
                    </tr>
                `;
            });
        }
    }

    // --- ACCIÓN DE CLIC EN NAVEGACIÓN SIDEBAR ---
    // Se utiliza delegación de eventos en el sidebarMenu
    sidebarMenu.addEventListener('click', (e) => {
        const navLink = e.target.closest('.sidebar-nav-link');
        if (!navLink) return;

        e.preventDefault();

        const subview = navLink.getAttribute('data-subview');
        if (subview && subview !== 'undefined' && subview !== '') {
            window.location.hash = subview;
        }
    });


