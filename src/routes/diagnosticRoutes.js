// routes/diagnosticRoutes.js - Routes complètes pour les tests de diagnostic

const express = require('express');
const {
  runDeviceDiagnostic,
  getDeviceDiagnosticHistory,
  getDiagnosticCommands,
  getDiagnosticStats,
  testDeviceConnectivity
} = require('../controllers/diagnosticController');

const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

// Route pour exécuter un test de diagnostic sur un appareil spécifique
router.post('/devices/:deviceId/diagnostic', authMiddleware, runDeviceDiagnostic);

// Route pour récupérer l'historique des diagnostics d'un appareil
router.get('/devices/:deviceId/diagnostic-history', authMiddleware, getDeviceDiagnosticHistory);

// Route pour tester la connectivité avec un appareil (ping test)
router.get('/devices/:deviceId/connectivity', authMiddleware, testDeviceConnectivity);

// Route pour récupérer la liste des commandes de diagnostic disponibles
router.get('/diagnostic-commands', authMiddleware, getDiagnosticCommands);

// Route pour récupérer les statistiques de diagnostic de l'utilisateur
router.get('/stats', authMiddleware, getDiagnosticStats);

module.exports = router;