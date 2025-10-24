const roleQueries = require("../../queries/admin/roleQueries");

/**
 * Controlador de roles
 */

// Obtener todos los roles
const getAllRoles = async (req, res) => {
  try {
    const roles = await roleQueries.findAllRoles();
    res.json(roles);
  } catch (error) {
    console.error("Error al obtener roles:", error);
    res.status(500).json({ error: "Error fetching roles" });
  }
};

// Crear nuevo rol
const createRole = async (req, res) => {
  const { nombre_rol, descripcion } = req.body;
  
  try {
    const id_rol = await roleQueries.insertRole(nombre_rol, descripcion);
    res.json({ 
      id_rol, 
      nombre_rol, 
      descripcion 
    });
  } catch (error) {
    console.error("Error al crear rol:", error);
    res.status(500).json({ error: "Error creating role" });
  }
};

// Actualizar rol
const updateRole = async (req, res) => {
  const { id } = req.params;
  const { nombre_rol, descripcion } = req.body;
  
  try {
    const updated = await roleQueries.updateRole(id, nombre_rol, descripcion);
    
    if (!updated) {
      return res.status(404).json({ error: "Rol no encontrado" });
    }
    
    res.json({ 
      id_rol: id, 
      nombre_rol, 
      descripcion 
    });
  } catch (error) {
    console.error("Error al actualizar rol:", error);
    res.status(500).json({ error: "Error updating role" });
  }
};

// Eliminar rol
const deleteRole = async (req, res) => {
  const { id } = req.params;
  
  try {
    const deleted = await roleQueries.deleteRole(id);
    
    if (!deleted) {
      return res.status(404).json({ error: "Rol no encontrado" });
    }
    
    res.json({ message: "Role deleted" });
  } catch (error) {
    console.error("Error al eliminar rol:", error);
    res.status(500).json({ error: "Error deleting role" });
  }
};

module.exports = {
  getAllRoles,
  createRole,
  updateRole,
  deleteRole
};