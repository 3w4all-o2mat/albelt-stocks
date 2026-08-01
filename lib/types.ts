export type PieceType = "BO" | "CC" | "CS" | "CP" | "SI";

export interface Category {
  id: number;
  name: string;
  nature: string;
  color: string;
  plies: string;
  thickness: string;
  motif: string;
  si_active: boolean;
}

export interface NewCategoryInput {
  nature: string;
  color: string;
  plies: string;
  thickness: string;
  motif: string;
  si_active?: boolean;
}

export interface UpdateCategoryInput {
  nature?: string;
  color?: string;
  plies?: string;
  thickness?: string;
  motif?: string;
  si_active?: boolean;
}

// ---------------------------------------------------------------------------
// Country
// ---------------------------------------------------------------------------

export interface Country {
  code: string;
  name_fr: string;
  name_en: string;
}

export interface NewCountryInput {
  code: string;
  name_fr: string;
  name_en: string;
}

export interface UpdateCountryInput {
  name_fr?: string;
  name_en?: string;
}

// ---------------------------------------------------------------------------
// Supplier
// ---------------------------------------------------------------------------

export interface Supplier {
  id: number;
  name: string;
  country_code: string;
  /** Populated when joining with albelt_country */
  country_name?: string;
  is_active: boolean;
  date_creation: string;
}

export interface NewSupplierInput {
  name: string;
  country_code: string;
  is_active?: boolean;
}

export interface UpdateSupplierInput {
  name?: string;
  country_code?: string;
  is_active?: boolean;
}

// ---------------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------------

export type VariableType = "integer" | "string" | "boolean";

export interface AppVariable {
  id: number;
  key: string;
  label: string;
  type: VariableType;
  value: string;
  date_creation: string;
  write_date: string;
}

export interface NewVariableInput {
  key: string;
  label: string;
  type: VariableType;
  value: string;
}

export interface UpdateVariableInput {
  label?: string;
  type?: VariableType;
  value?: string;
}

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------

export interface JournalEntry {
  id: number;
  operation: string;
  user_id: number | null;
  user_name: string;
  date: string;
}

export interface CreateJournalInput {
  operation: string;
  user_id: number;
  user_name: string;
}

export interface StockBase {
  id: number;
  name: string | null;
  chained_name: string | null;
  reference: string | null;
  type: PieceType;
  stk_category_id: number;
  category?: Category;
  sequence: number | null;
  parent_id: number | null;
  longueur: number;
  largeur: number;
  cute_x: number;
  cute_y: number;
  surface: number | null;
  surface_restante: number | null;
  atelier: string;
  user_id: number | null;
  company_id: number | null;
  is_consumed: boolean | null;
  observation: string | null;
  cmd_id: number | null;
  cmd_name: string | null;
  cmd_date: string | null;
  client_name: string | null;
  line_designation: string | null;
  line_qty: number | null;
  create_uid: number | null;
  create_date: string | null;
  write_uid: number | null;
  write_date: string | null;
  line_id: number | null;
  user_full_name?: string | null;
  user_username?: string | null;
  supplier_id?: number | null;
  supplier?: Supplier;
  year?: number | null;
}

export interface BO extends StockBase {
  type: "BO";
  parent_id: null;
  children?: StockPiece[];
}

export interface CC extends StockBase {
  type: "CC";
  parent_id: number;
  cmd_id: number | null;
  cmd_name: string | null;
}

export interface CS extends StockBase {
  type: "CS";
  parent_id: number;
  children?: StockPiece[];
}

export interface CP extends StockBase {
  type: "CP";
  parent_id: number;
}

export interface SI extends StockBase {
  type: "SI";
}

export type StockPiece = BO | CC | CS | CP | SI;

export interface Ancestor {
  id: number;
  name: string | null;
  chained_name: string | null;
  type: PieceType;
  parent_id: number | null;
  depth: number;
}

export interface NewCutInput {
  type: "CC" | "CS" | "CP";
  stk_category_id: number;
  parent_id: number;
  longueur: number;
  largeur: number;
  cute_x: number;
  cute_y: number;
  cmd_id?: number | null;
  cmd_name?: string | null;
  line_id?: number | null;
  atelier: string;
  user_id: number;
  company_id: number;
  observation?: string | null;
  create_uid: number;
}

export interface NewBOInput {
  stk_category_id: number;
  longueur: number;
  largeur: number;
  atelier: string;
  user_id: number;
  company_id: number;
  observation?: string | null;
  create_uid: number;
  supplier_id?: number | null;
  year?: number | null;
}

export const TYPE_COLORS: Record<PieceType, string> = {
  BO: "#1F2937",
  CC: "#3B82F6",
  CS: "#F59E0B",
  CP: "#EF4444",
  SI: "#8B5CF6",
};

export const TYPE_LABELS: Record<PieceType, string> = {
  BO: "Bobine",
  CC: "Coupe Commande",
  CS: "Chute Stockée",
  CP: "Chute Perdue",
  SI: "Stock Initial",
};

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

export type MembershipRole = "master" | "manager" | "user";

/** Full row from albelt_membership (never expose password_hash to clients). */
export interface MembershipUser {
  id: number;
  username: string;
  email: string;
  odoo_username: string | null;
  role: MembershipRole;
  full_name: string | null;
  date_creation: string;
  is_active: boolean;
  /** IDs of ateliers this user is allowed to view/use (manager/user only). */
  atelier_ids: number[];
}

/** Safe shape sent to the client (no password_hash). */
export type MembershipUserPublic = MembershipUser;

export interface NewUserInput {
  username: string;
  full_name?: string | null;
  email: string;
  odoo_username?: string | null;
  role: MembershipRole;
  password: string;
  /** Ateliers assigned to the user on creation. */
  atelier_ids?: number[];
}

export interface UpdateUserInput {
  full_name?: string | null;
  email?: string;
  odoo_username?: string | null;
  role?: MembershipRole;
  password?: string | null;
  is_active?: boolean;
  /** Replaces the user's atelier assignments when provided. */
  atelier_ids?: number[];
}

export interface UpdateProfileInput {
  full_name?: string | null;
  email?: string;
}

export interface ChangePasswordInput {
  current_password: string;
  new_password: string;
}

export const ROLE_LABELS: Record<MembershipRole, string> = {
  master: "Master",
  manager: "Manager",
  user: "User",
};

// ---------------------------------------------------------------------------
// Ateliers
// ---------------------------------------------------------------------------

export interface Atelier {
  id: number;
  name: string;
  is_active: boolean;
  date_creation: string;
}

export interface NewAtelierInput {
  name: string;
  is_active?: boolean;
}

export interface UpdateAtelierInput {
  name?: string;
  is_active?: boolean;
}
