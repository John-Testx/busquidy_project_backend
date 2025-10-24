const adminQueries = require("../../queries/admin/adminQueries");

/**
 * Controlador de permisos de administradores
 */

// Obtener permisos de un administrador
const getAdminPermissions = async (req, res) => {
  const { userId } = req.params;
  
  try {
    const permissions = await adminQueries.findPermissionsByUserId(userId);
    res.json({ 
      permissions: permissions.map(p => p.nombre_permiso) 
    });
  } catch (err) {
    console.error("Error al obtener permisos:", err);
    res.status(500).json({ error: "Error fetching permissions" });
  }
};

module.exports = {
  getAdminPermissions
};