const fs = require('fs');
const html = `
<!-- ==================== SIGNATURE MODAL ==================== -->
<div id="signature-modal" class="modal hidden">
    <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
            <h2>Firma de Recibo de Pago</h2>
            <span class="close" onclick="document.getElementById('signature-modal').classList.add('hidden')">&times;</span>
        </div>
        <div class="modal-body" style="text-align: center;">
            <p class="text-muted" style="margin-bottom: 10px;">Por favor, dibuje su firma en el recuadro para confirmar la recepción del pago.</p>
            <div style="border: 2px solid var(--border-color); border-radius: 8px; background-color: #fff; display: inline-block;">
                <canvas id="signature-pad" width="400" height="200" style="touch-action: none; cursor: crosshair;"></canvas>
            </div>
            <input type="hidden" id="signature-cut-id">
            <input type="hidden" id="signature-user-id">
        </div>
        <div class="modal-footer" style="display: flex; justify-content: space-between; margin-top: 15px;">
            <button class="btn-secondary" id="btn-clear-signature">Limpiar</button>
            <div>
                <button class="btn-secondary" onclick="document.getElementById('signature-modal').classList.add('hidden')">Cancelar</button>
                <button class="btn-primary" id="btn-save-signature" style="background-color: var(--success); border-color: var(--success);">Guardar Firma</button>
            </div>
        </div>
    </div>
</div>
`;
fs.appendFileSync('d:/Marcaje DCH/index.html', html);
console.log("Appended HTML");
