import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Look for the DB in the current directory first (for Vercel deployments), otherwise check parent directory
const localDbPath = path.join(process.cwd(), 'local_species_final.db');
const pipelineDbPath = path.join(process.cwd(), '../species-pipeline/local_species_final.db');
const dbPath = fs.existsSync(localDbPath) ? localDbPath : pipelineDbPath;

let db: ReturnType<typeof Database> | null = null;

export function getDb() {
  if (!db) {
    db = new Database(dbPath, { readonly: true });
  }
  return db;
}

export interface SpeciesRecord {
  id: string;
  scientific_name: string;
  common_names: string; // JSON
  taxonomy: string; // JSON
  description: string;
  habitat: string;
  geographic_range: string; // JSON
  diet_type: string;
  conservation_status: string;
  population_trend: string;
  lifespan_years: string;
  weight_kg: string;
  length_cm: string;
  behavior: string;
  reproduction: string;
  image_urls: string; // JSON
  wikipedia_url: string;
}

export function getAllSpecies() {
  const statement = getDb().prepare('SELECT * FROM species');
  return statement.all() as SpeciesRecord[];
}

export function getSpeciesById(id: string) {
  const statement = getDb().prepare('SELECT * FROM species WHERE id = ?');
  return statement.get(id) as SpeciesRecord | undefined;
}
