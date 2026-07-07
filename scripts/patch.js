const fs=require('fs');
const lines=fs.readFileSync('d:/Marcaje DCH/js/db-client.js','utf8').split('\n');
let out=[];
let inst=false;
const methods=`    async approvePayment(asistenciaId, adminId) {
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
        } catch (e) {
            console.error('Error in approvePayment:', e);
        }
        return false;
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
        } catch (e) {
            console.error('Error in approveBusRecord:', e);
        }
        return false;
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

    async createUser(username, password, nombre, rol, grupo, empresa, tarifaDiurna, tarifaNocturna, frecuenciaPago, adminId, préstamoTotal = 0, préstamoCuota = 0, préstamosaldo = 0, préstamoEstadoCuota = 'Ninguno', tipoPago = 'Por Horas', horasNormalesMax = 8.0, rangoMaximoHoras = 44.0, tarifaHoraExtra = 0.0, dpi = '', dpiFoto = null, hasVentasRole = 0, assignedStores = [], precioDieselBuses = 30.0, sueldoBusesAcumulado = 0.0) {
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, nombre, rol, grupo, empresa, tarifaDiurna, tarifaNocturna, frecuenciaPago, adminId, préstamoTotal, préstamoCuota, préstamosaldo, préstamoEstadoCuota, tipoPago, horasNormalesMax, rangoMaximoHoras, tarifaHoraExtra, dpi, dpiFoto, hasVentasRole, assignedStores, precioDieselBuses, sueldoBusesAcumulado })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return { success: true };
        }
        return { success: false, message: data.message || 'Error al crear usuario' };
    },

    async updateUser(userId, username, password, nombre, rol, grupo, empresa, tarifaDiurna, tarifaNocturna, frecuenciaPago, adminId, préstamoTotal = 0, préstamoCuota = 0, préstamosaldo = 0, préstamoEstadoCuota = 'Ninguno', tipoPago = 'Por Horas', horasNormalesMax = 8.0, rangoMaximoHoras = 44.0, tarifaHoraExtra = 0.0, dpi = '', dpiFoto = null, hasVentasRole = 0, assignedStores = [], precioDieselBuses = 30.0, sueldoBusesAcumulado = 0.0) {
        const res = await fetch('/api/users/'+userId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, nombre, rol, grupo, empresa, tarifaDiurna, tarifaNocturna, frecuenciaPago, adminId, préstamoTotal, préstamoCuota, préstamosaldo, préstamoEstadoCuota, tipoPago, horasNormalesMax, rangoMaximoHoras, tarifaHoraExtra, dpi, dpiFoto, hasVentasRole, assignedStores, precioDieselBuses, sueldoBusesAcumulado })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return { success: true };
        }
        return { success: false, message: data.message || 'Error al actualizar usuario' };
    },

    async deleteUser(userId, adminId) {
        const res = await fetch('/api/users/'+userIdadminIdadminId, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return { success: true };
        }
        return { success: false, message: data.message || 'Error al eliminar usuario' };
    },`;

for(const line of lines){
  if(line.includes('async createCompany') && !inst){
    out.push(methods);
    inst=true;
  }
  out.push(line);
}
fs.writeFileSync('d:/Marcaje DCH/js/db-client.js', out.join('\n'));
