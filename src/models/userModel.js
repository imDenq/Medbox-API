// Mise à jour du fichier userModel.js pour inclure les tables MEDBOX ET MÉDICAMENTS

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const createTablesIfNotExists = async () => {
  // Tables existantes (users, links, logs, etc.)
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(100) UNIQUE,
      password VARCHAR(255),
      is_2fa_enabled BOOLEAN DEFAULT FALSE,
      otp_secret VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_admin BOOLEAN DEFAULT FALSE
    );
  `;

  const createLinksTableQuery = `
    CREATE TABLE IF NOT EXISTS links (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      content TEXT,
      file_path TEXT,
      expiration TIMESTAMP,
      max_accesses INTEGER,
      access_count INTEGER DEFAULT 0,
      original_filename TEXT,
      iv VARCHAR(32),
      secure_string VARCHAR(50) UNIQUE,
      client_name VARCHAR(255),
      ticket_number INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createLogTableQuery = `
    CREATE TABLE IF NOT EXISTS linkcreationlog (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      expiration TIMESTAMP,
      max_accesses INTEGER,
      access_count INTEGER DEFAULT 0,
      client_name VARCHAR(255),
      ticket_number INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createLinkDeleteLogTableQuery = `
    CREATE TABLE IF NOT EXISTS linkdeletelog (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      expiration TIMESTAMP,
      max_accesses INTEGER,
      access_count INTEGER,
      client_name VARCHAR(255),
      ticket_number INTEGER,
      created_at TIMESTAMP,
      deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createUserLogTableQuery = `
    CREATE TABLE IF NOT EXISTS userlog (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      ip_address VARCHAR(45),
      login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      account_creation_date TIMESTAMP,
      browser_info TEXT,
      login_count INTEGER DEFAULT 1
    );
  `;

  const createUserModificationsTableQuery = `
    CREATE TABLE IF NOT EXISTS user_modifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      modified_by INTEGER REFERENCES users(id),
      modification_type VARCHAR(50),
      modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createPatchNotesTableQuery = `
    CREATE TABLE IF NOT EXISTS patch_notes (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP
    );
  `;

  // Tables MEDBOX existantes
  const createMedboxDevicesTableQuery = `
    CREATE TABLE IF NOT EXISTS medbox_devices (
      id SERIAL PRIMARY KEY,
      device_id VARCHAR(50) UNIQUE NOT NULL,
      device_name VARCHAR(100) NOT NULL,
      owner_id INTEGER REFERENCES users(id),
      mac_address VARCHAR(17),
      ip_address VARCHAR(45),
      firmware_version VARCHAR(20),
      status VARCHAR(20) DEFAULT 'offline',
      last_seen TIMESTAMP,
      wifi_ssid VARCHAR(32),
      registration_code VARCHAR(10),
      is_registered BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createMedboxCompartmentsTableQuery = `
    CREATE TABLE IF NOT EXISTS medbox_compartments (
      id SERIAL PRIMARY KEY,
      device_id VARCHAR(50) REFERENCES medbox_devices(device_id) ON DELETE CASCADE,
      
      -- Compartiment 0
      comp0_medicine_name VARCHAR(100),
      comp0_medicine_dosage VARCHAR(50),
      comp0_pills_count INTEGER DEFAULT 0,
      comp0_is_active BOOLEAN DEFAULT TRUE,
      
      -- Compartiment 1
      comp1_medicine_name VARCHAR(100),
      comp1_medicine_dosage VARCHAR(50),
      comp1_pills_count INTEGER DEFAULT 0,
      comp1_is_active BOOLEAN DEFAULT TRUE,
      
      -- Compartiment 2
      comp2_medicine_name VARCHAR(100),
      comp2_medicine_dosage VARCHAR(50),
      comp2_pills_count INTEGER DEFAULT 0,
      comp2_is_active BOOLEAN DEFAULT TRUE,
      
      -- Compartiment 3
      comp3_medicine_name VARCHAR(100),
      comp3_medicine_dosage VARCHAR(50),
      comp3_pills_count INTEGER DEFAULT 0,
      comp3_is_active BOOLEAN DEFAULT TRUE,
      
      -- Compartiment 4
      comp4_medicine_name VARCHAR(100),
      comp4_medicine_dosage VARCHAR(50),
      comp4_pills_count INTEGER DEFAULT 0,
      comp4_is_active BOOLEAN DEFAULT TRUE,
      
      -- Compartiment 5
      comp5_medicine_name VARCHAR(100),
      comp5_medicine_dosage VARCHAR(50),
      comp5_pills_count INTEGER DEFAULT 0,
      comp5_is_active BOOLEAN DEFAULT TRUE,
      
      -- Compartiment 6
      comp6_medicine_name VARCHAR(100),
      comp6_medicine_dosage VARCHAR(50),
      comp6_pills_count INTEGER DEFAULT 0,
      comp6_is_active BOOLEAN DEFAULT TRUE,
      
      -- Compartiment 7
      comp7_medicine_name VARCHAR(100),
      comp7_medicine_dosage VARCHAR(50),
      comp7_pills_count INTEGER DEFAULT 0,
      comp7_is_active BOOLEAN DEFAULT TRUE,
      
      -- Compartiment 8
      comp8_medicine_name VARCHAR(100),
      comp8_medicine_dosage VARCHAR(50),
      comp8_pills_count INTEGER DEFAULT 0,
      comp8_is_active BOOLEAN DEFAULT TRUE,
      
      -- Compartiment 9
      comp9_medicine_name VARCHAR(100),
      comp9_medicine_dosage VARCHAR(50),
      comp9_pills_count INTEGER DEFAULT 0,
      comp9_is_active BOOLEAN DEFAULT TRUE,
      
      -- Compartiment 10
      comp10_medicine_name VARCHAR(100),
      comp10_medicine_dosage VARCHAR(50),
      comp10_pills_count INTEGER DEFAULT 0,
      comp10_is_active BOOLEAN DEFAULT TRUE,
      
      -- Compartiment 11
      comp11_medicine_name VARCHAR(100),
      comp11_medicine_dosage VARCHAR(50),
      comp11_pills_count INTEGER DEFAULT 0,
      comp11_is_active BOOLEAN DEFAULT TRUE,
      
      -- Compartiment 12
      comp12_medicine_name VARCHAR(100),
      comp12_medicine_dosage VARCHAR(50),
      comp12_pills_count INTEGER DEFAULT 0,
      comp12_is_active BOOLEAN DEFAULT TRUE,
      
      -- Compartiment 13
      comp13_medicine_name VARCHAR(100),
      comp13_medicine_dosage VARCHAR(50),
      comp13_pills_count INTEGER DEFAULT 0,
      comp13_is_active BOOLEAN DEFAULT TRUE,
      
      -- Compartiment 14
      comp14_medicine_name VARCHAR(100),
      comp14_medicine_dosage VARCHAR(50),
      comp14_pills_count INTEGER DEFAULT 0,
      comp14_is_active BOOLEAN DEFAULT TRUE,
      
      -- Compartiment 15
      comp15_medicine_name VARCHAR(100),
      comp15_medicine_dosage VARCHAR(50),
      comp15_pills_count INTEGER DEFAULT 0,
      comp15_is_active BOOLEAN DEFAULT TRUE,
      
      -- Compartiment 16
      comp16_medicine_name VARCHAR(100),
      comp16_medicine_dosage VARCHAR(50),
      comp16_pills_count INTEGER DEFAULT 0,
      comp16_is_active BOOLEAN DEFAULT TRUE,
      
      -- Compartiment 17
      comp17_medicine_name VARCHAR(100),
      comp17_medicine_dosage VARCHAR(50),
      comp17_pills_count INTEGER DEFAULT 0,
      comp17_is_active BOOLEAN DEFAULT TRUE,
      
      -- Compartiment 18
      comp18_medicine_name VARCHAR(100),
      comp18_medicine_dosage VARCHAR(50),
      comp18_pills_count INTEGER DEFAULT 0,
      comp18_is_active BOOLEAN DEFAULT TRUE,
      
      -- Compartiment 19
      comp19_medicine_name VARCHAR(100),
      comp19_medicine_dosage VARCHAR(50),
      comp19_pills_count INTEGER DEFAULT 0,
      comp19_is_active BOOLEAN DEFAULT TRUE,
      
      -- Compartiment 20
      comp20_medicine_name VARCHAR(100),
      comp20_medicine_dosage VARCHAR(50),
      comp20_pills_count INTEGER DEFAULT 0,
      comp20_is_active BOOLEAN DEFAULT TRUE,
      
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      
      UNIQUE(device_id)
    );
  `;

  const createMedboxSchedulesTableQuery = `
    CREATE TABLE IF NOT EXISTS medbox_schedules (
      id SERIAL PRIMARY KEY,
      device_id VARCHAR(50) REFERENCES medbox_devices(device_id) ON DELETE CASCADE,
      compartment_number INTEGER NOT NULL CHECK (compartment_number >= 0 AND compartment_number <= 20),
      schedule_time TIME NOT NULL,
      days_of_week INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
      is_active BOOLEAN DEFAULT TRUE,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createMedboxDispenseHistoryTableQuery = `
    CREATE TABLE IF NOT EXISTS medbox_dispense_history (
      id SERIAL PRIMARY KEY,
      device_id VARCHAR(50) REFERENCES medbox_devices(device_id) ON DELETE CASCADE,
      compartment_number INTEGER NOT NULL CHECK (compartment_number >= 0 AND compartment_number <= 20),
      scheduled_time TIMESTAMP,
      actual_dispense_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(20) DEFAULT 'success',
      error_message TEXT
    );
  `;

  const createMedboxDeviceLogsTableQuery = `
    CREATE TABLE IF NOT EXISTS medbox_device_logs (
      id SERIAL PRIMARY KEY,
      device_id VARCHAR(50) REFERENCES medbox_devices(device_id) ON DELETE CASCADE,
      log_level VARCHAR(10) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // NOUVELLES TABLES MÉDICAMENTS
  const createMedicinesTableQuery = `
    CREATE TABLE IF NOT EXISTS medicines (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      active_ingredient VARCHAR(200),
      dosage VARCHAR(100) NOT NULL,
      unit VARCHAR(20) NOT NULL DEFAULT 'mg',
      form VARCHAR(50) NOT NULL DEFAULT 'comprimé',
      description TEXT,
      manufacturer VARCHAR(150),
      barcode VARCHAR(50),
      therapeutic_class VARCHAR(100),
      contraindications TEXT,
      side_effects TEXT,
      storage_conditions TEXT,
      expiry_months INTEGER DEFAULT 36,
      color VARCHAR(30),
      shape VARCHAR(30),
      size VARCHAR(30),
      created_by INTEGER REFERENCES users(id),
      is_active BOOLEAN DEFAULT TRUE,
      is_public BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      
      UNIQUE(name, dosage, created_by)
    );
  `;

  const createMedicineGroupsTableQuery = `
    CREATE TABLE IF NOT EXISTS medicine_groups (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      color VARCHAR(7) DEFAULT '#2563eb',
      icon VARCHAR(50) DEFAULT 'medication',
      created_by INTEGER REFERENCES users(id),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      
      UNIQUE(name, created_by)
    );
  `;

  const createMedicineGroupItemsTableQuery = `
    CREATE TABLE IF NOT EXISTS medicine_group_items (
      id SERIAL PRIMARY KEY,
      group_id INTEGER REFERENCES medicine_groups(id) ON DELETE CASCADE,
      medicine_id INTEGER REFERENCES medicines(id) ON DELETE CASCADE,
      quantity INTEGER DEFAULT 1,
      order_index INTEGER DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      
      UNIQUE(group_id, medicine_id)
    );
  `;

  const createCompartmentAssignmentsTableQuery = `
    CREATE TABLE IF NOT EXISTS compartment_assignments (
      id SERIAL PRIMARY KEY,
      device_id VARCHAR(50) REFERENCES medbox_devices(device_id) ON DELETE CASCADE,
      compartment_number INTEGER NOT NULL CHECK (compartment_number >= 0 AND compartment_number <= 20),
      assignment_type VARCHAR(20) NOT NULL CHECK (assignment_type IN ('medicine', 'group')),
      medicine_id INTEGER REFERENCES medicines(id) ON DELETE CASCADE,
      medicine_group_id INTEGER REFERENCES medicine_groups(id) ON DELETE CASCADE,
      pills_count INTEGER DEFAULT 0,
      max_capacity INTEGER DEFAULT 50,
      refill_threshold INTEGER DEFAULT 10,
      last_refill_date TIMESTAMP,
      expiry_date DATE,
      notes TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      
      CONSTRAINT check_assignment CHECK (
        (assignment_type = 'medicine' AND medicine_id IS NOT NULL AND medicine_group_id IS NULL) OR
        (assignment_type = 'group' AND medicine_group_id IS NOT NULL AND medicine_id IS NULL)
      ),
      
      UNIQUE(device_id, compartment_number)
    );
  `;

  const createCompartmentAssignmentHistoryTableQuery = `
    CREATE TABLE IF NOT EXISTS compartment_assignment_history (
      id SERIAL PRIMARY KEY,
      device_id VARCHAR(50) NOT NULL,
      compartment_number INTEGER NOT NULL,
      action VARCHAR(20) NOT NULL,
      old_assignment_type VARCHAR(20),
      old_medicine_id INTEGER,
      old_medicine_group_id INTEGER,
      new_assignment_type VARCHAR(20),
      new_medicine_id INTEGER,
      new_medicine_group_id INTEGER,
      changed_by INTEGER REFERENCES users(id),
      change_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Index pour optimiser les performances
  const createIndexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_medbox_devices_owner ON medbox_devices(owner_id);
    CREATE INDEX IF NOT EXISTS idx_medbox_devices_unassigned ON medbox_devices(status) WHERE owner_id IS NULL;
    CREATE INDEX IF NOT EXISTS idx_medbox_schedules_device ON medbox_schedules(device_id);
    CREATE INDEX IF NOT EXISTS idx_medbox_schedules_compartment ON medbox_schedules(device_id, compartment_number);
    CREATE INDEX IF NOT EXISTS idx_medbox_dispense_device_time ON medbox_dispense_history(device_id, actual_dispense_time);
    CREATE INDEX IF NOT EXISTS idx_medbox_dispense_compartment ON medbox_dispense_history(device_id, compartment_number);
    CREATE INDEX IF NOT EXISTS idx_medbox_logs_device_time ON medbox_device_logs(device_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_medbox_compartments_device ON medbox_compartments(device_id);
    
    -- Index pour les nouvelles tables médicaments
    CREATE INDEX IF NOT EXISTS idx_medicines_created_by ON medicines(created_by);
    CREATE INDEX IF NOT EXISTS idx_medicines_active ON medicines(is_active);
    CREATE INDEX IF NOT EXISTS idx_medicines_public ON medicines(is_public);
    CREATE INDEX IF NOT EXISTS idx_medicine_groups_created_by ON medicine_groups(created_by);
    CREATE INDEX IF NOT EXISTS idx_medicine_group_items_group ON medicine_group_items(group_id);
    CREATE INDEX IF NOT EXISTS idx_medicine_group_items_medicine ON medicine_group_items(medicine_id);
    CREATE INDEX IF NOT EXISTS idx_compartment_assignments_device ON compartment_assignments(device_id);
    CREATE INDEX IF NOT EXISTS idx_compartment_assignments_compartment ON compartment_assignments(device_id, compartment_number);
    CREATE INDEX IF NOT EXISTS idx_compartment_assignment_history_device ON compartment_assignment_history(device_id);
  `;

  try {
    // Création des tables dans un ordre logique pour les dépendances
    await pool.query(createUsersTableQuery);
    await pool.query(createLinksTableQuery);
    await pool.query(createLogTableQuery);
    await pool.query(createLinkDeleteLogTableQuery);
    await pool.query(createUserLogTableQuery);
    await pool.query(createUserModificationsTableQuery);
    await pool.query(createPatchNotesTableQuery);
    
    // Tables MEDBOX
    await pool.query(createMedboxDevicesTableQuery);
    await pool.query(createMedboxCompartmentsTableQuery);
    await pool.query(createMedboxSchedulesTableQuery);
    await pool.query(createMedboxDispenseHistoryTableQuery);
    await pool.query(createMedboxDeviceLogsTableQuery);
    
    // Tables Médicaments
    await pool.query(createMedicinesTableQuery);
    await pool.query(createMedicineGroupsTableQuery);
    await pool.query(createMedicineGroupItemsTableQuery);
    await pool.query(createCompartmentAssignmentsTableQuery);
    await pool.query(createCompartmentAssignmentHistoryTableQuery);
    
    // Création des index
    await pool.query(createIndexesQuery);
    
    console.log("Toutes les tables ont été créées ou existent déjà (y compris MEDBOX et système de médicaments complet).");
  } catch (err) {
    console.error("Erreur lors de la création des tables :", err);
  }
};

createTablesIfNotExists();

module.exports = {
  query: (text, params) => pool.query(text, params),
  createTablesIfNotExists
};