import { auth, db } from './firebase-config.js';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Elementos del DOM
const prendaFacturarSelect = document.getElementById('prendaFacturar');
const generarFacturaBtn = document.getElementById('generarFacturaBtn');
const guardarFacturaBtn = document.getElementById('guardarFacturaBtn');
const imprimirFacturaBtn = document.getElementById('imprimirFacturaBtn');
const facturaPreviewSection = document.getElementById('facturaPreview'); // Sección completa de la vista previa

// Elementos dentro de la vista previa de la factura (asegúrate de que estos IDs existan en tu factura.html)
const facturaFechaSpan = document.getElementById('facturaFecha');
const facturaNumeroSpan = document.getElementById('facturaNumero');
const clienteNombreFacturaSpan = document.getElementById('clienteNombreFactura');
const clienteTelefonoFacturaSpan = document.getElementById('clienteTelefonoFactura');
const clienteEmailFacturaSpan = document.getElementById('clienteEmailFactura');
const clienteDireccionFacturaSpan = document.getElementById('clienteDireccionFactura');
const tipoPrendaFacturaSpan = document.getElementById('tipoPrendaFactura');
const descripcionPrendaFacturaSpan = document.getElementById('descripcionPrendaFactura');
const cantidadPrendaFacturaSpan = document.getElementById('cantidadPrendaFactura');
const costoUnitarioFacturaSpan = document.getElementById('costoUnitarioFactura');
const totalPrendaFacturaSpan = document.getElementById('totalPrendaFactura');
const granTotalFacturaSpan = document.getElementById('granTotalFactura');
const modistaAsignadaFacturaSpan = document.getElementById('modistaAsignadaFactura');
const estadoPrendaFacturaSpan = document.getElementById('estadoPrendaFactura');
const prendaFacturaFeedback = document.getElementById('prendaFacturaFeedback'); // Para mensajes de feedback

let currentUserId = null;
let currentPrendaData = null; // Esta variable almacena los datos de la prenda seleccionada

// --- Verificación de Autenticación y Carga Inicial ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        console.log("Factura (DEBUG): Usuario autenticado. UID:", currentUserId);
        cargarPrendasParaFacturar(); // Carga las prendas disponibles para facturar
    } else {
        console.log("Factura (DEBUG): Usuario no autenticado. Redirigiendo a index.html");
        window.location.href = "index.html"; // Redirigir si no está autenticado
    }
});

// --- Funciones de Carga de Datos ---

/**
 * Carga las prendas disponibles desde Firestore y las llena en el select 'prendaFacturarSelect'.
 * Solo carga prendas con estado 'Terminada' o 'Entregada' que no hayan sido facturadas.
 */
async function cargarPrendasParaFacturar() {
    prendaFacturarSelect.innerHTML = '<option value="">Selecciona una prenda</option>'; // Resetear el select
    // Ocultar la sección de vista previa y los botones al recargar el select
    facturaPreviewSection.style.display = 'none';
    guardarFacturaBtn.style.display = 'none';
    imprimirFacturaBtn.style.display = 'none';

    try {
        if (!currentUserId) {
            console.warn("Factura (DEBUG): currentUserId es null al cargar prendas para facturar. Saltando la carga.");
            showFeedback('No se pueden cargar prendas. Usuario no autenticado.', 'error');
            return;
        }

        console.log("Factura (DEBUG): Cargando prendas para facturar para UID:", currentUserId);
        const q = query(
            collection(db, "prendas"),
            where("userId", "==", currentUserId),
            where("estado", "in", ["Terminada", "Entregada"]) // Solo prendas con estos estados
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            showFeedback('No hay prendas terminadas o entregadas disponibles para facturar.', 'info');
            console.log("Factura (DEBUG): No hay prendas 'Terminada' o 'Entregada' para este usuario.");
            return;
        }

        const prendasMap = new Map(); // Para almacenar los datos completos de la prenda por su ID

        for (const docPrenda of querySnapshot.docs) {
            const prenda = docPrenda.data();
            // Verificar si la prenda ya está "Entregada y Facturada"
            if (prenda.estado === "Entregada y Facturada") {
                console.log(`Factura (DEBUG): Saltando prenda ${docPrenda.id} porque ya está facturada.`);
                continue; // Saltar esta prenda, no la añadimos al select
            }

            prendasMap.set(docPrenda.id, { ...prenda, id: docPrenda.id }); // Almacenar el objeto prenda completo con su ID

            const clienteNombre = prenda.clienteNombre || 'Cliente Desconocido';
            const modistaNombre = prenda.modistaNombre || 'Modista Desconocida';

            const option = document.createElement('option');
            option.value = docPrenda.id;
            option.textContent = `${prenda.tipoPrenda} (Cliente: ${clienteNombre}, Modista: ${modistaNombre}, Estado: ${prenda.estado})`;
            prendaFacturarSelect.appendChild(option);
            console.log("Factura (DEBUG): Prenda añadida a select:", prenda.tipoPrenda, "ID:", docPrenda.id);
        }

        // --- Event Listener para el cambio en el SELECT ---
        // Este es CRÍTICO: Cuando el usuario selecciona una prenda, actualiza currentPrendaData
        // Se asegura de que solo haya un listener para evitar duplicados
        prendaFacturarSelect.removeEventListener('change', handlePrendaSelectChange);
        prendaFacturarSelect.addEventListener('change', handlePrendaSelectChange);

        function handlePrendaSelectChange(event) {
            const selectedPrendaId = event.target.value;
            currentPrendaData = prendasMap.get(selectedPrendaId); // ¡Aquí se asigna currentPrendaData!
            console.log("Factura (DEBUG): Prenda seleccionada en el select. ID:", selectedPrendaId, "Datos:", currentPrendaData);
            
            // Ocultar la vista previa si se cambia la selección y el valor es vacío
            if (!selectedPrendaId) {
                facturaPreviewSection.style.display = 'none';
                guardarFacturaBtn.style.display = 'none';
                imprimirFacturaBtn.style.display = 'none';
            } else {
                // Si se selecciona una prenda, podríamos ocultar la vista previa hasta que se pulse 'Generar Vista Previa'
                facturaPreviewSection.style.display = 'none';
                guardarFacturaBtn.style.display = 'none';
                imprimirFacturaBtn.style.display = 'none';
            }
            showFeedback('', 'info'); // Limpiar cualquier feedback anterior
        }

        console.log("Factura (DEBUG): Prendas para facturar cargadas exitosamente.");
    } catch (error) {
        console.error("Factura (ERROR): Error al cargar prendas para facturar: ", error);
        showFeedback("Error al cargar prendas para facturar.", 'error');
    }
}

// --- Event Listeners y Funciones de Facturación ---

// Generar vista previa de la factura
generarFacturaBtn.addEventListener('click', async () => {
    const selectedPrendaId = prendaFacturarSelect.value;
    console.log("Factura (DEBUG): Botón 'Generar Vista Previa' clicado. ID de prenda seleccionada:", selectedPrendaId);

    if (!selectedPrendaId) {
        showFeedback('Por favor, selecciona una prenda para generar la vista previa.', 'error');
        facturaPreviewSection.style.display = 'none';
        guardarFacturaBtn.style.display = 'none';
        imprimirFacturaBtn.style.display = 'none';
        console.error("Factura (DEBUG): No se seleccionó ninguna prenda.");
        return;
    }

    // Asegurarse de que currentPrendaData esté disponible y corresponda a la prenda seleccionada
    if (!currentPrendaData || currentPrendaData.id !== selectedPrendaId) {
        console.warn("Factura (DEBUG): currentPrendaData no está cargada o no coincide con la selección. Intentando cargar de nuevo desde Firestore.");
        try {
            const docSnap = await getDoc(doc(db, "prendas", selectedPrendaId));
            if (docSnap.exists()) {
                currentPrendaData = { ...docSnap.data(), id: docSnap.id }; // Recargar y añadir el ID
                console.log("Factura (DEBUG): currentPrendaData recargada desde Firestore:", currentPrendaData);
            } else {
                showFeedback('Error: Los datos de la prenda seleccionada no se encontraron en la base de datos.', 'error');
                facturaPreviewSection.style.display = 'none';
                guardarFacturaBtn.style.display = 'none';
                imprimirFacturaBtn.style.display = 'none';
                console.error("Factura (ERROR): Documento de prenda no encontrado en Firestore para ID:", selectedPrendaId);
                return;
            }
        } catch (error) {
            console.error("Factura (ERROR): Error al intentar recargar prenda desde Firestore:", error);
            showFeedback('Error al obtener los datos de la prenda.', 'error');
            facturaPreviewSection.style.display = 'none';
            guardarFacturaBtn.style.display = 'none';
            imprimirFacturaBtn.style.display = 'none';
            return;
        }
    }

    const prenda = currentPrendaData;
    console.log("Factura (DEBUG): Datos finales de la prenda para la vista previa:", prenda);

    // Verificación final de datos esenciales de la prenda
    if (!prenda || typeof prenda.costoPrenda !== 'number' || typeof prenda.cantidadPrenda !== 'number') {
        showFeedback('Error: Datos incompletos o inválidos de la prenda para generar factura.', 'error');
        facturaPreviewSection.style.display = 'none';
        guardarFacturaBtn.style.display = 'none';
        imprimirFacturaBtn.style.display = 'none';
        console.error("Factura (ERROR): Prenda o datos de costo/cantidad son inválidos:", prenda);
        return;
    }

    try {
        // Obtener datos completos del cliente para teléfono, email, dirección (si están en su documento)
        let clienteCompleto = { telefono: 'N/A', email: 'N/A', direccion: 'N/A' };
        if (prenda.clienteId) {
            const clienteRef = doc(db, "clientes", prenda.clienteId);
            const clienteSnap = await getDoc(clienteRef);
            if (clienteSnap.exists()) {
                const clienteData = clienteSnap.data();
                clienteCompleto.telefono = clienteData.telefono || 'N/A';
                clienteCompleto.email = clienteData.email || 'N/A';
                clienteCompleto.direccion = clienteData.direccion || 'N/A';
                console.log("Factura (DEBUG): Datos completos del cliente obtenidos:", clienteCompleto);
            } else {
                console.warn("Factura (WARN): Cliente completo no encontrado para ID:", prenda.clienteId);
            }
        } else {
            console.warn("Factura (WARN): prenda.clienteId es nulo o indefinido. No se puede obtener información completa del cliente.");
        }

        const costoTotal = prenda.costoPrenda * prenda.cantidadPrenda;
        const numeroFactura = 'FAC-' + Date.now().toString().slice(-8); // Genera un número de factura simple (últimos 8 dígitos de timestamp)

        // Llenar la vista previa de la factura en el HTML
        facturaFechaSpan.textContent = new Date().toLocaleDateString('es-ES');
        facturaNumeroSpan.textContent = numeroFactura;
        clienteNombreFacturaSpan.textContent = prenda.clienteNombre || 'N/A';
        clienteTelefonoFacturaSpan.textContent = clienteCompleto.telefono;
        clienteEmailFacturaSpan.textContent = clienteCompleto.email;
        clienteDireccionFacturaSpan.textContent = clienteCompleto.direccion;
        tipoPrendaFacturaSpan.textContent = prenda.tipoPrenda;
        descripcionPrendaFacturaSpan.textContent = prenda.descripcionPrenda;
        cantidadPrendaFacturaSpan.textContent = prenda.cantidadPrenda;
        costoUnitarioFacturaSpan.textContent = `$${prenda.costoPrenda.toFixed(2)}`;
        totalPrendaFacturaSpan.textContent = `$${costoTotal.toFixed(2)}`;
        granTotalFacturaSpan.textContent = `$${costoTotal.toFixed(2)}`;
        modistaAsignadaFacturaSpan.textContent = prenda.modistaNombre || 'N/A';
        estadoPrendaFacturaSpan.textContent = prenda.estado;

        // Mostrar la sección de vista previa y los botones
        facturaPreviewSection.style.display = 'block';
        guardarFacturaBtn.style.display = 'inline-block'; // O 'block' o lo que uses para botones
        imprimirFacturaBtn.style.display = 'inline-block';

        showFeedback('Vista previa de factura generada.', 'success');
        console.log("Factura (DEBUG): Vista previa generada y mostrada.");

    } catch (error) {
        console.error("Factura (ERROR): Error al generar vista previa de factura: ", error);
        showFeedback("Error al generar vista previa de factura. " + error.message, 'error');
        facturaPreviewSection.style.display = 'none';
        guardarFacturaBtn.style.display = 'none';
        imprimirFacturaBtn.style.display = 'none';
    }
});

// Guardar factura en Firestore
guardarFacturaBtn.addEventListener('click', async () => {
    console.log("Factura (DEBUG): Botón 'Guardar Factura' clicado.");
    if (!currentPrendaData || !prendaFacturarSelect.value) {
        showFeedback('No hay una prenda seleccionada o vista previa generada para guardar la factura.', 'error');
        console.error("Factura (DEBUG): currentPrendaData o prendaFacturarSelect.value es null al intentar guardar factura.");
        return;
    }

    try {
        const prenda = currentPrendaData;
        const costoTotal = prenda.costoPrenda * prenda.cantidadPrenda;

        let clienteCompleto = { telefono: 'N/A', email: 'N/A', direccion: 'N/A' };
        if (prenda.clienteId) {
            const clienteRef = doc(db, "clientes", prenda.clienteId);
            const clienteSnap = await getDoc(clienteRef);
            if (clienteSnap.exists()) {
                clienteCompleto = clienteSnap.data();
            }
        }

        const facturaData = {
            userId: currentUserId,
            prendaId: prenda.id, // Usar el ID de la prenda
            clienteId: prenda.clienteId,
            modistaId: prenda.modistaId,
            numeroFactura: facturaNumeroSpan.textContent,
            fechaFactura: facturaFechaSpan.textContent,
            total: parseFloat(granTotalFacturaSpan.textContent.replace('$', '')),
            detalles: {
                tipoPrenda: tipoPrendaFacturaSpan.textContent,
                descripcion: descripcionPrendaFacturaSpan.textContent,
                cantidad: parseInt(cantidadPrendaFacturaSpan.textContent),
                costoUnitario: parseFloat(costoUnitarioFacturaSpan.textContent.replace('$', '')),
            },
            clienteNombreCompleto: prenda.clienteNombre || 'Cliente Desconocido',
            modistaAsignada: prenda.modistaNombre || 'Modista Desconocida',
            clienteTelefono: clienteCompleto.telefono || 'N/A',
            clienteEmail: clienteCompleto.email || 'N/A',
            clienteDireccion: clienteCompleto.direccion || 'N/A',
            estadoPrendaAlFacturar: estadoPrendaFacturaSpan.textContent,
            // Añadir marca de tiempo para ordenación si es necesario
            timestamp: new Date().toISOString()
        };

        console.log("Factura (DEBUG): Datos de la factura a guardar:", facturaData);

        if (!currentUserId) {
            showFeedback('Error: Usuario no autenticado. Por favor, inicia sesión.', 'error');
            console.error('Factura (ERROR): currentUserId es null al intentar guardar factura. Operación abortada.');
            return;
        }

        await addDoc(collection(db, "facturas"), facturaData);
        console.log("Factura (DEBUG): Documento de factura añadido a Firestore.");

        // Actualizar el estado de la prenda a "Entregada y Facturada"
        const prendaRef = doc(db, "prendas", prenda.id); // Usar el ID de la prenda
        await updateDoc(prendaRef, { estado: "Entregada y Facturada" });
        console.log("Factura (DEBUG): Estado de la prenda actualizado a 'Entregada y Facturada'.");

        showFeedback('Factura guardada exitosamente y estado de prenda actualizado.', 'success');
        facturaPreviewSection.style.display = 'none'; // Ocultar la vista previa
        guardarFacturaBtn.style.display = 'none';
        imprimirFacturaBtn.style.display = 'none';
        currentPrendaData = null; // Limpiar datos de la prenda seleccionada
        cargarPrendasParaFacturar(); // Recargar el select de prendas para reflejar el cambio
        prendaFacturarSelect.value = ""; // Resetear el select a la opción por defecto

    } catch (error) {
        console.error("Factura (ERROR): Error al guardar factura: ", error);
        showFeedback("Error al guardar factura: " + error.message, 'error');
    }
});

// Función para imprimir la factura
imprimirFacturaBtn.addEventListener('click', () => {
    console.log("Factura (DEBUG): Botón 'Imprimir Factura' clicado.");
    const invoiceContent = document.getElementById('invoice-content'); // Asegúrate que el ID es 'invoice-content' en tu HTML
    if (!invoiceContent) {
        console.error("Factura (ERROR): Elemento 'invoice-content' no encontrado para imprimir.");
        showFeedback("Error: No se puede encontrar el contenido de la factura para imprimir.", 'error');
        return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>Factura</title>');
    // Opcional: Si tienes estilos CSS para la factura, puedes incluirlos aquí.
    // Lo ideal es tener un archivo CSS específico para impresión.
    // printWindow.document.write('<link rel="stylesheet" href="css/print-factura.css">');
    // Para simplificar, puedes inyectar los estilos de tu factura.css o el CSS global si es pequeño.
    printWindow.document.write('<style>');
    // Podrías copiar/pegar los estilos relevantes para la factura aquí o cargarlos desde un archivo
    // Ejemplo:
    printWindow.document.write(`
        body { font-family: sans-serif; margin: 20px; }
        #invoice-content { border: 1px solid #ccc; padding: 20px; max-width: 800px; margin: 0 auto; }
        .invoice-header, .invoice-footer { text-align: center; margin-bottom: 20px; }
        .invoice-details table, .item-details table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .invoice-details th, .invoice-details td, .item-details th, .item-details td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .item-details th { background-color: #f2f2f2; }
        .total-section { text-align: right; margin-top: 20px; }
        .total-section p { font-weight: bold; }
    `);
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(invoiceContent.innerHTML); // Inyecta el HTML de la vista previa
    printWindow.document.write('</body></html>');
    printWindow.document.close(); // Cierra el flujo de escritura del documento
    printWindow.focus(); // Pone el foco en la nueva ventana
    printWindow.print(); // Abre el diálogo de impresión
    // printWindow.close(); // No es recomendable cerrar inmediatamente, puede interferir con la impresión
});


// Función para mostrar feedback al usuario
function showFeedback(message, type) {
    prendaFacturaFeedback.textContent = message;
    prendaFacturaFeedback.className = `feedback ${type}`; // Aplica clases para estilos
    setTimeout(() => {
        prendaFacturaFeedback.textContent = '';
        prendaFacturaFeedback.className = 'feedback';
    }, 5000); // Ocultar después de 5 segundos
}