const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Memoria RAM interna del servidor (cero problemas de disco en Render)
let memoriaRevendedores = [
    {
        id: "ejemplo",
        nombre: "Ejemplo Revendedor",
        whatsapp: "3000000000",
        cuentas: [
            {
                id: "1",
                servicio: "Netflix",
                cuenta: "correo@test.com - Pin: 1234",
                fechaVencimiento: "2026-12-31",
                diasRestantes: 30,
                estadoSemaforo: "verde"
            }
        ]
    }
];

// Obtener todos los revendedores
app.get('/api/revendedores', (req, res) => {
    try {
        res.json(memoriaRevendedores);
    } catch (error) {
        res.json([]);
    }
});

// Guardar cuenta
app.post('/api/revendedor/cuenta', (req, res) => {
    try {
        const { nombre, whatsapp, servicio, cuenta, diasVigencia, fechaVencimiento, diasRestantes, estadoSemaforo } = req.body;
        
        const revendedorNombre = nombre ? nombre.trim() : 'General';
        let revendedor = memoriaRevendedores.find(r => r.nombre.toLowerCase() === revendedorNombre.toLowerCase());

        const nuevaCuenta = {
            id: Date.now().toString(),
            servicio: servicio || '',
            cuenta: cuenta || '',
            fechaVencimiento: fechaVencimiento || '',
            diasRestantes: Number(diasRestantes) || Number(diasVigencia) || 30,
            estadoSemaforo: estadoSemaforo || 'verde'
        };

        if (!revendedor) {
            revendedor = {
                id: Date.now().toString(),
                nombre: revendedorNombre,
                whatsapp: whatsapp || '',
                cuentas: [nuevaCuenta]
            };
            memoriaRevendedores.push(revendedor);
        } else {
            if (whatsapp) revendedor.whatsapp = whatsapp;
            if (!revendedor.cuentas) revendedor.cuentas = [];
            revendedor.cuentas.push(nuevaCuenta);
        }
        
        res.json({ success: true, message: 'Cuenta guardada correctamente' });
    } catch (error) {
        console.error("Error al guardar cuenta:", error);
        res.status(500).json({ error: 'Error al guardar la cuenta' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});