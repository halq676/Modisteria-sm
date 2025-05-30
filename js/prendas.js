import { auth, db } from './firebase-config.js';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Referencias a elementos del DOM
const prendaForm = document.getElementById('prendaForm');
const clientePrendaSelect = document.getElementById('clientePrenda');
const modistaAsignadaSelect = document.getElementById('modistaAsignada');
const tipoPrendaInput = document.getElementById('tipoPrenda');
const descripcionPrendaInput = document.getElementById('descripcionPrenda');
const medidasPrendaInput = document.getElementById('medidasPrenda');
const costoPrendaInput = document.getElementById('costoPrenda');
const cantidadPrendaInput = document.getElementById('cantidadPrenda');
const fechaEncargoInput = document.getElementById('fechaEncargo');
const fechaEntregaEstimadaInput = document.getElementById('fechaEntregaEstimada');
const estadoPrendaSelect = document.getElementById('estadoPrenda');
const prendaFeedbackDiv = document.getElementById('prendaFeedback');
const tablaPrendasBody = document.querySelector('#tablaPrendas tbody');
const buscarPrendaInput = document.getElementById('buscarPrenda');
const noPrendasMsg = document.getElementById('noPrendas');

let currentUserId = null;

// --- Verificación de Autenticación y Carga Inicial ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        console.log("Prendas: Usuario autenticado. UID:", currentUserId); // DEBUG
        cargarClientes();
        cargarModistas();
        cargarPrendas();
    } else {
        console.log("Prendas: Usuario no autenticado. Redirigiendo a index.html"); // DEBUG
        window.location.href = "index.html"; // Redirigir si no está autenticado
    }
});

// --- Funciones de Carga de Datos ---

/**
 * Carga los clientes desde Firestore y los llena en el select 'clientePrendaSelect'.
 */
async function cargarClientes() {
    clientePrendaSelect.innerHTML = '<option value="">Selecciona un cliente</option>';
    try {
        if (!currentUserId) {
            console.warn("Prendas: currentUserId es null al cargar clientes. Saltando la carga."); // DEBUG
            return;
        }
        console.log("Prendas: Cargando clientes para UID:", currentUserId); // DEBUG
        const q = query(collection(db, "clientes"), where("userId", "==", currentUserId));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            showFeedback('No hay clientes registrados. Añade clientes.', 'info');
            console.log("Prendas: No hay clientes registrados para este usuario."); // DEBUG
            return;
        }
        querySnapshot.forEach((docCliente) => {
            const cliente = docCliente.data();
            const option = document.createElement('option');
            option.value = docCliente.id;
            option.textContent = `${cliente.nombre} ${cliente.apellido}`;
            clientePrendaSelect.appendChild(option);
        });
        console.log("Prendas: Clientes cargados exitosamente."); // DEBUG
    } catch (error) {
        console.error("Prendas: Error al cargar clientes: ", error); // DEBUG
        showFeedback("Error al cargar clientes.", 'error');
    }
}

/**
 * Carga las modistas desde Firestore y las llena en el select 'modistaAsignadaSelect'.
 */
async function cargarModistas() {
    modistaAsignadaSelect.innerHTML = '<option value="">Selecciona una modista</option>';
    try {
        console.log("Prendas: Cargando modistas..."); // DEBUG
        const q = query(collection(db, "modistas")); // Las modistas no están filtradas por userId aquí
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            showFeedback('No hay modistas registradas. Añade modistas en Firestore.', 'info');
            console.log("Prendas: No hay modistas registradas."); // DEBUG
            return;
        }
        querySnapshot.forEach((docModista) => {
            const modista = docModista.data();
            const option = document.createElement('option');
            option.value = docModista.id;
            option.textContent = modista.Nombre || 'Nombre Desconocido';
            modistaAsignadaSelect.appendChild(option);
        });
        console.log("Prendas: Modistas cargadas exitosamente."); // DEBUG
    } catch (error) {
        console.error("Prendas: Error al cargar modistas: ", error); // DEBUG
        showFeedback("Error al cargar modistas.", 'error');
    }
}

/**
 * Carga las prendas desde Firestore y las muestra en la tabla.
 */
async function cargarPrendas() {
    tablaPrendasBody.innerHTML = '';
    noPrendasMsg.style.display = 'none';

    try {
        if (!currentUserId) {
            console.warn("Prendas: currentUserId es null al cargar prendas. Saltando la carga."); // DEBUG
            noPrendasMsg.style.display = 'block';
            noPrendasMsg.textContent = 'No se pueden cargar prendas. Usuario no autenticado.';
            return;
        }
        console.log("Prendas: Cargando prendas para UID:", currentUserId); // DEBUG
        const q = query(collection(db, "prendas"), where("userId", "==", currentUserId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            noPrendasMsg.style.display = 'block';
            noPrendasMsg.textContent = 'No hay prendas registradas.';
            console.log("Prendas: No hay prendas registradas para este usuario."); // DEBUG
            return;
        }

        querySnapshot.forEach((docPrenda) => {
            const prenda = docPrenda.data();
            console.log("Prendas: Prenda cargada:", prenda); // DEBUG: Ver cada prenda
            const row = tablaPrendasBody.insertRow();
            row.setAttribute('data-id', docPrenda.id);

            const clienteNombre = prenda.clienteNombre || 'Cliente Desconocido';
            const modistaNombre = prenda.modistaNombre || 'Modista Desconocida';

            row.insertCell().textContent = clienteNombre;
            row.insertCell().textContent = modistaNombre;
            row.insertCell().textContent = prenda.tipoPrenda;
            row.insertCell().textContent = `$${prenda.costoPrenda ? prenda.costoPrenda.toFixed(2) : '0.00'}`;
            row.insertCell().textContent = prenda.cantidadPrenda || '0';
            row.insertCell().textContent = prenda.estado;
            row.insertCell().textContent = prenda.fechaEntregaEstimada || 'N/A';

            const accionesCell = row.insertCell();
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Editar';
            editBtn.classList.add('btn', 'btn-small');
            editBtn.addEventListener('click', () => editarPrenda(docPrenda.id, prenda));
            accionesCell.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Eliminar';
            deleteBtn.classList.add('btn', 'btn-small', 'btn-danger');
            deleteBtn.addEventListener('click', () => eliminarPrenda(docPrenda.id));
            accionesCell.appendChild(deleteBtn);
        });
        console.log("Prendas: Prendas cargadas y mostradas exitosamente."); // DEBUG
    } catch (error) {
        console.error("Prendas: Error al cargar prendas: ", error); // DEBUG
        showFeedback("Error al cargar prendas.", 'error');
    }
}

// --- Event Listeners y Funciones de CRUD ---

// Manejar el envío del formulario (guardar o actualizar prenda)
prendaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Prendas: Intentando guardar/actualizar prenda..."); // DEBUG

    const selectedPrendaId = prendaForm.dataset.editingId;
    const clienteId = clientePrendaSelect.value;
    const modistaId = modistaAsignadaSelect.value;
    const tipoPrenda = tipoPrendaInput.value;
    const descripcionPrenda = descripcionPrendaInput.value;
    const medidasPrenda = medidasPrendaInput.value;
    const costoPrenda = parseFloat(costoPrendaInput.value);
    const cantidadPrenda = parseInt(cantidadPrendaInput.value);
    const fechaEncargo = fechaEncargoInput.value;
    const fechaEntregaEstimada = fechaEntregaEstimadaInput.value;
    const estadoPrenda = estadoPrendaSelect.value;

    console.log("Prendas: Valores del formulario - Cliente ID:", clienteId, "Modista ID:", modistaId); // DEBUG
    console.log("Prendas: Tipo:", tipoPrenda, "Costo:", costoPrenda, "Cantidad:", cantidadPrenda); // DEBUG

    if (!clienteId) {
        showFeedback('Por favor, selecciona un cliente.', 'error');
        console.error("Prendas: Cliente no seleccionado."); // DEBUG
        return;
    }
    if (!modistaId) {
        showFeedback('Por favor, selecciona una modista.', 'error');
        console.error("Prendas: Modista no seleccionada."); // DEBUG
        return;
    }

    try {
        let clienteNombre = '';
        if (clienteId) {
            const clienteRef = doc(db, "clientes", clienteId);
            const clienteSnap = await getDoc(clienteRef);
            if (clienteSnap.exists()) {
                const clienteData = clienteSnap.data();
                clienteNombre = `${clienteData.nombre} ${clienteData.apellido}`;
                console.log("Prendas: Nombre de cliente obtenido:", clienteNombre); // DEBUG
            } else {
                console.warn(`Prendas: Cliente con ID ${clienteId} no encontrado. Se usará 'Cliente Desconocido'.`); // DEBUG
                clienteNombre = 'Cliente Desconocido';
            }
        }

        let modistaNombre = '';
        if (modistaId) {
            const modistaRef = doc(db, "modistas", modistaId);
            const modistaSnap = await getDoc(modistaRef);
            if (modistaSnap.exists()) {
                const modistaData = modistaSnap.data();
                modistaNombre = modistaData.Nombre;
                console.log("Prendas: Nombre de modista obtenido:", modistaNombre); // DEBUG
            } else {
                console.warn(`Prendas: Modista con ID ${modistaId} no encontrada. Se usará 'Modista Desconocida'.`); // DEBUG
                modistaNombre = 'Modista Desconocida';
            }
        }

        const prendaData = {
            userId: currentUserId,
            clienteId: clienteId,
            clienteNombre: clienteNombre,
            modistaId: modistaId,
            modistaNombre: modistaNombre,
            tipoPrenda: tipoPrenda,
            descripcionPrenda: descripcionPrenda,
            medidasPrenda: medidasPrenda,
            costoPrenda: costoPrenda,
            cantidadPrenda: cantidadPrenda,
            fechaEncargo: fechaEncargo,
            fechaEntregaEstimada: fechaEntregaEstimada,
            estado: estadoPrenda
        };

        console.log("Prendas: Objeto prendaData listo:", prendaData); // DEBUG

        if (!currentUserId) {
            showFeedback('Error: Usuario no autenticado. Por favor, inicia sesión.', 'error');
            console.error('Prendas: currentUserId es null al intentar guardar prenda. Operación abortada.'); // DEBUG
            return;
        }

        if (selectedPrendaId) {
            console.log("Prendas: Iniciando actualización de prenda con ID:", selectedPrendaId); // DEBUG
            await updateDoc(doc(db, "prendas", selectedPrendaId), prendaData);
            mostrarMensajePrendaExito('Prenda actualizada exitosamente.', 'success');
            console.log("Prendas: Prenda actualizada en Firestore."); // DEBUG
            prendaForm.dataset.editingId = '';
            document.querySelector('#form-prendas h2').textContent = 'Registrar Nueva Prenda';
        } else {
            console.log("Prendas: Iniciando adición de nueva prenda..."); // DEBUG
            await addDoc(collection(db, "prendas"), prendaData);
            mostrarMensajePrendaExito('Prenda registrada exitosamente.', 'success');
            console.log("Prendas: Nueva prenda añadida a Firestore."); // DEBUG
        }

        prendaForm.reset();
        cargarPrendas();
    } catch (error) {
        console.error("Prendas: Error detallado al guardar/actualizar prenda: ", error); // DEBUG: Mostrar error completo
        showFeedback("Error al guardar/actualizar prenda: " + error.message, 'error');
    }
});

// Manejar la búsqueda en la tabla de prendas
buscarPrendaInput.addEventListener('input', async () => {
    const searchTerm = buscarPrendaInput.value.toLowerCase();
    tablaPrendasBody.innerHTML = '';
    noPrendasMsg.style.display = 'none';

    try {
        if (!currentUserId) {
            console.warn('Prendas: currentUserId es null al buscar prendas. Saltando la búsqueda.'); // DEBUG
            return;
        }
        console.log("Prendas: Buscando prendas para UID:", currentUserId, "con término:", searchTerm); // DEBUG
        const q = query(collection(db, "prendas"), where("userId", "==", currentUserId));
        const querySnapshot = await getDocs(q);

        let foundPrendas = false;

        querySnapshot.forEach((docPrenda) => {
            const prenda = docPrenda.data();
            const clienteNombre = prenda.clienteNombre || 'Cliente Desconocido';
            const modistaNombre = prenda.modistaNombre || 'Modista Desconocida';
            const searchString = `${prenda.tipoPrenda} ${prenda.descripcionPrenda} ${clienteNombre} ${modistaNombre} ${prenda.estado}`.toLowerCase();

            if (searchString.includes(searchTerm)) {
                foundPrendas = true;
                const row = tablaPrendasBody.insertRow();
                row.setAttribute('data-id', docPrenda.id);

                row.insertCell().textContent = clienteNombre;
                row.insertCell().textContent = modistaNombre;
                row.insertCell().textContent = prenda.tipoPrenda;
                row.insertCell().textContent = `$${prenda.costoPrenda ? prenda.costoPrenda.toFixed(2) : '0.00'}`;
                row.insertCell().textContent = prenda.cantidadPrenda || '0';
                row.insertCell().textContent = prenda.estado;
                row.insertCell().textContent = prenda.fechaEntregaEstimada || 'N/A';

                const accionesCell = row.insertCell();
                const editBtn = document.createElement('button');
                editBtn.textContent = 'Editar';
                editBtn.classList.add('btn', 'btn-small');
                editBtn.addEventListener('click', () => editarPrenda(docPrenda.id, prenda));
                accionesCell.appendChild(editBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Eliminar';
                deleteBtn.classList.add('btn', 'btn-small', 'btn-danger');
                deleteBtn.addEventListener('click', () => eliminarPrenda(docPrenda.id));
                accionesCell.appendChild(deleteBtn);
            }
        });

        if (!foundPrendas && searchTerm !== '') {
            noPrendasMsg.style.display = 'block';
            noPrendasMsg.textContent = 'No se encontraron prendas que coincidan con la búsqueda.';
        } else if (!foundPrendas && searchTerm === '') {
            if (querySnapshot.empty) {
                noPrendasMsg.style.display = 'block';
                noPrendasMsg.textContent = 'No hay prendas registradas.';
            } else {
                cargarPrendas();
            }
        }

    } catch (error) {
        console.error("Prendas: Error al buscar prendas: ", error); // DEBUG
        showFeedback("Error al buscar prendas.", 'error');
    }
});

/**
 * Rellena el formulario con los datos de una prenda para su edición.
 */
async function editarPrenda(id, prenda) {
    console.log("Prendas: Editando prenda:", id, prenda); // DEBUG
    prendaForm.dataset.editingId = id;
    document.querySelector('#form-prendas h2').textContent = 'Editar Prenda';

    clientePrendaSelect.value = prenda.clienteId;
    modistaAsignadaSelect.value = prenda.modistaId;
    tipoPrendaInput.value = prenda.tipoPrenda;
    descripcionPrendaInput.value = prenda.descripcionPrenda;
    medidasPrendaInput.value = prenda.medidasPrenda;
    costoPrendaInput.value = prenda.costoPrenda !== undefined ? prenda.costoPrenda : '';
    cantidadPrendaInput.value = prenda.cantidadPrenda !== undefined ? prenda.cantidadPrenda : '';
    fechaEncargoInput.value = prenda.fechaEncargo;
    fechaEntregaEstimadaInput.value = prenda.fechaEntregaEstimada;
    estadoPrendaSelect.value = prenda.estado;
}

/**
 * Elimina una prenda de Firestore.
 */
async function eliminarPrenda(id) {
    if (confirm("¿Estás seguro de que quieres eliminar esta prenda?")) {
        try {
            console.log("Prendas: Eliminando prenda con ID:", id); // DEBUG
            await deleteDoc(doc(db, "prendas", id));
            showFeedback('Prenda eliminada exitosamente.', 'success');
            cargarPrendas();
        } catch (error) {
            console.error("Prendas: Error al eliminar prenda: ", error); // DEBUG
            showFeedback("Error al eliminar prenda: " + error.message, 'error');
        }
    }
}

/**
 * Muestra mensajes de feedback al usuario.
 */
function showFeedback(message, type) {
    prendaFeedbackDiv.textContent = message;
    prendaFeedbackDiv.className = `feedback ${type}`;
    setTimeout(() => {
        prendaFeedbackDiv.textContent = '';
        prendaFeedbackDiv.className = 'feedback';
    }, 5000);
}
function mostrarMensajePrendaExito() {
    const mensaje = document.getElementById('prendaMensajeExito');
    mensaje.style.display = 'block';
    setTimeout(() => {
        mensaje.style.display = 'none';
    }, 3000);
}






