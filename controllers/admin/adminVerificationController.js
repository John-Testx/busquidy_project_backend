// 1. Obtener usuarios pendientes
exports.getPendingVerifications = async (req, res) => {
    const users = await db.query("SELECT id_usuario, correo, tipo_usuario, fecha_creacion FROM usuario WHERE estado_verificacion = 'en_revision'");
    res.json(users);
};

// 2. Obtener detalle de un usuario
exports.getUserVerificationDetails = async (req, res) => {
    const { id } = req.params;
    const [user] = await db.query("SELECT id_usuario, correo, tipo_usuario FROM usuario WHERE id_usuario = ?", [id]);
    const documents = await db.query("SELECT tipo_documento, url_documento, estado_documento FROM documentos_verificacion WHERE id_usuario = ?", [id]);

    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ user, documents });
};

// 3. Aprobar
exports.approveUser = async (req, res) => {
    const { id_usuario } = req.body;
    await db.query("UPDATE usuario SET estado_verificacion = 'verificado' WHERE id_usuario = ?", [id_usuario]);
    // (Opcional) Actualizar estado_documento en la otra tabla
    // (Opcional) Enviar email de bienvenida al usuario
    res.json({ message: 'Usuario aprobado' });
};

// 4. Rechazar
exports.rejectUser = async (req, res) => {
    const { id_usuario, motivo } = req.body;
    await db.query("UPDATE usuario SET estado_verificacion = 'rechazado' WHERE id_usuario = ?", [id_usuario]);
    // (Opcional) Guardar el motivo en algún lado
    // (Opcional) Enviar email al usuario con el motivo del rechazo
    res.json({ message: 'Usuario rechazado' });
};