-- ============================================================================
-- Albelt Stocks — Complete schema
-- ============================================================================
-- Consolidated single-file deployment for fresh databases.
-- Idempotent: all statements use IF NOT EXISTS / IF NOT NULL / ON CONFLICT,
-- so it is safe to run multiple times.
-- ============================================================================
-- Usage:
--   psql "$DATABASE_URL" -f db/full-schema.sql
--   node -e "const {Pool}=require('pg');new Pool({connectionString:process.env.DATABASE_URL}).query(require('fs').readFileSync('db/full-schema.sql','utf8')).then(()=>console.log('OK')).catch(e=>console.error(e))"
-- ============================================================================


-- ############################################################################
-- SECTION 0 — Base tables (from db/migration.sql)
-- ############################################################################

-- Sequences
CREATE SEQUENCE IF NOT EXISTS public.albelt_stocks_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.albelt_stocks_categories_id_seq;

-- Categories
CREATE TABLE IF NOT EXISTS public.albelt_stocks_categories
(
    id          integer PRIMARY KEY DEFAULT nextval('albelt_stocks_categories_id_seq'),
    name        character varying,
    nature      character varying NOT NULL,
    color       character varying NOT NULL,
    plies       character varying NOT NULL,
    thickness   character varying NOT NULL,
    motif       character varying NOT NULL,
    create_uid  integer,
    create_date timestamp,
    write_uid   integer,
    write_date  timestamp
);

-- Stocks (single table, discriminated by `type`)
CREATE TABLE IF NOT EXISTS public.albelt_stocks
(
    id                  integer PRIMARY KEY DEFAULT nextval('albelt_stocks_id_seq'),
    name                character varying,
    chained_name        character varying,
    reference           character varying,
    type                character varying NOT NULL,
    stk_category_id     integer NOT NULL,
    sequence            integer,
    parent_id           integer,
    longueur            integer NOT NULL,
    largeur             integer NOT NULL,
    cute_x              integer NOT NULL,
    cute_y              integer NOT NULL,
    cmd_name            character varying,
    cmd_id              integer,
    surface             integer,
    surface_restante    integer,
    atelier             character varying NOT NULL,
    user_id             integer,
    company_id          integer,
    is_consumed         boolean,
    observation         text,
    create_uid          integer,
    create_date         timestamp,
    write_uid           integer,
    write_date          timestamp,
    line_id             integer,
    CONSTRAINT albelt_stocks_parent_fk
        FOREIGN KEY (parent_id) REFERENCES public.albelt_stocks(id) ON DELETE CASCADE,
    CONSTRAINT albelt_stocks_category_fk
        FOREIGN KEY (stk_category_id) REFERENCES public.albelt_stocks_categories(id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_albelt_stocks_type      ON public.albelt_stocks(type);
CREATE INDEX IF NOT EXISTS idx_albelt_stocks_parent    ON public.albelt_stocks(parent_id);
CREATE INDEX IF NOT EXISTS idx_albelt_stocks_category  ON public.albelt_stocks(stk_category_id);
CREATE INDEX IF NOT EXISTS idx_albelt_stocks_create    ON public.albelt_stocks(create_date DESC);

-- Seed a sample category so the app is usable immediately
INSERT INTO public.albelt_stocks_categories
    (name, nature, color, plies, thickness, motif, create_date, write_date)
SELECT 'Caoutchouc Noir', 'Caoutchouc', 'Noir', '2', '3mm', 'Lisse', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.albelt_stocks_categories LIMIT 1);


-- ############################################################################
-- SECTION 1 — 001_create_albelt_membership.sql
-- ############################################################################
-- Authentication and role-based access control.

CREATE SEQUENCE IF NOT EXISTS public.albelt_membership_id_seq;

CREATE TABLE IF NOT EXISTS public.albelt_membership
(
    id               integer PRIMARY KEY DEFAULT nextval('albelt_membership_id_seq'),
    username         varchar(50)  NOT NULL UNIQUE,
    password_hash    text         NOT NULL,
    email            varchar(255) NOT NULL UNIQUE,
    odoo_username    varchar(100),
    role             varchar(20)  NOT NULL DEFAULT 'user'
                        CHECK (role IN ('master', 'manager', 'user')),
    full_name        varchar(150),
    atelier_id       integer,
    date_creation    timestamp    NOT NULL DEFAULT NOW(),
    is_active        boolean      NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_albelt_membership_atelier_id
        FOREIGN KEY (atelier_id) REFERENCES public.albelt_atelier(id) ON DELETE SET NULL
);

-- Idempotent migration: add atelier_id if the table was created before this column existed.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'albelt_membership'
          AND column_name = 'atelier_id'
    ) THEN
        ALTER TABLE public.albelt_membership
            ADD COLUMN atelier_id integer;
        ALTER TABLE public.albelt_membership
            ADD CONSTRAINT fk_albelt_membership_atelier_id
            FOREIGN KEY (atelier_id) REFERENCES public.albelt_atelier(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_albelt_membership_atelier_id
            ON public.albelt_membership (atelier_id);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_albelt_membership_role
    ON public.albelt_membership (role);
CREATE INDEX IF NOT EXISTS idx_albelt_membership_date_creation
    ON public.albelt_membership (date_creation);
CREATE INDEX IF NOT EXISTS idx_albelt_membership_atelier_id
    ON public.albelt_membership (atelier_id);


-- ############################################################################
-- SECTION 2 — 002_create_albelt_atelier.sql
-- ############################################################################
-- Ateliers (workshops) referenced by stock pieces.

CREATE SEQUENCE IF NOT EXISTS public.albelt_atelier_id_seq;

CREATE TABLE IF NOT EXISTS public.albelt_atelier
(
    id            integer PRIMARY KEY DEFAULT nextval('public.albelt_atelier_id_seq'),
    name          varchar(100) NOT NULL UNIQUE,
    is_active     boolean      NOT NULL DEFAULT TRUE,
    date_creation timestamp    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_albelt_atelier_name
    ON public.albelt_atelier (name);
CREATE INDEX IF NOT EXISTS idx_albelt_atelier_is_active
    ON public.albelt_atelier (is_active);

-- Migration: add code column if it doesn't exist (safe to run multiple times)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'albelt_atelier'
      AND column_name = 'code'
  ) THEN
    ALTER TABLE public.albelt_atelier ADD COLUMN code varchar(10) NOT NULL DEFAULT '';
    ALTER TABLE public.albelt_atelier ADD CONSTRAINT albelt_atelier_code_name UNIQUE (code, name);
    CREATE INDEX IF NOT EXISTS idx_albelt_atelier_code ON public.albelt_atelier (code);
  END IF;
END
$$;

-- Seed existing ateliers with their codes (idempotent)
INSERT INTO public.albelt_atelier (code, name, is_active, date_creation)
VALUES ('39', 'Eloued', true, NOW())
ON CONFLICT (name) DO UPDATE
    SET code = EXCLUDED.code;

INSERT INTO public.albelt_atelier (code, name, is_active, date_creation)
VALUES ('35', 'Boumerdes', true, NOW())
ON CONFLICT (name) DO UPDATE
    SET code = EXCLUDED.code;

INSERT INTO public.albelt_atelier (code, name, is_active, date_creation)
VALUES ('31', 'Oran', true, NOW())
ON CONFLICT (name) DO UPDATE
    SET code = EXCLUDED.code;


-- ############################################################################
-- SECTION 3 — 003_create_albelt_journal.sql
-- ############################################################################
-- Operation journal for audit trail.

CREATE SEQUENCE IF NOT EXISTS public.albelt_journal_id_seq;

CREATE TABLE IF NOT EXISTS public.albelt_journal
(
    id          integer PRIMARY KEY DEFAULT nextval('public.albelt_journal_id_seq'),
    operation   text         NOT NULL,
    user_id     integer      NULL REFERENCES public.albelt_membership(id) ON DELETE SET NULL,
    user_name   varchar(50)  NOT NULL DEFAULT 'system',
    date        timestamp    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_albelt_journal_date
    ON public.albelt_journal (date DESC);
CREATE INDEX IF NOT EXISTS idx_albelt_journal_user_id
    ON public.albelt_journal (user_id);


-- ############################################################################
-- SECTION 4 — 004_create_albelt_variables.sql
-- ############################################################################
-- Application-wide key/value settings.

CREATE SEQUENCE IF NOT EXISTS public.albelt_variables_id_seq;

CREATE TABLE IF NOT EXISTS public.albelt_variables
(
    id          integer PRIMARY KEY DEFAULT nextval('public.albelt_variables_id_seq'),
    key         varchar(100) NOT NULL UNIQUE,
    label       text         NOT NULL,
    type        varchar(20)  NOT NULL CHECK (type IN ('integer', 'string', 'boolean')),
    value       text         NOT NULL,
    date_creation timestamp  NOT NULL DEFAULT NOW(),
    write_date    timestamp  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_albelt_variables_key
    ON public.albelt_variables (key);

-- Default variables
INSERT INTO public.albelt_variables (key, label, type, value)
VALUES ('DELETE_OPERATION_HOURS', 'Nombre d''heures pour supprimer l''operation', 'integer', '12')
ON CONFLICT (key) DO NOTHING;


-- ############################################################################
-- SECTION 5 — 005_create_albelt_membership_atelier.sql
-- ############################################################################
-- Join table: which workshops each non-master user can access.

CREATE TABLE IF NOT EXISTS public.albelt_membership_atelier
(
    membership_id integer NOT NULL,
    atelier_id    integer NOT NULL,
    CONSTRAINT albelt_membership_atelier_pk
        PRIMARY KEY (membership_id, atelier_id),
    CONSTRAINT albelt_membership_atelier_membership_fk
        FOREIGN KEY (membership_id) REFERENCES public.albelt_membership(id) ON DELETE CASCADE,
    CONSTRAINT albelt_membership_atelier_atelier_fk
        FOREIGN KEY (atelier_id) REFERENCES public.albelt_atelier(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_albelt_membership_atelier_membership
    ON public.albelt_membership_atelier (membership_id);
CREATE INDEX IF NOT EXISTS idx_albelt_membership_atelier_atelier
    ON public.albelt_membership_atelier (atelier_id);


-- ############################################################################
-- SECTION 6 — 006_add_si_active_to_categories.sql
-- ############################################################################
-- Flag to auto-create SI stock line for a category.

ALTER TABLE public.albelt_stocks_categories
  ADD COLUMN IF NOT EXISTS si_active boolean NOT NULL DEFAULT false;


-- ############################################################################
-- SECTION 7 — 007_create_albelt_country.sql
-- ############################################################################
-- Countries reference table.

CREATE SEQUENCE IF NOT EXISTS public.albelt_country_code_seq;

CREATE TABLE IF NOT EXISTS public.albelt_country
(
    code       VARCHAR(3)  PRIMARY KEY,
    name_fr    VARCHAR(100) NOT NULL,
    name_en    VARCHAR(100) NOT NULL
);

INSERT INTO public.albelt_country (code, name_fr, name_en) VALUES
    ('FR', 'France', 'France'),
    ('BE', 'Belgique', 'Belgium'),
    ('DE', 'Allemagne', 'Germany'),
    ('IT', 'Italie', 'Italy'),
    ('ES', 'Espagne', 'Spain'),
    ('NL', 'Pays-Bas', 'Netherlands'),
    ('LU', 'Luxembourg', 'Luxembourg'),
    ('CH', 'Suisse', 'Switzerland'),
    ('PT', 'Portugal', 'Portugal'),
    ('GB', 'Royaume-Uni', 'United Kingdom'),
    ('IE', 'Irlande', 'Ireland'),
    ('DK', 'Danemark', 'Denmark'),
    ('SE', 'Suède', 'Sweden'),
    ('NO', 'Norvège', 'Norway'),
    ('FI', 'Finlande', 'Finland'),
    ('AT', 'Autriche', 'Austria'),
    ('PL', 'Pologne', 'Poland'),
    ('CZ', 'République tchèque', 'Czech Republic'),
    ('SK', 'Slovaquie', 'Slovakia'),
    ('HU', 'Hongrie', 'Hungary'),
    ('RO', 'Roumanie', 'Romania'),
    ('BG', 'Bulgarie', 'Bulgaria'),
    ('GR', 'Grèce', 'Greece'),
    ('HR', 'Croatie', 'Croatia'),
    ('SI', 'Slovénie', 'Slovenia'),
    ('LT', 'Lituanie', 'Lithuania'),
    ('LV', 'Lettonie', 'Latvia'),
    ('EE', 'Estonie', 'Estonia'),
    ('MA', 'Maroc', 'Morocco'),
    ('DZ', 'Algérie', 'Algeria'),
    ('TN', 'Tunisie', 'Tunisia'),
    ('TR', 'Turquie', 'Turkey'),
    ('CN', 'Chine', 'China'),
    ('IN', 'Inde', 'India'),
    ('JP', 'Japon', 'Japan'),
    ('KR', 'Corée du Sud', 'South Korea'),
    ('US', 'États-Unis', 'United States'),
    ('CA', 'Canada', 'Canada'),
    ('BR', 'Brésil', 'Brazil'),
    ('RU', 'Russie', 'Russia'),
    ('UA', 'Ukraine', 'Ukraine')
ON CONFLICT (code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_albelt_country_name_fr
    ON public.albelt_country (name_fr);


-- ############################################################################
-- SECTION 8 — 008_create_albelt_supplier.sql
-- ############################################################################
-- Suppliers.

CREATE SEQUENCE IF NOT EXISTS public.albelt_supplier_id_seq;

CREATE TABLE IF NOT EXISTS public.albelt_supplier
(
    id            integer PRIMARY KEY DEFAULT nextval('public.albelt_supplier_id_seq'),
    name          varchar(200) NOT NULL UNIQUE,
    country_code  varchar(3)   NOT NULL REFERENCES public.albelt_country(code) ON DELETE RESTRICT,
    is_active     boolean      NOT NULL DEFAULT TRUE,
    date_creation timestamp    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_albelt_supplier_name
    ON public.albelt_supplier (name);
CREATE INDEX IF NOT EXISTS idx_albelt_supplier_country
    ON public.albelt_supplier (country_code);
CREATE INDEX IF NOT EXISTS idx_albelt_supplier_is_active
    ON public.albelt_supplier (is_active);


-- ############################################################################
-- SECTION 9 — 009_add_supplier_and_year_to_stocks.sql
-- ############################################################################
-- Extend stocks with supplier reference and manufacturing year.

ALTER TABLE public.albelt_stocks
  ADD COLUMN IF NOT EXISTS supplier_id integer REFERENCES public.albelt_supplier(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS year integer;

CREATE INDEX IF NOT EXISTS idx_albelt_stocks_supplier
    ON public.albelt_stocks (supplier_id);
CREATE INDEX IF NOT EXISTS idx_albelt_stocks_year
    ON public.albelt_stocks (year);


-- ############################################################################
-- SECTION 10 — 010_remove_cmd_line_id_from_stocks.sql
-- ############################################################################
-- Remove legacy Odoo column that is no longer used.

ALTER TABLE public.albelt_stocks DROP COLUMN IF EXISTS cmd_line_id;


-- ############################################################################
-- SECTION 11 — 011_create_albelt_clients.sql
-- ############################################################################
-- Clients / contacts reference table.

CREATE SEQUENCE IF NOT EXISTS public.albelt_clients_id_seq;

CREATE TABLE IF NOT EXISTS public.albelt_clients
(
    id            integer PRIMARY KEY DEFAULT nextval('public.albelt_clients_id_seq'),
    name          varchar(200) NOT NULL,
    address       text,
    email         varchar(255),
    phone         varchar(50),
    date_creation timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_albelt_clients_name
    ON public.albelt_clients (name);
CREATE INDEX IF NOT EXISTS idx_albelt_clients_email
    ON public.albelt_clients (email);


-- ############################################################################
-- SECTION 12 — 012_create_albelt_commandes.sql
-- ############################################################################
-- Order headers, linked to a client.

CREATE SEQUENCE IF NOT EXISTS public.albelt_commandes_id_seq;

CREATE TABLE IF NOT EXISTS public.albelt_commandes
(
    cmd_id        integer PRIMARY KEY DEFAULT nextval('public.albelt_commandes_id_seq'),
    client_id     integer   NOT NULL REFERENCES public.albelt_clients(id) ON DELETE RESTRICT,
    cmd_date      timestamp NOT NULL DEFAULT NOW(),
    date_creation timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_albelt_commandes_client
    ON public.albelt_commandes (client_id);
CREATE INDEX IF NOT EXISTS idx_albelt_commandes_date
    ON public.albelt_commandes (cmd_date DESC);


-- ############################################################################
-- SECTION 13 — 013_create_albelt_commandes_lines.sql
-- ############################################################################
-- Individual lines within an order.

CREATE SEQUENCE IF NOT EXISTS public.albelt_commandes_lines_id_seq;

CREATE TABLE IF NOT EXISTS public.albelt_commandes_lines
(
    line_id          integer PRIMARY KEY DEFAULT nextval('public.albelt_commandes_lines_id_seq'),
    cmd_id           integer NOT NULL REFERENCES public.albelt_commandes(cmd_id) ON DELETE CASCADE,
    line_designation text    NOT NULL,
    line_qty         integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_albelt_commandes_lines_cmd
    ON public.albelt_commandes_lines (cmd_id);


-- ############################################################################
-- SECTION 14 — 014_add_line_id_to_stocks.sql
-- ############################################################################
-- Add line_id field to stocks for future command line association.

ALTER TABLE public.albelt_stocks
  ADD COLUMN IF NOT EXISTS line_id integer;


-- ############################################################################
-- SECTION 15 — 015_add_longueurs_to_commandes_lines.sql
-- ############################################################################
-- Per-line original ordered length (mirrored from Odoo's
-- sn_sales_commandes.longueur) and operator-entered right-side exact length
-- captured at CC cut creation.

ALTER TABLE public.albelt_commandes_lines
  ADD COLUMN IF NOT EXISTS longueur_origine integer,
  ADD COLUMN IF NOT EXISTS longueur_dx      integer;


-- ############################################################################
-- SEED — Master user account
-- ############################################################################
--
-- Default credentials (CHANGE IMMEDIATELY after first login via /profile):
--   username: master
--   password: ChangeMe!2026
--
-- The hash below was generated with bcrypt cost = 12.

INSERT INTO public.albelt_membership
    (username, password_hash, email, role, full_name)
VALUES
    ('master',
     '$2b$12$Y8R/D5/E89vOJj9CBsHEX.9vVB/calsTxCuGuEvKesFwcH45xTrTW',
     'master@albelt.local',
     'master',
     'System Master')
ON CONFLICT (username) DO NOTHING;
