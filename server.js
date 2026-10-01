const express = require('express');
const fs = require('fs');
const path = express(); // o path normal

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join ? path.join(__dirname, 'public') : './public'));

// Memoria RAM temporal por si el disco de Render se pone pesado
let memoriaRevendedores = [];
const dbFilePath = path.join(__dirname, 'database.json');

function leerDB() {
    try {
        if (fs.existsSync(dbFilePath)) {
            const data = fs.readFileSync(dbFilePath, 'utf8');
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed) && parsed.length > 0) {
                memoriaRevendedores = parsed;
            }
        }
    } catch (e) {
        console.log("Usando memoria RAM de respaldo");
    }
    return memoriaRevendedores;
}

function escribirDB(data) {
    memoriaRevendedores = data;
    try {
        fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.log("Modo memoria RAM activado (Render bloqueó escritura en disco)");
    }
}

// Cargar al iniciar
leerDB();

app.get('/api/revendedores', (req, res) => {
    try {
        const revendedores = leerDB();
        res.json(Array.isArray(revendedores) ? revendedores : []);
    } catch (error) {
        res.json([]);
    }
});

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
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});