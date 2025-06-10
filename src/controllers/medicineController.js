// controllers/medicineController.js - Gestion des médicaments et groupes

const db = require('../models/userModel');

// ===================== GESTION DES MÉDICAMENTS =====================

/**
 * Créer un nouveau médicament
 */
const createMedicine = async (req, res) => {
  const userId = req.user.id;
  const {
    name,
    active_ingredient,
    dosage,
    unit,
    form,
    description,
    manufacturer,
    barcode,
    therapeutic_class,
    contraindications,
    side_effects,
    storage_conditions,
    expiry_months,
    color,
    shape,
    size,
    is_public
  } = req.body;

  try {
    // Vérifier que le médicament n'existe pas déjà pour cet utilisateur
    const existingMedicine = await db.query(
      'SELECT id FROM medicines WHERE name = $1 AND dosage = $2 AND created_by = $3',
      [name, dosage, userId]
    );

    if (existingMedicine.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Ce médicament avec ce dosage existe déjà dans votre bibliothèque' 
      });
    }

    const result = await db.query(
      `INSERT INTO medicines 
       (name, active_ingredient, dosage, unit, form, description, manufacturer, 
        barcode, therapeutic_class, contraindications, side_effects, 
        storage_conditions, expiry_months, color, shape, size, created_by, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [name, active_ingredient, dosage, unit || 'mg', form || 'comprimé', 
       description, manufacturer, barcode, therapeutic_class, contraindications,
       side_effects, storage_conditions, expiry_months || 36, color, shape, 
       size, userId, is_public || false]
    );

    res.status(201).json({
      message: 'Médicament créé avec succès',
      medicine: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur dans createMedicine:', err);
    res.status(500).json({ error: 'Erreur lors de la création du médicament' });
  }
};

/**
 * Récupérer tous les médicaments de l'utilisateur + médicaments publics
 */
const getUserMedicines = async (req, res) => {
  const userId = req.user.id;
  const { search, therapeutic_class, form } = req.query;

  try {
    let query = `
      SELECT m.*, 
             u.name as creator_name,
             CASE WHEN m.created_by = $1 THEN true ELSE false END as is_mine
      FROM medicines m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE (m.created_by = $1 OR m.is_public = true) 
      AND m.is_active = true
    `;
    
    const params = [userId];
    let paramIndex = 2;

    // Filtres de recherche
    if (search) {
      query += ` AND (m.name ILIKE $${paramIndex} OR m.active_ingredient ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (therapeutic_class) {
      query += ` AND m.therapeutic_class = $${paramIndex}`;
      params.push(therapeutic_class);
      paramIndex++;
    }

    if (form) {
      query += ` AND m.form = $${paramIndex}`;
      params.push(form);
      paramIndex++;
    }

    query += ' ORDER BY m.name, m.dosage';

    const result = await db.query(query, params);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Erreur dans getUserMedicines:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des médicaments' });
  }
};

/**
 * Mettre à jour un médicament
 */
const updateMedicine = async (req, res) => {
  const { medicineId } = req.params;
  const userId = req.user.id;
  const updateData = req.body;

  try {
    // Vérifier que l'utilisateur possède ce médicament
    const medicineCheck = await db.query(
      'SELECT id FROM medicines WHERE id = $1 AND created_by = $2',
      [medicineId, userId]
    );

    if (medicineCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à ce médicament' });
    }

    // Construire la requête de mise à jour dynamiquement
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'name', 'active_ingredient', 'dosage', 'unit', 'form', 'description',
      'manufacturer', 'barcode', 'therapeutic_class', 'contraindications',
      'side_effects', 'storage_conditions', 'expiry_months', 'color', 
      'shape', 'size', 'is_public'
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(updateData[field]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(medicineId);

    const query = `
      UPDATE medicines 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);

    res.status(200).json({
      message: 'Médicament mis à jour avec succès',
      medicine: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur dans updateMedicine:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du médicament' });
  }
};

/**
 * Supprimer un médicament (soft delete)
 */
const deleteMedicine = async (req, res) => {
  const { medicineId } = req.params;
  const userId = req.user.id;

  try {
    // Vérifier que l'utilisateur possède ce médicament
    const medicineCheck = await db.query(
      'SELECT name FROM medicines WHERE id = $1 AND created_by = $2',
      [medicineId, userId]
    );

    if (medicineCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à ce médicament' });
    }

    // Vérifier si le médicament est utilisé dans des compartiments
    const usageCheck = await db.query(
      'SELECT COUNT(*) as count FROM compartment_assignments WHERE medicine_id = $1',
      [medicineId]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Ce médicament est actuellement assigné à des compartiments. Retirez-le d\'abord des compartiments avant de le supprimer.' 
      });
    }

    // Soft delete
    await db.query(
      'UPDATE medicines SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [medicineId]
    );

    res.status(200).json({
      message: 'Médicament supprimé avec succès'
    });
  } catch (err) {
    console.error('Erreur dans deleteMedicine:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression du médicament' });
  }
};

// ===================== GESTION DES GROUPES =====================

/**
 * Créer un nouveau groupe de médicaments
 */
const createMedicineGroup = async (req, res) => {
  const userId = req.user.id;
  const { name, description, color, icon } = req.body;

  try {
    // Vérifier que le groupe n'existe pas déjà
    const existingGroup = await db.query(
      'SELECT id FROM medicine_groups WHERE name = $1 AND created_by = $2',
      [name, userId]
    );

    if (existingGroup.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Un groupe avec ce nom existe déjà' 
      });
    }

    const result = await db.query(
      `INSERT INTO medicine_groups (name, description, color, icon, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description, color || '#2563eb', icon || 'medication', userId]
    );

    res.status(201).json({
      message: 'Groupe créé avec succès',
      group: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur dans createMedicineGroup:', err);
    res.status(500).json({ error: 'Erreur lors de la création du groupe' });
  }
};

/**
 * Récupérer tous les groupes de l'utilisateur avec leurs médicaments
 */
const getUserMedicineGroups = async (req, res) => {
  const userId = req.user.id;

  try {
    // Récupérer les groupes
    const groupsResult = await db.query(
      `SELECT * FROM medicine_groups 
       WHERE created_by = $1 AND is_active = true
       ORDER BY name`,
      [userId]
    );

    // Récupérer les médicaments pour chaque groupe
    const groupsWithMedicines = await Promise.all(
      groupsResult.rows.map(async (group) => {
        const medicinesResult = await db.query(
          `SELECT m.*, mgi.quantity, mgi.order_index, mgi.notes, mgi.id as group_item_id
           FROM medicine_group_items mgi
           JOIN medicines m ON mgi.medicine_id = m.id
           WHERE mgi.group_id = $1 AND m.is_active = true
           ORDER BY mgi.order_index, m.name`,
          [group.id]
        );

        return {
          ...group,
          medicines: medicinesResult.rows,
          medicine_count: medicinesResult.rows.length
        };
      })
    );

    res.status(200).json(groupsWithMedicines);
  } catch (err) {
    console.error('Erreur dans getUserMedicineGroups:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des groupes' });
  }
};

/**
 * Ajouter un médicament à un groupe
 */
const addMedicineToGroup = async (req, res) => {
  const { groupId } = req.params;
  const { medicine_id, quantity, order_index, notes } = req.body;
  const userId = req.user.id;

  try {
    // Vérifier que l'utilisateur possède ce groupe
    const groupCheck = await db.query(
      'SELECT id FROM medicine_groups WHERE id = $1 AND created_by = $2',
      [groupId, userId]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à ce groupe' });
    }

    // Vérifier que le médicament existe et que l'utilisateur y a accès
    const medicineCheck = await db.query(
      'SELECT id FROM medicines WHERE id = $1 AND (created_by = $2 OR is_public = true) AND is_active = true',
      [medicine_id, userId]
    );

    if (medicineCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Médicament non trouvé ou accès non autorisé' });
    }

    // Vérifier que le médicament n'est pas déjà dans le groupe
    const existingItem = await db.query(
      'SELECT id FROM medicine_group_items WHERE group_id = $1 AND medicine_id = $2',
      [groupId, medicine_id]
    );

    if (existingItem.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Ce médicament est déjà dans ce groupe' 
      });
    }

    const result = await db.query(
      `INSERT INTO medicine_group_items (group_id, medicine_id, quantity, order_index, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [groupId, medicine_id, quantity || 1, order_index || 0, notes]
    );

    res.status(201).json({
      message: 'Médicament ajouté au groupe avec succès',
      group_item: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur dans addMedicineToGroup:', err);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du médicament au groupe' });
  }
};

/**
 * Retirer un médicament d'un groupe
 */
const removeMedicineFromGroup = async (req, res) => {
  const { groupId, medicineId } = req.params;
  const userId = req.user.id;

  try {
    // Vérifier que l'utilisateur possède ce groupe
    const groupCheck = await db.query(
      'SELECT id FROM medicine_groups WHERE id = $1 AND created_by = $2',
      [groupId, userId]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à ce groupe' });
    }

    const result = await db.query(
      'DELETE FROM medicine_group_items WHERE group_id = $1 AND medicine_id = $2 RETURNING *',
      [groupId, medicineId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Médicament non trouvé dans ce groupe' });
    }

    res.status(200).json({
      message: 'Médicament retiré du groupe avec succès'
    });
  } catch (err) {
    console.error('Erreur dans removeMedicineFromGroup:', err);
    res.status(500).json({ error: 'Erreur lors du retrait du médicament du groupe' });
  }
};

/**
 * Supprimer un groupe (avec vérification)
 */
const deleteMedicineGroup = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;

  try {
    // Vérifier que l'utilisateur possède ce groupe
    const groupCheck = await db.query(
      'SELECT name FROM medicine_groups WHERE id = $1 AND created_by = $2',
      [groupId, userId]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à ce groupe' });
    }

    // Vérifier si le groupe est utilisé dans des compartiments
    const usageCheck = await db.query(
      'SELECT COUNT(*) as count FROM compartment_assignments WHERE medicine_group_id = $1',
      [groupId]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Ce groupe est actuellement assigné à des compartiments. Retirez-le d\'abord des compartiments avant de le supprimer.' 
      });
    }

    // Soft delete
    await db.query(
      'UPDATE medicine_groups SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [groupId]
    );

    res.status(200).json({
      message: 'Groupe supprimé avec succès'
    });
  } catch (err) {
    console.error('Erreur dans deleteMedicineGroup:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression du groupe' });
  }
};

// ===================== GESTION DES AFFECTATIONS COMPARTIMENTS =====================

/**
 * Assigner un médicament ou groupe à un compartiment
 */
const assignToCompartment = async (req, res) => {
  const userId = req.user.id;
  const {
    device_id,
    compartment_number,
    assignment_type, // 'medicine' ou 'group'
    medicine_id,
    medicine_group_id,
    pills_count,
    max_capacity,
    refill_threshold,
    expiry_date,
    notes
  } = req.body;

  try {
    // Vérifier que l'utilisateur possède cet appareil
    const deviceCheck = await db.query(
      'SELECT id FROM medbox_devices WHERE device_id = $1 AND owner_id = $2',
      [device_id, userId]
    );

    if (deviceCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à cet appareil' });
    }

    // Vérifier que le compartiment est libre
    const compartmentCheck = await db.query(
      'SELECT id FROM compartment_assignments WHERE device_id = $1 AND compartment_number = $2 AND is_active = true',
      [device_id, compartment_number]
    );

    if (compartmentCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Ce compartiment est déjà occupé. Libérez-le d\'abord.' 
      });
    }

    // Vérifier l'accès au médicament/groupe selon le type
    if (assignment_type === 'medicine' && medicine_id) {
      const medicineCheck = await db.query(
        'SELECT id FROM medicines WHERE id = $1 AND (created_by = $2 OR is_public = true) AND is_active = true',
        [medicine_id, userId]
      );
      if (medicineCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Médicament non trouvé ou accès non autorisé' });
      }
    } else if (assignment_type === 'group' && medicine_group_id) {
      const groupCheck = await db.query(
        'SELECT id FROM medicine_groups WHERE id = $1 AND created_by = $2 AND is_active = true',
        [medicine_group_id, userId]
      );
      if (groupCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Groupe non trouvé ou accès non autorisé' });
      }
    } else {
      return res.status(400).json({ error: 'Type d\'assignation invalide ou données manquantes' });
    }

    // Nettoyer les valeurs pour éviter les chaînes vides
    const cleanMedicineId = medicine_id && medicine_id !== '' ? parseInt(medicine_id) : null;
    const cleanMedicineGroupId = medicine_group_id && medicine_group_id !== '' ? parseInt(medicine_group_id) : null;
    const cleanExpiryDate = expiry_date && expiry_date !== '' ? expiry_date : null;

    const result = await db.query(
      `INSERT INTO compartment_assignments 
       (device_id, compartment_number, assignment_type, medicine_id, medicine_group_id,
        pills_count, max_capacity, refill_threshold, expiry_date, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [device_id, compartment_number, assignment_type, cleanMedicineId, cleanMedicineGroupId,
       pills_count || 0, max_capacity || 50, refill_threshold || 10, cleanExpiryDate, notes, userId]
    );

    // Logger l'assignation
    await db.query(
      `INSERT INTO compartment_assignment_history 
       (device_id, compartment_number, action, new_assignment_type, new_medicine_id, new_medicine_group_id, changed_by)
       VALUES ($1, $2, 'assigned', $3, $4, $5, $6)`,
      [device_id, compartment_number, assignment_type, cleanMedicineId, cleanMedicineGroupId, userId]
    );

    res.status(201).json({
      message: 'Assignation créée avec succès',
      assignment: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur dans assignToCompartment:', err);
    res.status(500).json({ error: 'Erreur lors de l\'assignation au compartiment' });
  }
};

/**
 * Récupérer les assignations de compartiments pour un appareil
 */
const getDeviceCompartmentAssignments = async (req, res) => {
  const { deviceId } = req.params;
  const userId = req.user.id;

  try {
    // Vérifier l'accès à l'appareil
    const deviceCheck = await db.query(
      'SELECT id FROM medbox_devices WHERE device_id = $1 AND owner_id = $2',
      [deviceId, userId]
    );

    if (deviceCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à cet appareil' });
    }

    const result = await db.query(
      `SELECT ca.*,
              m.name as medicine_name, m.dosage as medicine_dosage, m.form as medicine_form,
              mg.name as group_name, mg.color as group_color, mg.icon as group_icon,
              (SELECT COUNT(*) FROM medicine_group_items WHERE group_id = mg.id) as group_medicine_count
       FROM compartment_assignments ca
       LEFT JOIN medicines m ON ca.medicine_id = m.id
       LEFT JOIN medicine_groups mg ON ca.medicine_group_id = mg.id
       WHERE ca.device_id = $1 AND ca.is_active = true
       ORDER BY ca.compartment_number`,
      [deviceId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Erreur dans getDeviceCompartmentAssignments:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des assignations' });
  }
};

/**
 * Retirer une assignation de compartiment
 */
const removeCompartmentAssignment = async (req, res) => {
  const { assignmentId } = req.params;
  const userId = req.user.id;
  const { reason } = req.body;

  try {
    // Récupérer l'assignation et vérifier l'accès
    const assignmentResult = await db.query(
      `SELECT ca.*, d.device_id, d.owner_id
       FROM compartment_assignments ca
       JOIN medbox_devices d ON ca.device_id = d.device_id
       WHERE ca.id = $1`,
      [assignmentId]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignation non trouvée' });
    }

    const assignment = assignmentResult.rows[0];

    if (assignment.owner_id !== userId) {
      return res.status(403).json({ error: 'Accès non autorisé à cette assignation' });
    }

    // Logger le retrait
    await db.query(
      `INSERT INTO compartment_assignment_history 
       (device_id, compartment_number, action, old_assignment_type, old_medicine_id, old_medicine_group_id, changed_by, change_reason)
       VALUES ($1, $2, 'removed', $3, $4, $5, $6, $7)`,
      [assignment.device_id, assignment.compartment_number, assignment.assignment_type, 
       assignment.medicine_id, assignment.medicine_group_id, userId, reason]
    );

    // Supprimer l'assignation
    await db.query(
      'DELETE FROM compartment_assignments WHERE id = $1',
      [assignmentId]
    );

    res.status(200).json({
      message: 'Assignation supprimée avec succès'
    });
  } catch (err) {
    console.error('Erreur dans removeCompartmentAssignment:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'assignation' });
  }
};

module.exports = {
  // Médicaments
  createMedicine,
  getUserMedicines,
  updateMedicine,
  deleteMedicine,
  
  // Groupes
  createMedicineGroup,
  getUserMedicineGroups,
  addMedicineToGroup,
  removeMedicineFromGroup,
  deleteMedicineGroup,
  
  // Assignations compartiments
  assignToCompartment,
  getDeviceCompartmentAssignments,
  removeCompartmentAssignment
};