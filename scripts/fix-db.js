const fs = require('fs');

const content = fs.readFileSync('js/core/db-client.js', 'utf8');
const lines = content.split('\n');

const before = lines.slice(0, 138).join('\n');
const after = lines.slice(147).join('\n');

const middle = `
    getPenalizations() {
        return this._state.penalizations;
    },

    getPenalizationsByUser(userId) {
        return this._state.penalizations.filter(p => p.usuarioId === parseInt(userId));
    },

    getLogs() {
        return this._state.logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    },

    async checkIn(userId, lat = null, lng = null, justificacionLugar = null, justificacionMotivo = null, proyectoId = null) {
        const res = await fetch('/api/attendance/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId: userId, lat, lng, justificacionLugar, justificacionMotivo, proyectoId })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return data.record;
        }
        return null;
    },

    async checkOut(userId, lat = null, lng = null, justificacionLugar = null, justificacionMotivo = null) {
        const res = await fetch('/api/attendance/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId: userId, lat, lng, justificacionLugar, justificacionMotivo })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return data.record;
        }
        return null;
    },

    async applyPenalization(asistenciaId, usuarioId, motivo, monto, adminId, foto = null) {
        const res = await fetch('/api/penalizations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ asistenciaId, usuarioId, motivo, monto, adminId, foto })
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return true;
        }
        return false;
    },

    async deletePenalization(penalizationId, adminId) {
        const res = await fetch(\`/api/penalizations/\${penalizationIdadminId=\${adminId}\`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
            await this.loadStateFromServer();
            return true;
        }
        return false;
    },`;

fs.writeFileSync('js/core/db-client.js', before + middle + after);
console.log('Fixed db-client.js');
