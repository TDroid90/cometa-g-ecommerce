import { createHash } from "crypto";
import { appendSheetRow, readSheetRows, updateSheetRow } from "@/lib/googleSheets";

const USERS_SHEET = process.env.GOOGLE_SHEETS_USERS_NAME || "USUARIOS";
const PASSWORD_PEPPER = process.env.AUTH_PASSWORD_PEPPER || "cometa-g-v1";

export type UserProfile = {
  email: string;
  nombre?: string;
  apellido?: string;
  direccion?: string;
  telefono?: string;
  profile_complete: boolean;
};

type UserRow = UserProfile & {
  rowNumber: number;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(email: string, password: string): string {
  return createHash("sha256")
    .update(`${normalizeEmail(email)}:${password}:${PASSWORD_PEPPER}`)
    .digest("hex");
}

function rowToUser(row: Record<string, string>, index: number): UserRow {
  return {
    rowNumber: index + 2,
    email: normalizeEmail(row.email),
    password_hash: row.password_hash,
    nombre: row.nombre,
    apellido: row.apellido,
    direccion: row.direccion,
    telefono: row.telefono,
    profile_complete: row.profile_complete === "TRUE" || row.profile_complete === "true",
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function publicUser(user: UserRow): UserProfile {
  return {
    email: user.email,
    nombre: user.nombre,
    apellido: user.apellido,
    direccion: user.direccion,
    telefono: user.telefono,
    profile_complete: user.profile_complete
  };
}

async function getUsers(): Promise<UserRow[]> {
  const rows = await readSheetRows(USERS_SHEET);
  return rows.map(rowToUser).filter((user) => user.email);
}

export async function registerUser(email: string, password: string): Promise<UserProfile> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || password.length < 6) {
    throw new Error("Email invalido o contrasena demasiado corta.");
  }

  const users = await getUsers();
  if (users.some((user) => user.email === normalizedEmail)) {
    throw new Error("Ese email ya esta registrado.");
  }

  const now = new Date().toISOString();
  await appendSheetRow(USERS_SHEET, [
    normalizedEmail,
    hashPassword(normalizedEmail, password),
    "",
    "",
    "",
    "",
    false,
    now,
    now
  ]);

  return {
    email: normalizedEmail,
    profile_complete: false
  };
}

export async function loginUser(email: string, password: string): Promise<UserProfile> {
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = hashPassword(normalizedEmail, password);
  const user = (await getUsers()).find(
    (candidate) => candidate.email === normalizedEmail && candidate.password_hash === passwordHash
  );

  if (!user) {
    throw new Error("Email o contrasena incorrectos.");
  }

  return publicUser(user);
}

export async function updateUserProfile(input: {
  email: string;
  nombre: string;
  apellido: string;
  direccion: string;
  telefono: string;
}): Promise<UserProfile> {
  const normalizedEmail = normalizeEmail(input.email);
  const user = (await getUsers()).find((candidate) => candidate.email === normalizedEmail);

  if (!user) {
    throw new Error("Usuario no encontrado.");
  }

  const now = new Date().toISOString();
  const nextUser: UserRow = {
    ...user,
    nombre: input.nombre.trim(),
    apellido: input.apellido.trim(),
    direccion: input.direccion.trim(),
    telefono: input.telefono.trim(),
    profile_complete: Boolean(
      input.nombre.trim() && input.apellido.trim() && input.direccion.trim() && input.telefono.trim()
    ),
    updated_at: now
  };

  await updateSheetRow(USERS_SHEET, user.rowNumber, [
    nextUser.email,
    nextUser.password_hash,
    nextUser.nombre,
    nextUser.apellido,
    nextUser.direccion,
    nextUser.telefono,
    nextUser.profile_complete,
    nextUser.created_at,
    nextUser.updated_at
  ]);

  return publicUser(nextUser);
}
