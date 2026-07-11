    // --- VISTA 2: LÍDER DE GRUPO (leader) ---
    const leaderStatActive = document.getElementById('leader-stat-active');
    const leaderStatHours = document.getElementById('leader-stat-hours');
    const leaderStatEarnings = document.getElementById('leader-stat-earnings');
    const leaderTeamTable = document.getElementById('leader-team-table');
    const leaderAttendanceTable = document.getElementById('leader-attendance-table');
    const leaderPieceworkTable = document.getElementById('leader-piecework-table');

    function setupLeaderView() {
        const group = currentUser.grupo;

        // Obtener miembros del subgrupo
        const allUsers = window.AttendanceDB.getUsers();
        const teamUsers = allUsers.filter(u => u.grupo === group && u.rol === 'usr');

        const teamRecords = window.AttendanceDB.getAttendanceByGroup(group);

        // Obtener trabajos entregados (Por Trato) del subgrupo
        const allPiecework = window.AttendanceDB.getPiecework ? window.AttendanceDB.getPiecework() : [];
        const teamPiecework = allPiecework.filter(p => teamUsers.some(u => u.id === p.usuarioId));

        // 1. Calcular estadísticas consolidadas del grupo
        let activeCount = 0;
        let totalHours = 0;
        let totalNet = 0;

        teamUsers.forEach(user => {
            const activeRec = window.AttendanceDB.getActiveAttendanceByUser(user.id);
            if (activeRec) {
                activeCount++;
            }
        });

        teamRecords.forEach(rec => {
            if (rec.horaSalida) {
                totalHours += rec.horasTrabajadas;
                totalNet += rec.montoNeto;
            }
        });

        teamPiecework.forEach(rec => {
            if (rec.estado === 'Confirmado' && !rec.archivado) {
                totalNet += rec.total || 0;
            }
        });

        leaderStatActive.textContent = activeCount;
        leaderStatHours.textContent = `${totalHours.toFixed(2)} h`;
        leaderStatEarnings.textContent = `Q${totalNet.toFixed(2)}`;

        // 2. Renderizar tabla de Miembros de Equipo
        leaderTeamTable.innerHTML = '';
        if (teamUsers.length === 0) {
            leaderTeamTable.innerHTML = `
                <tr>
                    <td colspan="7" class="text-muted" style="text-align: center; padding: 20px;">
                        No hay colaboradores asociados a este subgrupo.
                    </td>
                </tr>
            `;
        } else {
            const fragmentTeam = document.createDocumentFragment();
            teamUsers.forEach(user => {
                const userRecs = teamRecords.filter(r => r.usuarioId === user.id && r.horaSalida);
                const isActive = window.AttendanceDB.getActiveAttendanceByUser(user.id);
                const userPiecework = teamPiecework.filter(r => r.usuarioId === user.id && r.estado === 'Confirmado');

                const statusTag = isActive
                    ? '<span class="status-tag status-online">Jornada Activa</span>'
                    : '<span class="status-tag status-offline">Inactivo</span>';

                const uHours = userRecs.reduce((acc, curr) => acc + curr.horasTrabajadas, 0);
                const uGrossAtt = userRecs.reduce((acc, curr) => acc + curr.montoBruto, 0);
                const uGrossPw = userPiecework.reduce((acc, curr) => acc + curr.total, 0);
                const uGross = uGrossAtt + uGrossPw;
                const uPenalties = userRecs.reduce((acc, curr) => acc + curr.descuento, 0);
                const uNetAtt = userRecs.reduce((acc, curr) => acc + curr.montoNeto, 0);
                const uNet = uNetAtt + uGrossPw;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${user.nombre}</strong><br><span class="text-muted" style="font-size:0.75rem;">@${user.username}</span></td>
                    <td>${statusTag}</td>
                    <td>Q${(user.tarifaDiurna || 0).toFixed(2)} (D) / Q${(user.tarifaNocturna || 0).toFixed(2)} (N)</td>
                    <td>${formatDecimalHours(uHours)}</td>
                    <td>Q${uGross.toFixed(2)}</td>
                    <td class="text-danger">${uPenalties > 0 ? `-Q${uPenalties.toFixed(2)}` : 'Q0.00'}</td>
                    <td><strong>Q${uNet.toFixed(2)}</strong></td>
                `;
                    fragmentTeam.appendChild(tr);
            });
            leaderTeamTable.appendChild(fragmentTeam);
        }

        // 3. Renderizar tabla de Últimos Marcajes del Grupo
        leaderAttendanceTable.innerHTML = '';
        if (teamRecords.length === 0) {
            leaderAttendanceTable.innerHTML = `
                <tr>
                    <td colspan="8" class="text-muted" style="text-align: center; padding: 20px;">
                        No existen registros de marcajes en este subgrupo.
                    </td>
                </tr>
            `;
        } else {
            const fragmentAttendance = document.createDocumentFragment();
            teamRecords.slice(0, 10).forEach(rec => {
                const user = allUsers.find(u => u.id === rec.usuarioId);
                const nombre = user ? user.nombre : 'Desconocido';

                const outTimeText = rec.horaSalida ? rec.horaSalida : '<span class="text-warning">En curso...</span>';
                const horasDiurnasText = rec.horaSalida ? formatDecimalHours(rec.horasDiurnas) : '-';
                const horasNocturnasText = rec.horaSalida ? formatDecimalHours(rec.horasNocturnas) : '-';
                const netoText = rec.horaSalida ? `Q${rec.montoNeto.toFixed(2)}` : '-';

                const statusBadge = rec.aprobado
                    ? '<span class="table-badge approved">Aprobado</span>'
                    : '<span class="table-badge pending">Pendiente</span>';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${nombre}</strong></td>
                    <td>${rec.fecha}</td>
                    <td>${rec.horaEntrada}</td>
                    <td>${outTimeText}</td>
                    <td>${horasDiurnasText}</td>
                    <td>${horasNocturnasText}</td>
                    <td><strong>${netoText}</strong></td>
                    <td>${statusBadge}</td>
                `;
                    fragmentAttendance.appendChild(tr);
            });
            leaderAttendanceTable.appendChild(fragmentAttendance);
        }

        // 4. Renderizar tabla de Últimos Trabajos Entregados
        if (leaderPieceworkTable) {
            leaderPieceworkTable.innerHTML = '';
            if (teamPiecework.length === 0) {
                leaderPieceworkTable.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-muted" style="text-align: center; padding: 20px;">
                            No existen trabajos por trato registrados en este subgrupo.
                        </td>
                    </tr>
                `;
            } else {
                const fragmentPiecework = document.createDocumentFragment();
                teamPiecework.slice(0, 15).forEach(rec => {
                    const user = allUsers.find(u => u.id === rec.usuarioId);
                    const nombre = user ? user.nombre : 'Desconocido';

                    let statusBadge = '';
                    if (rec.estado === 'Confirmado') {
                        statusBadge = '<span class="table-badge approved">Aprobado</span>';
                    } else {
                        statusBadge = '<span class="table-badge pending">Pendiente</span>';
                    }

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${nombre}</strong></td>
                        <td>${rec.fecha}</td>
                        <td>${rec.trabajo}</td>
                        <td>Q${(rec.precio || 0).toFixed(2)}</td>
                        <td>${rec.cantidad}</td>
                        <td><strong>Q${(rec.total || 0).toFixed(2)}</strong></td>
                        <td>${statusBadge}</td>
                    `;
                    fragmentPiecework.appendChild(tr);
                });
                leaderPieceworkTable.appendChild(fragmentPiecework);
            }
        }
    }

