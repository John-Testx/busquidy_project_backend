const searchQueries = require("../../queries/freelancer/searchQueries");
const { getUserById } = require("../../queries/user/userQueries");

/**
 * Listar todos los freelancers
 */
const listFreelancers = async (req, res) => {
  try {
    const results = await searchQueries.getAllFreelancers();
    
    if (results.length === 0) {
      return res.status(404).json({ error: "No se encontraron freelancers" });
    }

    // Procesar los resultados para formato consistente
    const freelancers = results.map((freelancer) => ({
      id_freelancer: freelancer.id_freelancer,
      nombre: freelancer.nombres,
      apellido: freelancer.apellidos,
      nacionalidad: freelancer.nacionalidad,
      ciudad: freelancer.ciudad,
      comuna: freelancer.comuna,
      correo_contacto: freelancer.correo_contacto,
      telefono_contacto: freelancer.telefono_contacto,
      calificacion_promedio: freelancer.calificacion_promedio,
      descripcion: freelancer.descripcion
    }));

    res.json(freelancers);
  } catch (error) {
    console.log("Error al obtener los freelancers:", error);
    return res.status(500).json({ error: "Error al obtener los freelancers" });
  }
};

/**
 * Obtener perfil público de un freelancer por id_freelancer
 */
const getFreelancerPublicProfile = async (req, res) => {
  const { id } = req.params;

  // Validar que el id sea válido
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "ID de freelancer inválido" });
  }

  try {
    // Obtener freelancer
    const freelancer = await searchQueries.getFreelancerById(id);
    
    if (!freelancer) {
      return res.status(404).json({ error: "No se encontró el freelancer" });
    }

    const id_usuario = freelancer.id_usuario;

    // Obtener usuario
    const usuario = await getUserById(id_usuario);
    
    if (!usuario) {
      return res.status(404).json({ error: "No se encontró el usuario" });
    }

    // Obtener datos completos del perfil público
    const profileData = await searchQueries.getPublicProfileData(id);

    console.log("perfilFreelancerResults:", freelancer);
    console.log("usuarioResults:", usuario);

    // Consolidar los datos en una sola respuesta
    res.json({
      usuario: {
        id_usuario: usuario.id_usuario,
        correo: usuario.correo,
        tipo_usuario: usuario.tipo_usuario
      },
      freelancer: freelancer || null,
      ...profileData
    });
  } catch (error) {
    console.error("Error al obtener el perfil del freelancer:", error);
    res.status(500).json({ error: "Error al obtener el perfil del freelancer" });
  }
};

/**
 * Obtener perfil público de un freelancer por id_usuario (NUEVA FUNCIÓN)
 */
const getFreelancerPublicProfileByUserId = async (req, res) => {
  const { id_usuario } = req.params;

  // Validar que el id sea válido
  if (!id_usuario || isNaN(id_usuario)) {
    return res.status(400).json({ error: "ID de usuario inválido" });
  }

  try {
    // Primero obtener el freelancer usando id_usuario
    const freelancer = await searchQueries.getFreelancerByUserId(id_usuario);
    
    if (!freelancer) {
      return res.status(404).json({ error: "No se encontró el freelancer" });
    }

    const id_freelancer = freelancer.id_freelancer;

    // Obtener usuario
    const usuario = await getUserById(id_usuario);
    
    if (!usuario) {
      return res.status(404).json({ error: "No se encontró el usuario" });
    }

    // Obtener datos completos del perfil público usando id_freelancer
    const profileData = await searchQueries.getPublicProfileData(id_freelancer);

    console.log("Perfil obtenido por id_usuario:", id_usuario);
    console.log("perfilFreelancerResults:", freelancer);
    console.log("usuarioResults:", usuario);

    // Consolidar los datos en una sola respuesta
    res.json({
      usuario: {
        id_usuario: usuario.id_usuario,
        correo: usuario.correo,
        tipo_usuario: usuario.tipo_usuario
      },
      freelancer: freelancer || null,
      ...profileData
    });
  } catch (error) {
    console.error("Error al obtener el perfil del freelancer por id_usuario:", error);
    res.status(500).json({ error: "Error al obtener el perfil del freelancer" });
  }
};

module.exports = {
  listFreelancers,
  getFreelancerPublicProfile,
  getFreelancerPublicProfileByUserId 
};