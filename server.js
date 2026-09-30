const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Enlace de conexión directa (shards) para evitar bloqueos DNS en Windows
const MONGO_URI = 'mongodb://usuario_db_tovijosepro:9rQXNLHliv8OMCaL@cluster0-shard-00-00.dloyiw2.mongodb.net:27017,cluster0-shard-00-01.dloyiw2.mongodb.net:27017,cluster0-shard-00-02.dloyiw2.mongodb.net:27017/panel_lara?ssl=true&replicaSet=atlas-dloyiw2-shard-0&authSource=admin&retryWrites=true&w=majority';

// Conexión a MongoDB Atlas optimizada
mongoose.connect(MONGO_URI, {
    family: 4,
    serverSelectionTimeoutMS: 5000
})
  .then(() => console.log('🔥 ¡Conectado exitosamente a la base de datos en la nube de MongoDB!'))
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

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- RUTAS DE LA API ---

app.post('/api/login', async (req, res) => {
    const { usuario, clave } = req.body;
    let adminClave = '123456'; // Clave por defecto rápida
    
    try {
        if (mongoose.connection.readyState === 1) {
            let conf = await Config.findOne().maxTimeMS(2000);
            if (conf && conf.claveAdmin) {
                adminClave = conf.claveAdmin;
            }
        }
    } catch (e) {
        // Si la BD tarda, usa la clave por defecto para no bloquear el login
    }

    if (usuario === 'admin' && clave === adminClave) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

app.post('/api/cambiar-clave', async (req, res) => {
    try {
        const { claveActual, nuevaClave } = req.body;
        let conf = await Config.findOne();
        const adminClave = conf ? conf.claveAdmin : '123456';

        if (claveActual !== adminClave) {
            return res.status(400).json({ success: false, error: 'Contraseña actual incorrecta' });
        }

        if (!conf) {
            await Config.create({ claveAdmin: nuevaClave });
        } else {
            conf.claveAdmin = nuevaClave;
            await conf.save();
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al cambiar contraseña' });
    }
});

app.get('/api/revendedores', async (req, res) => {
    try {
        let lista = await Revendedor.find();
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        let listaProcesada = lista.map(rev => {
            let revObj = rev.toObject();
            revObj.cuentas = revObj.cuentas.map(c => {
                let partes = c.fechaVencimiento.split('/');
                let fechaVenc = new Date(partes[2], partes[1] - 1, partes[0]);
                let diferenciaTiempo = fechaVenc - hoy;
                let diasRestantes = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24));

                let estadoSemaforo = 'verde';
                if (diasRestantes < 0) {
                    estadoSemaforo = 'rojo';
                } else if (diasRestantes <= 2) {
                    estadoSemaforo = 'amarillo';
                }

                return { ...c, diasRestantes, estadoSemaforo };
            });
            return revObj;
        });

        res.json(listaProcesada);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener datos' });
    }
});

app.post('/api/revendedor/cuenta', async (req, res) => {
    try {
        const { nombre, whatsapp, servicio, cuenta, diasPersonalizados } = req.body;
        const diasVigencia = diasPersonalizados ? parseInt(diasPersonalizados) : 30;

        let fechaVenc = new Date();
        fechaVenc.setDate(fechaVenc.getDate() + diasVigencia);
        let dia = String(fechaVenc.getDate()).padStart(2, '0');
        let mes = String(fechaVenc.getMonth() + 1).padStart(2, '0');
        let anio = fechaVenc.getFullYear();
        let fechaVencimientoStr = `${dia}/${mes}/${anio}`;

        let revendedor = await Revendedor.findOne({ nombre: { $regex: new RegExp(`^${nombre}$`, 'i') } });

        const nuevaCuentaObj = {
            id: Date.now().toString() + Math.floor(Math.random() * 1000),
            servicio,
            cuenta,
            fechaVencimiento: fechaVencimientoStr
        };

        if (revendedor) {
            if (whatsapp) revendedor.whatsapp = whatsapp;
            revendedor.cuentas.push(nuevaCuentaObj);
            await revendedor.save();
        } else {
            await Revendedor.create({
                id: Date.now().toString(),
                nombre,
                whatsapp: whatsapp || 'Sin número',
                cuentas: [nuevaCuentaObj]
            });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar cuenta' });
    }
});

app.post('/api/revendedor/:revId/cuenta/:cuentaId/renovar', async (req, res) => {
    try {
        const { revId, cuentaId } = req.params;
        let rev = await Revendedor.findOne({ id: revId });
        if (!rev) return res.status(404).json({ error: 'Revendedor no encontrado' });

        let cuenta = rev.cuentas.id(cuentaId) || rev.cuentas.find(c => c.id === cuentaId);
        if (!cuenta) return res.status(404).json({ error: 'Cuenta no encontrada' });

        let partes = cuenta.fechaVencimiento.split('/');
        let baseDate = new Date(partes[2], partes[1] - 1, partes[0]);
        let hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        let fechaInicio = baseDate > hoy ? baseDate : hoy;
        fechaInicio.setDate(fechaInicio.getDate() + 30);

        let dia = String(fechaInicio.getDate()).padStart(2, '0');
        let mes = String(fechaInicio.getMonth() + 1).padStart(2, '0');
        let anio = fechaInicio.getFullYear();
        cuenta.fechaVencimiento = `${dia}/${mes}/${anio}`;

        await rev.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al renovar' });
    }
});

app.put('/api/revendedor/:revId/cuenta/:cuentaId', async (req, res) => {
    try {
        const { revId, cuentaId } = req.params;
        const { servicio, cuenta } = req.body;

        let rev = await Revendedor.findOne({ id: revId });
        if (!rev) return res.status(404).json({ error: 'Revendedor no encontrado' });

        let cta = rev.cuentas.find(c => c.id === cuentaId);
        if (!cta) return res.status(404).json({ error: 'Cuenta no encontrada' });

        if (servicio) cta.servicio = servicio;
        if (cuenta) cta.cuenta = cuenta;

        await rev.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar' });
    }
});

app.delete('/api/revendedor/:revId/cuenta/:cuentaId', async (req, res) => {
    try {
        const { revId, cuentaId } = req.params;
        let rev = await Revendedor.findOne({ id: revId });
        if (!rev) return res.status(404).json({ error: 'Revendedor no encontrado' });

        rev.cuentas = rev.cuentas.filter(c => c.id !== cuentaId);

        if (rev.cuentas.length === 0) {
            await Revendedor.deleteOne({ id: revId });
        } else {
            await rev.save();
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
});