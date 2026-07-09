    // --- VISTA 3: ADMINISTRADOR DE RRHH (admin) ---
    const adminStatHours = document.getElementById('admin-stat-hours');
    const adminStatGross = document.getElementById('admin-stat-gross');
    const adminStatPenalties = document.getElementById('admin-stat-penalties');
    const adminStatPending = document.getElementById('admin-stat-pending');

    const adminGroupFilter = document.getElementById('admin-group-filter');
    const adminPeriodFilter = document.getElementById('admin-period-filter');
    const adminAttendanceTable = document.getElementById('admin-attendance-table');
    const adminPenaltiesTable = document.getElementById('admin-penalties-table');

    // Modal de Descuentos
    const btnOpenPenalizeModal = document.getElementById('btn-open-penalize-modal');
    const btnOpenPenalizeModalTab = document.getElementById('btn-open-penalize-modal-tab');
    const penalizeModal = document.getElementById('penalize-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelPenalize = document.getElementById('btn-cancel-penalize');
    const penalizationForm = document.getElementById('penalization-form');
    const penalizeRecordSelect = document.getElementById('penalize-record-select');
    const penalizeReasonInput = document.getElementById('penalize-reason');
    const penalizeAmountInput = document.getElementById('penalize-amount');

    // Gestión de Pestañas
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-tab');
            if (target) window.location.hash = target;
        });
    });

    function getPeriodRange(filterValue) {
        const now = new Date();

        // Buscar el viernes de la semana actual
        const cutoffFriday = new Date(now);
        const day = cutoffFriday.getDay();
        const diff = 5 - day; // Diferencia para llegar a viernes
        cutoffFriday.setDate(cutoffFriday.getDate() + diff);
        cutoffFriday.setHours(23, 59, 59, 999);

        let end;
        let start;

        switch (filterValue) {
            case 'closed_week':
                if (now >= cutoffFriday) {
                    end = new Date(cutoffFriday);
                } else {
                    end = new Date(cutoffFriday);
                    end.setDate(end.getDate() - 7);
                }
                start = new Date(end);
                start.setDate(start.getDate() - 7);
                break;

            case 'active_week':
                if (now >= cutoffFriday) {
                    end = new Date(cutoffFriday);
                    end.setDate(end.getDate() + 7);
                } else {
                    end = new Date(cutoffFriday);
                }
                start = new Date(end);
                start.setDate(start.getDate() - 7);
                break;

            case 'closed_quincena':
                if (now >= cutoffFriday) {
                    end = new Date(cutoffFriday);
                } else {
                    end = new Date(cutoffFriday);
                    end.setDate(end.getDate() - 7);
                }
                start = new Date(end);
                start.setDate(start.getDate() - 14);
                break;

            case 'active_quincena':
                if (now >= cutoffFriday) {
                    end = new Date(cutoffFriday);
                    end.setDate(end.getDate() + 7);
                } else {
                    end = new Date(cutoffFriday);
                }
                start = new Date(end);
                start.setDate(start.getDate() - 14);
                break;

            case 'all':
            default:
                start = new Date(0); // 1970
                end = new Date(8640000000000000); // Futuro lejano
                break;
        }

        return { start, end };
    }

    function setupAdminView() {
        renderGroupDropdowns();
        renderCompanyDropdowns();
        const filterGroup = adminGroupFilter.value;
        const filterPeriod = adminPeriodFilter ? adminPeriodFilter.value : 'closed_week';
        const allUsers = window.AttendanceDB.getUsers();
        let attendance = window.AttendanceDB.getAttendance();
        let penalizations = window.AttendanceDB.getPenalizations();
        let bonuses = window.AttendanceDB.getBonuses();

        // 1. Calcular KPIs Globales (Consolidado Histórico o filtrado por Grupo) para tab-trabajadores-admin
        let overallAttendance = window.AttendanceDB.getAttendance();
        let overallBusRecords = window.AttendanceDB.getBusRecords();
        if (filterGroup !== 'all') {
            const usersInGroup = allUsers.filter(u => u.grupo === filterGroup).map(u => u.id);
            overallAttendance = overallAttendance.filter(a => usersInGroup.includes(a.usuarioId));
            overallBusRecords = overallBusRecords.filter(a => usersInGroup.includes(a.usuarioId));
        }

        // Filtramos para que los KPIs solo muestren lo "Activo" (No archivado) a menos que vean "Todo el historial"
        if (filterPeriod !== 'all') {
            overallAttendance = overallAttendance.filter(a => !a.archivado);
            overallBusRecords = overallBusRecords.filter(a => !a.archivado);
        }

        let kpiHours = 0;
        let kpiBruto = 0;
        let kpiPenalties = 0;
        let kpiPendingCount = 0;
        let kpiNeto = 0;

        overallAttendance.forEach(rec => {
            if (rec.horaSalida) {
                kpiHours += rec.horasTrabajadas;
                kpiBruto += rec.montoBruto;
                kpiPenalties += rec.descuento;
                kpiNeto += rec.montoNeto; // Neto ya calcula bono y descuento
                if (!rec.aprobado) {
                    kpiPendingCount++;
                }
            }
        });

        overallBusRecords.forEach(rec => {
            const user = allUsers.find(u => u.id === rec.usuarioId);
            const tarifaDia = parseFloat(user ? user.tarifaDiurna : 0) || 0;
            const shifts = rec.turno ? rec.turno.split(',').length : 1;
            const bruto = shifts * tarifaDia;

            kpiBruto += bruto;
            kpiNeto += bruto;
            if (!rec.aprobado) {
                kpiPendingCount++;
            }
        });

        const kpiHoursEl = document.getElementById('kpi-total-hours');
        const kpiPayEl = document.getElementById('kpi-total-pay');
        const kpiDiscountsEl = document.getElementById('kpi-total-discounts');
        const kpiPendingEl = document.getElementById('kpi-pending-approvals');

        if (kpiHoursEl) kpiHoursEl.textContent = `${kpiHours.toFixed(2)} h`;
        if (kpiPayEl) kpiPayEl.textContent = `Q${kpiNeto.toFixed(2)}`;
        if (kpiDiscountsEl) kpiDiscountsEl.textContent = `Q${kpiPenalties.toFixed(2)}`;
        if (kpiPendingEl) kpiPendingEl.textContent = kpiPendingCount;

        // 2. Filtrar por frecuencia de pago y rango de fechas (para el resto de vistas como Día de Pago)
        const { start: periodStart, end: periodEnd } = getPeriodRange(filterPeriod);

        let targetUserIds = allUsers.map(u => u.id);
        if (filterPeriod === 'closed_week' || filterPeriod === 'active_week') {
            targetUserIds = allUsers.filter(u => !u.frecuenciaPago || u.frecuenciaPago === 'semanal').map(u => u.id);
        } else if (filterPeriod === 'closed_quincena' || filterPeriod === 'active_quincena') {
            targetUserIds = allUsers.filter(u => u.frecuenciaPago === 'quincenal').map(u => u.id);
        }

        attendance = attendance.filter(rec => {
            if (filterPeriod !== 'all' && rec.archivado) return false;
            if (!targetUserIds.includes(rec.usuarioId)) return false;
            const [yr, mo, dy] = rec.fecha.split('-').map(Number);
            const [hr, mn, sc] = (rec.horaEntrada || '00:00:00').split(':').map(Number);
            const recDate = new Date(yr, mo - 1, dy, hr, mn, sc || 0);
            return recDate >= periodStart && recDate < periodEnd;
        });

        let busRecords = window.AttendanceDB.getBusRecords();
        busRecords = busRecords.filter(rec => {
            if (filterPeriod !== 'all' && rec.archivado) return false;
            if (!targetUserIds.includes(rec.usuarioId)) return false;
            if (!rec.fecha) return false;
            const fechaStr = rec.fecha.split(' ')[0]; // "DD/MM/YYYY" format expected from Date.toLocaleDateString
            const parts = fechaStr.split('/');
            if (parts.length === 3) {
                const dy = parseInt(parts[0], 10);
                const mo = parseInt(parts[1], 10);
                const yr = parseInt(parts[2], 10);
                const recDate = new Date(yr, mo - 1, dy);
                return recDate >= periodStart && recDate < periodEnd;
            }
            return false;
        });

        penalizations = penalizations.filter(p => {
            if (!targetUserIds.includes(p.usuarioId)) return false;
            if (p.asistenciaId) {
                return attendance.some(a => a.id === p.asistenciaId);
            }
            return true;
        });

        bonuses = bonuses.filter(b => {
            if (!targetUserIds.includes(b.usuarioId)) return false;
            if (b.asistenciaId) {
                return attendance.some(a => a.id === b.asistenciaId);
            }
            return true;
        });

        // 3. Filtrar datos según grupo seleccionado
        if (filterGroup !== 'all') {
            const usersInGroup = allUsers.filter(u => u.grupo === filterGroup).map(u => u.id);
            attendance = attendance.filter(a => usersInGroup.includes(a.usuarioId));
            penalizations = penalizations.filter(p => usersInGroup.includes(p.usuarioId));
            bonuses = bonuses.filter(b => usersInGroup.includes(b.usuarioId));
            busRecords = busRecords.filter(rec => usersInGroup.includes(rec.usuarioId));
        }

        // 4. Calcular Estadísticas Consolidadas RRHH (Día de Pago)
        let totalHours = 0;
        let totalGross = 0;
        let totalPenalties = 0;
        let totalPending = 0;

        attendance.forEach(rec => {
            if (rec.horaSalida) {
                totalHours += rec.horasTrabajadas;
                totalGross += rec.montoBruto;
                totalPenalties += rec.descuento;
                if (!rec.aprobado) {
                    totalPending += rec.montoNeto;
                }
            }
        });

        busRecords.forEach(rec => {
            const user = allUsers.find(u => u.id === rec.usuarioId);
            const tarifaDia = parseFloat(user ? user.tarifaDiurna : 0) || 0;
            const shifts = rec.turno ? rec.turno.split(',').length : 1;
            const bruto = shifts * tarifaDia;

            totalGross += bruto;
            if (!rec.aprobado) {
                totalPending += bruto;
            }
        });

        if (adminStatHours) adminStatHours.textContent = `${totalHours.toFixed(2)} h`;
        if (adminStatGross) adminStatGross.textContent = `Q${totalGross.toFixed(2)}`;
        if (adminStatPenalties) adminStatPenalties.textContent = `Q${totalPenalties.toFixed(2)}`;
        if (adminStatPending) adminStatPending.textContent = `Q${totalPending.toFixed(2)}`;

        if (activeTab === 'tab-trabajadores-admin') {
            renderAdminWorkersGrid(allUsers, overallAttendance);
        } else if (activeTab === 'tab-asistencia') {
            renderAdminAttendanceTable(attendance, allUsers, busRecords); // <- SE PASAN AQUI
        } else if (activeTab === 'tab-descuentos') {
            renderAdminPenaltiesTable(penalizations, allUsers);
            renderAdminBonusesTable(bonuses, allUsers);
        } else if (activeTab === 'tab-usuarios') {
            renderAdminUsersTable();
        } else if (activeTab === 'tab-empresas') {
            renderAdminCompaniesTable();
        } else if (activeTab === 'tab-tiendas') {
            renderAdminStoresTable();
        } else if (activeTab === 'tab-vehículos') {
            renderAdminVehiclesTable();
        } else if (activeTab === 'tab-préstamos') {
            renderAdminLoansTable();
        } else if (activeTab === 'tab-proyectos') {
            renderProjectsView();
        }
    }

    // Bus Details Modal Close
    if (document.getElementById('btn-close-bus-details-modal')) {
        document.getElementById('btn-close-bus-details-modal').addEventListener('click', () => {
            document.getElementById('bus-details-modal').classList.add('hidden');
        });
    }
    if (document.getElementById('btn-close-bus-details-modal-footer')) {
        document.getElementById('btn-close-bus-details-modal-footer').addEventListener('click', () => {
            document.getElementById('bus-details-modal').classList.add('hidden');
        });
    }

    // Filtrado interactivo
    if (adminGroupFilter) {
        adminGroupFilter.addEventListener('change', () => {
            setupAdminView();
        });
    }
    if (adminPeriodFilter) {
        adminPeriodFilter.addEventListener('change', () => {
            setupAdminView();
        });
    }

    // Renderizar tabla de aprobaciones
    function renderAdminAttendanceTable(attendance, allUsers, busRecords = []) {
        attendance = attendance.filter(a => !a.archivado);
        busRecords = busRecords.filter(b => !b.archivado);
        adminAttendanceTable.innerHTML = '';

        if (attendance.length === 0 && busRecords.length === 0) {
            adminAttendanceTable.innerHTML = `
                <tr>
                    <td colspan="10" class="text-muted" style="text-align: center; padding: 30px;">
                        No existen registros de marcajes en el filtro seleccionado.
                    </td>
                </tr>
            `;
            return;
        }

        // Agrupar por usuarioId
        const grouped = {};
        attendance.forEach(rec => {
            const uid = rec.usuarioId;
            if (!grouped[uid]) {
                grouped[uid] = {
                    userId: uid,
                    records: [],
                    busRecords: [],
                    totalDiurnas: 0,
                    totalNocturnas: 0,
                    totalBruto: 0,
                    totalBono: 0,
                    totalDescuento: 0,
                    totalNeto: 0,
                    ingresoTotal: 0,
                    gastoTotal: 0,
                    allApproved: true,
                    anyPending: false
                };
            }
            grouped[uid].records.push(rec);
            if (rec.horaSalida) {
                grouped[uid].totalDiurnas += rec.horasDiurnas || 0;
                grouped[uid].totalNocturnas += rec.horasNocturnas || 0;
                grouped[uid].totalBruto += rec.montoBruto || 0;
                grouped[uid].totalBono += rec.bono || 0;
                grouped[uid].totalDescuento += rec.descuento || 0;
                grouped[uid].totalNeto += rec.montoNeto || 0;
                if (!rec.aprobado) {
                    grouped[uid].allApproved = false;
                    grouped[uid].anyPending = true;
                }
            } else {
                grouped[uid].allApproved = false;
                grouped[uid].anyPending = true;
            }
        });

        busRecords.forEach(rec => {
            const uid = rec.usuarioId;
            if (!grouped[uid]) {
                grouped[uid] = {
                    userId: uid,
                    records: [],
                    busRecords: [],
                    totalDiurnas: 0,
                    totalNocturnas: 0,
                    totalBruto: 0,
                    totalBono: 0,
                    totalDescuento: 0,
                    totalNeto: 0,
                    ingresoTotal: 0,
                    gastoTotal: 0,
                    allApproved: true,
                    anyPending: false
                };
            } else if (!grouped[uid].busRecords) {
                grouped[uid].busRecords = [];
                grouped[uid].ingresoTotal = 0;
                grouped[uid].gastoTotal = 0;
            }
            grouped[uid].busRecords.push(rec);
            grouped[uid].ingresoTotal += (rec.ingresoDinero || 0);
            grouped[uid].gastoTotal += (rec.montoGasto || 0);

            // Usamos totalDiurnas para guardar los das trabajados
            grouped[uid].totalDiurnas += 1;

            if (!rec.aprobado) {
                grouped[uid].allApproved = false;
                grouped[uid].anyPending = true;
            }
        });

        const fragment = document.createDocumentFragment();
        Object.values(grouped).forEach(group => {
            const user = allUsers.find(u => u.id === group.userId);
            const nombre = user ? user.nombre : 'Desconocido';
            const grupo = user ? user.grupo : 'N/A';
            const isBuses = user && user.empresa && user.empresa.toUpperCase().includes('BUSES');

            // Deducción de préstamo
            const prestamoSaldo = user ? (parseFloat(user.préstamosaldo) || 0) : 0;
            const userPréstamoEstado = user ? user.préstamoEstadoCuota : 'Ninguno';
            const hasLoan = user && (prestamoSaldo > 0 || userPréstamoEstado === 'Autorizado');

            let loanRequestHtml = '';
            if (!hasLoan && userPréstamoEstado === 'Ninguno') {
                loanRequestHtml = `<div style="margin-top: 15px; text-align: center;">
                    <button id="btn-request-loan" class="btn-primary" style="width: auto;">Solicitar Préstamo / Adelanto</button>
                </div>`;
            } else if (userPréstamoEstado === 'Pendiente de Autorizar') {
                loanRequestHtml = `<div style="margin-top: 15px; text-align: center; color: var(--warning);">
                    <em>Tienes una solicitud de préstamo pendiente de autorización.</em>
                </div>`;
            }
            
            const isDeducted = user && (user.préstamoEstadoCuota === 'Autorizado');
            const loanCuota = hasLoan ? parseFloat(user.préstamoCuota) || 0 : 0;
            const loanDeduction = isDeducted ? loanCuota : 0;

            let diurnasText, nocturnasText, brutoText, netText;

            if (isBuses) {
                const ganancia = group.ingresoTotal - group.gastoTotal;
                const tarifaDia = parseFloat(user.tarifaDiurna) || 0;
                group.totalBruto = group.totalDiurnas * tarifaDia;
                group.totalNeto = group.totalBruto + group.totalBono - group.totalDescuento;

                const netFinal = Math.max(0, group.totalNeto - loanDeduction);

                diurnasText = `${group.totalDiurnas} Das`;
                nocturnasText = `<div style="font-size:0.75rem;">I: Q${group.ingresoTotal.toFixed(2)}<br>G: Q${ganancia.toFixed(2)}</div>`;
                brutoText = `Q${group.totalBruto.toFixed(2)}`;
                netText = `Q${netFinal.toFixed(2)}`;
            } else {
                const netFinal = Math.max(0, group.totalNeto - loanDeduction);
                diurnasText = formatDecimalHours(group.totalDiurnas);
                nocturnasText = formatDecimalHours(group.totalNocturnas);
                brutoText = `Q${group.totalBruto.toFixed(2)}`;
                netText = `Q${netFinal.toFixed(2)}`;
            }

            const bonoText = group.totalBono > 0 ? `<span class="text-success">+Q${group.totalBono.toFixed(2)}</span>` : 'Q0.00';
            const descuentoText = group.totalDescuento > 0 ? `<span class="text-danger">-Q${group.totalDescuento.toFixed(2)}</span>` : 'Q0.00';
            const loanText = loanDeduction > 0 ? `<span class="text-danger">-Q${loanDeduction.toFixed(2)}</span>` : 'Q0.00';

            // Acciones consolidado
            let actionBtn = '';
            if (group.anyPending) {
                actionBtn = `<button class="btn-table-action approve approve-group-btn" data-uid="${group.userId}" style="padding: 4px 8px; font-size:0.75rem; width: 100%;">Aprobar Todo</button>`;
            } else {
                actionBtn = `<span class="table-badge approved" style="display:block; text-align:center; padding:4px 0;">Todo Aprobado</span>`;
            }

            const isRowExpanded = expandedUserId === group.userId;
            const rotationDeg = isRowExpanded ? '90deg' : '0deg';

            const trMain = document.createElement('tr');
            trMain.style.cursor = 'pointer';
            trMain.className = 'main-grouped-row';
            trMain.setAttribute('data-target-subtable', `subtable-${group.userId}`);
            trMain.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <svg class="toggle-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" style="transform: rotate(${rotationDeg}); transition: transform 0.2s;">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                        <strong>${nombre}</strong>
                    </div>
                </td>
                <td><span class="role-badge ${user?.rol || ''}">${grupo}</span></td>
                <td>${diurnasText}</td>
                <td>${nocturnasText}</td>
                <td>${brutoText}</td>
                <td>${bonoText}</td>
                <td>${descuentoText}</td>
                <td>${loanText}</td>
                <td><strong>${netText}</strong></td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="btn-table-action approve toggle-details-btn" data-uid="${group.userId}" style="background-color: var(--primary); border-color: var(--primary); padding: 4px 8px; font-size:0.75rem; width: auto;">Detalles</button>
                        ${actionBtn}
                    </div>
                </td>
            `;
            fragment.appendChild(trMain);

            // Subtabla Fila
            const trSub = document.createElement('tr');
            trSub.id = `subtable-${group.userId}`;
            trSub.className = `subtable-row ${isRowExpanded ? '' : 'hidden'}`;

            // Construir registros individuales para subtabla
            let subrowsHtml = '';

            if (isBuses) {
                group.busRecords.forEach(rec => {
                    const pagoDiario = parseFloat(user.tarifaDiurna) || 0;
                    const gananciaLocal = (rec.ingresoDinero || 0) - (rec.montoGasto || 0);
                    const rNeto = `Ganancia: Q${gananciaLocal.toFixed(2)}`;

                    let subAction = '';
                    if (rec.aprobado) {
                        subAction = '<span class="table-badge approved" style="font-size:0.7rem; padding: 2px 6px;">Aprobado</span>';
                    } else {
                        subAction = `
                            <div style="display:flex; gap:4px;">
                                <button class="btn-table-action approve approve-single-rec-buses" data-recid="${rec.id}" style="padding: 2px 6px; font-size: 0.7rem; width: auto;">Aprobar</button>
                            </div>
                        `;
                    }
                    subAction += ` <button class="btn-table-action info view-bus-details-btn" data-recid="${rec.id}" style="padding: 2px 6px; font-size: 0.7rem; width: auto; background-color: var(--info); border-color: var(--info); color: white;">Ver Detalles</button>`;

                    let tipoPagoCell = '';
                    if (rec.aprobado) {
                        tipoPagoCell = rec.metodoPago || 'Efectivo';
                    } else {
                        tipoPagoCell = `
                            <select class="bus-payment-method-select" data-recid="${rec.id}" style="font-size:0.8rem; padding:2px 4px; border-radius:var(--radius-sm); border:1px solid var(--border-color); background:var(--bg-card); color:#fff; width:100%;">
                                <option value="Efectivo" ${rec.metodoPago === 'Efectivo' || !rec.metodoPago ? 'selected' : ''}>Efectivo</option>
                                <option value="Transferencia" ${rec.metodoPago === 'Transferencia' ? 'selected' : ''}>Transferencia</option>
                            </select>
                        `;
                    }

                    const diasLaborados = rec.turno ? rec.turno.split(',').length : 1;

                    subrowsHtml += `
                        <tr>
                            <td>${rec.fecha}</td>
                            <td>Q${pagoDiario.toFixed(2)}</td>
                            <td>${diasLaborados}</td>
                            <td><strong>${rNeto}</strong></td>
                            <td>${subAction}</td>
                            <td>${tipoPagoCell}</td>
                        </tr>
                    `;
                });
            } else {
                group.records.forEach(rec => {
                    const outTime = rec.horaSalida ? rec.horaSalida : '<span class="text-warning">En curso...</span>';
                    const rDiurnas = rec.horaSalida ? formatDecimalHours(rec.horasDiurnas) : '-';
                    const rNocturnas = rec.horaSalida ? formatDecimalHours(rec.horasNocturnas) : '-';
                    const rBruto = rec.horaSalida ? `Q${rec.montoBruto.toFixed(2)}` : '-';
                    const rBono = rec.horaSalida ? (rec.bono > 0 ? `<span class="text-success">+Q${rec.bono.toFixed(2)}</span>` : 'Q0.00') : '-';
                    const rDesc = rec.horaSalida ? (rec.descuento > 0 ? `<span class="text-danger">-Q${rec.descuento.toFixed(2)}</span>` : 'Q0.00') : '-';
                    const rNeto = rec.horaSalida ? `Q${rec.montoNeto.toFixed(2)}` : '-';

                    let subAction = '';
                    if (!rec.horaSalida) {
                        subAction = '<span class="text-muted" style="font-size:0.75rem;">Jornada en Curso</span>';
                    } else if (rec.aprobado) {
                        subAction = '<span class="table-badge approved" style="font-size:0.7rem; padding: 2px 6px;">Aprobado</span>';
                    } else {
                        subAction = `
                            <div style="display:flex; gap:4px;">
                                <button class="btn-table-action approve approve-single-rec" data-recid="${rec.id}" style="padding: 2px 6px; font-size: 0.7rem; width: auto;">Aprobar</button>
                                <button class="btn-table-action approve-row-bonus-btn" data-recid="${rec.id}" style="background-color: var(--success); border-color: var(--success); padding: 2px 6px; font-size: 0.7rem; width: auto;">+ Bono</button>
                                <button class="btn-table-action penalize penalize-single-rec" data-recid="${rec.id}" style="padding: 2px 6px; font-size: 0.7rem; width: auto;">Penalizar</button>
                            </div>
                        `;
                    }

                    let inJustification = '';
                    if (rec.justificacionMotivoEntrada || rec.justificacionLugarEntrada) {
                        inJustification = `<div style="font-size:0.7rem; color:var(--text-muted); line-height:1.2; margin-top:2px;">
                            ${rec.justificacionLugarEntrada || ''} <br> ${rec.justificacionMotivoEntrada || ''}
                        </div>`;
                    }
                    
                    let outJustification = '';
                    if (rec.horaSalida && (rec.justificacionMotivoSalida || rec.justificacionLugarSalida)) {
                        outJustification = `<div style="font-size:0.7rem; color:var(--text-muted); line-height:1.2; margin-top:2px;">
                            ${rec.justificacionLugarSalida || ''} <br> ${rec.justificacionMotivoSalida || ''}
                        </div>`;
                    }

                    subrowsHtml += `
                        <tr>
                            <td>${rec.fecha}</td>
                            <td>${rec.horaEntrada} ${inJustification}</td>
                            <td>${outTime} ${outJustification}</td>
                            <td>${rDiurnas}</td>
                            <td>${rNocturnas}</td>
                            <td>${rBruto}</td>
                            <td class="bonuses-col">${rBono}</td>
                            <td class="penalties-col">${rDesc}</td>
                            <td><strong>${rNeto}</strong></td>
                            <td>${subAction}</td>
                        </tr>
                    `;
                });
            }

            // Resumen de préstamo html / fila adicional
            if (hasLoan) {
                const loanCuota = parseFloat(user.préstamoCuota) || 0;
                const loanDeductVal = isDeducted ? loanCuota : 0;

                if (isBuses) {
                    subrowsHtml += `
                        <tr style="background: rgba(253, 224, 71, 0.04); font-weight: 500;">
                            <td colspan="2">
                                <span style="color:var(--warning); font-weight:700;">Préstamo / Adelanto</span> (Saldo Pendiente: Q${parseFloat(user.préstamosaldo).toFixed(2)})
                            </td>
                            <td>-</td>
                            <td class="text-danger">${loanDeductVal > 0 ? `-Q${loanCuota.toFixed(2)}` : 'Q0.00'}</td>
                            <td>
                                <label style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.8rem;">
                                    <input type="checkbox" class="loan-deduct-checkbox" data-uid="${group.userId}" ${isDeducted ? 'checked' : ''}>
                                    Descontar Q${loanCuota.toFixed(2)}
                                </label>
                            </td>
                            <td>-</td>
                        </tr>
                    `;
                } else {
                    subrowsHtml += `
                        <tr style="background: rgba(253, 224, 71, 0.04); font-weight: 500;">
                            <td colspan="3">
                                <span style="color:var(--warning); font-weight:700;">Préstamo / Adelanto</span> (Saldo Pendiente: Q${parseFloat(user.préstamosaldo).toFixed(2)})
                            </td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td class="text-danger">${loanDeductVal > 0 ? `-Q${loanCuota.toFixed(2)}` : 'Q0.00'}</td>
                            <td><strong>${loanDeductVal > 0 ? `-Q${loanCuota.toFixed(2)}` : 'Q0.00'}</strong></td>
                            <td>
                                <label style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.8rem;">
                                    <input type="checkbox" class="loan-deduct-checkbox" data-uid="${group.userId}" ${isDeducted ? 'checked' : ''}>
                                    Descontar Q${loanCuota.toFixed(2)}
                                </label>
                            </td>
                        </tr>
                    `;
                }
            }

            // Suma Final Row
            if (isBuses) {
                let totalDias = 0;
                let totalGanancia = 0;
                group.busRecords.forEach(rec => {
                    const dias = rec.turno ? rec.turno.split(',').length : 1;
                    totalDias += dias;
                    totalGanancia += (rec.ingresoDinero || 0) - (rec.montoGasto || 0);
                });

                subrowsHtml += `
                    <tr style="background: rgba(255, 255, 255, 0.08); font-weight: bold; border-top: 2px solid var(--border-color);">
                        <td colspan="2" style="text-align: right; color: var(--primary);">Suma Final:</td>
                        <td>${totalDias} Das</td>
                        <td><span style="font-size: 0.95rem; color: var(--primary);">Ganancia: Q${totalGanancia.toFixed(2)}</span></td>
                        <td>-</td>
                        <td>-</td>
                    </tr>
                `;
            } else {
                let totalDiurnas = 0;
                let totalNocturnas = 0;
                let totalBruto = 0;
                let totalBonos = 0;
                let totalDescuentos = 0;

                group.records.forEach(rec => {
                    if (rec.horaSalida) {
                        totalDiurnas += parseFloat(rec.horasDiurnas) || 0;
                        totalNocturnas += parseFloat(rec.horasNocturnas) || 0;
                        totalBruto += parseFloat(rec.montoBruto) || 0;
                        totalBonos += parseFloat(rec.bono) || 0;
                        totalDescuentos += parseFloat(rec.descuento) || 0;
                    }
                });

                const loanDeductVal = isDeducted ? (parseFloat(user.préstamoCuota) || 0) : 0;
                const finalNeto = totalBruto + totalBonos - totalDescuentos - loanDeductVal;

                subrowsHtml += `
                    <tr style="background: rgba(255, 255, 255, 0.08); font-weight: bold; border-top: 2px solid var(--border-color);">
                        <td colspan="3" style="text-align: right; color: var(--primary);">Suma Final:</td>
                        <td>${totalDiurnas.toFixed(1)} hrs</td>
                        <td>${totalNocturnas.toFixed(1)} hrs</td>
                        <td>Q${totalBruto.toFixed(2)}</td>
                        <td class="text-success">+Q${totalBonos.toFixed(2)}</td>
                        <td class="text-danger">-Q${(totalDescuentos + loanDeductVal).toFixed(2)}</td>
                        <td colspan="2"><span style="font-size: 0.95rem; color: var(--primary);">Q${finalNeto.toFixed(2)}</span></td>
                    </tr>
                `;
            }

            let tableHeadersHtml = '';
            if (isBuses) {
                tableHeadersHtml = `
                    <tr>
                        <th>Fecha</th>
                        <th>Pago diario</th>
                        <th>Dias laborados</th>
                        <th>Monto Neto</th>
                        <th>Estado/Acción</th>
                        <th>Tipo de pago</th>
                    </tr>
                `;
            } else {
                tableHeadersHtml = `
                    <tr>
                        <th>Fecha</th>
                        <th>Entrada</th>
                        <th>Salida</th>
                        <th>H. Diurnas</th>
                        <th>H. Nocturnas</th>
                        <th>Monto Bruto</th>
                        <th>Bono</th>
                        <th>Descuento</th>
                        <th>Monto Neto</th>
                        <th>Estado/Acción</th>
                    </tr>
                `;
            }

            trSub.innerHTML = `
                <td colspan="10" style="background: rgba(0,0,0,0.15); padding: 15px;">
                    <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; background: var(--bg-card);">
                        <h4 style="margin-top: 0; margin-bottom: 10px; font-size: 0.95rem; display: flex; align-items: center; gap: 6px;">
                            <span>Desglose de turnos de ${nombre}</span>
                        </h4>
                        <div class="table-responsive">
                            <table style="width: 100%; font-size: 0.85rem;">
                                <thead>
                                    ${tableHeadersHtml}
                                </thead>
                                <tbody>
                                    ${subrowsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </td>
            `;
            fragment.appendChild(trSub);
        });

        adminAttendanceTable.appendChild(fragment);

        // Registrar listeners para expandir/colapsar
        adminAttendanceTable.querySelectorAll('.main-grouped-row').forEach(row => {
            const toggleFunc = (e) => {
                if (e.target.closest('button')) return;
                const targetId = row.getAttribute('data-target-subtable');
                const subRow = document.getElementById(targetId);
                const icon = row.querySelector('.toggle-icon');
                const uid = parseInt(targetId.replace('subtable-', ''));
                if (subRow) {
                    subRow.classList.toggle('hidden');
                    if (subRow.classList.contains('hidden')) {
                        icon.style.transform = 'rotate(0deg)';
                        if (expandedUserId === uid) expandedUserId = null;
                    } else {
                        icon.style.transform = 'rotate(90deg)';
                        expandedUserId = uid;
                    }
                }
            };
            row.addEventListener('click', toggleFunc);

            row.querySelectorAll('.toggle-details-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetId = row.getAttribute('data-target-subtable');
                    const subRow = document.getElementById(targetId);
                    const icon = row.querySelector('.toggle-icon');
                    const uid = parseInt(targetId.replace('subtable-', ''));
                    if (subRow) {
                        subRow.classList.toggle('hidden');
                        if (subRow.classList.contains('hidden')) {
                            icon.style.transform = 'rotate(0deg)';
                            if (expandedUserId === uid) expandedUserId = null;
                        } else {
                            icon.style.transform = 'rotate(90deg)';
                            expandedUserId = uid;
                        }
                    }
                });
            });
        });

        // Registrar listeners de acciones dentro de la subtabla
        adminAttendanceTable.querySelectorAll('.approve-single-rec').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const recid = e.target.getAttribute('data-recid');
                const success = await window.AttendanceDB.approvePayment(recid, currentUser.id);
                if (success) {
                    setupAdminView();
                }
            });
        });

        adminAttendanceTable.querySelectorAll('.approve-single-rec-buses').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const recid = e.target.getAttribute('data-recid');
                const row = e.target.closest('tr');
                const selectEl = row.querySelector('.bus-payment-method-select');
                const metodoPago = selectEl ? selectEl.value : 'Efectivo';

                const success = await window.AttendanceDB.approveBusRecord(recid, currentUser.id, metodoPago);
                if (success) {
                    showToast('Éxito', 'Pago de turno aprobado correctamente.', 'success');
                    setupAdminView();
                } else {
                    showToast('Error', 'No se pudo aprobar el pago. Asegúrate de haber reiniciado el servidor.', 'danger');
                }
            });
        });

        adminAttendanceTable.querySelectorAll('.view-bus-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recid = parseInt(e.target.getAttribute('data-recid'));
                const records = window.AttendanceDB._state?.busRecords || [];
                const rec = records.find(r => r.id === recid);
                if (rec) {
                    const contentDiv = document.getElementById('bus-details-content');
                    if (contentDiv) {
                        try {
                            const gastos = JSON.parse(rec.detallesGastos || '[]');
                            if (gastos.length === 0) {
                                contentDiv.innerHTML = '<p class="text-muted">No hay detalles registrados.</p>';
                            } else {
                                let html = '<ul style="list-style: none; padding: 0;">';
                                gastos.forEach((g, i) => {
                                    html += `<li style="margin-bottom: 15px; padding: 15px; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
                                        <strong>#${i + 1} - ${g.tipo}</strong><br>
                                        Monto: Q${(g.monto || 0).toFixed(2)}<br>`;
                                    if (g.tipo === 'Diesel' && g.cantidad) {
                                        html += `Cantidad: ${g.cantidad} Gal/Lt<br>`;
                                    }
                                    if (g.tipo === 'Préstamo' && g.empleadoId) {
                                        html += `Empleado: ${g.empleadoNombre || 'ID '+g.empleadoId}<br>`;
                                        html += `Justificación: ${g.justificacion || '-'}<br>`;
                                    }
                                    if (g.fotoUrl) {
                                        html += `<img src="${g.fotoUrl}" style="max-width: 100%; margin-top: 10px; border-radius: 4px; display: block;">`;
                                    }
                                    html += '</li>';
                                });
                                html += '</ul>';
                                contentDiv.innerHTML = html;
                            }
                            document.getElementById('bus-details-modal').classList.remove('hidden');
                        } catch (err) {
                            contentDiv.innerHTML = '<p class="text-danger">Error al leer detalles.</p>';
                        }
                    }
                }
            });
        });

        adminAttendanceTable.querySelectorAll('.approve-row-bonus-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recid = e.target.getAttribute('data-recid');
                openBonusModal(recid);
            });
        });

        adminAttendanceTable.querySelectorAll('.penalize-single-rec').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recid = e.target.getAttribute('data-recid');
                const rec = window.AttendanceDB.getAttendance().find(a => a.id === parseInt(recid));
                openModal(rec ? rec.usuarioId : null);
            });
        });

        // Registrar listeners para botón "Aprobar Todo" del grupo
        adminAttendanceTable.querySelectorAll('.approve-group-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const uid = parseInt(e.target.getAttribute('data-uid'));
                const group = grouped[uid];

                if (group.records && group.records.length > 0) {
                    for (const rec of group.records) {
                        if (rec.horaSalida && !rec.aprobado) {
                            await window.AttendanceDB.approvePayment(rec.id, currentUser.id);
                        }
                    }
                }

                if (group.busRecords && group.busRecords.length > 0) {
                    for (const rec of group.busRecords) {
                        if (!rec.aprobado) {
                            const selectEl = adminAttendanceTable.querySelector(`.bus-payment-method-select[data-recid="${rec.id}"]`);
                            const metodoPago = selectEl ? selectEl.value : 'Efectivo';
                            await window.AttendanceDB.approveBusRecord(rec.id, currentUser.id, metodoPago);
                        }
                    }
                }

                setupAdminView();
            });
        });

        // Registrar listeners de préstamo checkbox
        adminAttendanceTable.querySelectorAll('.loan-deduct-checkbox').forEach(cb => {
            cb.addEventListener('change', async (e) => {
                const uid = parseInt(e.target.getAttribute('data-uid'));
                const active = e.target.checked;
                let success = false;
                if (active) {
                    const res = await window.AttendanceDB.authorizeLoanCuota(uid, currentUser.id);
                    success = res.success;
                } else {
                    const res = await window.AttendanceDB.resetLoanCuota(uid, currentUser.id);
                    success = res.success;
                }

                if (success) {
                    showToast('Cuota de Préstamo Actualizada', active ? 'Se aplicará deducción en esta planilla.' : 'Se pospone deducción de cuota.', 'info');
                    setupAdminView();
                } else {
                    showToast('Error', 'No se pudo actualizar el estado de la cuota del préstamo.', 'danger');
                    e.target.checked = !active; // deshacer
                }
            });
        });
    }

    // Renderizar tabla de descuentos
    function renderAdminPenaltiesTable(penalizations, allUsers) {
        adminPenaltiesTable.innerHTML = '';

        if (penalizations.length === 0) {
            adminPenaltiesTable.innerHTML = `
                <tr>
                    <td colspan="5" class="text-muted" style="text-align: center; padding: 30px;">
                        No existen descuentos aplicadas en este período.
                    </td>
                </tr>
            `;
            return;
        }

        const fragmentPenalties = document.createDocumentFragment();
        penalizations.forEach(pen => {
            const user = allUsers.find(u => u.id === pen.usuarioId);
            const nombre = user ? user.nombre : 'Desconocido';

            // Buscar si el registro de asistencia ya fue aprobado. Si sí, deshabilitar la eliminación.
            const attendanceRecord = window.AttendanceDB.getAttendance().find(a => a.id === pen.asistenciaId);
            const isApproved = attendanceRecord ? attendanceRecord.aprobado : false;

            const deleteButton = isApproved
                ? '<button class="btn-table-action disabled" disabled title="No se puede eliminar de un pago ya aprobado">Eliminar</button>'
                : `<button class="btn-table-action penalize delete-penalty" data-id="${pen.id}">Eliminar</button>`;

            const fotoLink = pen.fotoUrl
                ? `<div style="margin-top: 4px;">
                    <a href="${pen.fotoUrl}" target="_blank" class="btn-table-action approve" style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; font-size: 0.75rem; background-color: var(--primary); border-color: var(--primary);">
                        Ver Foto
                    </a>
                   </div>`
                : '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${nombre}</strong></td>
                <td>${pen.fecha}</td>
                <td>${pen.motivo}${fotoLink}</td>
                <td><strong class="text-danger">Q${pen.monto.toFixed(2)}</strong></td>
                <td>${deleteButton}</td>
            `;
            fragmentPenalties.appendChild(tr);
        });
        adminPenaltiesTable.appendChild(fragmentPenalties);

        // Registrar listener para eliminar
        adminPenaltiesTable.querySelectorAll('.delete-penalty').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const penaltyId = e.target.getAttribute('data-id');
                if (await appConfirm('Confirmación', '¿Estás seguro de que deseas eliminar esta descuento? Esto recalculará el pago del usuario.')) {
                    const success = await window.AttendanceDB.deletePenalization(penaltyId, currentUser.id);
                    if (success) {
                        showToast('Descuento Eliminada', 'Se ha recalculado el monto neto de la asistencia.', 'info');
                        setupAdminView();
                    }
                }
            });
        });
    }

    // Renderizar tabla de bonos / extras
    function renderAdminBonusesTable(bonuses, allUsers) {
        const adminBonusesTable = document.getElementById('admin-bonuses-table');
        if (!adminBonusesTable) return;
        adminBonusesTable.innerHTML = '';

        if (bonuses.length === 0) {
            adminBonusesTable.innerHTML = `
                <tr>
                    <td colspan="5" class="text-muted" style="text-align: center; padding: 30px;">
                        No existen bonificaciones aplicadas en este período.
                    </td>
                </tr>
            `;
            return;
        }

        const fragmentBonuses = document.createDocumentFragment();
        bonuses.forEach(bon => {
            const user = allUsers.find(u => u.id === bon.usuarioId);
            const nombre = user ? user.nombre : 'Desconocido';

            // Buscar si el registro de asistencia ya fue aprobado. Si sí, deshabilitar la eliminación.
            const attendanceRecord = window.AttendanceDB.getAttendance().find(a => a.id === bon.asistenciaId);
            const isApproved = attendanceRecord ? attendanceRecord.aprobado : false;

            const deleteButton = isApproved
                ? '<button class="btn-table-action disabled" disabled title="No se puede eliminar de un pago ya aprobado">Eliminar</button>'
                : `<button class="btn-table-action penalize delete-bonus" data-id="${bon.id}">Eliminar</button>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${nombre}</strong></td>
                <td>${bon.fecha}</td>
                <td>${bon.motivo}</td>
                <td><strong class="text-success">Q${bon.monto.toFixed(2)}</strong></td>
                <td>${deleteButton}</td>
            `;
            fragmentBonuses.appendChild(tr);
        });
        adminBonusesTable.appendChild(fragmentBonuses);

        // Registrar listener para eliminar
        adminBonusesTable.querySelectorAll('.delete-bonus').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const bonusId = e.target.getAttribute('data-id');
                if (await appConfirm('Confirmación', '¿Estás seguro de que deseas eliminar este bono? Esto recalculará el pago del usuario.')) {
                    const success = await window.AttendanceDB.deleteBonus(bonusId, currentUser.id);
                    if (success) {
                        showToast('Bono Eliminado', 'Se ha recalculado el monto neto de la asistencia.', 'info');
                        setupAdminView();
                    }
                }
            });
        });
    }

    // --- MANEJO DEL MODAL DE DESCUENTOS ---
    if (btnOpenPenalizeModal) {
        btnOpenPenalizeModal.addEventListener('click', () => {
            openModal();
        });
    }
    if (btnOpenPenalizeModalTab) {
        btnOpenPenalizeModalTab.addEventListener('click', () => {
            openModal();
        });
    }

    btnCloseModal.addEventListener('click', closeModal);
    btnCancelPenalize.addEventListener('click', closeModal);

    // Cerrar al hacer clic fuera del modal
    penalizeModal.addEventListener('click', (e) => {
        if (e.target === penalizeModal) closeModal();
    });

    function openModal(preselectedUserId = null) {
        penalizeModal.classList.remove('hidden');

        // Limpiar formulario
        const artInput = document.getElementById('penalize-article');
        if (artInput) artInput.value = '';
        penalizeReasonInput.value = '';
        penalizeAmountInput.value = '';

        // Cargar colaboradores en el selector
        const allUsers = window.AttendanceDB.getUsers();
        const userSelect = document.getElementById('penalize-user-select');
        if (userSelect) {
            userSelect.innerHTML = '';
            allUsers.filter(u => u.rol === 'usr' || u.rol === 'leader').forEach(u => {
                const option = document.createElement('option');
                option.value = u.id;
                option.textContent = `${u.nombre} (@${u.username}) [${u.grupo || 'Sin Grupo'}]`;
                if (preselectedUserId && parseInt(preselectedUserId) === u.id) {
                    option.selected = true;
                }
                userSelect.appendChild(option);
            });
        }
    }

    function closeModal() {
        penalizeModal.classList.add('hidden');
    }

    penalizationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userSelect = document.getElementById('penalize-user-select');
        const userId = userSelect ? userSelect.value : null;
        const article = document.getElementById('penalize-article') ? document.getElementById('penalize-article').value.trim() : '';
        const justification = penalizeReasonInput.value.trim();
        const monto = parseFloat(penalizeAmountInput.value);

        if (!userId) {
            showToast('Operación Inválida', 'Debes seleccionar un colaborador válido.', 'danger');
            return;
        }

        const motivo = `Artículo: ${article} | Justificación: ${justification}`;

        let fotoBase64 = null;
        const photoInput = document.getElementById('penalize-photo-input');
        if (photoInput && photoInput.files && photoInput.files.length > 0) {
            const file = photoInput.files[0];
            fotoBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        }

        const success = await window.AttendanceDB.applyPenalization(null, userId, motivo, monto, currentUser.id, fotoBase64);

        if (success) {
            showToast('Descuento Aplicada', `Se aplicó descuento de Q${monto.toFixed(2)} al colaborador.`, 'success');

            // Limpiar input file
            if (photoInput) photoInput.value = '';

            closeModal();
            setupAdminView();
        } else {
            showToast('Error', 'No se pudo aplicar la descuento.', 'danger');
        }
    });

    // --- MANEJO DEL MODAL DE BONOS / EXTRAS ---
    const btnOpenBonusModalTrigger = document.getElementById('btn-open-bonus-modal-trigger');
    const bonusModal = document.getElementById('bonus-modal');
    const btnCloseBonusModal = document.getElementById('btn-close-bonus-modal');
    const btnCancelBonus = document.getElementById('btn-cancel-bonus');
    const bonusForm = document.getElementById('bonus-form');
    const bonusRecordSelect = document.getElementById('bonus-record-select');
    const bonusReasonInput = document.getElementById('bonus-reason');
    const bonusAmountInput = document.getElementById('bonus-amount');

    if (btnOpenBonusModalTrigger) {
        btnOpenBonusModalTrigger.addEventListener('click', () => {
            openBonusModal();
        });
    }

    if (btnCloseBonusModal) btnCloseBonusModal.addEventListener('click', closeBonusModal);
    if (btnCancelBonus) btnCancelBonus.addEventListener('click', closeBonusModal);
    if (bonusModal) {
        bonusModal.addEventListener('click', (e) => {
            if (e.target === bonusModal) closeBonusModal();
        });
    }

    function openBonusModal(preselectedRecordId = null) {
        if (!bonusModal) return;
        bonusModal.classList.remove('hidden');

        bonusReasonInput.value = '';
        bonusAmountInput.value = '';

        const allUsers = window.AttendanceDB.getUsers();
        const pendingRecords = window.AttendanceDB.getAttendance().filter(a => a.horaSalida && !a.aprobado);

        bonusRecordSelect.innerHTML = '';
        if (pendingRecords.length === 0) {
            bonusRecordSelect.innerHTML = '<option value="">No hay registros de jornada completados pendientes de pago</option>';
        } else {
            pendingRecords.forEach(rec => {
                const user = allUsers.find(u => u.id === rec.usuarioId);
                const label = `${user ? user.nombre : 'Usuario'} - Fecha: ${rec.fecha} (Bruto: Q${rec.montoBruto.toFixed(2)}, Neto: Q${rec.montoNeto.toFixed(2)})`;

                const option = document.createElement('option');
                option.value = rec.id;
                option.textContent = label;

                if (preselectedRecordId && parseInt(preselectedRecordId) === rec.id) {
                    option.selected = true;
                }

                bonusRecordSelect.appendChild(option);
            });
        }
    }

    function closeBonusModal() {
        if (bonusModal) bonusModal.classList.add('hidden');
    }

    if (bonusForm) {
        bonusForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const recordId = bonusRecordSelect.value;
            const motivo = bonusReasonInput.value.trim();
            const monto = parseFloat(bonusAmountInput.value);

            if (!recordId) {
                showToast('Operación Inválida', 'Debes seleccionar un registro de asistencia válido.', 'danger');
                return;
            }

            const success = await window.AttendanceDB.applyBonus(recordId, motivo, monto, currentUser.id);

            if (success) {
                showToast('Bono Aplicado', `Se aplicó un bono de Q${monto.toFixed(2)} al registro seleccionado.`, 'success');
                closeBonusModal();
                setupAdminView();
            } else {
                showToast('Error', 'No se pudo aplicar el bono.', 'danger');
            }
        });
    }

