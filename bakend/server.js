require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid'); // Añadido para generar IDs de carrito

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
// Agregar después de la configuración de cors y express.json
app.use((req, res, next) => {
    console.log('Ruta:', req.path);
    console.log('Método:', req.method);
    console.log('Body:', req.body);
    console.log('Headers:', req.headers);
    next();
});

// Configuración de la conexión a la base de datos
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection()
  .then(conn => {
    console.log('Database connection successful');
    conn.release();
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });

// Middleware para verificar tokens
const verificarToken = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ error: 'Acceso denegado' });

    // Extraer el token (puede venir como "Bearer token")
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

    try {
        const verificado = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = verificado;
        next();
    } catch (err) {
        console.error('Error de verificación de token:', err);
        res.status(400).json({ error: 'Token inválido' });
    }
};

// Middleware para verificar si es administrador
const esAdmin = (req, res, next) => {
    if (req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso restringido a administradores' });
    }
    next();
};

// Ruta de prueba
app.get('/api/test', (req, res) => {
    res.json({ mensaje: 'API funcionando correctamente' });
});

// Ruta de Registro
app.post('/api/register', async (req, res) => {
    try {
        const { nombre, apellidos, email, password } = req.body;
        
        // Validar campos
        if (!nombre || !apellidos || !email || !password) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }
        
        // Verificar si el email ya existe
        const [existingUsers] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar usuario (por defecto como rol 'usuario')
        const [result] = await pool.query(
            'INSERT INTO usuarios (nombre, apellidos, email, password, rol) VALUES (?, ?, ?, ?, "usuario")', 
            [nombre, apellidos, email, hashedPassword]
        );
        
        res.status(201).json({ 
            mensaje: 'Usuario registrado con éxito',
            userId: result.insertId
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Ruta de Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validar campos
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
        }

        // Buscar usuario por email
        const [users] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ error: 'Credenciales incorrectas' });
        }

        const usuario = users[0];
        
        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, usuario.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Credenciales incorrectas' });
        }

        // Generar token JWT
        const token = jwt.sign(
            { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );

        res.json({ 
            token, 
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// ENDPOINTS DE PRODUCTOS

// Obtener todos los productos
app.get('/api/productos', async (req, res) => {
    try {
        const [productos] = await pool.query('SELECT * FROM productos');
        res.json(productos);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// Obtener un producto por ID
app.get('/api/productos/:id', async (req, res) => {
    try {
        const [productos] = await pool.query('SELECT * FROM productos WHERE id = ?', [req.params.id]);
        
        if (productos.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        res.json(productos[0]);
    } catch (error) {
        console.error('Error al obtener producto:', error);
        res.status(500).json({ error: 'Error al obtener producto' });
    }
});

// Agregar un producto (Admin)
app.post('/api/productos', verificarToken, esAdmin, async (req, res) => {
    try {
        const { referencia, nombre, descripcion, precio, stock, tipo, oferta, imagen } = req.body;
        
        // Validar campos obligatorios
        if (!nombre || !precio) {
            return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
        }
        
        const [result] = await pool.query(
            'INSERT INTO productos (referencia, nombre, descripcion, precio, stock, tipo, oferta, imagen) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
            [referencia, nombre, descripcion, precio, stock || 0, tipo, oferta || false, imagen]
        );

        res.status(201).json({ 
            mensaje: 'Producto agregado correctamente',
            id: result.insertId 
        });
    } catch (error) {
        console.error('Error al agregar producto:', error);
        
        // Error específico para duplicados
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'La referencia del producto ya existe' });
        }
        
        res.status(500).json({ error: 'Error al agregar producto' });
    }
});

// Actualizar un producto (Admin)
app.put('/api/productos/:id', verificarToken, esAdmin, async (req, res) => {
    try {
        const { referencia, nombre, descripcion, precio, stock, tipo, oferta, imagen } = req.body;
        
        // Validar campos obligatorios
        if (!nombre || !precio) {
            return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
        }
        
        // Verificar si el producto existe
        const [productos] = await pool.query('SELECT id FROM productos WHERE id = ?', [req.params.id]);
        if (productos.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        // Actualizar el producto
        await pool.query(
            'UPDATE productos SET referencia = ?, nombre = ?, descripcion = ?, precio = ?, stock = ?, tipo = ?, oferta = ?, imagen = ? WHERE id = ?', 
            [referencia, nombre, descripcion, precio, stock, tipo, oferta, imagen, req.params.id]
        );

        res.json({ mensaje: 'Producto actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        
        // Error específico para duplicados
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'La referencia del producto ya existe' });
        }
        
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});

// Eliminar un producto (Admin)
app.delete('/api/productos/:id', verificarToken, esAdmin, async (req, res) => {
    try {
        // Verificar si el producto existe
        const [productos] = await pool.query('SELECT id FROM productos WHERE id = ?', [req.params.id]);
        if (productos.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        // Eliminar el producto
        await pool.query('DELETE FROM productos WHERE id = ?', [req.params.id]);
        res.json({ mensaje: 'Producto eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        
        // Manejar errores de restricción de clave foránea
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: 'No se puede eliminar el producto porque está referenciado en compras o carritos' });
        }
        
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

// ENDPOINTS DE CARRITO EXISTENTES

// Obtener carrito del usuario
app.get('/api/carrito', verificarToken, async (req, res) => {
    try {
        // Eliminar productos expirados del carrito
        await pool.query(
            'DELETE FROM carrito WHERE fecha_expiracion < NOW()'
        );
        
        // Obtener carrito actual
        const [carrito] = await pool.query(
            `SELECT c.id, c.cantidad, c.fecha_expiracion, 
                    p.id as producto_id, p.referencia, p.nombre, p.precio, p.imagen, p.stock
             FROM carrito c
             JOIN productos p ON c.producto_id = p.id
             WHERE c.usuario_id = ?`, 
            [req.usuario.id]
        );
        
        res.json(carrito);
    } catch (error) {
        console.error('Error al obtener carrito:', error);
        res.status(500).json({ error: 'Error al obtener carrito' });
    }
});

// Agregar producto al carrito
app.post('/api/carrito', verificarToken, async (req, res) => {
    try {
        const { producto_id, cantidad } = req.body;
        
        // Validar cantidad
        if (!cantidad || cantidad <= 0) {
            return res.status(400).json({ error: 'La cantidad debe ser mayor que cero' });
        }

        // Verificar stock disponible
        const [productos] = await pool.query('SELECT stock FROM productos WHERE id = ?', [producto_id]);
        
        if (productos.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        if (productos[0].stock < cantidad) {
            return res.status(400).json({ error: 'Stock insuficiente' });
        }

        // Verificar si ya existe el producto en el carrito
        const [carritoExistente] = await pool.query(
            'SELECT id, cantidad FROM carrito WHERE usuario_id = ? AND producto_id = ?',
            [req.usuario.id, producto_id]
        );

        const fechaExpiracion = new Date(Date.now() + 10 * 60000); // 10 minutos

        if (carritoExistente.length > 0) {
            // Actualizar cantidad
            await pool.query(
                'UPDATE carrito SET cantidad = cantidad + ?, fecha_expiracion = ? WHERE id = ?', 
                [cantidad, fechaExpiracion, carritoExistente[0].id]
            );
        } else {
            // Insertar nuevo item en el carrito
            await pool.query(
                'INSERT INTO carrito (usuario_id, producto_id, cantidad, fecha_expiracion) VALUES (?, ?, ?, ?)', 
                [req.usuario.id, producto_id, cantidad, fechaExpiracion]
            );
        }

        res.status(201).json({ mensaje: 'Producto agregado al carrito' });
    } catch (error) {
        console.error('Error al agregar al carrito:', error);
        res.status(500).json({ error: 'Error al agregar al carrito' });
    }
});

// Actualizar cantidad de un producto en el carrito
app.put('/api/carrito/:id', verificarToken, async (req, res) => {
    try {
        const { cantidad } = req.body;
        
        // Validar cantidad
        if (!cantidad || cantidad <= 0) {
            return res.status(400).json({ error: 'La cantidad debe ser mayor que cero' });
        }

        // Verificar que el item del carrito pertenezca al usuario
        const [carritoItems] = await pool.query(
            'SELECT c.id, c.producto_id, p.stock FROM carrito c JOIN productos p ON c.producto_id = p.id WHERE c.id = ? AND c.usuario_id = ?',
            [req.params.id, req.usuario.id]
        );

        if (carritoItems.length === 0) {
            return res.status(404).json({ error: 'Item no encontrado en el carrito' });
        }

        // Verificar stock
        if (carritoItems[0].stock < cantidad) {
            return res.status(400).json({ error: 'Stock insuficiente' });
        }

        // Actualizar fecha de expiración
        const fechaExpiracion = new Date(Date.now() + 10 * 60000); // 10 minutos

        // Actualizar cantidad
        await pool.query(
            'UPDATE carrito SET cantidad = ?, fecha_expiracion = ? WHERE id = ?', 
            [cantidad, fechaExpiracion, req.params.id]
        );

        res.json({ mensaje: 'Carrito actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar carrito:', error);
        res.status(500).json({ error: 'Error al actualizar carrito' });
    }
});

// Eliminar un producto del carrito
app.delete('/api/carrito/:id', verificarToken, async (req, res) => {
    try {
        // Verificar que el item del carrito pertenezca al usuario
        const [carritoItems] = await pool.query(
            'SELECT id FROM carrito WHERE id = ? AND usuario_id = ?',
            [req.params.id, req.usuario.id]
        );

        if (carritoItems.length === 0) {
            return res.status(404).json({ error: 'Item no encontrado en el carrito' });
        }

        // Eliminar el item del carrito
        await pool.query('DELETE FROM carrito WHERE id = ?', [req.params.id]);
        
        res.json({ mensaje: 'Producto eliminado del carrito' });
    } catch (error) {
        console.error('Error al eliminar del carrito:', error);
        res.status(500).json({ error: 'Error al eliminar del carrito' });
    }
});

// Procesar la compra del carrito
app.post('/api/procesar-compra', verificarToken, async (req, res) => {
    // Crear una transacción para garantizar la integridad de los datos
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Obtener los items del carrito
        const [carritoItems] = await connection.query(
            `SELECT c.id, c.producto_id, c.cantidad, p.precio, p.stock, p.nombre
             FROM carrito c
             JOIN productos p ON c.producto_id = p.id
             WHERE c.usuario_id = ?`,
            [req.usuario.id]
        );

        // Verificar si hay productos en el carrito
        if (carritoItems.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'El carrito está vacío' });
        }

        // Verificar stock de todos los productos
        for (const item of carritoItems) {
            if (item.stock < item.cantidad) {
                await connection.rollback();
                return res.status(400).json({ 
                    error: `Stock insuficiente para ${item.nombre}. Disponible: ${item.stock}` 
                });
            }
        }

        // Calcular el total de la compra
        const total = carritoItems.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

        // Crear la compra
        const [compraResult] = await connection.query(
            'INSERT INTO compras (usuario_id, total) VALUES (?, ?)',
            [req.usuario.id, total]
        );
        
        const compraId = compraResult.insertId;

        // Agregar detalles de la compra y actualizar stock
        for (const item of carritoItems) {
            // Insertar detalle de compra
            await connection.query(
                'INSERT INTO detalle_compra (compra_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
                [compraId, item.producto_id, item.cantidad, item.precio]
            );

            // Actualizar stock
            await connection.query(
                'UPDATE productos SET stock = stock - ? WHERE id = ?',
                [item.cantidad, item.producto_id]
            );
        }

        // Eliminar carrito
        await connection.query('DELETE FROM carrito WHERE usuario_id = ?', [req.usuario.id]);

        // Confirmar la transacción
        await connection.commit();

        res.status(201).json({ 
            mensaje: 'Compra procesada correctamente',
            compraId: compraId,
            total: total
        });
    } catch (error) {
        // Si hay error, revertir los cambios
        await connection.rollback();
        console.error('Error al procesar compra:', error);
        res.status(500).json({ error: 'Error al procesar la compra' });
    } finally {
        // Liberar la conexión
        connection.release();
    }
});

// ENDPOINTS DE COMPRAS

// Obtener historial de compras del usuario
// ENDPOINTS DE COMPRAS

// Obtener historial de compras del usuario
app.get('/api/compras', verificarToken, async (req, res) => {
    try {
        const [pedidos] = await pool.query(
            `SELECT p.id, p.fecha as fecha_compra, 
                    (SELECT SUM(dp.precio_unitario * dp.cantidad) FROM detalles_pedido dp WHERE dp.pedido_id = p.id) as total,
                    (SELECT COUNT(*) FROM detalles_pedido WHERE pedido_id = p.id) as num_productos
             FROM pedidos p
             WHERE p.usuario_id = ?
             ORDER BY p.fecha DESC`,
            [req.usuario.id]
        );
        
        res.json(pedidos);
    } catch (error) {
        console.error('Error al obtener compras:', error);
        res.status(500).json({ error: 'Error al obtener compras' });
    }
});

// Obtener detalle de una compra
app.get('/api/compras/:id', verificarToken, async (req, res) => {
    try {
        // Verificar que el pedido pertenezca al usuario (o sea admin)
        const [pedidos] = await pool.query(
            'SELECT p.id, p.fecha as fecha_compra, p.estado FROM pedidos p WHERE p.id = ? AND (p.usuario_id = ? OR ? = "admin")',
            [req.params.id, req.usuario.id, req.usuario.rol]
        );

        if (pedidos.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        // Calcular el total
        const [totalResult] = await pool.query(
            'SELECT SUM(precio_unitario * cantidad) as total FROM detalles_pedido WHERE pedido_id = ?',
            [req.params.id]
        );

        // Obtener detalles
        const [detalles] = await pool.query(
            `SELECT dp.cantidad, dp.precio_unitario, 
                    p.id as producto_id, p.referencia, p.nombre, p.imagen
             FROM detalles_pedido dp
             JOIN productos p ON dp.producto_id = p.id
             WHERE dp.pedido_id = ?`,
            [req.params.id]
        );

        const pedidoConTotal = {
            ...pedidos[0],
            total: totalResult[0].total || 0
        };

        res.json({
            compra: pedidoConTotal,
            detalles: detalles
        });
    } catch (error) {
        console.error('Error al obtener detalle de compra:', error);
        res.status(500).json({ error: 'Error al obtener detalle de compra' });
    }
});

// ENDPOINTS DE PERFIL DE USUARIO

// Obtener datos del perfil
app.get('/api/perfil', verificarToken, async (req, res) => {
    try {
        const [usuarios] = await pool.query(
            'SELECT id, nombre, apellidos, email, rol, fecha_registro FROM usuarios WHERE id = ?',
            [req.usuario.id]
        );
        
        if (usuarios.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json(usuarios[0]);
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
});

// Actualizar datos del perfil
app.put('/api/perfil', verificarToken, async (req, res) => {
    try {
        const { nombre, apellidos, email } = req.body;
        
        // Validar campos
        if (!nombre || !apellidos || !email) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }
        
        // Verificar si el email ya existe (si se está cambiando)
        if (email !== req.usuario.email) {
            const [existingUsers] = await pool.query('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, req.usuario.id]);
            if (existingUsers.length > 0) {
                return res.status(400).json({ error: 'El email ya está en uso' });
            }
        }
        
        // Actualizar datos
        await pool.query(
            'UPDATE usuarios SET nombre = ?, apellidos = ?, email = ? WHERE id = ?',
            [nombre, apellidos, email, req.usuario.id]
        );
        
        res.json({ mensaje: 'Perfil actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

// Cambiar contraseña
app.put('/api/cambiar-password', verificarToken, async (req, res) => {
    try {
        const { passwordActual, passwordNueva } = req.body;
        
        // Validar campos
        if (!passwordActual || !passwordNueva) {
            return res.status(400).json({ error: 'Ambas contraseñas son obligatorias' });
        }
        
        // Obtener usuario
        const [usuarios] = await pool.query('SELECT password FROM usuarios WHERE id = ?', [req.usuario.id]);
        
        if (usuarios.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        // Verificar contraseña actual
        const validPassword = await bcrypt.compare(passwordActual, usuarios[0].password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Contraseña actual incorrecta' });
        }
        
        // Hash de la nueva contraseña
        const hashedPassword = await bcrypt.hash(passwordNueva, 10);
        
        // Actualizar contraseña
        await pool.query('UPDATE usuarios SET password = ? WHERE id = ?', [hashedPassword, req.usuario.id]);
        
        res.json({ mensaje: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({ error: 'Error al cambiar contraseña' });
    }
});

// NUEVO SISTEMA DE CARRITO CON CADUCIDAD

const cartExpirationTime = 10 * 60 * 1000; // 10 minutos en milisegundos
const activeCarts = new Map(); // Almacena los carritos activos

// Middleware para verificar si el carrito existe y no ha expirado
const validateCart = async (req, res, next) => {
    const cartId = req.params.cartId;
    const cart = activeCarts.get(cartId);
    
    if (!cart) {
        return res.status(404).json({ error: 'Carrito no encontrado' });
    }
    
    if (Date.now() > cart.expirationTime) {
        // El carrito ha expirado
        await releaseCartStock(cartId);
        activeCarts.delete(cartId);
        return res.status(410).json({ error: 'El carrito ha expirado' });
    }
    
    next();
};

// Función para devolver el stock cuando un carrito expira
const releaseCartStock = async (cartId) => {
    const cart = activeCarts.get(cartId);
    if (!cart) return;
    
    try {
        for (const item of cart.items) {
            // Liberar el stock reservado para este producto
            await pool.query(
                'UPDATE productos SET stock = stock + ? WHERE id = ?',
                [item.quantity, item.productId]
            );
        }
        
        console.log(`Stock liberado para el carrito ${cartId}`);
    } catch (error) {
        console.error('Error al liberar stock:', error);
    }
};

// Crear un nuevo carrito
app.post('/api/cart', verificarToken, async (req, res) => {
    try {
        const userId = req.usuario.id;
        const cartId = uuidv4(); // Genera un ID único para el carrito
        
        const newCart = {
            id: cartId,
            userId: userId,
            items: [],
            createdAt: Date.now(),
            expirationTime: Date.now() + cartExpirationTime
        };
        
        activeCarts.set(cartId, newCart);
        
        // Programar limpieza del carrito cuando expire
        setTimeout(async () => {
            if (activeCarts.has(cartId)) {
                await releaseCartStock(cartId);
                activeCarts.delete(cartId);
                console.log(`Carrito ${cartId} expiró automáticamente`);
            }
        }, cartExpirationTime);
        
        res.status(201).json({ cartId: cartId });
    } catch (error) {
        console.error('Error al crear carrito:', error);
        res.status(500).json({ error: 'Error al crear el carrito' });
    }
});

// Obtener información de un carrito
app.get('/api/cart/:cartId', verificarToken, validateCart, (req, res) => {
    const cartId = req.params.cartId;
    const cart = activeCarts.get(cartId);
    
    // Calcular tiempo restante
    const timeRemaining = Math.max(0, cart.expirationTime - Date.now());
    const secondsRemaining = Math.floor(timeRemaining / 1000);
    
    res.json({
        id: cart.id,
        items: cart.items,
        timeRemaining: secondsRemaining
    });
});

// Añadir un producto al carrito
app.post('/api/cart/:cartId/items', verificarToken, validateCart, async (req, res) => {
    try {
        const cartId = req.params.cartId;
        const { productId, quantity } = req.body;
        
        if (!productId || !quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Datos inválidos' });
        }
        
        // Verificar stock disponible
        const [rows] = await pool.query('SELECT * FROM productos WHERE id = ?', [productId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        const product = rows[0];
        
        if (product.stock < quantity) {
            return res.status(400).json({ error: 'No hay suficiente stock disponible' });
        }
        
        const cart = activeCarts.get(cartId);
        
        // Verificar si el producto ya está en el carrito
        const existingItemIndex = cart.items.findIndex(item => item.productId === parseInt(productId));
        
        if (existingItemIndex !== -1) {
            // Actualizar cantidad existente
            const newQuantity = cart.items[existingItemIndex].quantity + parseInt(quantity);
            
            if (product.stock < newQuantity) {
                return res.status(400).json({ error: 'No hay suficiente stock para la cantidad solicitada' });
            }
            
            cart.items[existingItemIndex].quantity = newQuantity;
        } else {
            // Añadir nuevo item
            cart.items.push({
                productId: parseInt(productId),
                name: product.nombre,
                price: parseFloat(product.precio),
                quantity: parseInt(quantity),
                image: product.imagen || '',
                stock: product.stock
            });
        }
        
        // Reducir stock
        await pool.query(
            'UPDATE productos SET stock = stock - ? WHERE id = ?',
            [parseInt(quantity), productId]
        );
        
        res.status(201).json({ message: 'Producto añadido al carrito' });
    } catch (error) {
        console.error('Error al añadir producto al carrito:', error);
        res.status(500).json({ error: 'Error al añadir producto al carrito' });
    }
});

// Actualizar cantidad de un producto en el carrito
app.put('/api/cart/:cartId/items/:productId', verificarToken, validateCart, async (req, res) => {
    try {
        const cartId = req.params.cartId;
        const productId = parseInt(req.params.productId);
        const { quantity } = req.body;
        
        if (!quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Cantidad inválida' });
        }
        
        const cart = activeCarts.get(cartId);
        
        // Buscar el item en el carrito
        const itemIndex = cart.items.findIndex(item => item.productId === productId);
        
        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
        }
        
        const currentItem = cart.items[itemIndex];
        
        // Verificar stock disponible
        const [rows] = await pool.query('SELECT stock FROM productos WHERE id = ?', [productId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        const availableStock = rows[0].stock + currentItem.quantity; // Stock actual + lo que ya está en el carrito
        
        if (quantity > availableStock) {
            return res.status(400).json({ error: 'No hay suficiente stock disponible' });
        }
        
        // Ajustar el stock
        const stockDifference = quantity - currentItem.quantity;
        
        await pool.query(
            'UPDATE productos SET stock = stock - ? WHERE id = ?',
            [stockDifference, productId]
        );
        
        // Actualizar cantidad en el carrito
        cart.items[itemIndex].quantity = quantity;
        
        res.json({ message: 'Cantidad actualizada' });
    } catch (error) {
        console.error('Error al actualizar cantidad:', error);
        res.status(500).json({ error: 'Error al actualizar cantidad' });
    }
});

// Eliminar un producto del carrito
app.delete('/api/cart/:cartId/items/:productId', verificarToken, validateCart, async (req, res) => {
    try {
        const cartId = req.params.cartId;
        const productId = parseInt(req.params.productId);
        
        const cart = activeCarts.get(cartId);
        
        // Buscar el item en el carrito
        const itemIndex = cart.items.findIndex(item => item.productId === productId);
        
        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
        }
        
        const removedItem = cart.items[itemIndex];
        
        // Devolver el stock
        await pool.query(
            'UPDATE productos SET stock = stock + ? WHERE id = ?',
            [removedItem.quantity, productId]
        );
        
        // Eliminar el item del carrito
        cart.items.splice(itemIndex, 1);
        
        res.json({ message: 'Producto eliminado del carrito' });
    } catch (error) {
        console.error('Error al eliminar producto del carrito:', error);
        res.status(500).json({ error: 'Error al eliminar producto del carrito' });
    }
});

// Extender el tiempo de expiración del carrito
app.put('/api/cart/:cartId/refresh', verificarToken, validateCart, (req, res) => {
    const cartId = req.params.cartId;
    const cart = activeCarts.get(cartId);
    
    // Extender tiempo de expiración
    cart.expirationTime = Date.now() + cartExpirationTime;
    
    res.json({ message: 'Tiempo de carrito extendido' });
});

// Finalizar compra
app.post('/api/cart/:cartId/checkout', verificarToken, validateCart, async (req, res) => {
    try {
        const cartId = req.params.cartId;
        const cart = activeCarts.get(cartId);
        const userId = req.usuario.id;
        
        // Si el carrito está vacío
        if (cart.items.length === 0) {
            return res.status(400).json({ error: 'El carrito está vacío' });
        }
        
        // Crear un registro de pedido en la base de datos
        const [orderResult] = await pool.query(
            'INSERT INTO pedidos (usuario_id, fecha, estado) VALUES (?, NOW(), ?)',
            [userId, 'completado']
        );
        
        const orderId = orderResult.insertId;
        
        // Insertar detalles del pedido
        for (const item of cart.items) {
            await pool.query(
                'INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
                [orderId, item.productId, item.quantity, item.price]
            );
        }
        
        // Eliminar el carrito
        activeCarts.delete(cartId);
        
        res.status(201).json({ 
            message: 'Pedido completado correctamente',
            orderId: orderId 
        });
    } catch (error) {
        console.error('Error al procesar el pedido:', error);
        res.status(500).json({ error: 'Error al procesar el pedido' });
    }
});

// Eliminar carrito
app.delete('/api/cart/:cartId', verificarToken, validateCart, async (req, res) => {
    try {
        const cartId = req.params.cartId;
        
        // Liberar stock de los productos
        await releaseCartStock(cartId);
        
        // Eliminar el carrito
        activeCarts.delete(cartId);
        
        res.json({ message: 'Carrito eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar el carrito:', error);
        res.status(500).json({ error: 'Error al eliminar el carrito' });
    }
});

// Tarea programada para limpiar carritos expirados
const cleanupExpiredCarts = async () => {
    console.log('Ejecutando limpieza de carritos expirados...');
    
    const now = Date.now();
    const expiredCartIds = [];
    
    activeCarts.forEach((cart, cartId) => {
        if (now > cart.expirationTime) {
            expiredCartIds.push(cartId);
        }
    });
    
    for (const cartId of expiredCartIds) {
        await releaseCartStock(cartId);
        activeCarts.delete(cartId);
        console.log(`Carrito expirado eliminado: ${cartId}`);
    }
};

// Ejecutar limpieza cada 5 minutos
setInterval(cleanupExpiredCarts, 5 * 60 * 1000);

// Tarea programada para eliminar carritos expirados del sistema antiguo
setInterval(async () => {
    try {
        await pool.query('DELETE FROM carrito WHERE fecha_expiracion < NOW()');
        console.log('Limpieza de carritos expirados completada');
    } catch (error) {
        console.error('Error al limpiar carritos expirados:', error);
    }
}, 5 * 60 * 1000); // Ejecutar cada 5 minutos

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});