    // --- LÓGICA DE INICIO DE SESIÓN ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = usernameInput.value;
        const password = passwordInput.value;

        const user = await window.AttendanceDB.validateUser(username, password);

        if (user) {
            currentUser = user;
            sessionStorage.setItem('dch_current_user', JSON.stringify(user));

            // Log de auditoría
            await window.AttendanceDB.addLog(user.id, `Inicio de sesión eÉxitoso - Rol: ${user.rol}`);

            showToast('¡Bienvenido!', `Has iniciado sesión como ${user.nombre}`, 'success');

            // Limpiar formulario y redireccionar
            usernameInput.value = '';
            passwordInput.value = '';
            showDashboard();

            if ((user.rol === 'admin' || user.rol === 'superadmin')) {
                checkMaterialAlerts();
            }
        } else {
            showToast('Error de Acceso', 'Usuario o contraseña incorrectos.', 'danger');
            await window.AttendanceDB.addLog(0, `Intento de acceso fallido para el usuario: "${username}"`);
        }
    });

    // Cierre de sesión
    btnLogout.addEventListener('click', async () => {
        if (currentUser) {
            await window.AttendanceDB.addLog(currentUser.id, 'Cierre de sesión voluntario');
            showToast('Sesión Cerrada', 'Has salido del sistema de forma segura.', 'info');
        }
        showLogin();
        window.location.reload();
    });

    // --- VISTA 1: USUARIO OPERATIVO (usr) ---
    const btnPlayMarcaje = document.getElementById('btn-play-marcaje');
    const playIconSvg = document.getElementById('play-icon-svg');
    const stopIconSvg = document.getElementById('stop-icon-svg');
    const userStatusTag = document.getElementById('user-status-tag');
    const userTimer = document.getElementById('user-timer');
    const userCheckinDetails = document.getElementById('user-checkin-details');
    const usrAttendanceTable = document.getElementById('usr-attendance-table');

    // Tarjetas de estadísticas
    const usrStatNet = document.getElementById('usr-stat-net');
    const usrStatPenalties = document.getElementById('usr-stat-penalties');

    // Ver detalles de Descuentos
    const btnViewPenaltiesDetail = document.getElementById('btn-view-penalties-detail');
    const viewUserPenalties = document.getElementById('view-user-penalties');
    const btnBackToUser = document.getElementById('btn-back-to-user');
    const penaltyDetailContent = document.getElementById('penalty-detail-content');
    const userPenaltyList = document.getElementById('user-penalty-list');

    // Modal de ubicación
    const locationModal = document.getElementById('location-modal');
    const locationModalTitle = document.getElementById('location-modal-title');
    const btnCloseLocationModal = document.getElementById('btn-close-location-modal');
    const btnCancelLocation = document.getElementById('btn-cancel-location');
    const btnConfirmLocation = document.getElementById('btn-confirm-location');
    const simulatedCoordinates = document.getElementById('simulated-coordinates');

    // Justificaciones de marcaje
    const locationWhereInput = document.getElementById('location-where-input');
    const locationWhyInput = document.getElementById('location-why-input');

    // Estado temporal del marcaje en curso
    let isCheckInAction = true;

    function setupUserView() {
        clearInterval(timerInterval);

        const cardTimerControl = document.getElementById('card-timer-control');
        const cardPieceworkControl = document.getElementById('card-piecework-control');
        const cardBusesControl = document.getElementById('card-buses-control');

        const isBuses = currentUser.tipoPago === 'Pago Fijo Diario';

        if (isBuses) {
            if (cardTimerControl) cardTimerControl.classList.add('hidden');
            if (cardPieceworkControl) cardPieceworkControl.classList.add('hidden');
            if (cardBusesControl) cardBusesControl.classList.remove('hidden');

            // Cargar tablas y estadísticas de buses
            renderUserStatsAndTable();
            return;
        } else if (currentUser.tipoPago === 'Destajo' || currentUser.tipoPago === 'Por Trato') {
            if (cardTimerControl) cardTimerControl.classList.remove('hidden');
            if (cardPieceworkControl) cardPieceworkControl.classList.add('hidden');
            if (cardBusesControl) cardBusesControl.classList.add('hidden');
            
            // Opcional: Ocultar el temporizador si no quieren que se vean las horas
            // document.getElementById('user-timer').style.display = 'none';

            // Cargar tablas y estadísticas de por trato
            renderUserStatsAndTable();
        } else {
            if (cardTimerControl) cardTimerControl.classList.remove('hidden');
            if (cardPieceworkControl) cardPieceworkControl.classList.add('hidden');
            if (cardBusesControl) cardBusesControl.classList.add('hidden');
        }

        // Verificar marcaje activo
        const activeRecord = window.AttendanceDB.getActiveAttendanceByUser(currentUser.id);

        if (activeRecord) {
            // Usuario está en turno (Checked-in)
            userStatusTag.textContent = 'Jornada Activa';
            userStatusTag.className = 'status-tag status-online';

            // Botón en modo Stop
            btnPlayMarcaje.className = 'btn-play check-out';
            playIconSvg.classList.add('hidden');
            stopIconSvg.classList.remove('hidden');

            // Mostrar hora de entrada
            userCheckinDetails.innerHTML = `Entrada registrada a las <strong>${activeRecord.horaEntrada}</strong> del ${formatDateDDMMYYYY(activeRecord.fecha)}`;

            // Iniciar temporizador activo
            startActiveTimer(activeRecord.fecha, activeRecord.horaEntrada);
        } else {
            // Usuario fuera de turno
            userStatusTag.textContent = 'Fuera de Turno';
            userStatusTag.className = 'status-tag status-offline';

            // Botón en modo Play
            btnPlayMarcaje.className = 'btn-play check-in';
            playIconSvg.classList.remove('hidden');
            stopIconSvg.classList.add('hidden');

            userTimer.textContent = '00:00:00';

            // Obtener el último marcaje completado
            const history = window.AttendanceDB.getAttendanceByUser(currentUser.id);
            const lastRecord = history.find(a => a.horaSalida);
            if (lastRecord) {
                userCheckinDetails.innerHTML = `Último turno: ${formatDateDDMMYYYY(lastRecord.fecha)} (${lastRecord.horaEntrada} a ${lastRecord.horaSalida})`;
            } else {
                userCheckinDetails.textContent = 'No has registrado entrada hoy.';
            }
        }

        // Cargar tablas y estadísticas personales
        renderUserStatsAndTable();

        setTimeout(() => {
            const btnRequestLoan = document.getElementById('btn-request-loan');
            if (btnRequestLoan) {
                btnRequestLoan.addEventListener('click', async () => {
                    const amount = await appPrompt('Préstamo', '¿Qué cantidad deseas solicitar como préstamo/adelanto?', 'number');
                    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
                        const cuota = await appPrompt('Cuota', '¿De cuánto será la cuota de descuento por período?', 'number');
                        if (cuota && !isNaN(cuota) && parseFloat(cuota) > 0) {
                            fetch(`/api/users/${currentUser.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    ...currentUser,
                                    préstamoTotal: parseFloat(amount),
                                    préstamosaldo: parseFloat(amount),
                                    préstamoCuota: parseFloat(cuota),
                                    préstamoEstadoCuota: 'Pendiente de Autorizar'
                                })
                            }).then(res => res.json()).then(data => {
                                if (data.success) {
                                    showToast('Solicitud Enviada', 'Tu solicitud de préstamo está pendiente de autorización.', 'success');
                                    window.AttendanceDB.getUsers().then(users => {
                                        currentUser = users.find(u => u.id === currentUser.id);
                                        renderUserStatsAndTable();
                                    });
                                }
                            });
                        }
                    }
                });
            }
        }, 100);
    }

    function startActiveTimer(fechaStr, horaEntradaStr) {
        const [year, month, day] = fechaStr.split('-').map(Number);
        const [entH, entM, entS] = horaEntradaStr.split(':').map(Number);
        const entradaDate = new Date(year, month - 1, day, entH, entM, entS, 0);

        const updateTimer = () => {
            const now = new Date();
            let diffMs = now.getTime() - entradaDate.getTime();
            if (diffMs < 0) diffMs = 0; // Evitar diferencias negativas en cambios de segundo

            const totalSegundos = Math.floor(diffMs / 1000);
            const horas = Math.floor(totalSegundos / 3600);
            const minutos = Math.floor((totalSegundos % 3600) / 60);
            const segundos = totalSegundos % 60;

            const pad = (num) => String(num).padStart(2, '0');
            userTimer.textContent = `${pad(horas)}:${pad(minutos)}:${pad(segundos)}`;
        };

        updateTimer();
        timerInterval = setInterval(updateTimer, 1000);
    }

    // --- FLUJO DE MODAL DE UBICACIÓN ---
    btnPlayMarcaje.addEventListener('click', async () => {
        const activeRecord = window.AttendanceDB.getActiveAttendanceByUser(currentUser.id);
        const projectSelect = document.getElementById('location-project-select');

        if (!activeRecord) {
            // Acción: Iniciar turno (Check-in)
            isCheckInAction = true;
            locationModalTitle.textContent = 'Confirmar Entrada';
            if (projectSelect) {
                projectSelect.parentElement.classList.remove('hidden');
                // Cargar proyectos
                try {
                    const currentComp = window.AttendanceDB?.currentCompany || 'Todas';
                    const res = await fetch(`/api/projects?empresa=${encodeURIComponent(currentComp)}`);
                    const projects = await res.json();
                    projectSelect.innerHTML = '<option value="">-- Sin Proyecto (Operativo) --</option>';
                    projects.forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p.id;
                        opt.textContent = p.nombre;
                        projectSelect.appendChild(opt);
                    });
                } catch (e) { console.error(e); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger'); if(typeof window.showToast === 'function') window.showToast('Error', 'Ocurrió un problema de conexión', 'danger'); }
            }
        } else {
            // Acción: Finalizar turno (Check-out)
            isCheckInAction = false;
            locationModalTitle.textContent = 'Confirmar Salida';
            if (projectSelect) {
                projectSelect.parentElement.classList.add('hidden'); // Ocultar al salir
            }
        }

        // Restablecer justificaciones
        if (locationWhereInput) locationWhereInput.value = '';
        if (locationWhyInput) locationWhyInput.value = '';

        const gpsStatus = document.getElementById('gps-status');
        const gpsAccuracy = document.getElementById('gps-accuracy');
        const realMapEl = document.getElementById('real-map');

        if (gpsStatus) {
            gpsStatus.textContent = 'OBTENIENDO GPS...';
            gpsStatus.style.color = '#f1c40f';
        }
        if (gpsAccuracy) gpsAccuracy.textContent = 'Precisión: -';
        simulatedCoordinates.textContent = `Lat: -, Lng: -`;
        if (realMapEl) realMapEl.innerHTML = 'Cargando mapa...';
        
        if (btnConfirmLocation) {
            btnConfirmLocation.disabled = true;
            btnConfirmLocation.textContent = 'Obteniendo ubicación...';
            btnConfirmLocation.style.opacity = '0.5';
            btnConfirmLocation.style.cursor = 'not-allowed';
        }

        // Configurar campos dinámicos de Por Trato y Foto
        const fotoAsistenciaContainer = document.getElementById('foto-asistencia-container');
        const destajoFieldsContainer = document.getElementById('destajo-fields-container');
        const fotoAsistenciaEl = document.getElementById('location-foto-asistencia');
        const descEl = document.getElementById('destajo-descripcion');
        const cantEl = document.getElementById('destajo-cantidad');
        const fotoAntesEl = document.getElementById('destajo-foto-antes');
        const fotoDespuesEl = document.getElementById('destajo-foto-despues');

        if (fotoAsistenciaEl) fotoAsistenciaEl.value = '';
        if (descEl) descEl.value = '';
        if (cantEl) cantEl.value = '';
        if (fotoAntesEl) fotoAntesEl.value = '';
        if (fotoDespuesEl) fotoDespuesEl.value = '';

        // Siempre requerimos foto general para marcar Entrada o Salida
        if (fotoAsistenciaContainer) {
            fotoAsistenciaContainer.classList.remove('hidden');
        }

        if (isCheckInAction) {
            if (destajoFieldsContainer) destajoFieldsContainer.classList.add('hidden');
        } else {
            if (currentUser.tipoPago === 'Destajo' || currentUser.tipoPago === 'Por Trato') {
                if (destajoFieldsContainer) destajoFieldsContainer.classList.remove('hidden');
            } else {
                if (destajoFieldsContainer) destajoFieldsContainer.classList.add('hidden');
            }
        }

        // Abrir modal
        locationModal.classList.remove('hidden');

        // Inicializar mapa y obtener ubicación real
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;
                
                simulatedCoordinates.textContent = `Lat: ${lat.toFixed(4)}°, Lng: ${lng.toFixed(4)}°`;
                if (gpsStatus) {
                    gpsStatus.textContent = 'GPS LOCK: OK';
                    gpsStatus.style.color = '#2ecc71';
                }
                if (gpsAccuracy) gpsAccuracy.textContent = `Precisión: ± ${Math.round(accuracy)}m`;
                
                if (btnConfirmLocation) {
                    btnConfirmLocation.disabled = false;
                    btnConfirmLocation.textContent = 'Confirmar y Marcar';
                    btnConfirmLocation.style.opacity = '1';
                    btnConfirmLocation.style.cursor = 'pointer';
                }

                // Render Google Map
                if (window.google && window.google.maps && realMapEl) {
                    const myLatlng = { lat: lat, lng: lng };
                    const mapOptions = {
                        zoom: 16,
                        center: myLatlng,
                        disableDefaultUI: true,
                        zoomControl: true
                    };
                    const map = new google.maps.Map(realMapEl, mapOptions);
                    new google.maps.Marker({
                        position: myLatlng,
                        map,
                        title: "Tu Ubicación"
                    });

                    // Auto-completar dirección
                    if (locationWhereInput) {
                        locationWhereInput.placeholder = "Obteniendo dirección...";
                        const geocoder = new google.maps.Geocoder();
                        geocoder.geocode({ location: myLatlng }, (results, status) => {
                            if (status === "OK" && results[0]) {
                                locationWhereInput.value = results[0].formatted_address;
                            } else {
                                locationWhereInput.placeholder = "ej: Oficina Central, Proyecto X...";
                            }
                        });
                    }
                } else if (realMapEl) {
                    realMapEl.innerHTML = 'Error al cargar Google Maps.';
                }
            }, (error) => {
                console.error("Error obteniendo ubicación:", error);
                if (gpsStatus) {
                    gpsStatus.textContent = 'PERMISO DENEGADO';
                    gpsStatus.style.color = '#e74c3c';
                }
                if (realMapEl) {
                    realMapEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #e74c3c;"><strong>¡Ubicación obligatoria!</strong><br><br>No podemos registrar tu marcaje porque no concediste los permisos de ubicación o hubo un error al obtenerla. Por favor, asegúrate de habilitar la ubicación en tu navegador para continuar.</div>';
                }
                if (btnConfirmLocation) {
                    btnConfirmLocation.textContent = 'Ubicación Requerida';
                }
                simulatedCoordinates.textContent = `Lat: -, Lng: -`;
            }, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        } else {
            if (gpsStatus) {
                gpsStatus.textContent = 'NO SOPORTADO';
                gpsStatus.style.color = '#e74c3c';
            }
            if (realMapEl) realMapEl.innerHTML = 'Tu navegador no soporta geolocalización. No puedes marcar.';
            if (btnConfirmLocation) {
                btnConfirmLocation.textContent = 'No soportado';
            }
        }
    });

    // Cerrar modal de ubicación
    const closeLocationModal = () => {
        locationModal.classList.add('hidden');
    };

    btnCloseLocationModal.addEventListener('click', closeLocationModal);
    btnCancelLocation.addEventListener('click', closeLocationModal);
    locationModal.addEventListener('click', (e) => {
        if (e.target === locationModal) closeLocationModal();
    });

    const fileToBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    // Confirmar marcaje y enviar ubicación
    btnConfirmLocation.addEventListener('click', async () => {
        if (btnConfirmLocation.disabled) return;
        
        let whereValue = locationWhereInput ? locationWhereInput.value.trim() : '';
        let whyValue = locationWhyInput ? locationWhyInput.value.trim() : '';

        if (!whereValue) {
            showToast('Justificación requerida', 'Por favor confirma tu ubicación actual.', 'warning');
            return;
        }
        if (!whyValue) {
            showToast('Justificación requerida', 'Por favor ingresa el motivo/actividad de tu marcaje.', 'warning');
            return;
        }

        const fotoAsistenciaContainer = document.getElementById('foto-asistencia-container');
        const destajoFieldsContainer = document.getElementById('destajo-fields-container');
        
        const fotoAsistenciaEl = document.getElementById('location-foto-asistencia');
        let fotoAsistenciaB64 = null;
        
        if (fotoAsistenciaContainer && !fotoAsistenciaContainer.classList.contains('hidden')) {
            if (!fotoAsistenciaEl.files || fotoAsistenciaEl.files.length === 0) {
                showToast('Foto Requerida', 'La empresa requiere que tomes una fotografía para registrar tu marcaje.', 'warning');
                return;
            }
            fotoAsistenciaB64 = await fileToBase64(fotoAsistenciaEl.files[0]);
        }

        let trabajoDescripcion = null;
        let trabajoCantidad = 0;
        let fotoAntesB64 = null;
        let fotoDespuesB64 = null;

        if (!isCheckInAction && destajoFieldsContainer && !destajoFieldsContainer.classList.contains('hidden')) {
            const descEl = document.getElementById('destajo-descripcion');
            const cantEl = document.getElementById('destajo-cantidad');
            const fotoAntesEl = document.getElementById('destajo-foto-antes');
            const fotoDespuesEl = document.getElementById('destajo-foto-despues');

            trabajoDescripcion = descEl ? descEl.value.trim() : '';
            trabajoCantidad = cantEl ? parseInt(cantEl.value) : 0;

            if (!trabajoDescripcion) {
                showToast('Datos de Trato', 'Por favor ingresa la descripción de lo que realizaste.', 'warning');
                return;
            }
            if (!trabajoCantidad || trabajoCantidad <= 0) {
                showToast('Datos de Trato', 'Por favor ingresa la cantidad válida de unidades realizadas.', 'warning');
                return;
            }
            if (!fotoAntesEl.files || fotoAntesEl.files.length === 0) {
                showToast('Datos de Trato', 'Por favor adjunta la fotografía de ANTES de iniciar el trabajo.', 'warning');
                return;
            }
            if (!fotoDespuesEl.files || fotoDespuesEl.files.length === 0) {
                showToast('Datos de Trato', 'Por favor adjunta la fotografía de DESPUÉS de terminar el trabajo.', 'warning');
                return;
            }

            fotoAntesB64 = await fileToBase64(fotoAntesEl.files[0]);
            fotoDespuesB64 = await fileToBase64(fotoDespuesEl.files[0]);
        }

        btnConfirmLocation.disabled = true;
        btnConfirmLocation.textContent = 'Enviando...';

        // Obtener lat/lng simulados para guardar en DB
        const coordsText = simulatedCoordinates.textContent; // "Lat: 14.6284°, Lng: -90.5222°"
        let lat = null, lng = null;
        if (coordsText) {
            const matches = coordsText.match(/Lat:\s*([-\d.]+)[^\d-]+Lng:\s*([-\d.]+)/);
            if (matches) {
                lat = parseFloat(matches[1]);
                lng = parseFloat(matches[2]);
            }
        }

        if (isCheckInAction) {
            // Hacer check-in
            const projectSelect = document.getElementById('location-project-select');
            const proyectoId = projectSelect ? projectSelect.value : null;
            // Pasamos fotoAsistenciaB64 como fotoEntrada
            const record = await window.AttendanceDB.checkIn(currentUser.id, lat, lng, whereValue, whyValue, proyectoId, fotoAsistenciaB64);
            if (record) {
                showToast('Entrada Registrada', `Marcaje de entrada exitoso a las ${record.horaEntrada}`, 'success');
                closeLocationModal();
                setupUserView();
            }
        } else {
            // Hacer check-out
            // Para checkOut, necesitamos pasar fotoAsistenciaB64 como fotoSalida. 
            // Vamos a tener que editar AttendanceDB.checkOut en db-client.js para que reciba fotoSalida
            const record = await window.AttendanceDB.checkOut(currentUser.id, lat, lng, whereValue, whyValue, trabajoDescripcion, trabajoCantidad, fotoAntesB64, fotoDespuesB64, fotoAsistenciaB64);
            if (record) {
                showToast('Salida Registrada', `Marcaje de salida exitoso. Horas: ${record.horasTrabajadas}`, 'success');
                closeLocationModal();
                setupUserView();
            }
        }
        
        btnConfirmLocation.disabled = false;
        btnConfirmLocation.textContent = 'Confirmar y Marcar';
    });

    // --- FLUJO DE MODAL DE ENTREGAR TRABAJO (POR TRATO) ---
    const btnOpenPieceworkSubmit = document.getElementById('btn-open-piecework-submit');
    const pieceworkModal = document.getElementById('piecework-modal');
    const btnClosePieceworkModal = document.getElementById('btn-close-piecework-modal');
    const btnCancelPiecework = document.getElementById('btn-cancel-piecework');
    const pieceworkForm = document.getElementById('piecework-form');
    const pieceworkDesc = document.getElementById('piecework-desc');
    const pieceworkQuantity = document.getElementById('piecework-quantity');

    if (btnOpenPieceworkSubmit) {
        btnOpenPieceworkSubmit.addEventListener('click', () => {
            pieceworkForm.reset();
            pieceworkModal.classList.remove('hidden');
        });
    }

    const closePieceworkModal = () => pieceworkModal.classList.add('hidden');

    if (btnClosePieceworkModal) btnClosePieceworkModal.addEventListener('click', closePieceworkModal);
    if (btnCancelPiecework) btnCancelPiecework.addEventListener('click', closePieceworkModal);
    if (pieceworkModal) {
        pieceworkModal.addEventListener('click', (e) => {
            if (e.target === pieceworkModal) closePieceworkModal();
        });
    }

    if (pieceworkForm) {
        pieceworkForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const desc = pieceworkDesc.value.trim();
            const price = 0; // El supervisor define el precio
            const qty = parseInt(pieceworkQuantity.value) || 0;
            const total = 0;

            if (!desc || qty <= 0) {
                showToast('Datos inválidos', 'Revisa la descripción y cantidad.', 'warning');
                return;
            }

            const res = await window.AttendanceDB.submitPiecework(currentUser.id, desc, price, qty, total);
            if (res.success) {
                showToast('Trabajo Entregado', 'Tu trabajo ha sido enviado y está pendiente de confirmación.', 'success');
                closePieceworkModal();
                setupUserView();
            } else {
                showToast('Error', res.message, 'danger');
            }
        });
    }

    // --- FLUJO DE MODAL DE BUSES (EFECTIVO Y GASTOS) ---
    const btnOpenBusesSubmit = document.getElementById('btn-open-buses-submit');
    const busesModal = document.getElementById('buses-modal');
    const btnCloseBusesModal = document.getElementById('btn-close-buses-modal');
    const btnCancelBuses = document.getElementById('btn-cancel-buses');
    const busesForm = document.getElementById('buses-form');

    // Dynamic expenses logic
    const btnAddBusExpense = document.getElementById('btn-add-bus-expense');
    const busesExpensesList = document.getElementById('buses-expenses-list');
    let expenseCounter = 0;

    const createExpenseRow = () => {
        expenseCounter++;
        const row = document.createElement('div');
        row.className = 'buses-expense-row';
        row.style.border = '1px solid var(--border-color)';
        row.style.padding = '10px';
        row.style.marginBottom = '10px';
        row.style.borderRadius = 'var(--radius-sm)';
        row.style.position = 'relative';

        row.innerHTML = `
            <button type="button" class="btn-remove-expense" style="position: absolute; right: 5px; top: 5px; background: none; border: none; color: var(--danger); cursor: pointer;" title="Eliminar">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div class="form-group" style="margin-bottom: 10px;">
                <label>Tipo de Movimiento *</label>
                <select class="form-control exp-tipo" required>
                    <option value="Gasto">Gasto</option>
                    <option value="Sueldo">Sueldo</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Préstamo">Préstamo</option>
                </select>
            </div>
            <div class="form-group exp-monto-container" style="margin-bottom: 10px;">
                <label class="lbl-monto">Monto (Q) *</label>
                <input type="number" class="form-control exp-monto" min="0.01" step="0.01" required>
                <small class="exp-sueldo-hint hidden" style="color:var(--text-muted); font-size:0.75rem;">Tu acumulado es: Q<span class="exp-sueldo-val">0.00</span></small>
            </div>
            <div class="form-group exp-diesel-container hidden" style="margin-bottom: 10px;">
                <label>Cantidad (Galones/Litros) *</label>
                <input type="number" class="form-control exp-cantidad" min="0.01" step="0.01">
                <small style="color:var(--text-muted); font-size:0.75rem;">Precio estipulado: Q<span class="exp-precio-diesel">30.00</span></small>
            </div>
            <div class="form-group exp-préstamo-container hidden" style="margin-bottom: 10px;">
                <label>Empleado *</label>
                <select class="form-control exp-empleado"></select>
                <label style="margin-top: 10px;">Justificación *</label>
                <input type="text" class="form-control exp-justificacion">
            </div>
            <div class="form-group exp-factura-container" style="margin-bottom: 0;">
                <label>Subir Factura/Comprobante *</label>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <input type="file" class="exp-file" accept="image/*" style="display: none;">
                    <button type="button" class="btn-secondary btn-exp-upload" style="flex: 1; padding: 5px;">Seleccionar Foto</button>
                </div>
                <div class="exp-preview" style="margin-top: 10px; max-height: 100px; overflow: hidden; display: none;">
                    <img class="exp-img" src="" style="width: 100%; height: auto; border-radius: 4px;">
                </div>
            </div>
        `;

        const btnRemove = row.querySelector('.btn-remove-expense');
        const selectTipo = row.querySelector('.exp-tipo');
        const fileInput = row.querySelector('.exp-file');
        const btnUpload = row.querySelector('.btn-exp-upload');
        const img = row.querySelector('.exp-img');
        const preview = row.querySelector('.exp-preview');
        const facturaContainer = row.querySelector('.exp-factura-container');
        const dieselContainer = row.querySelector('.exp-diesel-container');
        const préstamoContainer = row.querySelector('.exp-préstamo-container');
        const inputMonto = row.querySelector('.exp-monto');
        const inputCantidad = row.querySelector('.exp-cantidad');
        const selectEmpleado = row.querySelector('.exp-empleado');
        const sueldoHint = row.querySelector('.exp-sueldo-hint');

        const precioDiesel = currentUser.precioDieselBuses || 30;
        const sueldoAcumulado = currentUser.sueldoBusesAcumulado || 0;
        row.querySelector('.exp-precio-diesel').textContent = precioDiesel.toFixed(2);
        row.querySelector('.exp-sueldo-val').textContent = sueldoAcumulado.toFixed(2);

        // Populate selectEmpleado
        const users = window.AttendanceDB.getUsers();
        selectEmpleado.innerHTML = '<option value="">Seleccionar Empleado...</option>';
        users.filter(u => u.rol === 'usr' || u.rol === 'leader').forEach(u => {
            selectEmpleado.innerHTML += `<option value="${u.id}">${u.nombre}</option>`;
        });

        btnRemove.addEventListener('click', () => row.remove());

        selectTipo.addEventListener('change', () => {
            const val = selectTipo.value;
            // Reset visibility
            facturaContainer.classList.remove('hidden');
            dieselContainer.classList.add('hidden');
            préstamoContainer.classList.add('hidden');
            sueldoHint.classList.add('hidden');
            inputMonto.readOnly = false;
            
            if (val === 'Sueldo') {
                facturaContainer.classList.add('hidden');
                sueldoHint.classList.remove('hidden');
                inputMonto.value = sueldoAcumulado > 0 ? sueldoAcumulado : '';
            } else if (val === 'Préstamo') {
                facturaContainer.classList.add('hidden');
                préstamoContainer.classList.remove('hidden');
            } else if (val === 'Diesel') {
                dieselContainer.classList.remove('hidden');
                inputMonto.readOnly = true;
                inputMonto.value = '';
            }
        });

        inputCantidad.addEventListener('input', () => {
            if (selectTipo.value === 'Diesel') {
                const qty = parseFloat(inputCantidad.value) || 0;
                inputMonto.value = (qty * precioDiesel).toFixed(2);
            }
        });

        btnUpload.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (evt) {
                    img.src = evt.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });

        if (busesExpensesList) {
            busesExpensesList.appendChild(row);
        }
    };

    if (btnAddBusExpense) {
        btnAddBusExpense.addEventListener('click', createExpenseRow);
    }

    const openBusesModal = () => {
        busesModal.classList.remove('hidden');
        if (busesForm) busesForm.reset();
        if (busesExpensesList) busesExpensesList.innerHTML = '';
        expenseCounter = 0;
    };

    const closeBusesModal = () => {
        busesModal.classList.add('hidden');
    };

    if (btnOpenBusesSubmit) btnOpenBusesSubmit.addEventListener('click', openBusesModal);
    if (btnCloseBusesModal) btnCloseBusesModal.addEventListener('click', closeBusesModal);
    if (btnCancelBuses) btnCancelBuses.addEventListener('click', closeBusesModal);

    if (busesForm) {
        busesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const turnosSeleccionados = [];
            if (document.getElementById('buses-turno-manana').checked) turnosSeleccionados.push('Mañana');
            if (document.getElementById('buses-turno-tarde').checked) turnosSeleccionados.push('Tarde');

            if (turnosSeleccionados.length === 0) {
                showToast('Error', 'Debe seleccionar al menos un turno (Mañana o Tarde).', 'danger');
                return;
            }
            const turno = turnosSeleccionados.join(', ');
            const ingreso = parseFloat(document.getElementById('buses-ingreso').value) || 0;

            if (ingreso < 0) {
                showToast('Error', 'El ingreso de dinero debe ser mayor o igual a 0.', 'danger');
                return;
            }

            const gastos = [];
            const expenseRows = busesExpensesList.querySelectorAll('.buses-expense-row');

            for (let i = 0; i < expenseRows.length; i++) {
                const r = expenseRows[i];
                const tipo = r.querySelector('.exp-tipo').value;
                const monto = parseFloat(r.querySelector('.exp-monto').value) || 0;
                const imgBase64 = r.querySelector('.exp-img').getAttribute('src');
                const cantidad = parseFloat(r.querySelector('.exp-cantidad').value) || 0;
                const empleadoId = r.querySelector('.exp-empleado').value;
                const empleadoNombre = r.querySelector('.exp-empleado').options[r.querySelector('.exp-empleado').selectedIndex]?.text || '';
                const justificacion = r.querySelector('.exp-justificacion').value;

                if (monto <= 0) {
                    showToast('Error', `El monto en el movimiento #${i + 1} debe ser mayor a 0.`, 'danger');
                    return;
                }
                if (tipo === 'Gasto' && (!imgBase64 || !imgBase64.startsWith('data:'))) {
                    showToast('Error', `Debe adjuntar una foto de la factura para el gasto #${i + 1}.`, 'danger');
                    return;
                }
                if (tipo === 'Diesel' && cantidad <= 0) {
                    showToast('Error', `Debe ingresar la cantidad de Diesel para el movimiento #${i + 1}.`, 'danger');
                    return;
                }
                if (tipo === 'Préstamo' && (!empleadoId || !justificacion.trim())) {
                    showToast('Error', `Debe seleccionar un empleado y escribir una justificación para el préstamo #${i + 1}.`, 'danger');
                    return;
                }

                gastos.push({
                    tipo: tipo,
                    monto: monto,
                    fotoBase64: imgBase64 || null,
                    cantidad: tipo === 'Diesel' ? cantidad : null,
                    empleadoId: tipo === 'Préstamo' ? parseInt(empleadoId) : null,
                    empleadoNombre: tipo === 'Préstamo' ? empleadoNombre : null,
                    justificacion: tipo === 'Préstamo' ? justificacion.trim() : null
                });
            }

            const res = await window.AttendanceDB.submitBusRecord(currentUser.id, turno, ingreso, null, null, null, gastos);
            if (res.success) {
                showToast('Registro Guardado', 'El registro de turno se ha enviado con éxito.', 'success');
                closeBusesModal();
                setupUserView();
            } else {
                showToast('Error', res.message, 'danger');
            }
        });
    }

    function renderUserStatsAndTable() {
        const usrAttendanceThead = document.getElementById('usr-attendance-thead');
        const usrPieceworkThead = document.getElementById('usr-piecework-thead');
        const usrBusesThead = document.getElementById('usr-buses-thead');
        const usrAttendanceTable = document.getElementById('usr-attendance-table');
        const usrPieceworkTable = document.getElementById('usr-piecework-table');
        const usrBusesTable = document.getElementById('usr-buses-table');

        let totalNet = 0;
        let totalPenalties = 0;
        const isBuses = currentUser.tipoPago === 'Pago Fijo Diario';

        if (isBuses) {
            if (usrAttendanceThead) usrAttendanceThead.classList.add('hidden');
            if (usrPieceworkThead) usrPieceworkThead.classList.add('hidden');
            if (usrBusesThead) usrBusesThead.classList.remove('hidden');
            if (usrAttendanceTable) usrAttendanceTable.classList.add('hidden');
            if (usrPieceworkTable) usrPieceworkTable.classList.add('hidden');
            if (usrBusesTable) usrBusesTable.classList.remove('hidden');

            const busRecords = window.AttendanceDB.getBusRecordsByUser(currentUser.id);
            if (busRecords.length === 0) {
                usrBusesTable.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align:center;">No hay reportes de efectivo.</td></tr>`;
            } else {
                const fragmentBuses = document.createDocumentFragment();
                busRecords.forEach(b => {
                    let statusClass = b.aprobado === 1 ? 'approved' : 'pending';
                    let statusText = b.aprobado === 1 ? 'Aprobado' : 'Pendiente';
                    let hasReceipt = b.fotoFacturaUrl ? `<br><a href="${b.fotoFacturaUrl}" target="_blank" style="font-size:0.8rem;">Ver Recibo</a>` : '';
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${formatDateDDMMYYYY(b.fecha)}</td>
                        <td>${b.turno}</td>
                        <td>Q${b.ingresoDinero.toFixed(2)}</td>
                        <td>${b.tipoGasto}</td>
                        <td>Q${b.montoGasto.toFixed(2)}${hasReceipt}</td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    `;
                    fragmentBuses.appendChild(tr);
                });
                usrBusesTable.innerHTML = '';
                usrBusesTable.appendChild(fragmentBuses);
            }

            busRecords.forEach(b => {
                if (b.aprobado === 1 && !b.archivado) {
                    totalNet += (b.ingresoDinero - b.montoGasto);
                }
            });

            if (usrStatNet) usrStatNet.textContent = `Q${totalNet.toFixed(2)}`;
            if (usrStatPenalties) usrStatPenalties.textContent = `Q0.00`;

        } else if (currentUser.tipoPago === 'Destajo' || currentUser.tipoPago === 'Por Trato') {
            if (usrAttendanceThead) usrAttendanceThead.classList.add('hidden');
            if (usrPieceworkThead) usrPieceworkThead.classList.remove('hidden');
            if (usrBusesThead) usrBusesThead.classList.add('hidden');
            if (usrAttendanceTable) usrAttendanceTable.classList.add('hidden');
            if (usrPieceworkTable) usrPieceworkTable.classList.remove('hidden');
            if (usrBusesTable) usrBusesTable.classList.add('hidden');

            const history = window.AttendanceDB.getPieceworkByUser(currentUser.id);
            usrPieceworkTable.innerHTML = '';

            if (history.length === 0) {
                usrPieceworkTable.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-muted" style="text-align: center; padding: 30px;">
                            No has entregado trabajos aún.
                        </td>
                    </tr>
                `;
            } else {
                const loggedInUserStr = sessionStorage.getItem('dch_current_user');
                const loggedInUser = loggedInUserStr ? JSON.parse(loggedInUserStr) : null;
                const isLoggedAdmin = loggedInUser && ((loggedInUser.rol === 'admin' || loggedInUser.rol === 'superadmin') || loggedInUser.rol === 'lider');
                const fragmentPiecework = document.createDocumentFragment();

                history.forEach(rec => {
                    if (rec.estado === 'Confirmado' && !rec.archivado) totalNet += rec.total;

                    let statusBadge = '';
                    if (rec.estado === 'Confirmado') {
                        statusBadge = '<span class="table-badge approved">Confirmado</span>';
                    } else {
                        statusBadge = isLoggedAdmin 
                            ? `<button class="btn-table-action approve approve-piecework-btn" data-id="${rec.id}" style="padding: 2px 6px; font-size: 0.7rem; width: auto;">Autorizar</button>` 
                            : '<span class="table-badge pending">Pendiente</span>';
                    }

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${formatDateDDMMYYYY(rec.fecha)}</strong></td>
                        <td>${rec.trabajo}</td>
                        <td>Q${rec.precio.toFixed(2)}</td>
                        <td>${rec.cantidad}</td>
                        <td><strong>Q${rec.total.toFixed(2)}</strong></td>
                        <td>${statusBadge}</td>
                    `;
                    fragmentPiecework.appendChild(tr);
                });
                usrPieceworkTable.appendChild(fragmentPiecework);

                if (isLoggedAdmin) {
                    usrPieceworkTable.querySelectorAll('.approve-piecework-btn').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            const id = e.target.getAttribute('data-id');
                            const price = prompt('Ingrese el precio unitario para autorizar este trabajo:', '');
                            if (price !== null && price.trim() !== '') {
                                const parsedPrice = parseFloat(price);
                                if (!isNaN(parsedPrice) && parsedPrice > 0) {
                                    const confirmId = loggedInUser.id;
                                    const res = await window.AttendanceDB.approvePiecework(id, confirmId, parsedPrice);
                                    if (res.success) {
                                        showToast('Autorizado', 'El trabajo ha sido autorizado con el nuevo precio.', 'success');
                                        window.AttendanceDB.fetchInitialData().then(() => {
                                            if (typeof setupAdminView === 'function') setupAdminView();
                                            if (typeof updateHistoryUI === 'function') updateHistoryUI();
                                        });
                                    } else {
                                        showToast('Error', res.message, 'danger');
                                    }
                                } else {
                                    alert('Precio inválido.');
                                }
                            }
                        });
                    });
                }
            }
        } else {
            if (usrAttendanceThead) usrAttendanceThead.classList.remove('hidden');
            if (usrPieceworkThead) usrPieceworkThead.classList.add('hidden');
            if (usrBusesThead) usrBusesThead.classList.add('hidden');
            if (usrAttendanceTable) usrAttendanceTable.classList.remove('hidden');
            if (usrPieceworkTable) usrPieceworkTable.classList.add('hidden');
            if (usrBusesTable) usrBusesTable.classList.add('hidden');

            const history = window.AttendanceDB.getAttendanceByUser(currentUser.id);
            let totalHours = 0;
            let totalGross = 0;

            usrAttendanceTable.innerHTML = '';

            if (history.length === 0) {
                usrAttendanceTable.innerHTML = `
                    <tr>
                        <td colspan="10" class="text-muted" style="text-align: center; padding: 30px;">
                            No posees registros de asistencia creados en este período.
                        </td>
                    </tr>
                `;
            } else {
                const fragmentAttendance = document.createDocumentFragment();
                history.forEach(rec => {
                    // Sumar solo si el marcaje ya se completó y no está archivado en un corte
                    if (rec.horaSalida && !rec.archivado) {
                        totalHours += rec.horasTrabajadas;
                        totalGross += rec.montoBruto;
                        totalPenalties += rec.descuento;
                        totalNet += rec.montoNeto;
                    }

                    const outTimeText = rec.horaSalida ? rec.horaSalida : '<span class="text-warning">En curso...</span>';
                    const horasDiurnasText = rec.horaSalida ? formatDecimalHours(rec.horasDiurnas) : '-';
                    const horasNocturnasText = rec.horaSalida ? formatDecimalHours(rec.horasNocturnas) : '-';
                    const brutoText = rec.horaSalida ? `Q${rec.montoBruto.toFixed(2)}` : '-';
                    const bonoText = rec.horaSalida ? (rec.bono > 0 ? `<span class="text-success">+Q${rec.bono.toFixed(2)}</span>` : 'Q0.00') : '-';
                    const descuentoText = rec.horaSalida ? (rec.descuento > 0 ? `<span class="text-danger">-Q${rec.descuento.toFixed(2)}</span>` : 'Q0.00') : '-';
                    const netoText = rec.horaSalida ? `Q${rec.montoNeto.toFixed(2)}` : '-';

                    const statusBadge = rec.aprobado
                        ? '<span class="table-badge approved">Aprobado</span>'
                        : '<span class="table-badge pending">Pendiente</span>';

                    const inJustification = rec.justificacionLugarEntrada
                        ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:4px; line-height:1.2;">
                        Lugar: ${rec.justificacionLugarEntrada}<br>Motivo: ${rec.justificacionMotivoEntrada || ''}
                       </div>`
                        : '';
                    const outJustification = (rec.horaSalida && rec.justificacionLugarSalida)
                        ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:4px; line-height:1.2;">
                        Lugar: ${rec.justificacionLugarSalida}<br>Motivo: ${rec.justificacionMotivoSalida || ''}
                       </div>`
                        : '';

                    const justificacionHtml = `
                        <div style="font-size:0.75rem; color:var(--text-color); max-width: 150px; line-height: 1.2;">
                            <span style="color:var(--primary-color);">In:</span> ${rec.justificacionMotivoEntrada || rec.justificacionLugarEntrada || '-'}<br>
                            ${rec.horaSalida ? `<span style="color:var(--danger);">Out:</span> ${rec.justificacionMotivoSalida || rec.justificacionLugarSalida || '-'}` : ''}
                        </div>
                    `;

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                    <td><strong>${formatDateDDMMYYYY(rec.fecha)}</strong></td>
                    <td>${rec.horaEntrada}</td>
                    <td>${outTimeText}</td>
                    <td>${horasDiurnasText}</td>
                    <td>${horasNocturnasText}</td>
                    <td>${justificacionHtml}</td>
                    <td>${brutoText}</td>
                    <td>${bonoText}</td>
                    <td>${descuentoText}</td>
                    <td><strong>${netoText}</strong></td>
                    <td>${statusBadge}</td>
                `;
                    fragmentAttendance.appendChild(tr);
                });
                usrAttendanceTable.appendChild(fragmentAttendance);
            }
        }

        // Renderizar estadísticas en widgets
        usrStatNet.textContent = `Q${totalNet.toFixed(2)}`;
        usrStatPenalties.textContent = `Q${totalPenalties.toFixed(2)}`;

        // Préstamo del Colaborador
        const usrStatLoanSaldo = document.getElementById('usr-stat-loan-saldo');
        const usrStatLoanDetails = document.getElementById('usr-stat-loan-details');
        if (usrStatLoanSaldo && usrStatLoanDetails) {
            const saldo = currentUser.préstamosaldo || 0;
            const cuota = currentUser.préstamoCuota || 0;
            const total = currentUser.préstamoTotal || 0;
            const estado = currentUser.préstamoEstadoCuota || 'Ninguno';

            usrStatLoanSaldo.textContent = `Q${saldo.toFixed(2)}`;
            usrStatLoanDetails.innerHTML = `Total: Q${total.toFixed(2)} | Cuota: Q${cuota.toFixed(2)}<br>Estado Cuota: <strong>${estado}</strong>`;
        }
    }

    // --- NUEVO MÓDULO DE DETALLES DE DESCUENTOS (USUARIO) ---
    btnViewPenaltiesDetail.addEventListener('click', () => {
        // Ocultar vista principal de usuario y mostrar descuentos
        viewUser.classList.add('hidden');
        viewUserPenalties.classList.remove('hidden');
        viewTitle.textContent = 'Detalles de Descuentos';
        viewSubtitle.textContent = 'Historial y motivos detallados de los descuentos aplicados a tus marcajes.';

        loadUserPenaltiesView();
    });

    btnBackToUser.addEventListener('click', () => {
        // En lugar de forzar la vista de asistencia (a la cual podrían no tener acceso),
        // regresamos a la pantalla por defecto según sus permisos limpiando el hash.
        window.location.hash = '';
    });

    function loadUserPenaltiesView() {
        const penalties = window.AttendanceDB.getPenalizationsByUser(currentUser.id);

        // Limpiar panel izquierdo (detalle)
        penaltyDetailContent.innerHTML = `
            <div class="centered-content placeholder-inner text-muted">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <p class="margin-top">Selecciona una descuento de la lista de la derecha para ver los detalles.</p>
            </div>
        `;

        // Renderizar lista derecha (motivos)
        userPenaltyList.innerHTML = '';

        if (penalties.length === 0) {
            userPenaltyList.innerHTML = `
                <li class="text-muted" style="text-align: center; padding: 20px; border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
                    No tienes descuentos registradas.
                </li>
            `;
            return;
        }

        penalties.forEach(pen => {
            const li = document.createElement('li');
            li.className = 'penalty-list-item';
            li.setAttribute('data-id', pen.id);
            li.innerHTML = `
                <div class="penalty-list-info">
                    <span class="penalty-list-title">${pen.motivo}</span>
                    <span class="penalty-list-date">${formatDateDDMMYYYY(pen.fecha)}</span>
                </div>
                <span class="penalty-list-value">-Q${pen.monto.toFixed(2)}</span>
            `;
            userPenaltyList.appendChild(li);

            // Click listener para cargar detalles en panel izquierdo
            li.addEventListener('click', () => {
                // Quitar clase seleccionada a otros
                document.querySelectorAll('.penalty-list-item').forEach(item => {
                    item.classList.remove('selected');
                });
                // Seleccionar actual
                li.classList.add('selected');

                // Mostrar detalles en panel izquierdo
                const adminUser = window.AttendanceDB.getUserById(pen.creadoPor);
                const adminName = adminUser ? adminUser.nombre : 'Supervisor';

                const fotoHtml = pen.fotoUrl
                    ? `<div class="penalty-detail-reason-box" style="margin-top: 15px;">
                        <h4>Comprobante Adjunto</h4>
                        <img src="${pen.fotoUrl}" alt="Comprobante" style="max-width:100%; border-radius:var(--radius-md); box-shadow:var(--shadow-sm); cursor:pointer;" onclick="window.open('${pen.fotoUrl}', '_blank')">
                       </div>`
                    : '';

                penaltyDetailContent.innerHTML = `
                    <div class="penalty-detail-content-active">
                        <div class="penalty-detail-row">
                            <span>ID de Descuento</span>
                            <span>#${pen.id}</span>
                        </div>
                        <div class="penalty-detail-row">
                            <span>Fecha de Aplicación</span>
                            <span>${formatDateDDMMYYYY(pen.fecha)}</span>
                        </div>
                        <div class="penalty-detail-row">
                            <span>Monto Descontado</span>
                            <span class="text-danger">-Q${pen.monto.toFixed(2)}</span>
                        </div>
                        <div class="penalty-detail-row">
                            <span>Aplicado Por</span>
                            <span>${adminName}</span>
                        </div>
                        
                        <div class="penalty-detail-reason-box">
                            <h4>Motivo del Descuento</h4>
                            <p>${pen.motivo}</p>
                        </div>
                        ${fotoHtml}
                    </div>
                `;
            });
        });
    }

