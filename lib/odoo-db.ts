import { Pool } from "pg";

if (!process.env.DATABASE_URL_ODOO) {
  throw new Error("DATABASE_URL_ODOO is not set. Configure .env.local");
}

const odooPool = new Pool({
  connectionString: process.env.DATABASE_URL_ODOO,
});

odooPool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("Unexpected error on idle Odoo pg client", err);
});

export default odooPool;
