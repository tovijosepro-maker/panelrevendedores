const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ruta del archivo database.json
const dbFilePath = path.join(__dirname, 'database.json');

// Función auxiliar para leer la base de datos local
function leerDB() {
    try {
        if (!fs.existsSync(dbFilePath)) {
            fs.writeFileSync(dbFilePath, JSON.stringify([], null, 2));
        }
        const data = fs.readFileSync(dbFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error al leer database.json:', error);
        return [];
    }
}

// Función auxiliar para escribir en la base de datos local
function escribirDB(data) {
    try {
        fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error al escribir database.json:', error);
    }
}

// Obtener todos los revendedores
app.get('/api/revendedores', (req, res) => {
    try {
        const revendedores = leerDB();
        res.json(revendedores || []);
    } catch (error) {
        console.error('Error en /api/revendedores:', error);
        res.json([]);
    }
});

// Guardar o actualizar una cuenta de revendedor
app.post('/api/revendedor/cuenta', (req, res) => {
    try {
        const { nombre, whatsapp, servicio, cuenta, diasVigencia, fechaVencimiento, diasRestantes, estadoSemaforo } = req.body;
        
        const revendedorId = nombre ? nombre.trim().toLowerCase() : 'general';
        let revendedores = leerDB();
        
        let revendedor = revendedores.find(r => r.id === revendedorId || (r.nombre && r.nombre.toLowerCase() === (nombre || '').toLowerCase()));

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
                id: revendedorId,
                nombre: nombre || 'Sin nombre',
                whatsapp: whatsapp || '',
                cuentas: [nuevaCuenta]
            };
            revendedores.push(revendedor);
        } else {
            if (whatsapp) revendedor.whatsapp = whatsapp;
            if (!revendedor.cuentas) revendedor.cuentas = [];
            revendedor.cuentas.push(nuevaCuenta);
        }
        
        escribirDB(revendedores);
        res.json({ success: true, message: 'Cuenta guardada correctamente' });
    } catch (error) {
        console.error("Error al guardar cuenta:", error);
        res.status(500).json({ error: 'Error al guardar la cuenta' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT} usando database.json local`);
});