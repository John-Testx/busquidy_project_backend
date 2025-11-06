const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
// Importa las otras estrategias aquí...
const userQueries = require("../queries/user/userQueries");

// Necesitarás estas variables en tu archivo .env
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  BACKEND_URL,
} = process.env;

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: `${BACKEND_URL}/api/users/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { id, emails, displayName } = profile;
        const email = emails[0].value;

        // 1. Buscar si el usuario ya existe con este Google ID
        let user = await userQueries.findUserByProviderId("google_id", id);
        if (user) {
          return done(null, user); // Usuario encontrado, iniciar sesión
        }

        // 2. Buscar si el usuario ya existe con ese email (cuenta de correo normal)
        const existingUser = await userQueries.findUserByEmail(email);
        if (existingUser.length > 0) {
          // Si existe, vincula el Google ID a esa cuenta e inicia sesión
          await userQueries.linkProviderToUser(
            existingUser[0].id_usuario,
            "google_id",
            id
          );
          return done(null, existingUser[0]);
        }

        // 3. Es un usuario nuevo.
        // Devolvemos un perfil parcial para que el frontend pida el 'tipo_usuario'
        const partialProfile = {
          newUser: true,
          provider: "google_id",
          providerId: id,
          email: email,
          nombre: displayName,
        };
        return done(null, partialProfile);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// Configura las estrategias de Microsoft y Apple de forma similar...