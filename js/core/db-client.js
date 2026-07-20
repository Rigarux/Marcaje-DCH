// Sistema de Control de Asistencia y Pagos - Lógica de Aplicación (app.js)

// API Client de base de datos SQLite conectada al servidor Express
window.AttendanceDB = {
    _state: {
        users: [],
        groups: [],
        companies: [],
        stores: [],
        attendance: [],
        penalizations: [],
        bonuses: [],
        logs: [],
        vehicles: [],
        loans: [],
        piecework: [],
        busRecords: []
    },

    async loadStateFromServer() {
        try {
            const [usersRes, groupsRes, companiesRes, storesRes, attendanceRes, penalizationsRes, bonusesRes, logsRes, vehiclesRes, loansRes, pieceworkRes, busRecordsRes] = await Promise.all([
                fetch('/api/users'),
                fetch('/api/groups'),
                fetch('/api/companies'),
                fetch('/api/stores'),
                fetch('/api/attendance'),
                fetch('/api/penalizations'),
                fetch('/api/bonuses'),
                fetch('/api/logs'),
                fetch('/api/vehicles'),
                fetch('/api/loans'),
                fetch('/api/piecework'),
                fetch('/api/bus-records')
            ]);

            this._state.users = await usersRes.json();
            
            // Sync current user's stores immediately after DB updates
            if (window.currentUser && this._state.users && this._state.users.success) {
                const updatedUser = this._state.users.data.find(u => u.id === window.currentUser.id);
                if (updatedUser) {
                    window.currentUser = updatedUser;
                    sessionStorage.setItem('dch_current_user', JSON.stringify(updatedUser));
                }
            }
            this._state.groups = await groupsRes.json();
            this._state.companies = await companiesRes.json();
            this._state.stores = await storesRes.json();
            this._state.attendance = await attendanceRes.json();
            this._state.penalizations = await penalizationsRes.json();
                        this._state.bonuses = await bonusesRes.json();
            this._state.logs = await logsRes.json();
            this._state.vehicles = await vehiclesRes.json();
            this._state.loans = await loansRes.json();

            const pData = await pieceworkRes.json();
            if (pData.success) this._state.piecework = pData.data;

            const bData = await busRecordsRes.json();
            if (bData.success) this._state.busRecords = bData.data;
        } catch (e) {
            console.error("Error al cargar datos desde el servidor SQL:", e);
            if (typeof window.showToast === 'function') {
                window.showToast('Error de Conexión', 'No se pudieron cargar los datos. Verifica tu conexión.', 'danger');
            }
        }
    },

    getBonuses() {
        return this._state.bonuses;
    },

    getBonusesByUser(userId) {
        return this._state.bonuses.filter(b => b.usuarioId === parseInt(userId));
    },

    getUsers() {
        return this._state.users;
    },

    getUserById(id) {
        return this._state.users.find(u => u.id === parseInt(id));
    },

    getUserByUsername(username) {
        return this._state.users.find(u => u.username.toLowerCase() === username.toLowerCase().trim());
    },

    async validateUser(username, password) {
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    await this.loadStateFromServer();
                    return this._state.users.find(u => u.id === data.user.id) || data.user;
                }
            }
        } catch (e) {
             console.error("Error validando usuario SQL:", e);
             if (typeof window.showToast === 'function') {
                 window.showToast('Error de Conexión', 'No se pudo conectar con el servidor para validar el usuario.', 'danger');
             }
        }
        return null;
    },

    getGroups() {
        return this._state.groups;
    },

    getCompanies() {
        return this._state.companies;
    },

    getStores() {
        return this._state.stores;
    },

    getAttendance() {
        return this._state.attendance;
    },

    getAttendanceByUser(userId) {
        return this._state.attendance
            .filter(a => a.usuarioId === parseInt(userId))
            .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.horaEntrada.localeCompare(a.horaEntrada));
    },

    getAttendanceByGroup(groupName) {
        const usersInGroup = this._state.users.filter(u => u.grupo === groupName).map(u => u.id);
        return this._state.attendance
            .filter(a => usersInGroup.includes(a.usuarioId))
            .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.horaEntrada.localeCompare(a.horaEntrada));
    },

    getActiveAttendanceByUser(userId) {
        return this._state.attendance.find(a => a.usuarioId === parseInt(userId) && (!a.horaSalida || a.horaSalida === ''));
    },

    getPenalizations() {
        return this._state.penalizations;
    },

    getPenalizationsByUser(userId) {
        return this._state.penalizations.filter(p => p.usuarioId === parseInt(userId));
    },

    getLogs() {
        return this._state.logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    },

    async checkIn(userId, lat = null, lng = null, justificacionLugar = null, justificacionMotivo = null, proyectoId = null, fotoEntrada = null) {
        const res = await fetch('/api/attendance/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId: userId, lat, lng, justificacionLugar, justificacionMotivo, proyectoId, fotoEntrada })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return data.record;
        }
        return null;
    },

    async checkOut(userId, lat = null, lng = null, justificacionLugar = null, justificacionMotivo = null, trabajoDescripcion = null, trabajoCantidad = 0, fotoAntes = null, fotoDespues = null, fotoSalida = null) {
        const res = await fetch('/api/attendance/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId: userId, lat, lng, justificacionLugar, justificacionMotivo, trabajoDescripcion, trabajoCantidad, fotoAntes, fotoDespues, fotoSalida })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return data.record;
        }
        return null;
    },

    async applyPenalization(asistenciaId, usuarioId, motivo, monto, adminId, foto = null, fecha = null) {
        const res = await fetch('/api/penalizations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ asistenciaId, usuarioId, motivo, monto, adminId, foto, fecha })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return true;
        }
        return false;
    },

    async deletePenalization(penalizationId, adminId) {
        const res = await fetch(`/api/penalizations/${penalizationId}?adminId=${adminId}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return true;
        }
        return false;
    },

    async applyBonus(asistenciaId, motivo, monto, adminId) {
        const res = await fetch('/api/bonuses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ asistenciaId, motivo, monto, adminId })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return true;
        }
        return false;
    },

    async deleteBonus(bonusId, adminId) {
        const res = await fetch(`/api/bonuses/${bonusId}?adminId=${adminId}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return true;
        }
        return false;
    },

    async approvePayment(asistenciaId, adminId) {
        try {
            const res = await fetch('/api/attendance/approve/'+asistenciaId, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminId })
            });
            if (!res.ok) return false;
            const data = await res.json();
            if (data && data.success) {
                await this.loadStateFromServer();
                return true;
            }
        } catch (e) { console.error(e); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger'); }
        return false;
    },

    async adjustAttendanceHours(asistenciaId, horasAprobadas, adminId) {
        try {
            const res = await fetch('/api/attendance/adjust/'+asistenciaId, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ horasAprobadas, adminId })
            });
            if (!res.ok) return false;
            const data = await res.json();
            if (data && data.success) {
                await this.loadStateFromServer();
                return true;
            }
            return false;
        } catch(e) {
            console.error(e);
            return false;
        }
    },

    async approveBusRecord(busRecordId, adminId, metodoPago) {
        try {
            const res = await fetch('/api/bus-records/approve/'+busRecordId, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminId, metodoPago })
            });
            if (!res.ok) return false;
            const data = await res.json();
            if (data && data.success) {
                await this.loadStateFromServer();
                return true;
            }
        } catch (e) { console.error(e); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger'); }
        return false;
    },

    async rejectBusRecord(busRecordId) {
        try {
            const res = await fetch('/api/bus-records/'+busRecordId, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                await this.loadStateFromServer();
                return true;
            }
            return false;
        } catch (e) {
            console.error(e);
            return false;
        }
    },

    async authorizeLoanCuota(userId, adminId) {
        const res = await fetch('/api/users/'+userId+'/loans/authorize-cuota', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return { success: true, préstamosaldo: data.préstamosaldo, préstamoEstadoCuota: data.préstamoEstadoCuota };
        }
        return { success: false, message: data.message || 'Error al autorizar cuota' };
    },

    async resetLoanCuota(userId, adminId) {
        const res = await fetch('/api/users/'+userId+'/loans/reset-cuota', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return { success: true, préstamoEstadoCuota: data.préstamoEstadoCuota };
        }
        return { success: false, message: data.message || 'Error al restablecer cuota' };
    },

    async createGroup(name, adminId) {
        const res = await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, adminId })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return true;
        }
        return false;
    },

    async createUser(username, password, nombre, rol, grupo, empresa, tarifaDiurna, tarifaNocturna, frecuenciaPago, adminId, préstamoTotal = 0, préstamoCuota = 0, préstamosaldo = 0, préstamoEstadoCuota = 'Ninguno', tipoPago = 'Por Horas', horasNormalesMax = 8.0, rangoMaximoHoras = 44.0, tarifaHoraExtra = 0.0, dpi = '', dpiFoto = null, hasVentasRole = 0, assignedStores = [], precioDieselBuses = 30.0, sueldoBusesAcumulado = 0.0, permisos = null, sueldoBusesDiario = 0.0, empresas_asignadas_json = '[]', descuentaAlmuerzo = 0) {
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, nombre, rol, grupo, empresa, tarifaDiurna, tarifaNocturna, frecuenciaPago, adminId, préstamoTotal, préstamoCuota, préstamosaldo, préstamoEstadoCuota, tipoPago, horasNormalesMax, rangoMaximoHoras, tarifaHoraExtra, dpi, dpiFoto, hasVentasRole, assignedStores, precioDieselBuses, sueldoBusesAcumulado, permisos, sueldoBusesDiario, empresas_asignadas_json, descuentaAlmuerzo })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return { success: true };
        }
        return { success: false, message: data.message || 'Error al crear usuario' };
    },

    async updateUser(userId, username, password, nombre, rol, grupo, empresa, tarifaDiurna, tarifaNocturna, frecuenciaPago, adminId, préstamoTotal = 0, préstamoCuota = 0, préstamosaldo = 0, préstamoEstadoCuota = 'Ninguno', tipoPago = 'Por Horas', horasNormalesMax = 8.0, rangoMaximoHoras = 44.0, tarifaHoraExtra = 0.0, dpi = '', dpiFoto = null, hasVentasRole = 0, assignedStores = [], precioDieselBuses = 30.0, sueldoBusesAcumulado = 0.0, permisos = null, sueldoBusesDiario = 0.0, empresas_asignadas_json = '[]', descuentaAlmuerzo = 0) {
        const res = await fetch('/api/users/'+userId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, nombre, rol, grupo, empresa, tarifaDiurna, tarifaNocturna, frecuenciaPago, adminId, préstamoTotal, préstamoCuota, préstamosaldo, préstamoEstadoCuota, tipoPago, horasNormalesMax, rangoMaximoHoras, tarifaHoraExtra, dpi, dpiFoto, hasVentasRole, assignedStores, precioDieselBuses, sueldoBusesAcumulado, permisos, sueldoBusesDiario, empresas_asignadas_json, descuentaAlmuerzo })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return { success: true };
        }
        return { success: false, message: data.message || 'Error al actualizar usuario' };
    },

    async deleteUser(userId, adminId) {
        const res = await fetch('/api/users/'+userId+'?adminId='+adminId, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return { success: true };
        }
        return { success: false, message: data.message || 'Error al eliminar usuario' };
    },

    async createCompany(name, encargadoId = null, adminId, modules = '{}', require_photo = 0) {
        const res = await fetch('/api/companies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, encargadoId, adminId, modules, require_photo })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return { success: true };
        }
        return { success: false };
    },

    async createStore(nombre, pdf_email, pdf_telefono, pdf_direccion, pdf_propietario, logoBase64) {
        const res = await fetch('/api/stores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, pdf_email, pdf_telefono, pdf_direccion, pdf_propietario, logoBase64 })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return { success: true, storeId: data.storeId };
        }
        return { success: false, message: data.message };
    },

    async updateStore(id, nombre, pdf_email, pdf_telefono, pdf_direccion, pdf_propietario, logoBase64) {
        const res = await fetch(`/api/stores/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, pdf_email, pdf_telefono, pdf_direccion, pdf_propietario, logoBase64 })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return { success: true };
        }
        return { success: false, message: data.message };
    },

    async deleteStore(id) {
        const res = await fetch(`/api/stores/${id}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return { success: true };
        }
        return { success: false, message: data.message };
    },

    async updateCompany(oldName, newName, encargadoId = null, employeeIds = [], adminId, modules = '{}', require_photo = 0) {
        const res = await fetch('/api/companies', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldName, newName, encargadoId, employeeIds, adminId, modules, require_photo })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return { success: true };
        }
        return { success: false, message: data.message || 'Error al renombrar empresa' };
    },

    async deleteCompany(name, adminId) {
        const res = await fetch('/api/companies', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, adminId })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return { success: true };
        }
        return { success: false, message: data.message || 'Error al eliminar empresa' };
    },

    async resetDatabase(adminId) {
        const res = await fetch('/api/reset-db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return true;
        }
        return false;
    },

    async addLog(userId, action) {
        await fetch('/api/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId: userId, accion: action })
        });
        try {
            const logsRes = await fetch('/api/logs');
            this._state.logs = await logsRes.json();
        } catch (e) { }
    },

    getVehicles() {
        return this._state.vehicles;
    },

    async createVehicle(placa, marca, modelo, empleadoAsignadoId, estado, adminId) {
        const empresa = window.AttendanceDB?.currentCompany || 'N/A';
        const res = await fetch('/api/vehicles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placa, marca, modelo, empleadoAsignadoId, estado, adminId, empresa })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return { success: true };
        }
        return { success: false, message: data.message || 'Error al registrar vehículo' };
    },

    async updateVehicle(id, placa, marca, modelo, empleadoAsignadoId, estado, motivoUso = null, fechaAsignación = null, adminId) {
        const empresa = window.AttendanceDB?.currentCompany || 'N/A';
        const res = await fetch(`/api/vehicles/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placa, marca, modelo, empleadoAsignadoId, estado, motivoUso, fechaAsignación, adminId, empresa })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return { success: true };
        }
        return { success: false, message: data.message || 'Error al actualizar vehículo' };
    },

    async deleteVehicle(id, adminId) {
        const res = await fetch(`/api/vehicles/${id}?adminId=${adminId}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return true;
        }
        return false;
    },

    getLoans() {
        return this._state.loans;
    },

    async createLoan(usuarioId, monto, cuotas, cuotaMonto) {
        const res = await fetch('/api/loans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId, monto, cuotas, cuotaMonto })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return true;
        }
        return false;
    },

    async approveLoan(id, adminId) {
        const res = await fetch(`/api/loans/approve/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return true;
        }
        return false;
    },

    async approveLoanCuota(id, adminId) {
        const res = await fetch(`/api/loans/approve-cuota/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return true;
        }
        return false;
    },

    // --- DESTAJO (PIECEWORK) ---
    getPiecework() {
        return this._state.piecework || [];
    },

    getPieceworkByUser(userId) {
        return this._state.piecework.filter(p => p.usuarioId === userId);
    },

    async submitPiecework(usuarioId, trabajo, precio, cantidad, total) {
        const res = await fetch('/api/piecework/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId, trabajo, precio, cantidad, total })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return { success: true };
        }
        return { success: false, message: data.message };
    },

    async approvePiecework(id, confirmadoPor, precio) {
        const res = await fetch(`/api/piecework/approve/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ confirmadoPor, precio })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return { success: true };
        }
        return { success: false, message: data.message };
    },

    async approvePieceworkAttendance(id, confirmadoPor, precio) {
        const res = await fetch(`/api/attendance/approve-piecework/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ confirmadoPor, precio })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return { success: true };
        }
        return { success: false, message: data.message };
    },

    async correctPieceworkAttendanceRecord(id, formData) {
        const res = await fetch(`/api/attendance/correct-piecework/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return { success: true, message: data.message };
        }
        return { success: false, message: data.message };
    },

    async deletePiecework(id) {
        try {
            const res = await fetch(`/api/piecework/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                await this.loadStateFromServer();
                return true;
            }
            return false;
        } catch (e) {
            console.error(e);
            return false;
        }
    },

    async rejectLoan(id, adminId) {
        const res = await fetch(`/api/loans/reject/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return true;
        }
        return false;
    },

    async deleteLoan(id, adminId) {
        const res = await fetch(`/api/loans/${id}?adminId=${adminId}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return true;
        }
        return false;
    },


    // --- BUSES ---
    getBusRecords() {
        return this._state.busRecords;
    },


    // --- BUSES ---
    getBusRecords() {
        return this._state.busRecords;
    },

    getBusRecordsByUser(userId) {
        return this._state.busRecords.filter(b => b.usuarioId === userId);
    },

    async submitBusRecord(usuarioId, turno, ingresoDinero, tipoGasto, montoGasto, fotoFacturaBase64, gastos) {
        const res = await fetch('/api/bus-records/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId, turno, ingresoDinero, gastos })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return { success: true };
        }
        return { success: false, message: data.message };
    },

    // --- CORRECCIONES ---
    async correctAttendanceRecord(id, updateData) {
        try {
            const res = await fetch(`/api/attendance/correction/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            const data = await res.json();
            if (data.success) {
                await this.loadStateFromServer();
            }
            return data;
        } catch (e) {
            console.error(e);
            return { success: false, message: e.message };
        }
    },

    async correctPieceworkRecord(id, updateData) {
        try {
            const res = await fetch(`/api/piecework/correction/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            const data = await res.json();
            if (data.success) {
                await this.loadStateFromServer();
            }
            return data;
        } catch (e) {
            console.error(e);
            return { success: false, message: e.message };
        }
    }
};
