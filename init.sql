-- Otorgar permisos completos al usuario
GRANT ALL PRIVILEGES ON DATABASE clinic_db TO clinic_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO clinic_user;
ALTER SCHEMA public OWNER TO clinic_user;

-- Configurar permisos por defecto
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO clinic_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO clinic_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO clinic_user;