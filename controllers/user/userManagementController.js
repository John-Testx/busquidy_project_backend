const userQueries = require("../../queries/user/userQueries");
const profileQueries = require("../../queries/user/profileQueries");

/**
 * Controlador de gestión de usuarios
 */

// Obtener todos los usuarios
const getAllUsers = async (req, res) => {
  try {
    const users = await userQueries.findAllUsersWithRoles();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obtener usuario por ID
const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await userQueries.findUserById(id);
    if (user.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json(user[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Actualizar estado de usuario
const updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  try {
    await userQueries.updateUserStatus(id, is_active);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Actualizar detalles de usuario
const updateUserDetails = async (req, res) => {
  const { id } = req.params;
  const { correo, rol_usuario, tipo_usuario } = req.body;
  try {
    await userQueries.updateUserDetails(id, correo, rol_usuario, tipo_usuario);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obtener usuarios con datos completos
const getUsersWithData = async (req, res) => {
  try {
    const usuarios = await userQueries.findAllUsers();

    if (usuarios.length === 0) {
      return res.status(404).json({ error: "No se encontraron usuarios" });
    }

    const usuariosConDatos = await Promise.all(
      usuarios.map(async (usuario) => {
        // Comprobamos si el tipo de usuario es CUALQUIERA de los tipos de empresa
        const isEmpresa = usuario.tipo_usuario === "empresa_juridico" || usuario.tipo_usuario === "empresa_natural";
        const isFreelancer = usuario.tipo_usuario === "freelancer";

        const empresa = isEmpresa
          ? await profileQueries.findEmpresaByUserId(usuario.id_usuario)
          : null;

        const freelancer = isFreelancer
          ? await profileQueries.findFreelancerByUserId(usuario.id_usuario)
          : null;

        // Procesar datos de rol y premium
        const idRol = isEmpresa
          ? (empresa ? empresa.id_empresa : null)
          : (freelancer ? freelancer.id_freelancer : null);

        const premium = isEmpresa
          ? (empresa && empresa.premium === 1 ? "Sí" : "No")
          : (freelancer && freelancer.premium === 1 ? "Sí" : "No");

        return {
          ...usuario,
          idRol,
          premium,
          empresa,
          freelancer,
        };
      })
    );

    res.json(usuariosConDatos);
  } catch (error) {
    console.error("Error al obtener los usuarios:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// Eliminar usuario
const deleteUser = async (req, res) => {
  const id_usuario = req.params.id_usuario;

  // Validar que el id_usuario sea válido
  if (!id_usuario || isNaN(id_usuario)) {
    return res.status(400).json({ error: "ID de usuario inválido" });
  }

  try {
    // Verificar usuario
    const usuario = await userQueries.findUserById(id_usuario);
    if (usuario.length === 0) {
      return res.status(404).json({ error: "No se encontró el usuario" });
    }

    await userQueries.deleteUserById(id_usuario);
    res.status(200).json({ message: "Usuario eliminado exitosamente" });
  } catch (error) {
    console.error("Error al eliminar el usuario:", error);
    res.status(500).json({ error: "Error al eliminar el usuario" });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserDetails,
  getUsersWithData,
  deleteUser
};