const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('¡Conectado exitosamente a la base de datos en la nube de MongoDB!'))
  .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

// Esquemas de la Base de Datos
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

const configSchema = new mongoose.Schema({
    claveAdmin: String
});

const Revendedor = mongoose.model('Revendedor', revendedorSchema);
const Config = mongoose.model('Config', configSchema);

// RUTAS REALES DE LA API
app.get('/api/revendedores', async (req, res) => {
    try {
        const revendedores = await Revendedor.find();
        res.json(revendedores);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los revendedores' });
    }
});

app.post('/api/revendedor/cuenta', async (req, res) => {
    try {
        const { revendedorId, cuentaData } = req.body;
        let revendedor = await Revendedor.findOne({ id: revendedorId });
        
        if (!revendedor) {
            revendedor = new Revendedor({ id: revendedorId, nombre: revendedorId, whatsapp: '', cuentas: [cuentaData] });
        } else {
            revendedor.cuentas.push(cuentaData);
        }
        
        await revendedor.save();
        res.json({ success: true, message: 'Cuenta guardada correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar la cuenta' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});