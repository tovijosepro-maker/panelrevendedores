const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI || '';

if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
      .then(() => console.log('¡Conectado exitosamente a la base de datos!'))
      .catch(err => console.error('❌ Error al conectar a MongoDB:', err));
} else {
    console.warn('⚠️ MONGO_URI no está definida en las variables de entorno.');
}

const cuentaSchema = new mongoose.Schema({
    id: String,
    servicio: String,
    cuenta: String,
    fechaVencimiento: String,
    diasRestantes: Number,
    estadoSemaforo: String
});

const revendedorSchema = new mongoose.Schema({
    id: String,
    nombre: String,
    whatsapp: String,
    cuentas: [cuentaSchema]
});

const Revendedor = mongoose.model('Revendedor', revendedorSchema);

// Ruta protegida: si la BD falla, devuelve un array vacío [] para que el frontend nunca colapse
app.get('/api/revendedores', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.json([]);
        }
        const revendedores = await Revendedor.find();
        res.json(revendedores || []);
    } catch (error) {
        console.error('Error en /api/revendedores:', error);
        res.json([]); 
    }
});

app.post('/api/revendedor/cuenta', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({ error: 'Base de datos desconectada temporalmente' });
        }
        
        const { nombre, whatsapp, servicio, cuenta, diasVigencia, fechaVencimiento, diasRestantes, estadoSemaforo } = req.body;
        
        const revendedorId = nombre ? nombre.trim().toLowerCase() : 'general';
        let revendedor = await Revendedor.findOne({ 
            $or: [
                { id: revendedorId }, 
                { nombre: { $regex: new RegExp(`^${nombre}$`, 'i') } }
            ] 
        });
        
        const nuevaCuenta = {
            id: Date.now().toString(),
            servicio: servicio || '',
            cuenta: cuenta || '',
            fechaVencimiento: fechaVencimiento || '',
            diasRestantes: Number(diasRestantes) || Number(diasVigencia) || 30,
            estadoSemaforo: estadoSemaforo || 'verde'
        };

        if (!revendedor) {
            revendedor = new Revendedor({
                id: revendedorId,
                nombre: nombre || 'Sin nombre',
                whatsapp: whatsapp || '',
                cuentas: [nuevaCuenta]
            });
        } else {
            if (whatsapp) revendedor.whatsapp = whatsapp;
            revendedor.cuentas.push(nuevaCuenta);
        }
        
        await revendedor.save();
        res.json({ success: true, message: 'Cuenta guardada correctamente' });
    } catch (error) {
        console.error("Error al guardar cuenta:", error);
        res.status(500).json({ error: 'Error al guardar la cuenta' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});