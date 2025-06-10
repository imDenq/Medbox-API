// controllers/medboxController.js - Version mise à jour avec suppression MEDBOX et compartiments optimisés

const db = require('../models/userModel');
const crypto = require('crypto');
const { sendStatusNotification } = require('../services/emailService');

// Variable globale pour l'intervalle de monitoring
let monitoringInterval = null;

// Générer un code d'enregistrement unique
const generateRegistrationCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Fonction pour convertir les données compartiments en format API (21 compartiments séparés)
const formatCompartmentsForAPI = (compartmentRow) => {
  const compartments = [];
  
  for (let i = 0; i <= 20; i++) {
    const compPrefix = `comp${i}_`;
    compartments.push({
      compartment_number: i,
      medicine_name: compartmentRow[`${compPrefix}medicine_name`] || null,
      medicine_dosage: compartmentRow[`${compPrefix}medicine_dosage`] || null,
      pills_count: compartmentRow[`${compPrefix}pills_count`] || 0,
      is_active: compartmentRow[`${compPrefix}is_active`] !== false
    });
  }
  
  return compartments;
};

// Fonction pour obtenir le nom de colonne du compartiment
const getCompartmentColumn = (compartmentNumber, field) => {
  return `comp${compartmentNumber}_${field}`;
};

// Fonction améliorée pour vérifier automatiquement le statut des appareils
const checkDeviceStatus = async () => {
  try {
    const OFFLINE_THRESHOLD = 1;
    
    const devicesGoingOffline = await db.query(
      `SELECT device_id, device_name, status, last_seen, owner_id
       FROM medbox_devices 
       WHERE status = 'online' 
       AND last_seen < NOW() - INTERVAL '${OFFLINE_THRESHOLD} minutes'
       AND owner_id IS NOT NULL`
    );

    // Marquer comme hors ligne et envoyer des notifications
    for (const device of devicesGoingOffline.rows) {
      const previousStatus = device.status;
      const timestamp = new Date();

      // Mettre à jour le statut
      await db.query(
        `UPDATE medbox_devices 
         SET status = 'offline'
         WHERE device_id = $1`,
        [device.device_id]
      );

      // Logger le changement
      await db.query(
        `INSERT INTO medbox_device_logs (device_id, log_level, message)
         VALUES ($1, 'WARNING', $2)`,
        [device.device_id, `Appareil passé hors ligne - aucun heartbeat reçu depuis ${OFFLINE_THRESHOLD} minutes`]
      );

      // Envoyer la notification par email
      console.log(`📴 ${device.device_name} (${device.device_id}) passé hors ligne - Envoi notification email`);
      
      // Envoi asynchrone de l'email pour ne pas bloquer le processus
      sendStatusNotification(device.device_id, 'offline', previousStatus, timestamp)
        .then(() => {
          console.log(`✅ Notification email envoyée pour ${device.device_name}`);
        })
        .catch((error) => {
          console.error(`❌ Erreur notification email pour ${device.device_name}:`, error);
        });
    }

    if (devicesGoingOffline.rows.length > 0) {
      console.log(`📴 ${devicesGoingOffline.rows.length} appareils marqués comme hors ligne avec notifications envoyées`);
    }

  } catch (error) {
    console.error('Erreur lors de la vérification du statut des appareils:', error);
  }
};

// Fonction améliorée updateDeviceStatus avec notifications email
const updateDeviceStatus = async (req, res) => {
  const { device_id, status, ip_address } = req.body;

  try {
    // Récupérer l'ancien statut et les informations de l'appareil
    const oldDeviceResult = await db.query(
      'SELECT status, device_name, owner_id FROM medbox_devices WHERE device_id = $1',
      [device_id]
    );

    if (oldDeviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appareil non trouvé' });
    }

    const oldDevice = oldDeviceResult.rows[0];
    const oldStatus = oldDevice.status;
    const deviceName = oldDevice.device_name;
    const ownerId = oldDevice.owner_id;

    // Mettre à jour le statut
    const result = await db.query(
      `UPDATE medbox_devices 
       SET status = $1, ip_address = $2, last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE device_id = $3
       RETURNING *`,
      [status, ip_address, device_id]
    );

    const statusChanged = oldStatus !== status;
    const timestamp = new Date();

    // Logger le changement de statut si différent
    if (statusChanged) {
      const logMessage = `Changement de statut: ${oldStatus} → ${status}`;
      await db.query(
        `INSERT INTO medbox_device_logs (device_id, log_level, message)
         VALUES ($1, 'INFO', $2)`,
        [device_id, logMessage]
      );
      
      console.log(`📊 ${deviceName} (${device_id}): ${logMessage}`);

      // Envoyer notification email seulement si l'appareil a un propriétaire et le changement est significatif
      if (ownerId && (status === 'online' || status === 'offline')) {
        console.log(`📧 Préparation notification email pour ${deviceName} - ${oldStatus} → ${status}`);
        
        // Envoi asynchrone de l'email
        sendStatusNotification(device_id, status, oldStatus, timestamp)
          .then(() => {
            console.log(`✅ Notification email envoyée pour changement ${deviceName}: ${oldStatus} → ${status}`);
          })
          .catch((error) => {
            console.error(`❌ Erreur notification email pour ${deviceName}:`, error.message);
          });
      }
    }

    res.status(200).json({ 
      message: 'Statut mis à jour',
      device: result.rows[0],
      status_changed: statusChanged,
      email_notification_sent: statusChanged && ownerId && (status === 'online' || status === 'offline')
    });

  } catch (err) {
    console.error('Erreur dans updateDeviceStatus:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du statut' });
  }
};

// Fonction confirmRegistration mise à jour avec notification
const confirmRegistration = async (req, res) => {
  const { device_id, registration_code, ip_address } = req.body;

  try {
    // Récupérer les informations avant mise à jour
    const deviceBeforeUpdate = await db.query(
      'SELECT status, device_name, owner_id FROM medbox_devices WHERE device_id = $1 AND registration_code = $2',
      [device_id, registration_code]
    );

    if (deviceBeforeUpdate.rows.length === 0) {
      return res.status(400).json({ error: 'Code d\'enregistrement invalide' });
    }

    const oldStatus = deviceBeforeUpdate.rows[0].status;
    const deviceName = deviceBeforeUpdate.rows[0].device_name;
    const ownerId = deviceBeforeUpdate.rows[0].owner_id;

    const result = await db.query(
      `UPDATE medbox_devices 
       SET status = 'online', ip_address = $1, last_seen = CURRENT_TIMESTAMP, is_registered = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE device_id = $2 AND registration_code = $3
       RETURNING *`,
      [ip_address, device_id, registration_code]
    );

    // Logger la confirmation
    await db.query(
      `INSERT INTO medbox_device_logs (device_id, log_level, message)
       VALUES ($1, 'INFO', 'Enregistrement confirmé - appareil en ligne')`,
      [device_id]
    );

    console.log(`✅ Appareil confirmé: ${deviceName} (${device_id}) - IP: ${ip_address}`);

    // Envoyer notification email si l'appareil a un propriétaire et passe en ligne
    if (ownerId && oldStatus !== 'online') {
      const timestamp = new Date();
      console.log(`📧 Envoi notification de mise en ligne pour ${deviceName}`);
      
      sendStatusNotification(device_id, 'online', oldStatus, timestamp)
        .then(() => {
          console.log(`✅ Notification de confirmation envoyée pour ${deviceName}`);
        })
        .catch((error) => {
          console.error(`❌ Erreur notification confirmation pour ${deviceName}:`, error.message);
        });
    }

    res.status(200).json({
      message: 'Enregistrement confirmé avec succès',
      device: result.rows[0],
      email_notification_sent: ownerId && oldStatus !== 'online'
    });

  } catch (err) {
    console.error('Erreur dans confirmRegistration:', err);
    res.status(500).json({ error: 'Erreur lors de la confirmation de l\'enregistrement' });
  }
};

// Nouvelle route pour obtenir des statistiques détaillées
const getDeviceStats = async (req, res) => {
  const userId = req.user.id;

  try {
    // Statistiques globales de l'utilisateur
    const statsResult = await db.query(
      `SELECT 
         COUNT(*) as total_devices,
         COUNT(CASE WHEN status = 'online' THEN 1 END) as online_devices,
         COUNT(CASE WHEN status = 'offline' THEN 1 END) as offline_devices,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_devices,
         COUNT(CASE WHEN is_registered = false THEN 1 END) as unregistered_devices,
         COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - last_seen))/60)::INTEGER, 0) as avg_last_seen_minutes
       FROM medbox_devices 
       WHERE owner_id = $1`,
      [userId]
    );

    // Appareils récemment hors ligne (dans les dernières 24h)
    const recentlyOfflineResult = await db.query(
      `SELECT device_id, device_name, last_seen, 
              EXTRACT(EPOCH FROM (NOW() - last_seen))/60 as minutes_offline
       FROM medbox_devices 
       WHERE owner_id = $1 
       AND status = 'offline' 
       AND last_seen > NOW() - INTERVAL '24 hours'
       ORDER BY last_seen DESC`,
      [userId]
    );

    // Historique des changements de statut (dernières 24h)
    const statusHistoryResult = await db.query(
      `SELECT d.device_name, l.message, l.created_at, l.log_level
       FROM medbox_device_logs l
       JOIN medbox_devices d ON l.device_id = d.device_id
       WHERE d.owner_id = $1 
       AND l.created_at > NOW() - INTERVAL '24 hours'
       AND (l.message ILIKE '%hors ligne%' OR l.message ILIKE '%en ligne%' OR l.message ILIKE '%offline%' OR l.message ILIKE '%online%' OR l.message ILIKE '%statut%' OR l.message ILIKE '%email%')
       ORDER BY l.created_at DESC
       LIMIT 20`,
      [userId]
    );

    // Statistiques d'emails envoyés (dernières 24h)
    const emailStatsResult = await db.query(
      `SELECT COUNT(*) as emails_sent_24h
       FROM medbox_device_logs l
       JOIN medbox_devices d ON l.device_id = d.device_id
       WHERE d.owner_id = $1 
       AND l.created_at > NOW() - INTERVAL '24 hours'
       AND l.message ILIKE '%email%notification%envoyé%'`,
      [userId]
    );

    res.status(200).json({
      stats: {
        ...statsResult.rows[0],
        emails_sent_24h: emailStatsResult.rows[0].emails_sent_24h
      },
      recently_offline: recentlyOfflineResult.rows,
      status_history: statusHistoryResult.rows
    });
  } catch (err) {
    console.error('Erreur dans getDeviceStats:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
};

// Fonction pour démarrer le monitoring automatique
const startDeviceMonitoring = () => {
  // Arrêter l'ancien monitoring s'il existe
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
  
  // Vérifier le statut des appareils toutes les minutes
  monitoringInterval = setInterval(checkDeviceStatus, 60000);
  console.log('🔍 Monitoring des appareils MEDBOX démarré avec notifications email (vérification chaque minute)');
  
  // Première vérification immédiate (après 10 secondes pour laisser le serveur se stabiliser)
  setTimeout(checkDeviceStatus, 10000);
};

// Route pour obtenir l'historique de connexion d'un appareil
const getDeviceConnectionHistory = async (req, res) => {
  const { deviceId } = req.params;
  const userId = req.user.id;

  try {
    // Vérifier que l'utilisateur possède cet appareil
    const deviceCheck = await db.query(
      'SELECT id FROM medbox_devices WHERE device_id = $1 AND owner_id = $2',
      [deviceId, userId]
    );

    if (deviceCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à cet appareil' });
    }

    // Historique des logs de connexion (7 derniers jours)
    const historyResult = await db.query(
      `SELECT log_level, message, created_at
       FROM medbox_device_logs
       WHERE device_id = $1 
       AND created_at > NOW() - INTERVAL '7 days'
       AND (message ILIKE '%statut%' OR message ILIKE '%ligne%' OR message ILIKE '%connexion%' OR message ILIKE '%heartbeat%' OR message ILIKE '%email%')
       ORDER BY created_at DESC
       LIMIT 50`,
      [deviceId]
    );

    // Statistiques de disponibilité (dernières 24h)
    const uptimeResult = await db.query(
      `SELECT 
         COUNT(CASE WHEN message ILIKE '%online%' OR message ILIKE '%en ligne%' THEN 1 END) as connections,
         COUNT(CASE WHEN message ILIKE '%offline%' OR message ILIKE '%hors ligne%' THEN 1 END) as disconnections,
         COUNT(CASE WHEN message ILIKE '%email%notification%' THEN 1 END) as email_notifications,
         MIN(created_at) as first_log,
         MAX(created_at) as last_log
       FROM medbox_device_logs
       WHERE device_id = $1 
       AND created_at > NOW() - INTERVAL '24 hours'`,
      [deviceId]
    );

    res.status(200).json({
      history: historyResult.rows,
      uptime_stats: uptimeResult.rows[0]
    });
  } catch (err) {
    console.error('Erreur dans getDeviceConnectionHistory:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
  }
};

// NOUVELLE FONCTION: Supprimer une MEDBOX
const deleteDevice = async (req, res) => {
  const { deviceId } = req.params;
  const userId = req.user.id;

  try {
    // Vérifier que l'utilisateur possède cet appareil
    const deviceCheck = await db.query(
      'SELECT device_name FROM medbox_devices WHERE device_id = $1 AND owner_id = $2',
      [deviceId, userId]
    );

    if (deviceCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à cet appareil ou appareil inexistant' });
    }

    const deviceName = deviceCheck.rows[0].device_name;

    // Supprimer l'appareil (CASCADE supprimera automatiquement les données liées)
    const deleteResult = await db.query(
      'DELETE FROM medbox_devices WHERE device_id = $1 AND owner_id = $2 RETURNING device_name',
      [deviceId, userId]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appareil non trouvé ou suppression impossible' });
    }

    console.log(`🗑️ MEDBOX supprimée: ${deviceName} (${deviceId}) par utilisateur ${userId}`);

    res.status(200).json({
      message: 'MEDBOX supprimée avec succès',
      device_name: deviceName,
      device_id: deviceId
    });

  } catch (err) {
    console.error('Erreur dans deleteDevice:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression de la MEDBOX' });
  }
};

const registerDevice = async (req, res) => {
  const { device_id, device_name, mac_address, firmware_version, owner_email } = req.body;

  try {
    // Vérifier si l'appareil existe déjà
    const existingDevice = await db.query(
      'SELECT * FROM medbox_devices WHERE device_id = $1',
      [device_id]
    );

    if (existingDevice.rows.length > 0) {
      return res.status(400).json({ error: 'Cet appareil est déjà enregistré' });
    }

    // Vérifier que l'email du propriétaire est fourni
    if (!owner_email) {
      return res.status(400).json({ error: 'Email du propriétaire requis' });
    }

    // Chercher l'utilisateur par email
    const userResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [owner_email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Aucun compte trouvé avec cet email. Créez d\'abord un compte sur le dashboard.' 
      });
    }

    const ownerId = userResult.rows[0].id;

    // Générer un code d'enregistrement
    const registrationCode = generateRegistrationCode();

    // Insérer le nouvel appareil avec le propriétaire
    const result = await db.query(
      `INSERT INTO medbox_devices 
       (device_id, device_name, mac_address, firmware_version, owner_id, registration_code, is_registered, status) 
       VALUES ($1, $2, $3, $4, $5, $6, FALSE, 'pending')
       RETURNING *`,
      [device_id, device_name, mac_address, firmware_version, ownerId, registrationCode]
    );

    // NOUVEAU: Créer une seule ligne de compartiments avec tous les compartiments en colonnes
    await db.query(
      'INSERT INTO medbox_compartments (device_id) VALUES ($1)',
      [device_id]
    );

    // Logger l'enregistrement
    await db.query(
      `INSERT INTO medbox_device_logs (device_id, log_level, message)
       VALUES ($1, 'INFO', $2)`,
      [device_id, `Appareil enregistré avec succès pour propriétaire: ${owner_email} - Notifications email activées`]
    );

    console.log(`📱 Nouvel appareil enregistré: ${device_id} pour ${owner_email} - Notifications email prêtes`);

    res.status(201).json({
      message: 'Appareil enregistré avec succès',
      device: result.rows[0],
      registrationCode,
      owner_email,
      email_notifications_enabled: true
    });
  } catch (err) {
    console.error('Erreur dans registerDevice:', err);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement de l\'appareil' });
  }
};

const claimDevice = async (req, res) => {
  const { device_id, registration_code } = req.body;
  const userId = req.user.id;

  try {
    const deviceCheck = await db.query(
      'SELECT * FROM medbox_devices WHERE device_id = $1 AND registration_code = $2',
      [device_id, registration_code]
    );

    if (deviceCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Code d\'enregistrement invalide' });
    }

    const device = deviceCheck.rows[0];

    if (device.owner_id === userId) {
      const result = await db.query(
        `UPDATE medbox_devices 
         SET is_registered = TRUE, status = 'online', last_seen = CURRENT_TIMESTAMP
         WHERE device_id = $1
         RETURNING *`,
        [device_id]
      );

      return res.status(200).json({
        message: 'Appareil confirmé (déjà associé à votre compte)',
        device: result.rows[0]
      });
    }

    if (device.owner_id === null) {
      const result = await db.query(
        `UPDATE medbox_devices 
         SET owner_id = $1, is_registered = TRUE, status = 'online', last_seen = CURRENT_TIMESTAMP
         WHERE device_id = $2
         RETURNING *`,
        [userId, device_id]
      );

      // Créer les compartiments si ils n'existent pas
      const compartmentExists = await db.query(
        'SELECT id FROM medbox_compartments WHERE device_id = $1',
        [device_id]
      );

      if (compartmentExists.rows.length === 0) {
        await db.query(
          'INSERT INTO medbox_compartments (device_id) VALUES ($1)',
          [device_id]
        );
      }

      return res.status(200).json({
        message: 'Appareil associé avec succès',
        device: result.rows[0]
      });
    }

    return res.status(403).json({ error: 'Cet appareil appartient déjà à un autre utilisateur' });

  } catch (err) {
    console.error('Erreur dans claimDevice:', err);
    res.status(500).json({ error: 'Erreur lors de l\'association de l\'appareil' });
  }
};

const getAvailableDevices = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT device_id, device_name, mac_address, registration_code, created_at
       FROM medbox_devices 
       WHERE owner_id IS NULL AND status = 'pending'
       ORDER BY created_at DESC`
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Erreur dans getAvailableDevices:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des appareils disponibles' });
  }
};

const getUserDevices = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.query(
      `SELECT d.*, 
       COALESCE(s.schedule_count, 0) as schedule_count,
       COALESCE(c.compartment_count, 0) as compartment_count
       FROM medbox_devices d
       LEFT JOIN (
         SELECT device_id, COUNT(*) as schedule_count
         FROM medbox_schedules 
         WHERE is_active = TRUE
         GROUP BY device_id
       ) s ON d.device_id = s.device_id
       LEFT JOIN (
         SELECT device_id, (
           CASE WHEN comp0_medicine_name IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN comp1_medicine_name IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN comp2_medicine_name IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN comp3_medicine_name IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN comp4_medicine_name IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN comp5_medicine_name IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN comp6_medicine_name IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN comp7_medicine_name IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN comp8_medicine_name IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN comp9_medicine_name IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN comp10_medicine_name IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN comp11_medicine_name IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN comp12_medicine_name IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN comp13_medicine_name IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN comp14_medicine_name IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN comp15_medicine_name IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN comp16_medicine_name IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN comp17_medicine_name IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN comp18_medicine_name IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN comp19_medicine_name IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN comp20_medicine_name IS NOT NULL THEN 1 ELSE 0 END
         ) as compartment_count
         FROM medbox_compartments
       ) c ON d.device_id = c.device_id
       WHERE d.owner_id = $1
       ORDER BY d.created_at DESC`,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Erreur dans getUserDevices:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des appareils' });
  }
};

const getDeviceDetails = async (req, res) => {
  const { deviceId } = req.params;
  const userId = req.user.id;

  try {
    const deviceResult = await db.query(
      'SELECT * FROM medbox_devices WHERE device_id = $1 AND owner_id = $2',
      [deviceId, userId]
    );

    if (deviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appareil non trouvé' });
    }

    // Récupérer les compartiments (nouvelle structure)
    const compartmentsResult = await db.query(
      'SELECT * FROM medbox_compartments WHERE device_id = $1',
      [deviceId]
    );

    // Convertir en format API
    const compartments = compartmentsResult.rows.length > 0 
      ? formatCompartmentsForAPI(compartmentsResult.rows[0])
      : [];

    // Compter les planifications par compartiment
    const schedulesCountResult = await db.query(
      `SELECT compartment_number, COUNT(*) as count
       FROM medbox_schedules 
       WHERE device_id = $1 AND is_active = TRUE
       GROUP BY compartment_number`,
      [deviceId]
    );

    const scheduleCounts = {};
    schedulesCountResult.rows.forEach(row => {
      scheduleCounts[row.compartment_number] = parseInt(row.count);
    });

    // Ajouter le nombre de planifications à chaque compartiment
    compartments.forEach(comp => {
      comp.schedule_count = scheduleCounts[comp.compartment_number] || 0;
    });

    const schedulesResult = await db.query(
      `SELECT s.*, 
       CASE 
         WHEN s.compartment_number = 0 THEN c.comp0_medicine_name
         WHEN s.compartment_number = 1 THEN c.comp1_medicine_name
         WHEN s.compartment_number = 2 THEN c.comp2_medicine_name
         WHEN s.compartment_number = 3 THEN c.comp3_medicine_name
         WHEN s.compartment_number = 4 THEN c.comp4_medicine_name
         WHEN s.compartment_number = 5 THEN c.comp5_medicine_name
         WHEN s.compartment_number = 6 THEN c.comp6_medicine_name
         WHEN s.compartment_number = 7 THEN c.comp7_medicine_name
         WHEN s.compartment_number = 8 THEN c.comp8_medicine_name
         WHEN s.compartment_number = 9 THEN c.comp9_medicine_name
         WHEN s.compartment_number = 10 THEN c.comp10_medicine_name
         WHEN s.compartment_number = 11 THEN c.comp11_medicine_name
         WHEN s.compartment_number = 12 THEN c.comp12_medicine_name
         WHEN s.compartment_number = 13 THEN c.comp13_medicine_name
         WHEN s.compartment_number = 14 THEN c.comp14_medicine_name
         WHEN s.compartment_number = 15 THEN c.comp15_medicine_name
         WHEN s.compartment_number = 16 THEN c.comp16_medicine_name
         WHEN s.compartment_number = 17 THEN c.comp17_medicine_name
         WHEN s.compartment_number = 18 THEN c.comp18_medicine_name
         WHEN s.compartment_number = 19 THEN c.comp19_medicine_name
         WHEN s.compartment_number = 20 THEN c.comp20_medicine_name
       END as medicine_name
       FROM medbox_schedules s
       LEFT JOIN medbox_compartments c ON s.device_id = c.device_id
       WHERE s.device_id = $1 AND s.is_active = TRUE
       ORDER BY s.schedule_time`,
      [deviceId]
    );

    res.status(200).json({
      device: deviceResult.rows[0],
      compartments: compartments,
      schedules: schedulesResult.rows
    });
  } catch (err) {
    console.error('Erreur dans getDeviceDetails:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des détails de l\'appareil' });
  }
};

const configureCompartment = async (req, res) => {
  const { deviceId, compartmentNumber } = req.params;
  const { medicine_name, medicine_dosage, pills_count } = req.body;
  const userId = req.user.id;

  try {
    const deviceCheck = await db.query(
      'SELECT id FROM medbox_devices WHERE device_id = $1 AND owner_id = $2',
      [deviceId, userId]
    );

    if (deviceCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à cet appareil' });
    }

    const compNum = parseInt(compartmentNumber);
    if (compNum < 0 || compNum > 20) {
      return res.status(400).json({ error: 'Numéro de compartiment invalide (0-20)' });
    }

    // Construire la requête de mise à jour dynamiquement
    const medicineNameCol = getCompartmentColumn(compNum, 'medicine_name');
    const medicineDosageCol = getCompartmentColumn(compNum, 'medicine_dosage');
    const pillsCountCol = getCompartmentColumn(compNum, 'pills_count');

    const result = await db.query(
      `UPDATE medbox_compartments 
       SET ${medicineNameCol} = $1, ${medicineDosageCol} = $2, ${pillsCountCol} = $3, updated_at = CURRENT_TIMESTAMP
       WHERE device_id = $4
       RETURNING *`,
      [medicine_name, medicine_dosage, pills_count || 0, deviceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compartiment non trouvé' });
    }

    // Retourner les données du compartiment formatées
    const formattedCompartments = formatCompartmentsForAPI(result.rows[0]);
    const updatedCompartment = formattedCompartments.find(c => c.compartment_number === compNum);

    res.status(200).json({
      message: 'Compartiment configuré avec succès',
      compartment: updatedCompartment
    });
  } catch (err) {
    console.error('Erreur dans configureCompartment:', err);
    res.status(500).json({ error: 'Erreur lors de la configuration du compartiment' });
  }
};

const createSchedule = async (req, res) => {
  const { deviceId } = req.params;
  const { compartment_number, schedule_time, days_of_week } = req.body;
  const userId = req.user.id;

  try {
    const deviceCheck = await db.query(
      'SELECT id FROM medbox_devices WHERE device_id = $1 AND owner_id = $2',
      [deviceId, userId]
    );

    if (deviceCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à cet appareil' });
    }

    const result = await db.query(
      `INSERT INTO medbox_schedules (device_id, compartment_number, schedule_time, days_of_week, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [deviceId, compartment_number, schedule_time, days_of_week, userId]
    );

    res.status(201).json({
      message: 'Planification créée avec succès',
      schedule: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur dans createSchedule:', err);
    res.status(500).json({ error: 'Erreur lors de la création de la planification' });
  }
};

const deleteSchedule = async (req, res) => {
  const { scheduleId } = req.params;
  const userId = req.user.id;

  try {
    const result = await db.query(
      `DELETE FROM medbox_schedules 
       WHERE id = $1 AND created_by = $2
       RETURNING *`,
      [scheduleId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Planification non trouvée ou accès non autorisé' });
    }

    res.status(200).json({
      message: 'Planification supprimée avec succès'
    });
  } catch (err) {
    console.error('Erreur dans deleteSchedule:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression de la planification' });
  }
};

const logDispense = async (req, res) => {
  const { device_id, compartment_number, scheduled_time, status, error_message } = req.body;

  try {
    await db.query(
      `INSERT INTO medbox_dispense_history (device_id, compartment_number, scheduled_time, status, error_message)
       VALUES ($1, $2, $3, $4, $5)`,
      [device_id, compartment_number, scheduled_time, status, error_message]
    );

    res.status(201).json({ message: 'Log de distribution enregistré' });
  } catch (err) {
    console.error('Erreur dans logDispense:', err);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement du log' });
  }
};

const getDispenseHistory = async (req, res) => {
  const { deviceId } = req.params;
  const userId = req.user.id;

  try {
    const deviceCheck = await db.query(
      'SELECT id FROM medbox_devices WHERE device_id = $1 AND owner_id = $2',
      [deviceId, userId]
    );

    if (deviceCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à cet appareil' });
    }

    const result = await db.query(
      `SELECT h.*, 
       CASE 
         WHEN h.compartment_number = 0 THEN c.comp0_medicine_name
         WHEN h.compartment_number = 1 THEN c.comp1_medicine_name
         WHEN h.compartment_number = 2 THEN c.comp2_medicine_name
         WHEN h.compartment_number = 3 THEN c.comp3_medicine_name
         WHEN h.compartment_number = 4 THEN c.comp4_medicine_name
         WHEN h.compartment_number = 5 THEN c.comp5_medicine_name
         WHEN h.compartment_number = 6 THEN c.comp6_medicine_name
         WHEN h.compartment_number = 7 THEN c.comp7_medicine_name
         WHEN h.compartment_number = 8 THEN c.comp8_medicine_name
         WHEN h.compartment_number = 9 THEN c.comp9_medicine_name
         WHEN h.compartment_number = 10 THEN c.comp10_medicine_name
         WHEN h.compartment_number = 11 THEN c.comp11_medicine_name
         WHEN h.compartment_number = 12 THEN c.comp12_medicine_name
         WHEN h.compartment_number = 13 THEN c.comp13_medicine_name
         WHEN h.compartment_number = 14 THEN c.comp14_medicine_name
         WHEN h.compartment_number = 15 THEN c.comp15_medicine_name
         WHEN h.compartment_number = 16 THEN c.comp16_medicine_name
         WHEN h.compartment_number = 17 THEN c.comp17_medicine_name
         WHEN h.compartment_number = 18 THEN c.comp18_medicine_name
         WHEN h.compartment_number = 19 THEN c.comp19_medicine_name
         WHEN h.compartment_number = 20 THEN c.comp20_medicine_name
       END as medicine_name
       FROM medbox_dispense_history h
       LEFT JOIN medbox_compartments c ON h.device_id = c.device_id
       WHERE h.device_id = $1
       ORDER BY h.actual_dispense_time DESC
       LIMIT 100`,
      [deviceId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Erreur dans getDispenseHistory:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
  }
};

const getDeviceConfig = async (req, res) => {
  const { device_id } = req.params;

  try {
    const schedulesResult = await db.query(
      `SELECT s.*
       FROM medbox_schedules s
       WHERE s.device_id = $1 AND s.is_active = TRUE
       ORDER BY s.schedule_time`,
      [device_id]
    );

    res.status(200).json({
      schedules: schedulesResult.rows,
      server_time: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erreur dans getDeviceConfig:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération de la configuration' });
  }
};

module.exports = {
  registerDevice,
  confirmRegistration,
  claimDevice,
  getAvailableDevices,
  getUserDevices,
  getDeviceDetails,
  configureCompartment,
  createSchedule,
  deleteSchedule,
  updateDeviceStatus,
  logDispense,
  getDispenseHistory,
  getDeviceConfig,
  checkDeviceStatus,
  getDeviceStats,
  getDeviceConnectionHistory,
  startDeviceMonitoring,
  deleteDevice
};