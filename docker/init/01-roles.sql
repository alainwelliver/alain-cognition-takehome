-- admin is the superuser created by POSTGRES_USER (migrations, demos).
-- app_user is the least-privilege runtime role used by the application.
CREATE ROLE app_user LOGIN PASSWORD 'app_user';

CREATE DATABASE app_test OWNER admin;

GRANT CONNECT ON DATABASE app TO app_user;
GRANT CONNECT ON DATABASE app_test TO app_user;

\connect app
GRANT USAGE ON SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE admin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE admin IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;

\connect app_test
GRANT USAGE ON SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE admin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE admin IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;
