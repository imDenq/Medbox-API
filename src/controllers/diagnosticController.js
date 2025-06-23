// controllers/diagnosticController.js - Contrôleur pour les tests de diagnostic RÉELS

const db = require('../models/userModel');
const axios = require('axios'); // Pour la communication HTTP avec l'ESP32

// Commandes de diagnostic disponibles
const DIAGNOSTIC_COMMANDS = {
  // Tests moteurs
  test_compartment_motor: {
    name: 'Test Moteur Compartiments',
    description: 'Test de rotation du moteur de sélection des compartiments',
    category: 'motors',
    estimated_duration: 30,
    parameters: ['degrees', 'speed']
  },
  test_dispense_motor: {
    name: 'Test Moteur Distribution',
    description: 'Test de rotation du moteur de distribution',
    category: 'motors',
    estimated_duration: 30,
    parameters: ['degrees', 'speed']
  },
  test_full_sequence: {
    name: 'Test Séquence Complète',
    description: 'Test de la séquence complète de distribution',
    category: 'motors',
    estimated_duration: 60,
    parameters: ['compartment', 'steps']
  },

  // Tests RTC
  test_rtc_comm: {
    name: 'Test Communication RTC',
    description: 'Vérification de la communication I2C avec le module RTC',
    category: 'rtc',
    estimated_duration: 5,
    parameters: []
  },
  test_rtc_sync: {
    name: 'Test Synchronisation RTC',
    description: 'Test de précision et synchronisation temporelle',
    category: 'rtc',
    estimated_duration: 10,
    parameters: []
  },
  test_rtc_battery: {
    name: 'Test Batterie RTC',
    description: 'Vérification de l\'alimentation de sauvegarde',
    category: 'rtc',
    estimated_duration: 15,
    parameters: []
  },

  // Tests hardware
  test_leds: {
    name: 'Test LEDs',
    description: 'Test des LEDs de statut',
    category: 'hardware',
    estimated_duration: 15,
    parameters: ['pattern', 'duration']
  },
  test_eeprom: {
    name: 'Test EEPROM',
    description: 'Test de la mémoire persistante',
    category: 'hardware',
    estimated_duration: 10,
    parameters: []
  },
  test_sensors: {
    name: 'Test Capteurs',
    description: 'Test des capteurs de position',
    category: 'hardware',
    estimated_duration: 20,
    parameters: []
  },

  // Tests connectivité
  test_wifi_signal: {
    name: 'Test Signal WiFi',
    description: 'Mesure de la qualité WiFi',
    category: 'connectivity',
    estimated_duration: 10,
    parameters: []
  },
  test_backend_conn: {
    name: 'Test Connectivité Backend',
    description: 'Test de connexion au serveur',
    category: 'connectivity',
    estimated_duration: 15,
    parameters: []
  },
  test_heartbeat: {
    name: 'Test Heartbeat',
    description: 'Test du système de heartbeat',
    category: 'connectivity',
    estimated_duration: 30,
    parameters: []
  },

  // Tests système
  test_memory: {
    name: 'Test Mémoire RAM',
    description: 'Vérification de la mémoire système',
    category: 'system',
    estimated_duration: 10,
    parameters: []
  },
  test_cpu_performance: {
    name: 'Test Performance CPU',
    description: 'Benchmark du processeur ESP32',
    category: 'system',
    estimated_duration: 30,
    parameters: []
  },
  test_full_diagnostic: {
    name: 'Diagnostic Complet',
    description: 'Exécution de tous les tests',
    category: 'system',
    estimated_duration: 300,
    parameters: ['comprehensive']
  }
};

/**
 * Exécuter un test de diagnostic sur un appareil
 */
const runDeviceDiagnostic = async (req, res) => {
  const { deviceId } = req.params;
  const { test_command, parameters } = req.body;
  const userId = req.user.id;

  console.log(`🔬 Test diagnostic demandé: ${test_command} sur appareil ${deviceId}`);

  try {
    // Vérifier que l'utilisateur possède cet appareil
    const deviceCheck = await db.query(
      'SELECT device_name, ip_address, status FROM medbox_devices WHERE device_id = $1 AND owner_id = $2',
      [deviceId, userId]
    );

    if (deviceCheck.rows.length === 0) {
      console.log(`❌ Accès refusé à l'appareil ${deviceId} pour l'utilisateur ${userId}`);
      return res.status(403).json({ error: 'Accès non autorisé à cet appareil' });
    }

    const device = deviceCheck.rows[0];
    console.log(`📱 Appareil trouvé: ${device.device_name} (IP: ${device.ip_address}, Status: ${device.status})`);

    // Vérifier que l'appareil est en ligne
    if (device.status !== 'online') {
      console.log(`⚠️  Appareil ${deviceId} hors ligne (${device.status})`);
      return res.status(400).json({ 
        error: 'L\'appareil doit être en ligne pour exécuter des tests de diagnostic',
        device_status: device.status
      });
    }

    // Vérifier que la commande de test existe
    if (!DIAGNOSTIC_COMMANDS[test_command]) {
      console.log(`❌ Commande inconnue: ${test_command}`);
      return res.status(400).json({ 
        error: 'Commande de diagnostic inconnue',
        available_commands: Object.keys(DIAGNOSTIC_COMMANDS)
      });
    }

    const command = DIAGNOSTIC_COMMANDS[test_command];
    const startTime = Date.now();

    console.log(`⚡ Démarrage du test: ${command.name} (durée estimée: ${command.estimated_duration}s)`);

    // Logger le début du test
    await db.query(
      `INSERT INTO medbox_device_logs (device_id, log_level, message)
       VALUES ($1, 'INFO', $2)`,
      [deviceId, `Début du test de diagnostic: ${command.name}`]
    );

    let testResult;

    try {
      // Envoyer la commande RÉELLE à l'ESP32
      console.log(`🚀 Envoi commande à l'ESP32 sur IP: ${device.ip_address}`);
      testResult = await sendDiagnosticCommandToESP32(device.ip_address, test_command, parameters);
      console.log(`✅ Résultat reçu de l'ESP32:`, testResult.success ? 'SUCCÈS' : 'ÉCHEC');
      
    } catch (error) {
      console.error(`❌ Erreur communication ESP32 ${deviceId}:`, error.message);
      
      // Si l'ESP32 n'est pas accessible, retourner une erreur claire
      return res.status(503).json({
        success: false,
        error_message: 'Impossible de communiquer avec l\'appareil MEDBOX',
        details: {
          communication_error: true,
          device_ip: device.ip_address,
          error: error.message,
          attempted_command: test_command,
          troubleshooting: [
            'Vérifiez que l\'appareil est allumé et connecté au WiFi',
            'Vérifiez que l\'adresse IP est correcte',
            'Assurez-vous que l\'API diagnostic est activée sur l\'ESP32',
            'Testez la connectivité réseau vers l\'appareil'
          ]
        }
      });
    }

    const endTime = Date.now();
    const executionTime = Math.round((endTime - startTime) / 1000);

    // Enrichir le résultat avec des métadonnées
    const enrichedResult = {
      ...testResult,
      test_command,
      device_id: deviceId,
      device_name: device.device_name,
      execution_time: executionTime,
      estimated_duration: command.estimated_duration,
      timestamp: new Date().toISOString(),
      parameters: parameters || {}
    };

    // Logger le résultat du test
    await db.query(
      `INSERT INTO medbox_device_logs (device_id, log_level, message)
       VALUES ($1, $2, $3)`,
      [
        deviceId, 
        testResult.success ? 'INFO' : 'ERROR',
        `Test ${command.name} ${testResult.success ? 'réussi' : 'échoué'} en ${executionTime}s${testResult.error_message ? ': ' + testResult.error_message : ''}`
      ]
    );

    // Sauvegarder le résultat dans l'historique de diagnostic
    await saveDiagnosticResult(deviceId, userId, enrichedResult);

    console.log(`📊 Test diagnostic ${command.name} terminé sur ${device.device_name} - ${testResult.success ? 'SUCCÈS' : 'ÉCHEC'} en ${executionTime}s`);

    res.status(200).json(enrichedResult);

  } catch (err) {
    console.error('💥 Erreur dans runDeviceDiagnostic:', err);
    res.status(500).json({ error: 'Erreur lors de l\'exécution du test de diagnostic' });
  }
};

/**
 * Envoyer une commande de diagnostic à l'ESP32 via HTTP - VERSION RÉELLE
 */
const sendDiagnosticCommandToESP32 = async (deviceIp, command, parameters) => {
  console.log(`🔗 Connexion ESP32: http://${deviceIp}/diagnostic`);
  
  try {
    // Envoyer la requête POST à l'API diagnostic de l'ESP32
    const response = await axios.post(`http://${deviceIp}/diagnostic`, {
      command: command,
      parameters: parameters || {}
    }, {
      timeout: 60000, // 60 secondes timeout pour les tests longs
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MEDBOX-Backend/2.0',
        'Accept': 'application/json'
      },
      validateStatus: function (status) {
        // Accepter les codes 2xx et 4xx pour une meilleure gestion d'erreur
        return status >= 200 && status < 500;
      }
    });

    console.log(`📡 Réponse ESP32 reçue (${response.status}):`, response.data);

    if (response.status === 200) {
      // Succès - retourner les données de l'ESP32
      return response.data;
    } else {
      // Erreur HTTP de l'ESP32
      console.error(`❌ Erreur HTTP ESP32: ${response.status}`);
      throw new Error(`ESP32 returned HTTP ${response.status}: ${JSON.stringify(response.data)}`);
    }

  } catch (error) {
    console.error(`❌ Erreur communication ESP32:`, error.message);
    
    // Analyser le type d'erreur pour un meilleur diagnostic
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Connexion refusée - L\'ESP32 n\'accepte pas les connexions HTTP');
    } else if (error.code === 'EHOSTUNREACH') {
      throw new Error('Hôte inaccessible - Vérifiez l\'adresse IP et la connectivité réseau');
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error('Timeout - L\'ESP32 ne répond pas assez rapidement');
    } else if (error.response) {
      throw new Error(`Erreur HTTP ${error.response.status}: ${error.response.statusText}`);
    } else {
      throw new Error(`Erreur réseau: ${error.message}`);
    }
  }
};

/**
 * Sauvegarder le résultat d'un diagnostic
 */
const saveDiagnosticResult = async (deviceId, userId, result) => {
  try {
    // Créer la table de diagnostic si elle n'existe pas
    await db.query(`
      CREATE TABLE IF NOT EXISTS medbox_diagnostic_history (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(50) REFERENCES medbox_devices(device_id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        test_command VARCHAR(100) NOT NULL,
        test_name VARCHAR(200),
        success BOOLEAN NOT NULL,
        execution_time INTEGER,
        error_message TEXT,
        details JSONB,
        parameters JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      INSERT INTO medbox_diagnostic_history 
      (device_id, user_id, test_command, test_name, success, execution_time, error_message, details, parameters)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      deviceId,
      userId,
      result.test_command,
      DIAGNOSTIC_COMMANDS[result.test_command]?.name || result.test_command,
      result.success,
      result.execution_time,
      result.error_message,
      JSON.stringify(result.details || {}),
      JSON.stringify(result.parameters || {})
    ]);

    console.log(`💾 Résultat diagnostic sauvegardé pour ${deviceId}`);

  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde du diagnostic:', error);
  }
};

/**
 * Récupérer l'historique des diagnostics d'un appareil
 */
const getDeviceDiagnosticHistory = async (req, res) => {
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
      `SELECT 
        id, test_command, test_name, success, execution_time, 
        error_message, details, parameters, created_at
       FROM medbox_diagnostic_history 
       WHERE device_id = $1 
       ORDER BY created_at DESC 
       LIMIT 100`,
      [deviceId]
    );

    // Ajouter des statistiques
    const stats = await db.query(
      `SELECT 
        COUNT(*) as total_tests,
        COUNT(*) FILTER (WHERE success = true) as successful_tests,
        COUNT(*) FILTER (WHERE success = false) as failed_tests,
        AVG(execution_time) as avg_execution_time,
        MAX(created_at) as last_test_date
       FROM medbox_diagnostic_history 
       WHERE device_id = $1`,
      [deviceId]
    );

    res.status(200).json({
      history: result.rows,
      statistics: stats.rows[0]
    });

  } catch (err) {
    console.error('Erreur dans getDeviceDiagnosticHistory:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
  }
};

/**
 * Récupérer la liste des commandes de diagnostic disponibles
 */
const getDiagnosticCommands = async (req, res) => {
  try {
    res.status(200).json({
      commands: DIAGNOSTIC_COMMANDS,
      categories: {
        motors: 'Tests des moteurs pas-à-pas',
        rtc: 'Tests du module horloge temps réel',
        hardware: 'Tests des composants matériels',
        connectivity: 'Tests de connectivité réseau',
        system: 'Tests système et performance'
      },
      total_commands: Object.keys(DIAGNOSTIC_COMMANDS).length,
      api_version: '2.0',
      last_updated: '2025-06-23'
    });
  } catch (err) {
    console.error('Erreur dans getDiagnosticCommands:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des commandes' });
  }
};

/**
 * Récupérer les statistiques de diagnostic pour tous les appareils de l'utilisateur
 */
const getDiagnosticStats = async (req, res) => {
  const userId = req.user.id;

  try {
    // Statistiques globales des tests
    const globalStats = await db.query(`
      SELECT 
        COUNT(*) as total_tests,
        COUNT(*) FILTER (WHERE success = true) as successful_tests,
        COUNT(*) FILTER (WHERE success = false) as failed_tests,
        COUNT(DISTINCT device_id) as devices_tested,
        AVG(execution_time) as avg_execution_time,
        MAX(created_at) as last_test_date
      FROM medbox_diagnostic_history dh
      JOIN medbox_devices md ON dh.device_id = md.device_id
      WHERE md.owner_id = $1
    `, [userId]);

    // Statistiques par appareil
    const deviceStats = await db.query(`
      SELECT 
        dh.device_id,
        md.device_name,
        COUNT(*) as total_tests,
        COUNT(*) FILTER (WHERE dh.success = true) as successful_tests,
        COUNT(*) FILTER (WHERE dh.success = false) as failed_tests,
        MAX(dh.created_at) as last_test_date,
        AVG(dh.execution_time) as avg_execution_time
      FROM medbox_diagnostic_history dh
      JOIN medbox_devices md ON dh.device_id = md.device_id
      WHERE md.owner_id = $1
      GROUP BY dh.device_id, md.device_name
      ORDER BY last_test_date DESC
    `, [userId]);

    // Tests les plus récents
    const recentTests = await db.query(`
      SELECT 
        dh.device_id,
        md.device_name,
        dh.test_name,
        dh.success,
        dh.execution_time,
        dh.created_at,
        dh.error_message
      FROM medbox_diagnostic_history dh
      JOIN medbox_devices md ON dh.device_id = md.device_id
      WHERE md.owner_id = $1
      ORDER BY dh.created_at DESC
      LIMIT 20
    `, [userId]);

    // Commandes les plus utilisées
    const popularCommands = await db.query(`
      SELECT 
        dh.test_command,
        dh.test_name,
        COUNT(*) as usage_count,
        COUNT(*) FILTER (WHERE dh.success = true) as success_count,
        AVG(dh.execution_time) as avg_execution_time
      FROM medbox_diagnostic_history dh
      JOIN medbox_devices md ON dh.device_id = md.device_id
      WHERE md.owner_id = $1
      GROUP BY dh.test_command, dh.test_name
      ORDER BY usage_count DESC
      LIMIT 10
    `, [userId]);

    res.status(200).json({
      global_statistics: globalStats.rows[0],
      device_statistics: deviceStats.rows,
      recent_tests: recentTests.rows,
      popular_commands: popularCommands.rows,
      generated_at: new Date().toISOString()
    });

  } catch (err) {
    console.error('Erreur dans getDiagnosticStats:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
};

/**
 * Test de connectivité avec un appareil (ping test)
 */
const testDeviceConnectivity = async (req, res) => {
  const { deviceId } = req.params;
  const userId = req.user.id;

  try {
    // Vérifier l'accès à l'appareil
    const deviceCheck = await db.query(
      'SELECT device_name, ip_address, status FROM medbox_devices WHERE device_id = $1 AND owner_id = $2',
      [deviceId, userId]
    );

    if (deviceCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à cet appareil' });
    }

    const device = deviceCheck.rows[0];
    const startTime = Date.now();

    try {
      // Test de ping simple vers l'interface web de l'ESP32
      const response = await axios.get(`http://${device.ip_address}/api/status`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'MEDBOX-Backend-Ping/2.0'
        }
      });

      const responseTime = Date.now() - startTime;

      res.status(200).json({
        success: true,
        device_id: deviceId,
        device_name: device.device_name,
        ip_address: device.ip_address,
        response_time_ms: responseTime,
        esp32_status: response.data,
        connectivity: 'excellent',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;

      res.status(200).json({
        success: false,
        device_id: deviceId,
        device_name: device.device_name,
        ip_address: device.ip_address,
        response_time_ms: responseTime,
        error: error.message,
        connectivity: error.code === 'ETIMEDOUT' ? 'timeout' : 'unreachable',
        timestamp: new Date().toISOString(),
        troubleshooting: [
          'Vérifiez que l\'appareil est allumé',
          'Vérifiez la connexion WiFi de l\'appareil',
          'Vérifiez que l\'adresse IP est correcte',
          'Redémarrez l\'appareil si nécessaire'
        ]
      });
    }

  } catch (err) {
    console.error('Erreur dans testDeviceConnectivity:', err);
    res.status(500).json({ error: 'Erreur lors du test de connectivité' });
  }
};

module.exports = {
  runDeviceDiagnostic,
  getDeviceDiagnosticHistory,
  getDiagnosticCommands,
  getDiagnosticStats,
  testDeviceConnectivity
};