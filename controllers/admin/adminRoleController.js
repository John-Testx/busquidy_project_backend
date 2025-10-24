const roleQueries = require("../../queries/admin/roleQueries");
const adminQueries = require("../../queries/admin/adminQueries");

/**
 * Controlador de asignación de roles a administradores
 */

// Obtener roles de un administrador (con indicador de cuáles tiene asignados)
const getAdminRoles = async (req, res) => {
  const { adminId } = req.params;
  
  try {
    // Obtener todos los roles
    const allRoles = await roleQueries.findAllRoles();
    
    // Obtener roles asignados a este admin
    const assignedRoles = await adminQueries.findRolesByAdminId(adminId);
    const assignedRoleIds = assignedRoles.map(r => r.id_rol);
    
    // Marcar cuáles roles están seleccionados
    const rolesWithSelected = allRoles.map(r => ({
      ...r,
      selected: assignedRoleIds.includes(r.id_rol),
    }));
    
    res.json(rolesWithSelected);
  } catch (error) {
    console.error("Error al obtener roles del admin:", error);
    res.status(500).json({ error: "Error fetching admin roles" });
  }
};

// Actualizar roles de un administrador
const updateAdminRoles = async (req, res) => {
  const { id } = req.params;
  const { roles } = req.body; // array de IDs de roles
  
  try {
    // Eliminar roles actuales
    await adminQueries.deleteAdminRoles(id);
    
    // Asignar nuevos roles
    await adminQueries.assignRolesToAdmin(id, roles);
    
    res.json({ success: true });
  } catch (err) {
    console.error("Error al actualizar roles del admin:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAdminRoles,
  updateAdminRoles
};