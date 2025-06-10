// Ajout dans medboxRoutes.js - Nouvelles routes pour le monitoring et suppression

const express = require('express');
const {
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
  // NOUVELLES FONCTIONS
  getDeviceStats,
  getDeviceConnectionHistory,
  startDeviceMonitoring,
  deleteDevice // NOUVEAU: Fonction de suppression MEDBOX
} = require('../controllers/medboxController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Routes publiques (pour l'appareil MEDBOX - pas d'authentification requise)
router.post('/register', registerDevice);
router.post('/confirm-registration', confirmRegistration);
router.post('/heartbeat', updateDeviceStatus);
router.post('/log-dispense', logDispense);
router.get('/config/:device_id', getDeviceConfig);

// Routes protégées existantes
router.get('/devices', authMiddleware, getUserDevices);
router.get('/devices/:deviceId', authMiddleware, getDeviceDetails);
router.put('/devices/:deviceId/compartments/:compartmentNumber', authMiddleware, configureCompartment);
router.post('/devices/:deviceId/schedules', authMiddleware, createSchedule);
router.delete('/schedules/:scheduleId', authMiddleware, deleteSchedule);
router.get('/devices/:deviceId/history', authMiddleware, getDispenseHistory);
router.get('/available-devices', authMiddleware, getAvailableDevices);
router.post('/claim-device', authMiddleware, claimDevice);

// Routes de monitoring
router.get('/stats', authMiddleware, getDeviceStats);
router.get('/devices/:deviceId/connection-history', authMiddleware, getDeviceConnectionHistory);

// NOUVELLE ROUTE: Suppression d'une MEDBOX
router.delete('/devices/:deviceId', authMiddleware, deleteDevice);

// Démarrer le monitoring automatique au chargement du module
startDeviceMonitoring();

module.exports = router;