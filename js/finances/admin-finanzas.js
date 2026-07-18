window.renderAdminFinances = async function() {
    const monthSelect = document.getElementById('finance-month-select');
    if (!monthSelect) return;

    // Fetch projects and global incomes
    let projects = [];
    let globalIncomes = [];
    let pettyCashFunds = [];
    
    try {
        const currentComp = window.AttendanceDB?.currentCompany;
        if (currentUser.rol !== 'superadmin' && (!currentComp || currentComp === 'Todas')) {
            // Leader/Admin with no specific company sees no finances
            document.getElementById('finance-nomina-pagada').textContent = 'Q0.00';
            document.getElementById('finance-ingresos').textContent = 'Q0.00';
            document.getElementById('finance-gastos').textContent = 'Q0.00';
            document.getElementById('finance-user-list').innerHTML = `<tr><td colspan="3" class="text-muted" style="text-align:center; padding:20px;">Debes seleccionar una empresa para ver sus finanzas.</td></tr>`;
            return;
        }

        const compToFetch = currentComp || 'Todas';
        const [projRes, incRes, pettyRes] = await Promise.all([
            fetch(`/api/projects?empresa=${encodeURIComponent(compToFetch)}`),
            fetch('/api/global-incomes'),
            fetch(`/api/petty-cash-funds?empresa=${encodeURIComponent(compToFetch)}`)
        ]);
        if (projRes.ok) {
            const data = await projRes.json();
            projects = Array.isArray(data) ? data : [];
        }
        if (incRes.ok) {
            const data = await incRes.json();
            globalIncomes = Array.isArray(data) ? data : (data.data || []);
        }
        if (pettyRes.ok) {
            const data = await pettyRes.json();
            pettyCashFunds = Array.isArray(data) ? data : [];
        }
    } catch (e) {
        console.error("Error fetching finance data:", e);
    }

    // Attendance data (Nomina)
    let attendance = window.AttendanceDB?.getAttendance() || [];
    let piecework = window.AttendanceDB?.getPiecework() || [];
    let busRecords = window.AttendanceDB?.getBusRecords() || [];

    const currentCompCheck = window.AttendanceDB?.currentCompany;
    if (currentUser.rol === 'superadmin') {
        if (currentCompCheck && currentCompCheck !== 'Todas') {
            const allUsers = window.AttendanceDB?.getUsers() || [];
            const usersInCompany = allUsers.filter(u => u.empresa === currentCompCheck || u.empresas_asignadas?.includes(currentCompCheck)).map(u => u.id);
            attendance = attendance.filter(a => usersInCompany.includes(a.usuarioId));
            piecework = piecework.filter(p => usersInCompany.includes(p.usuarioId));
            busRecords = busRecords.filter(b => usersInCompany.includes(b.usuarioId));
            globalIncomes = globalIncomes.filter(g => usersInCompany.includes(g.usuarioId));
            pettyCashFunds = pettyCashFunds.filter(f => usersInCompany.includes(f.usuario_id));
        }
    } else {
        if (currentCompCheck && currentCompCheck !== 'Todas') {
            const allUsers = window.AttendanceDB?.getUsers() || [];
            const usersInCompany = allUsers.filter(u => u.empresa === currentCompCheck || u.empresas_asignadas?.includes(currentCompCheck)).map(u => u.id);
            attendance = attendance.filter(a => usersInCompany.includes(a.usuarioId));
            piecework = piecework.filter(p => usersInCompany.includes(p.usuarioId));
            busRecords = busRecords.filter(b => usersInCompany.includes(b.usuarioId));
            globalIncomes = globalIncomes.filter(g => usersInCompany.includes(g.usuarioId));
            pettyCashFunds = pettyCashFunds.filter(f => usersInCompany.includes(f.usuario_id));
        } else {
            attendance = [];
            piecework = [];
            busRecords = [];
            globalIncomes = [];
            pettyCashFunds = [];
        }
    }

    // Helper: format YYYY-MM
    function getMonthKey(dateString) {
        if (!dateString) return null;
        let d;
        if (dateString.includes('/')) {
            const parts = dateString.split(' ')[0].split('/');
            d = new Date(parts[2], parts[1] - 1, parts[0]);
        } else {
            d = new Date(dateString);
        }
        if (isNaN(d.getTime())) return null;
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        return `${d.getFullYear()}-${m}`;
    }

    // Extract unique months from all activity to populate dropdown
    const monthsSet = new Set();
    const addMonth = (dateStr) => {
        const key = getMonthKey(dateStr);
        if (key) monthsSet.add(key);
    };

    attendance.forEach(a => addMonth(a.fecha));
    piecework.forEach(p => addMonth(p.fecha));
    busRecords.forEach(b => addMonth(b.fecha));
    globalIncomes.forEach(g => addMonth(g.fecha));
    
    // Petty cash expenses dates
    pettyCashFunds.forEach(fund => {
        if (fund.gastos) {
            fund.gastos.forEach(e => addMonth(e.fecha));
        }
    });

    const sortedMonths = Array.from(monthsSet).sort().reverse();
    
    // If no months, add current
    if (sortedMonths.length === 0) {
        const now = new Date();
        const m = (now.getMonth() + 1).toString().padStart(2, '0');
        sortedMonths.push(`${now.getFullYear()}-${m}`);
    }

    // Populate Select if empty or different
    const currentSelected = monthSelect.value || sortedMonths[0];
    monthSelect.innerHTML = '';
    sortedMonths.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        // Format label nicely: "2026-07" -> "Julio 2026"
        const [yy, mm] = m.split('-');
        const date = new Date(yy, parseInt(mm) - 1, 1);
        opt.textContent = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
        if (m === currentSelected) opt.selected = true;
        monthSelect.appendChild(opt);
    });

    const selectedMonth = monthSelect.value;

    // ----- CALCULATE KPIs FOR SELECTED MONTH -----
    let monthPayroll = 0;
    let monthIncomes = 0;
    let monthExpenses = 0;

    // Nomina Pagada
    let payrollByUser = {};
    window.currentPayrollDetailsByUser = {};

    attendance.forEach(a => {
        if (getMonthKey(a.fecha) === selectedMonth && (a.aprobado || a.archivado)) {
            const amount = parseFloat(a.montoNeto) || 0;
            monthPayroll += amount;
            payrollByUser[a.usuarioId] = (payrollByUser[a.usuarioId] || 0) + amount;
            
            if (!window.currentPayrollDetailsByUser[a.usuarioId]) window.currentPayrollDetailsByUser[a.usuarioId] = [];
            window.currentPayrollDetailsByUser[a.usuarioId].push({ fecha: a.fecha, tipo: 'Asistencia Regular', monto: amount });
        }
    });
    piecework.forEach(p => {
        if (getMonthKey(p.fecha) === selectedMonth && (p.estado === 'Aprobado' || p.estado === 'Pagado' || p.archivado)) {
            const amount = parseFloat(p.total) || 0;
            monthPayroll += amount;
            payrollByUser[p.usuarioId] = (payrollByUser[p.usuarioId] || 0) + amount;
            
            if (!window.currentPayrollDetailsByUser[p.usuarioId]) window.currentPayrollDetailsByUser[p.usuarioId] = [];
            window.currentPayrollDetailsByUser[p.usuarioId].push({ fecha: p.fecha, tipo: 'Trabajo por Trato', monto: amount });
        }
    });
    const allUsers = window.AttendanceDB?.getUsers() || [];
    busRecords.forEach(b => {
        if (getMonthKey(b.fecha) === selectedMonth && (b.aprobado || b.archivado)) {
            const user = allUsers.find(u => u.id === b.usuarioId);
            const tarifaDia = parseFloat(user ? user.tarifaDiurna : 0) || 0;
            const shifts = b.turno ? b.turno.split(',').length : 1;
            const amount = (shifts * tarifaDia);
            monthPayroll += amount;
            payrollByUser[b.usuarioId] = (payrollByUser[b.usuarioId] || 0) + amount;
            
            if (!window.currentPayrollDetailsByUser[b.usuarioId]) window.currentPayrollDetailsByUser[b.usuarioId] = [];
            window.currentPayrollDetailsByUser[b.usuarioId].push({ fecha: b.fecha, tipo: 'Turno de Buses', monto: amount });
        }
    });

    // Ingresos / Gastos globales
    globalIncomes.forEach(g => {
        if (getMonthKey(g.fecha) === selectedMonth && g.estado !== 'Rechazado') {
            if (g.tipo === 'Ingreso') {
                monthIncomes += parseFloat(g.monto) || 0;
            } else if (g.tipo === 'Gasto' || g.tipo === 'Egreso') {
                monthExpenses += parseFloat(g.monto) || 0;
            }
        }
    });

    // Caja Chica
    pettyCashFunds.forEach(fund => {
        if (fund.gastos) {
            fund.gastos.forEach(e => {
                if (getMonthKey(e.fecha) === selectedMonth) {
                    monthExpenses += parseFloat(e.monto) || 0;
                }
            });
        }
    });

    // Update DOM
    document.getElementById('fin-kpi-payroll').textContent = `Q${monthPayroll.toLocaleString('es-GT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('fin-kpi-incomes').textContent = `Q${monthIncomes.toLocaleString('es-GT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('fin-kpi-expenses').textContent = `Q${monthExpenses.toLocaleString('es-GT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    // Render payroll table
    const payrollTbody = document.getElementById('fin-payroll-table-body');
    if (payrollTbody) {
        payrollTbody.innerHTML = '';
        const userIds = Object.keys(payrollByUser);
        if (userIds.length === 0) {
            payrollTbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No hay nómina registrada en este mes</td></tr>`;
        } else {
            // Sort by amount descending
            userIds.sort((a, b) => payrollByUser[b] - payrollByUser[a]);
            userIds.forEach(uid => {
                const amount = payrollByUser[uid];
                const userObj = allUsers.find(u => u.id === parseInt(uid) || u.id === uid);
                const userName = userObj ? userObj.nombre : `Usuario #${uid}`;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${userName}</strong></td>
                    <td style="text-align: right; color: var(--primary); font-weight: bold;">Q${amount.toLocaleString('es-GT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td style="text-align: center;">
                        <button class="btn-table-action" style="padding: 4px 8px; font-size: 0.8rem;" onclick="window.showPayrollDetails('${uid}', '${userName.replace(/'/g, "\\'")}')">Ver Detalles</button>
                    </td>
                `;
                payrollTbody.appendChild(tr);
            });
        }
    }

    // ----- DÍAS TRABAJADOS (BONO 14, AGUINALDO) -----
    const workedDaysTbody = document.getElementById('fin-worked-days-table-body');
    if (workedDaysTbody) {
        workedDaysTbody.innerHTML = '';
        
        let daysByUser = {};
        
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-indexed, 0 = Jan, 11 = Dec

        // Determinar límites Bono 14
        let bono14Start, bono14End;
        if (currentMonth < 6) { // Before July
            bono14Start = new Date(currentYear - 1, 6, 1); // July 1st last year
            bono14End = new Date(currentYear, 5, 30, 23, 59, 59); // June 30th this year
        } else {
            bono14Start = new Date(currentYear, 6, 1); // July 1st this year
            bono14End = new Date(currentYear + 1, 5, 30, 23, 59, 59); // June 30th next year
        }

        // Determinar límites Aguinaldo
        let aguiStart, aguiEnd;
        if (currentMonth < 11) { // Before December
            aguiStart = new Date(currentYear - 1, 11, 1); // Dec 1st last year
            aguiEnd = new Date(currentYear, 10, 30, 23, 59, 59); // Nov 30th this year
        } else {
            aguiStart = new Date(currentYear, 11, 1); // Dec 1st this year
            aguiEnd = new Date(currentYear + 1, 10, 30, 23, 59, 59); // Nov 30th next year
        }

        // Helper date parser
        function parseDate(dateStr) {
            if (!dateStr) return new Date(0);
            if (dateStr.includes('/')) {
                const parts = dateStr.split(' ')[0].split('/');
                return new Date(parts[2], parts[1] - 1, parts[0]);
            }
            return new Date(dateStr);
        }

        // Calculate cycle days
        attendance.forEach(a => {
            if (a.horaSalida && (a.aprobado || a.archivado)) {
                if (!daysByUser[a.usuarioId]) daysByUser[a.usuarioId] = { monthDays: 0, bono14Days: 0, aguiDays: 0, totalDays: 0 };
                
                const recDate = parseDate(a.fecha);
                
                if (recDate >= bono14Start && recDate <= bono14End) {
                    daysByUser[a.usuarioId].bono14Days++;
                }
                if (recDate >= aguiStart && recDate <= aguiEnd) {
                    daysByUser[a.usuarioId].aguiDays++;
                }
                if (getMonthKey(a.fecha) === selectedMonth) {
                    daysByUser[a.usuarioId].monthDays++;
                }
                
                // Add to total days history
                daysByUser[a.usuarioId].totalDays++;
            }
        });

        const activeUserIds = Object.keys(daysByUser);
        if (activeUserIds.length === 0) {
            workedDaysTbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No hay registros de días trabajados en los ciclos actuales</td></tr>`;
        } else {
            // Sort by Bono 14 days mostly
            activeUserIds.sort((a, b) => daysByUser[b].bono14Days - daysByUser[a].bono14Days);
            activeUserIds.forEach(uid => {
                const userObj = allUsers.find(u => u.id === parseInt(uid) || u.id === uid);
                const userName = userObj ? userObj.nombre : `Usuario #${uid}`;
                const data = daysByUser[uid];
                
                const minWageInput = document.getElementById('fin-min-wage');
                const salarioMinimoMensual = minWageInput ? parseFloat(minWageInput.value) || 4252.28 : 4252.28;
                
                const bono14Amount = salarioMinimoMensual * (data.bono14Days / 365);
                const aguiAmount = salarioMinimoMensual * (data.aguiDays / 365);
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="Colaborador"><strong>${userName}</strong></td>
                    <td data-label="Descanso Restante" style="text-align: center; color: var(--text-color); font-weight: bold;">${userObj && userObj.vacacionesRestantes !== undefined ? userObj.vacacionesRestantes : 15} días</td>
                    <td data-label="Día total laborados" style="text-align: center; color: var(--primary); font-weight: bold;">${data.totalDays} días</td>
                    <td data-label="Días Bono 14 (Jul-Jun)" style="text-align: center; color: var(--success); font-weight: bold;">${data.bono14Days} días</td>
                    <td data-label="Pago Bono 14 (Q)" style="text-align: right; color: var(--success);">Q${bono14Amount.toLocaleString('es-GT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td data-label="Días Aguinaldo (Dic-Nov)" style="text-align: center; color: var(--warning); font-weight: bold;">${data.aguiDays} días</td>
                    <td data-label="Pago Aguinaldo (Q)" style="text-align: right; color: var(--warning);">Q${aguiAmount.toLocaleString('es-GT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                `;
                workedDaysTbody.appendChild(tr);
            });
        }
    }

    // ----- RENDERING PROJECTS TABLE (GLOBAL) -----
    const tbody = document.getElementById('fin-projects-table-body');
    tbody.innerHTML = '';
    
    if (projects.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No hay proyectos registrados</td></tr>`;
    } else {
        projects.forEach(p => {
            const presupuesto = parseFloat(p.presupuesto) || 0;
            
            // Calc gastos for project
            const gastosMateriales = parseFloat(p.gastosMateriales) || 0;
            const gastosPersonal = parseFloat(p.gastosPersonal) || 0;
            const gastosTotales = parseFloat(p.totalGastos) || 0;
            const totalIngresos = parseFloat(p.totalIngresos) || 0;

            const gananciaReal = totalIngresos - gastosTotales;
            
            let color = gananciaReal > 0 ? 'text-success' : (gananciaReal < 0 ? 'text-danger' : '');
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${p.nombre}</strong> <span class="badge ${p.estado === 'Cerrado' ? 'bg-danger' : 'bg-success'}" style="font-size: 0.6rem; margin-left: 5px;">${p.estado || 'Activo'}</span></td>
                <td>Q${presupuesto.toLocaleString('es-GT', {minimumFractionDigits:2})}</td>
                <td style="color: var(--success); font-weight: bold;">Q${totalIngresos.toLocaleString('es-GT', {minimumFractionDigits:2})}</td>
                <td>Q${gastosMateriales.toLocaleString('es-GT', {minimumFractionDigits:2})}</td>
                <td>Q${gastosPersonal.toLocaleString('es-GT', {minimumFractionDigits:2})}</td>
                <td class="text-danger">Q${gastosTotales.toLocaleString('es-GT', {minimumFractionDigits:2})}</td>
                <td class="${color} font-bold">Q${gananciaReal.toLocaleString('es-GT', {minimumFractionDigits:2})}</td>
                <td><span class="badge ${gananciaReal < 0 ? 'bg-danger' : 'bg-primary'}">${gananciaReal < 0 ? 'Pérdida' : 'Estable'}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Attach event listener to select only once
    if (!monthSelect.dataset.listenerAttached) {
        monthSelect.addEventListener('change', window.renderAdminFinances);
        monthSelect.dataset.listenerAttached = 'true';
    }
};

window.showPayrollDetails = function(uid, userName) {
    const details = window.currentPayrollDetailsByUser[uid] || [];
    
    // Sort by date ascending
    details.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    
    let html = `
    <div style="max-height: 300px; overflow-y: auto; text-align: left; margin-top: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2);">
        <table class="table" style="margin: 0; font-size: 0.9rem;">
            <thead>
                <tr>
                    <th style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">Fecha</th>
                    <th style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">Concepto</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.1);">Monto</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    if (details.length === 0) {
        html += `<tr><td colspan="3" class="text-center text-muted" style="padding: 15px;">No hay detalles disponibles</td></tr>`;
    } else {
        details.forEach(d => {
            let colorMonto = 'var(--primary)';
            if (d.tipo.toLowerCase().includes('préstamo') || d.tipo.toLowerCase().includes('descuento')) {
                colorMonto = 'var(--danger)';
            }
            html += `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05);">${typeof formatDateDDMMYYYY === 'function' ? formatDateDDMMYYYY(d.fecha) : d.fecha}</td>
                    <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05);">${d.tipo}</td>
                    <td style="padding: 10px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.05); color: ${colorMonto};">Q${d.monto.toFixed(2)}</td>
                </tr>
            `;
        });
    }
    html += `</tbody></table></div>`;
    
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: `Detalle de Nómina`,
            html: `<p style="margin-top:0; font-weight: bold; color: var(--text-color);">${userName}</p>` + html,
            width: '600px',
            background: '#1a2235',
            color: '#f8fafc',
            confirmButtonColor: '#3b82f6',
            confirmButtonText: 'Cerrar'
        });
    } else {
        alert("No se pudo cargar SweetAlert, pero los detalles son: " + JSON.stringify(details));
    }
};

// Configurar el input de Salario Mínimo globalmente
document.addEventListener('DOMContentLoaded', () => {
    const minWageInput = document.getElementById('fin-min-wage');
    const btnUpdateWage = document.getElementById('btn-update-min-wage');
    
    if (minWageInput && btnUpdateWage) {
        const savedWage = localStorage.getItem('dch_min_wage');
        if (savedWage) minWageInput.value = savedWage;
        
        btnUpdateWage.addEventListener('click', () => {
            localStorage.setItem('dch_min_wage', minWageInput.value);
            alert('Cambios realizados');
            window.location.reload();
        });
    }
});
