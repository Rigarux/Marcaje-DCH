// --- LÓGICA DE VENTAS ---
let currentDetailedQuoteId = null;
let currentQuoteData = null;
let currentQuoteItems = [];

const viewQuotes = document.getElementById('tab-unified-pos');
const viewQuoteDetail = document.getElementById('view-quote-detail');
const btnOpenQuoteModal = document.getElementById('btn-open-quote-modal');
const newQuoteModal = document.getElementById('new-quote-modal');
const btnCloseQuoteModal = document.getElementById('btn-close-quote-modal');
const btnCancelQuoteModal = document.getElementById('btn-cancel-quote-modal');
const formNewQuote = document.getElementById('form-new-quote');
const quotesTableBody = document.getElementById('quotes-table-body');
const btnBackToQuotes = document.getElementById('btn-back-to-quotes');

let globalClients = [];
// Formularios de detalle
const quoteHeaderForm = document.getElementById('quote-header-form');
const formAddQuoteItem = document.getElementById('form-add-quote-item');
const quoteItemsTableBody = document.getElementById('quote-items-table-body');
const btnExportQuoteExcel = document.getElementById('btn-export-quote-excel');

// Cerrar modales
[btnCloseQuoteModal, btnCancelQuoteModal].forEach(btn => {
    if (btn) btn.addEventListener('click', () => {
        newQuoteModal.classList.add('hidden');
    });
});

if (btnOpenQuoteModal) {
    btnOpenQuoteModal.addEventListener('click', async () => {
        document.getElementById('new-quote-validity').value = '';

        const select = document.getElementById('new-quote-client-select');
        select.innerHTML = '<option value="">-- Cargando --</option>';
        try {
            const res = await fetch('/api/clients');
            globalClients = await res.json();
            select.innerHTML = '<option value="">-- Seleccionar Cliente --</option>';
            globalClients.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.nombre;
                select.appendChild(opt);
            });
        } catch (e) {
            console.error(e); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
            select.innerHTML = '<option value="">-- Error al cargar --</option>';
        }

        newQuoteModal.classList.remove('hidden');
    });
}

if (formNewQuote) {
    formNewQuote.addEventListener('submit', async (e) => {
        e.preventDefault();
        const clientId = document.getElementById('new-quote-client-select').value;
        if (!clientId) {
            showToast('Atención', 'Seleccione un cliente válido.', 'warning');
            return;
        }
        const client = globalClients.find(c => c.id == clientId);
        if (!client) {
            showToast('Error', 'Cliente no encontrado', 'danger');
            return;
        }

        const validoHasta = document.getElementById('new-quote-validity').value;
        const tipoVenta = document.getElementById('new-quote-type-select').value;
        const fecha = new Date().toISOString().split('T')[0];
        const isLibre = window.isVentaLibreModal === true;

        try {
            const res = await fetch('/api/quotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clienteNombre: client.nombre,
                    clienteDireccion: client.direccion,
                    clienteNit: client.nit,
                    clienteTelefono: client.telefono,
                    clienteEmail: client.email,
                    validoHasta,
                    fecha,
                    tipo_documento: isLibre ? 'Venta Libre' : tipoVenta,
                    creadoPor: currentUser.id
                })
            });
            const data = await res.json();
            if (data.success) {
                newQuoteModal.classList.add('hidden');
                showToast('Éxito', 'Venta creada.', 'success');
                if (isLibre) {
                    if (typeof window.renderVentaLibreView === 'function') window.renderVentaLibreView();
                } else {
                    renderQuotesView();
                }
                renderQuoteDetails(data.id);
            } else {
                showToast('Error', data.message, 'danger');
            }
        } catch (err) {
            console.error(err); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
            showToast('Error', 'Error al crear la venta', 'danger');
        }
    });
}

// --- Lógica Modal Nuevo Cliente ---
const newClientModal = document.getElementById('new-client-modal');
const btnOpenNewClientModal = document.getElementById('btn-open-new-client-modal');
const formNewClient = document.getElementById('form-new-client');
const btnCloseClientModal = document.getElementById('btn-close-client-modal');
const btnCancelClientModal = document.getElementById('btn-cancel-client-modal');

[btnCloseClientModal, btnCancelClientModal].forEach(btn => {
    if (btn) btn.addEventListener('click', () => newClientModal.classList.add('hidden'));
});

if (btnOpenNewClientModal) {
    btnOpenNewClientModal.addEventListener('click', () => {
        formNewClient.reset();
        newClientModal.classList.remove('hidden');
    });
}

if (formNewClient) {
    formNewClient.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('new-client-name').value.trim();
        const direccion = document.getElementById('new-client-address').value.trim();
        const nit = document.getElementById('new-client-nit').value.trim();
        const telefono = document.getElementById('new-client-phone').value.trim();
        const email = document.getElementById('new-client-email').value.trim();

        try {
            const res = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, direccion, nit, telefono, email })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            showToast('Éxito', 'Cliente registrado exitosamente.', 'success');
            newClientModal.classList.add('hidden');

            // Recargar el select de clientes
            const select = document.getElementById('new-quote-client-select');
            if (select) {
                const cRes = await fetch('/api/clients');
                globalClients = await cRes.json();
                select.innerHTML = '<option value="">-- Seleccionar Cliente --</option>';
                globalClients.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.nombre;
                    select.appendChild(opt);
                });
                // Auto-seleccionar el cliente recién creado
                select.value = data.id;
            }
        } catch (err) {
            console.error(err); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
            showToast('Error', 'No se pudo guardar el cliente', 'danger');
        }
    });
}

let currentQuoteFilter = 'Borrador';

// Interceptar clics en los filtros de Ventas
document.addEventListener('click', (e) => {
    if (e.target.matches('[data-quote-filter]')) {
        currentQuoteFilter = e.target.getAttribute('data-quote-filter');
        document.querySelectorAll('[data-quote-filter]').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        renderQuotesView();
    }

    const navLink = e.target.closest('.sidebar-nav-link');
    if (navLink && navLink.getAttribute('data-subview') === 'view-quotes') {
        renderQuotesView();
    } else if (navLink && navLink.getAttribute('data-subview') === 'view-petty-cash') {
        if (typeof renderPettyCashView === 'function') renderPettyCashView();
    }
});

window.renderQuotesView = renderQuotesView;
async function renderQuotesView() {
    if (!quotesTableBody) return;
    viewQuotes.querySelector('.card.table-card').classList.remove('hidden');
    viewQuoteDetail.classList.add('hidden');
    quotesTableBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">Cargando Ventas...</td></tr>';

    try {
        const res = await fetch('/api/quotes');
        let quotes = await res.json();

        // Filtrar las de Venta Libre para que no se muestren en la vista general
        quotes = quotes.filter(q => q.tipo_documento !== 'Venta Libre');

        // Filtrar por estado actual
        quotes = quotes.filter(q => (q.estado || 'Borrador') === currentQuoteFilter);

        quotesTableBody.innerHTML = '';
        if (quotes.length === 0) {
            quotesTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No hay Ventas registradas en estado: ${currentQuoteFilter}.</td></tr>`;
            return;
        }

        const fragmentQuotes = document.createDocumentFragment();
        quotes.forEach(q => {
            const tr = document.createElement('tr');
            let tagClass = 'status-online';
            if (q.estado === 'Aceptada') tagClass = 'status-online';
            if (q.estado === 'Rechazada') tagClass = 'status-danger';
            if (q.estado === 'Borrador' || !q.estado) tagClass = 'status-offline';

            tr.innerHTML = `
                    <td>VT-${String(q.id).padStart(4, '0')}</td>
                    <td>${q.tiendaNombre || 'Tienda Principal'}</td>
                    <td>${q.clienteNombre}</td>
                    <td>${q.clienteNit || '-'}</td>
                    <td>${q.fecha ? q.fecha.split(' ')[0] : '-'}</td>
                    <td>${q.fecha_estado ? q.fecha_estado.split(' ')[0] : '-'}</td>
                    <td class="font-weight-bold">Q${parseFloat(q.totalCotización || q.totalVenta || 0).toFixed(2)}</td>
                    <td><span class="status-tag ${tagClass}">${q.estado || 'Borrador'}</span></td>
                    <td style="text-align: center;">
                        <button class="btn-secondary btn-sm btn-open-quote" data-id="${q.id}" title="Ver Detalles">Ver</button>
                        ${(q.estado === 'Borrador' || !q.estado) ? `
                            <button class="btn-primary btn-sm btn-accept-quote" data-id="${q.id}" data-total="${q.totalVenta}" title="Aceptar Venta" style="margin-left: 5px; background-color: var(--success); border-color: var(--success);">Aceptar</button>
                            <button class="btn-danger btn-sm btn-reject-quote" data-id="${q.id}" title="Rechazar Venta" style="margin-left: 5px;">Rechazar</button>
                        ` : ''}
                        ${(currentUser.rol === 'admin') ? `
                            <button class="btn-danger btn-sm btn-delete-quote" data-id="${q.id}" title="Eliminar" style="margin-left: 5px;">X</button>
                        ` : ''}
                    </td>
                `;
            fragmentQuotes.appendChild(tr);
        });
        quotesTableBody.appendChild(fragmentQuotes);

        // Listeners
        quotesTableBody.querySelectorAll('.btn-open-quote').forEach(btn => {
            btn.addEventListener('click', (e) => {
                renderQuoteDetails(e.target.closest('button').dataset.id);
            });
        });
        quotesTableBody.querySelectorAll('.btn-delete-quote').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.closest('button').dataset.id;
                if (await appConfirm('Confirmación', '¿Estás seguro de eliminar esta venta?')) {
                    try {
                        await fetch(`/api/quotes/${id}`, { method: 'DELETE' });
                        showToast('Éxito', 'Venta eliminada.', 'success');
                        renderQuotesView();
                    } catch (err) {
                        showToast('Error', 'No se pudo eliminar.', 'danger');
                    }
                }
            });
        });
        quotesTableBody.querySelectorAll('.btn-reject-quote').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.closest('button').dataset.id;
                if (await appConfirm('Confirmación', '¿Estás seguro de rechazar esta venta?')) {
                    try {
                        const res = await fetch(`/api/quotes/${id}/reject`, { method: 'POST' });
                        const data = await res.json();
                        if (data.success) {
                            showToast('Éxito', 'Venta rechazada.', 'success');
                            renderQuotesView();
                        } else {
                            showToast('Error', data.message || 'No se pudo rechazar.', 'danger');
                        }
                    } catch (err) {
                        showToast('Error', 'Fallo de conexión.', 'danger');
                    }
                }
            });
        });
        quotesTableBody.querySelectorAll('.btn-accept-quote').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('button').dataset.id;
                const total = e.target.closest('button').dataset.total;
                openAcceptQuoteModal(id, total);
            });
        });

    } catch (err) {
        console.error(err); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
        quotesTableBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error al cargar Ventas.</td></tr>';
    }
}

// ==================== LÓGICA VENTA LIBRE ====================
let currentVentaLibreFilter = 'Borrador';

document.addEventListener('click', (e) => {
    if (e.target.matches('[data-venta-libre-filter]')) {
        currentVentaLibreFilter = e.target.getAttribute('data-venta-libre-filter');
        document.querySelectorAll('[data-venta-libre-filter]').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        renderVentaLibreView();
    }
});

const btnOpenVentaLibreModal = document.getElementById('btn-open-venta-libre-modal');
if (btnOpenVentaLibreModal) {
    btnOpenVentaLibreModal.addEventListener('click', async () => {
        window.isVentaLibreModal = true;
        document.getElementById('new-quote-validity').value = '';

        const select = document.getElementById('new-quote-client-select');
        select.innerHTML = '<option value="">-- Cargando --</option>';
        try {
            const res = await fetch('/api/clients');
            globalClients = await res.json();
            select.innerHTML = '<option value="">-- Seleccionar Cliente --</option>';
            globalClients.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.nombre;
                select.appendChild(opt);
            });
        } catch (e) {
            console.error(e); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
            select.innerHTML = '<option value="">-- Error al cargar --</option>';
        }

        newQuoteModal.classList.remove('hidden');
    });
}

// Añadimos el reset del flag cuando se abre desde el botón normal de quotes
if (btnOpenQuoteModal) {
    btnOpenQuoteModal.addEventListener('click', () => {
        window.isVentaLibreModal = false;
    });
}

window.renderVentaLibreView = renderVentaLibreView;
async function renderVentaLibreView() {
    const ventaLibreTableBody = document.getElementById('venta-libre-table-body');
    if (!ventaLibreTableBody) return;
    
    ventaLibreTableBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Cargando Ventas Libres...</td></tr>';

    try {
        const res = await fetch('/api/quotes');
        let quotes = await res.json();

        // Filtrar solo las de Venta Libre y luego por estado
        quotes = quotes.filter(q => q.tipo_documento === 'Venta Libre');
        quotes = quotes.filter(q => (q.estado || 'Borrador') === currentVentaLibreFilter);

        ventaLibreTableBody.innerHTML = '';
        if (quotes.length === 0) {
            ventaLibreTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No hay Ventas Libres registradas en estado: ${currentVentaLibreFilter}.</td></tr>`;
            return;
        }

        const fragmentVL = document.createDocumentFragment();
        quotes.forEach(q => {
            const tr = document.createElement('tr');
            let tagClass = 'status-online';
            if (q.estado === 'Aceptada') tagClass = 'status-online';
            if (q.estado === 'Rechazada') tagClass = 'status-danger';
            if (q.estado === 'Borrador' || !q.estado) tagClass = 'status-offline';

            tr.innerHTML = `
                    <td>VL-${String(q.id).padStart(4, '0')}</td>
                    <td>${q.clienteNombre}</td>
                    <td>${q.clienteNit || '-'}</td>
                    <td>${q.fecha ? q.fecha.split(' ')[0] : '-'}</td>
                    <td>${q.fecha_estado ? q.fecha_estado.split(' ')[0] : '-'}</td>
                    <td class="font-weight-bold">Q${parseFloat(q.totalCotización || q.totalVenta || 0).toFixed(2)}</td>
                    <td><span class="status-tag ${tagClass}">${q.estado || 'Borrador'}</span></td>
                    <td style="text-align: center;">
                        <button class="btn-secondary btn-sm btn-open-quote" data-id="${q.id}" title="Ver Detalles">Ver</button>
                        ${(q.estado === 'Borrador' || !q.estado) ? `
                            <button class="btn-primary btn-sm btn-accept-quote" data-id="${q.id}" data-total="${q.totalVenta}" title="Aceptar Venta" style="margin-left: 5px; background-color: var(--success); border-color: var(--success);">Aceptar</button>
                            <button class="btn-danger btn-sm btn-reject-quote" data-id="${q.id}" title="Rechazar Venta" style="margin-left: 5px;">Rechazar</button>
                        ` : ''}
                        ${(currentUser.rol === 'admin') ? `
                            <button class="btn-danger btn-sm btn-delete-quote" data-id="${q.id}" title="Eliminar" style="margin-left: 5px;">X</button>
                        ` : ''}
                    </td>
                `;
            fragmentVL.appendChild(tr);
        });
        ventaLibreTableBody.appendChild(fragmentVL);

        // Listeners for actions in Venta Libre table
        ventaLibreTableBody.querySelectorAll('.btn-open-quote').forEach(btn => {
            btn.addEventListener('click', (e) => {
                renderQuoteDetails(e.target.closest('button').dataset.id);
            });
        });
        ventaLibreTableBody.querySelectorAll('.btn-delete-quote').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.closest('button').dataset.id;
                if (await appConfirm('Confirmación', '¿Estás seguro de eliminar esta venta libre?')) {
                    try {
                        await fetch(`/api/quotes/${id}`, { method: 'DELETE' });
                        showToast('Éxito', 'Venta libre eliminada.', 'success');
                        renderVentaLibreView();
                    } catch (err) {
                        showToast('Error', 'No se pudo eliminar.', 'danger');
                    }
                }
            });
        });
        ventaLibreTableBody.querySelectorAll('.btn-reject-quote').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.closest('button').dataset.id;
                if (await appConfirm('Confirmación', '¿Estás seguro de rechazar esta venta libre?')) {
                    try {
                        const res = await fetch(`/api/quotes/${id}/reject`, { method: 'POST' });
                        const data = await res.json();
                        if (data.success) {
                            showToast('Éxito', 'Venta libre rechazada.', 'success');
                            renderVentaLibreView();
                        } else {
                            showToast('Error', data.message || 'No se pudo rechazar.', 'danger');
                        }
                    } catch (err) {
                        showToast('Error', 'Fallo de conexión.', 'danger');
                    }
                }
            });
        });
        ventaLibreTableBody.querySelectorAll('.btn-accept-quote').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('button').dataset.id;
                const total = e.target.closest('button').dataset.total;
                openAcceptQuoteModal(id, total);
            });
        });

    } catch (err) {
        console.error(err); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
        ventaLibreTableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error al cargar Ventas Libres.</td></tr>';
    }
}

if (btnBackToQuotes) {
    btnBackToQuotes.addEventListener('click', async () => {
        if (window.isNewQuote) {
            if (confirm('¿Deseas salir sin guardar? La venta no será creada.')) {
                try {
                    await fetch(`/api/quotes/${currentDetailedQuoteId}`, { method: 'DELETE' });
                } catch(e) { console.error(e); }
                window.isNewQuote = false;
            } else {
                return; // Cancel exit
            }
        }
        window.location.hash = 'view-sales';
        viewQuoteDetail.classList.add('hidden');
        
        // Let's force a reload of the view to be safe and clean
        if (typeof window.handleHashChange === 'function') {
            window.handleHashChange();
        } else {
            window.location.reload();
        }
    });
}

window.renderQuoteDetails = renderQuoteDetails;
async function renderQuoteDetails(id) {
    document.getElementById('tab-unified-pos')?.classList.add('hidden');
    document.getElementById('sales-pos-view')?.classList.add('hidden');
    const tabVentaLibre = document.getElementById('tab-venta-libre');
    if (tabVentaLibre) tabVentaLibre.style.display = 'none';
    viewQuoteDetail.classList.remove('hidden');
    currentDetailedQuoteId = id;

    try {
        const res = await fetch(`/api/quotes/${id}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        currentQuoteData = data.quote;
        currentQuoteItems = data.items;

        // Llenar formulario
        document.getElementById('quote-client-name').value = data.quote.clienteNombre || '';
        document.getElementById('quote-client-nit').value = data.quote.clienteNit || '';
        document.getElementById('quote-client-address').value = data.quote.clienteDireccion || '';
        document.getElementById('quote-client-phone').value = data.quote.clienteTelefono || '';
        document.getElementById('quote-client-email').value = data.quote.clienteEmail || '';
        document.getElementById('quote-valid-until').value = data.quote.validoHasta || '';

        // Restricción de rol
        const isLeader = currentUser.rol === 'leader';
        const inputs = quoteHeaderForm.querySelectorAll('input');
        inputs.forEach(inp => inp.disabled = isLeader);
        const btnSaveHeader = document.getElementById('btn-save-quote-header');
        if (isLeader) {
            btnSaveHeader.style.display = 'none';
        } else {
            btnSaveHeader.style.display = 'inline-block';
        }

        // Llenar tabla de ítems
        quoteItemsTableBody.innerHTML = '';
        let total = 0;
        if (currentQuoteItems.length === 0) {
            quoteItemsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay ítems agregados.</td></tr>';
        } else {
            currentQuoteItems.forEach(item => {
                const subtotal = item.cantidad * item.precio;
                total += subtotal;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                        <td>${item.descripcion.replace(/\n/g, '<br>')}</td>
                        <td style="text-align: right;">${item.cantidad}</td>
                        <td style="text-align: right;">${item.unidad}</td>
                        <td style="text-align: right;">Q${item.precio.toFixed(2)}</td>
                        <td style="text-align: right; font-weight: bold;">Q${subtotal.toFixed(2)}</td>
                        <td style="text-align: center;">
                            <button class="btn-danger btn-sm btn-delete-quote-item" data-id="${item.id}">X</button>
                        </td>
                    `;
                quoteItemsTableBody.appendChild(tr);
            });

            quoteItemsTableBody.querySelectorAll('.btn-delete-quote-item').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const itemId = e.target.closest('button').dataset.id;
                    if (await appConfirm('Confirmación', '¿Eliminar este ítem?')) {
                        try {
                            await fetch(`/api/quotes/items/${itemId}`, { method: 'DELETE' });
                            renderQuoteDetails(currentDetailedQuoteId);
                        } catch (err) { console.error(err); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger'); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger'); }
                    }
                });
            });
        }

        document.getElementById('quote-total-amount').textContent = 'Q' + total.toFixed(2);

    } catch (err) {
        console.error(err); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
        showToast('Error', 'No se pudo cargar la venta.', 'danger');
    }
}

if (quoteHeaderForm) {
    quoteHeaderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (currentUser.rol === 'leader') return; // Seguridad extra

        try {
            await fetch(`/api/quotes/${currentDetailedQuoteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clienteNombre: document.getElementById('quote-client-name').value,
                    clienteNit: document.getElementById('quote-client-nit').value,
                    clienteDireccion: document.getElementById('quote-client-address').value,
                    clienteTelefono: document.getElementById('quote-client-phone').value,
                    clienteEmail: document.getElementById('quote-client-email').value,
                    validoHasta: document.getElementById('quote-valid-until').value,
                    fecha: currentQuoteData.fecha,
                    estado: currentQuoteData.estado
                })
            });
            window.isNewQuote = false; // Quote is now explicitly saved
            showToast('Éxito', 'Datos del cliente actualizados.', 'success');
            renderQuoteDetails(currentDetailedQuoteId); // recargar data
        } catch (err) {
            console.error(err); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
            showToast('Error', 'Error al guardar datos.', 'danger');
        }
    });
}

if (formAddQuoteItem) {
    formAddQuoteItem.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = formAddQuoteItem.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
            let descText = document.getElementById('quote-item-desc').value;
            const itemType = document.getElementById('quote-item-type');
            if (itemType) {
                if (itemType.value === 'venta') descText = '[Venta] ' + descText;
                if (itemType.value === 'renta') descText = '[Renta] ' + descText;
            }

            await fetch(`/api/quotes/${currentDetailedQuoteId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    descripcion: descText,
                    cantidad: document.getElementById('quote-item-qty').value,
                    unidad: document.getElementById('quote-item-unit').value,
                    precio: document.getElementById('quote-item-price').value
                })
            });

            formAddQuoteItem.reset();
            document.getElementById('quote-item-qty').value = 1;
            document.getElementById('quote-item-unit').value = 'Unidad';

            showToast('Éxito', 'Ítem agregado.', 'success');
            renderQuoteDetails(currentDetailedQuoteId);
        } catch (err) {
            console.error(err); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
            showToast('Error', 'Error al agregar ítem.', 'danger');
        } finally {
            btn.disabled = false;
        }
    });
}

// Exportación a Excel eliminada a petición

const btnExportQuotePdf = document.getElementById('btn-export-quote-pdf');
if (btnExportQuotePdf) {
    btnExportQuotePdf.addEventListener('click', async () => {
        if (!currentQuoteData) return;

        btnExportQuotePdf.disabled = true;
        const originalContent = btnExportQuotePdf.innerHTML;
        btnExportQuotePdf.innerHTML = '<div class="spinner" style="width: 16px; height: 16px;"></div> Generando PDF...';

        try {
            // Crear contenedor temporal para html2pdf
            const pdfContainer = document.createElement('div');
            pdfContainer.style.padding = '0';
            pdfContainer.style.fontFamily = 'Arial, sans-serif';
            pdfContainer.style.backgroundColor = '#fff';
            pdfContainer.style.width = '700px';

            let rowsHtml = '';
            let totalSuma = 0;
            currentQuoteItems.forEach(item => {
                const subtotal = item.cantidad * item.precio;
                totalSuma += subtotal;
                rowsHtml += `
                        <tr>
                            <td style="border: 1px solid #000; padding: 5px; font-size: 12px;">${item.descripcion.replace(/\n/g, '<br>')}</td>
                            <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px;">${item.cantidad}</td>
                            <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px;">${item.unidad}</td>
                            <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 12px;">Q${parseFloat(item.precio).toFixed(2)}</td>
                            <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 12px;">Q${subtotal.toFixed(2)}</td>
                        </tr>
                    `;
            });

            // Rellenar filas vacías
            const minRows = 10;
            if (currentQuoteItems.length < minRows) {
                for (let i = 0; i < minRows - currentQuoteItems.length; i++) {
                    rowsHtml += `
                            <tr>
                                <td style="border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px dotted #000; padding: 15px;"></td>
                                <td style="border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px dotted #000; padding: 15px;"></td>
                                <td style="border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px dotted #000; padding: 15px;"></td>
                                <td style="border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px dotted #000; padding: 15px;"></td>
                                <td style="border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px dotted #000; padding: 15px;"></td>
                            </tr>
                        `;
                }
            }

            pdfContainer.innerHTML = `
                    <style>
                        .pdf-wrapper * {
                            color: #000 !important;
                        }
                        .pdf-wrapper table {
                            table-layout: fixed;
                            width: 100%;
                        }
                        .pdf-wrapper th, .pdf-wrapper td {
                            word-wrap: break-word;
                        }
                    </style>
                    <div class="pdf-wrapper">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                            <div style="width: 30%;">
                                <img src="${currentQuoteData.tiendaLogoUrl || '/logo.png'}" style="max-width: 100%; max-height: 100px; object-fit: contain;">
                            </div>
                            <div style="width: 65%; text-align: center; font-weight: bold; font-size: 14px;">
                                <!-- Membrete eliminado -->
                            </div>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px;">
                            <div>
                                <div style="font-weight: bold; font-style: italic; font-size: 1.2rem;">Detalle de Venta</div>
                                <div>Transacción Comercial</div>
                            </div>
                            <div style="text-align: right;">
                                <div><strong>NÚMERO:</strong> ${currentQuoteData.id}</div>
                                <div><strong>FECHA:</strong> ${currentQuoteData.fecha}</div>
                                <div><strong>VÁLIDO HASTA:</strong> ${currentQuoteData.validoHasta || '-'}</div>
                            </div>
                        </div>

                        <div style="border: 2px solid #000; text-align: center; font-weight: bold; font-style: italic; padding: 5px; margin-bottom: 10px;">
                            Venta
                        </div>

                        <div style="font-size: 12px; margin-bottom: 20px;">
                            <div><strong>Nombre:</strong> ${currentQuoteData.clienteNombre || ''}</div>
                            <div><strong>Dirección:</strong> ${currentQuoteData.clienteDireccion || ''}</div>
                            <div><strong>NIT:</strong> ${currentQuoteData.clienteNit || ''}</div>
                            <div><strong>Teléfono:</strong> ${currentQuoteData.clienteTelefono || ''}</div>
                            <div><strong>E-mail:</strong> ${currentQuoteData.clienteEmail || ''}</div>
                        </div>

                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <thead>
                                <tr style="border: 1px solid #000;">
                                    <th style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px; width: 35%;">DESCRIPCIÓN</th>
                                    <th style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px; width: 15%;">CANTIDAD</th>
                                    <th style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px; width: 15%;">UNIDAD</th>
                                    <th style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px; width: 15%;">PRECIO</th>
                                    <th style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px; width: 20%;">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="3" style="border-top: 1px solid #000;"></td>
                                    <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 12px;">SUB-TOTAL</td>
                                    <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 12px;">Q${totalSuma.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td colspan="3"></td>
                                    <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px;">IVA % INCLUIDO</td>
                                    <td style="border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px;">-</td>
                                </tr>
                                <tr>
                                    <td colspan="3"></td>
                                    <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-style: italic; font-size: 12px;">TOTAL</td>
                                    <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-style: italic; font-size: 12px;">Q${totalSuma.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                `;

            const opt = {
                margin: 10,
                filename: `Venta_${currentQuoteData.clienteNombre}_${currentQuoteData.id}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
            };

            await html2pdf().set(opt).from(pdfContainer).save();
            showToast('Éxito', 'Venta exportada a PDF.', 'success');
        } catch (err) {
            console.error(err); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
            showToast('Error', 'No se pudo generar el PDF. Revisa la consola.', 'danger');
        } finally {
            btnExportQuotePdf.disabled = false;
            btnExportQuotePdf.innerHTML = originalContent;
        }
    });
}

// --- LÓGICA DE MODAL ACEPTAR Venta ---
const modalAcceptQuote = document.getElementById('modal-accept-quote');
const acceptQuoteForm = document.getElementById('accept-quote-form');
const btnCloseAcceptQuote = document.getElementById('btn-close-accept-quote-modal');
const btnCancelAcceptQuote = document.getElementById('btn-cancel-accept-quote');
const acceptQuoteProjectSelect = document.getElementById('accept-quote-project');
const acceptQuoteInvoiceInput = document.getElementById('accept-quote-invoice');
const acceptQuoteInvoiceName = document.getElementById('accept-quote-invoice-name');

window.openAcceptQuoteModal = async function (id, total) {
    document.getElementById('accept-quote-id').value = id;
    document.getElementById('accept-quote-total').value = total;
    acceptQuoteInvoiceInput.value = '';
    acceptQuoteInvoiceName.textContent = 'Seleccionar archivo...';

    // Cargar proyectos activos
    acceptQuoteProjectSelect.innerHTML = '<option value="">Cargando proyectos...</option>';
    try {
        const res = await fetch('/api/projects');
        const data = await res.json();

        acceptQuoteProjectSelect.innerHTML = '<option value="">Seleccione un proyecto...</option>';
        data.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.nombre;
            acceptQuoteProjectSelect.appendChild(opt);
        });
    } catch (e) {
        acceptQuoteProjectSelect.innerHTML = '<option value="">Error al cargar proyectos</option>';
    }

    modalAcceptQuote.classList.remove('hidden');
};

function closeAcceptQuoteModal() {
    modalAcceptQuote.classList.add('hidden');
    acceptQuoteForm.reset();
}

if (btnCloseAcceptQuote) btnCloseAcceptQuote.addEventListener('click', closeAcceptQuoteModal);
if (btnCancelAcceptQuote) btnCancelAcceptQuote.addEventListener('click', closeAcceptQuoteModal);

if (acceptQuoteInvoiceInput) {
    acceptQuoteInvoiceInput.addEventListener('change', function () {
        if (this.files && this.files[0]) {
            acceptQuoteInvoiceName.textContent = this.files[0].name;
        } else {
            acceptQuoteInvoiceName.textContent = 'Seleccionar archivo...';
        }
    });
}

if (acceptQuoteForm) {
    acceptQuoteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('accept-quote-id').value;
        const total = document.getElementById('accept-quote-total').value;
        const proyectoId = acceptQuoteProjectSelect.value;

        if (!proyectoId) {
            showToast('Atención', 'Debe seleccionar un proyecto.', 'warning');
            return;
        }
        try {
            let fotoFacturaBase64 = null;
            if (acceptQuoteInvoiceInput.files && acceptQuoteInvoiceInput.files[0]) {
                const file = acceptQuoteInvoiceInput.files[0];
                fotoFacturaBase64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                });
            }

            const res = await fetch(`/api/quotes/${id}/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proyectoId, fotoFacturaBase64, totalVenta: total })
            });

            const data = await res.json();
            if (data.success) {
                showToast('Éxito', 'Venta aceptada y asginada al proyecto exitosamente.', 'success');
                closeAcceptQuoteModal();
                // Refrescar vistas
                renderQuotesView();
            } else {
                showToast('Error', data.message || 'No se pudo aceptar la venta.', 'danger');
            }
        } catch (err) {
            console.error(err); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
            showToast('Error', 'Hubo un problema de conexión.', 'danger');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Aceptar Venta';
        }
    });
}

// --- Lógica Modal Buscar Producto ---
const productSearchModal = document.getElementById('product-search-modal');
const btnSearchProduct = document.getElementById('btn-search-product');
const btnCloseProductSearchModal = document.getElementById('btn-close-product-search-modal');
const productSearchInput = document.getElementById('product-search-input');
const productSearchResults = document.getElementById('product-search-results');
let allProductsCache = [];

if (btnSearchProduct && productSearchModal) {
    btnSearchProduct.addEventListener('click', async () => {
        productSearchModal.classList.remove('hidden');
        if (productSearchInput) productSearchInput.value = '';
        if (productSearchResults) productSearchResults.innerHTML = '<tr><td colspan="4" class="text-center">Cargando...</td></tr>';

        try {
            const res = await fetch('/api/materials');
            const data = await res.json();
            allProductsCache = data.data || data || [];
            renderProductSearch(allProductsCache);
        } catch (e) {
            console.error(e); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger');
            if (productSearchResults) productSearchResults.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error al cargar productos</td></tr>';
        }
    });
}

if (btnCloseProductSearchModal) {
    btnCloseProductSearchModal.addEventListener('click', () => {
        productSearchModal.classList.add('hidden');
    });
}

if (productSearchInput) {
    productSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allProductsCache.filter(p =>
            (p.nombre && p.nombre.toLowerCase().includes(query)) ||
            (p.codigo && p.codigo.toLowerCase().includes(query))
        );
        renderProductSearch(filtered);
    });
}

function renderProductSearch(products) {
    if (!productSearchResults) return;
    productSearchResults.innerHTML = '';
    if (!Array.isArray(products) || products.length === 0) {
        productSearchResults.innerHTML = '<tr><td colspan="4" class="text-center">No se encontraron productos.</td></tr>';
        return;
    }

    products.forEach(p => {
        const tr = document.createElement('tr');
        const stock = (p.stock !== undefined) ? p.stock : (p.cantidad !== undefined ? p.cantidad : 0);
        const price = p.precio_venta || p.precio || 0;
        tr.innerHTML = `
                <td>${p.nombre || 'Sin nombre'}</td>
                <td style="text-align: right;">${stock}</td>
                <td style="text-align: right;">Q${parseFloat(price).toFixed(2)}</td>
                <td style="text-align: center;">
                    <button type="button" class="btn-primary btn-sm btn-select-product" data-id="${p.id}" data-name="${p.nombre}" data-price="${price}">Seleccionar</button>
                </td>
            `;
        productSearchResults.appendChild(tr);
    });

    productSearchResults.querySelectorAll('.btn-select-product').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const name = e.target.getAttribute('data-name');
            const price = e.target.getAttribute('data-price');

            document.getElementById('quote-item-desc').value = name;
            document.getElementById('quote-item-price').value = price;
            document.getElementById('quote-item-qty').value = 1;
            document.getElementById('quote-item-type').value = 'venta'; // Selecciona Venta de producto

            productSearchModal.classList.add('hidden');
        });
    });
}
/*
    ,d88b.d88b,
    88888888888
    `Y8 N + B 8P'
      `Y888P'  
        `Y'    
*/
