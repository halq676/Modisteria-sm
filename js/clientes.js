import { auth, db } from './firebase-config.js';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Referencias a elementos del DOM
const clienteForm = document.getElementById('clienteForm');
const nombreClienteInput = document.getElementById('nombreCliente');
const apellidoClienteInput = document.getElementById('apellidoCliente');
const telefonoClienteInput = document.getElementById('telefonoCliente');
const emailClienteInput = document.getElementById('emailCliente');
const direccionClienteInput = document.getElementById('direccionCliente');
const clienteFeedbackDiv = document.getElementById('clienteFeedback');
const tablaClientesBody = document.querySelector('#tablaClientes tbody');
const buscarClienteInput = document.getElementById('buscarCliente');
const noClientesMsg = document.getElementById('noClientes');

let currentUserId = null;

// Verificar autenticación
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        console.log("Usuario autenticado. UID:", currentUserId); // DEBUG
        cargarClientes();
    } else {
        console.log("Usuario no autenticado. Redirigiendo a index.html"); // DEBUG
        window.location.href = "index.html";
    }
});

// Manejar el envío del formulario (guardar o actualizar cliente)
clienteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const selectedClientId = clienteForm.dataset.editingId;
    const nombre = nombreClienteInput.value;
    const apellido = apellidoClienteInput.value;
    const telefono = telefonoClienteInput.value;
    const email = emailClienteInput.value;
    const direccion = direccionClienteInput.value; // Obtener valor de la dirección

    // Basic validation
    if (!nombre || !apellido) {
        showFeedback('Nombre y Apellido son campos obligatorios.', 'error');
        return;
    }

    try {
        // Asegúrate de que currentUserId esté disponible
        if (!currentUserId) {
            showFeedback('Error: Usuario no autenticado. Por favor, inicia sesión.', 'error');
            console.error('currentUserId es null al intentar guardar cliente. Operación abortada.'); // DEBUG
            return;
        }

        const clienteData = {
            userId: currentUserId, // Asociar el cliente al usuario actual
            nombre: nombre,
            apellido: apellido,
            telefono: telefono,
            email: email,
            direccion: direccion
        };

        console.log("Datos del cliente a guardar:", clienteData); // DEBUG

        if (selectedClientId) {
            // Actualizar cliente existente
            console.log("Actualizando cliente con ID:", selectedClientId); // DEBUG
            await updateDoc(doc(db, "clientes", selectedClientId), clienteData);
            showFeedback('Cliente actualizado exitosamente.', 'success');
            clienteForm.dataset.editingId = ''; // Limpiar ID de edición
            document.querySelector('#form-clientes h2').textContent = 'Registrar Nuevo Cliente';
        } else {
            // Guardar nuevo cliente
            console.log("Creando nuevo cliente..."); // DEBUG
            await addDoc(collection(db, "clientes"), clienteData);
            mostrarMensajeExito('Cliente registrado exitosamente.', 'success');
        }

        clienteForm.reset(); // Limpiar el formulario
        cargarClientes(); // Recargar la tabla de clientes
    } catch (error) {
        console.error("Error detallado al guardar/actualizar cliente: ", error); // DEBUG: Mostrar error completo
        showFeedback("Error al guardar/actualizar cliente: " + error.message, 'error');
    }
});

// Función para cargar y mostrar clientes
async function cargarClientes() {
    tablaClientesBody.innerHTML = '';
    noClientesMsg.style.display = 'none';

    try {
        if (!currentUserId) {
            console.warn('currentUserId es null al cargar clientes. Saltando la carga.'); // DEBUG
            noClientesMsg.style.display = 'block';
            noClientesMsg.textContent = 'No se pueden cargar clientes. Usuario no autenticado.';
            return;
        }

        console.log("Cargando clientes para UID:", currentUserId); // DEBUG
        const q = query(collection(db, "clientes"), where("userId", "==", currentUserId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            noClientesMsg.style.display = 'block';
            noClientesMsg.textContent = 'No hay clientes registrados.';
            console.log("No hay clientes registrados para este usuario."); // DEBUG
            return;
        }

        querySnapshot.forEach((docCliente) => {
            const cliente = docCliente.data();
            console.log("Cliente cargado:", cliente); // DEBUG: Ver cada cliente
            const row = tablaClientesBody.insertRow();
            row.setAttribute('data-id', docCliente.id);

            row.insertCell().textContent = `${cliente.nombre} ${cliente.apellido}`;
            row.insertCell().textContent = cliente.telefono || 'N/A';
            row.insertCell().textContent = cliente.email || 'N/A';
            row.insertCell().textContent = cliente.direccion || 'N/A';

            const accionesCell = row.insertCell();
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Editar';
            editBtn.classList.add('btn', 'btn-small');
            editBtn.addEventListener('click', () => editarCliente(docCliente.id, cliente));
            accionesCell.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Eliminar';
            deleteBtn.classList.add('btn', 'btn-small', 'btn-danger');
            deleteBtn.addEventListener('click', () => eliminarCliente(docCliente.id));
            accionesCell.appendChild(deleteBtn);
        });
    } catch (error) {
        console.error("Error al cargar clientes: ", error); // DEBUG: Mostrar error completo
        showFeedback("Error al cargar clientes: " + error.message, 'error');
    }
}

// Función para editar cliente
async function editarCliente(id, cliente) {
    console.log("Editando cliente:", id, cliente); // DEBUG
    clienteForm.dataset.editingId = id;
    document.querySelector('#form-clientes h2').textContent = 'Editar Cliente';

    nombreClienteInput.value = cliente.nombre;
    apellidoClienteInput.value = cliente.apellido;
    telefonoClienteInput.value = cliente.telefono;
    emailClienteInput.value = cliente.email;
    direccionClienteInput.value = cliente.direccion;
}

// Función para eliminar cliente
async function eliminarCliente(id) {
    if (confirm("¿Estás seguro de que quieres eliminar este cliente?")) {
        try {
            console.log("Eliminando cliente con ID:", id); // DEBUG
            await deleteDoc(doc(db, "clientes", id));
            showFeedback('Cliente eliminado exitosamente.', 'success');
            cargarClientes();
        } catch (error) {
            console.error("Error al eliminar cliente: ", error); // DEBUG
            showFeedback("Error al eliminar cliente: " + error.message, 'error');
        }
    }
}

// Función de búsqueda de clientes
buscarClienteInput.addEventListener('input', async () => {
    const searchTerm = buscarClienteInput.value.toLowerCase();
    tablaClientesBody.innerHTML = '';
    noClientesMsg.style.display = 'none';

    try {
        if (!currentUserId) {
            console.warn('currentUserId es null al buscar clientes. Saltando la búsqueda.'); // DEBUG
            return;
        }

        console.log("Buscando clientes para UID:", currentUserId, "con término:", searchTerm); // DEBUG
        const q = query(collection(db, "clientes"), where("userId", "==", currentUserId));
        const querySnapshot = await getDocs(q);

        let foundClients = false;

        querySnapshot.forEach((docCliente) => {
            const cliente = docCliente.data();
            const searchString = `${cliente.nombre} ${cliente.apellido} ${cliente.telefono} ${cliente.email} ${cliente.direccion || ''}`.toLowerCase();

            if (searchString.includes(searchTerm)) {
                foundClients = true;
                const row = tablaClientesBody.insertRow();
                row.setAttribute('data-id', docCliente.id);

                row.insertCell().textContent = `${cliente.nombre} ${cliente.apellido}`;
                row.insertCell().textContent = cliente.telefono || 'N/A';
                row.insertCell().textContent = cliente.email || 'N/A';
                row.insertCell().textContent = cliente.direccion || 'N/A';

                const accionesCell = row.insertCell();
                const editBtn = document.createElement('button');
                editBtn.textContent = 'Editar';
                editBtn.classList.add('btn', 'btn-small');
                editBtn.addEventListener('click', () => editarCliente(docCliente.id, cliente));
                accionesCell.appendChild(editBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Eliminar';
                deleteBtn.classList.add('btn', 'btn-small', 'btn-danger');
                deleteBtn.addEventListener('click', () => eliminarCliente(docCliente.id));
                accionesCell.appendChild(deleteBtn);
            }
        });

        if (!foundClients && searchTerm !== '') {
            noClientesMsg.style.display = 'block';
            noClientesMsg.textContent = 'No se encontraron clientes que coincidan con la búsqueda.';
        } else if (!foundClients && searchTerm === '') {
            if (querySnapshot.empty) {
                noClientesMsg.style.display = 'block';
                noClientesMsg.textContent = 'No hay clientes registrados.';
            } else {
                cargarClientes();
            }
        }

    } catch (error) {
        console.error("Error al buscar clientes: ", error); // DEBUG
        showFeedback("Error al buscar clientes.", 'error');
    }
});


// Función para mostrar feedback al usuario
function showFeedback(message, type) {
    clienteFeedbackDiv.textContent = message;
    clienteFeedbackDiv.className = `feedback ${type}`;
    setTimeout(() => {
        clienteFeedbackDiv.textContent = '';
        clienteFeedbackDiv.className = 'feedback';
    }, 5000);
}
function mostrarMensajeExito() {
    const mensaje = document.getElementById('clienteMensajeExito');
    mensaje.style.display = 'block';
    setTimeout(() => {
        mensaje.style.display = 'none';
    }, 3000);
}
