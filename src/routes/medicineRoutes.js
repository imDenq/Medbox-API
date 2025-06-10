// routes/medicineRoutes.js - Routes pour la gestion des médicaments

const express = require('express');
const {
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
} = require('../controllers/medicineController');

const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

// ===================== ROUTES MÉDICAMENTS =====================

// Créer un nouveau médicament
router.post('/medicines', authMiddleware, createMedicine);

// Récupérer tous les médicaments de l'utilisateur (avec filtres)
router.get('/medicines', authMiddleware, getUserMedicines);

// Mettre à jour un médicament
router.put('/medicines/:medicineId', authMiddleware, updateMedicine);

// Supprimer un médicament
router.delete('/medicines/:medicineId', authMiddleware, deleteMedicine);

// ===================== ROUTES GROUPES =====================

// Créer un nouveau groupe
router.post('/groups', authMiddleware, createMedicineGroup);

// Récupérer tous les groupes de l'utilisateur
router.get('/groups', authMiddleware, getUserMedicineGroups);

// Supprimer un groupe
router.delete('/groups/:groupId', authMiddleware, deleteMedicineGroup);

// Ajouter un médicament à un groupe
router.post('/groups/:groupId/medicines', authMiddleware, addMedicineToGroup);

// Retirer un médicament d'un groupe
router.delete('/groups/:groupId/medicines/:medicineId', authMiddleware, removeMedicineFromGroup);

// ===================== ROUTES ASSIGNATIONS COMPARTIMENTS =====================

// Assigner un médicament/groupe à un compartiment
router.post('/compartments/assign', authMiddleware, assignToCompartment);

// Récupérer les assignations d'un appareil
router.get('/compartments/:deviceId/assignments', authMiddleware, getDeviceCompartmentAssignments);

// Retirer une assignation de compartiment
router.delete('/compartments/assignments/:assignmentId', authMiddleware, removeCompartmentAssignment);

module.exports = router;