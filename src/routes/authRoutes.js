const express = require('express');
const { register, login, enable2FA, disable2FA, verify2FA, check2FAStatus, verify2FAForDisable, changePassword, 
    getUserInfo, getUserLogs, getAllUsers, deleteUser, disable2FAForUser, resetPasswordForUser, getUserModifications, 
    checkAdminStatus, verify2FAForActivation, prepare2FA, verifyAndEnable2FA, toggleAdminStatus, checkAdminStatusForUser} = require('../controllers/authController'); 
const authMiddleware = require('../middlewares/authMiddleware'); 
const router = express.Router();

router.post('/register', register);
router.post('/login', login);

router.post('/enable-2fa', authMiddleware, enable2FA);
router.post('/disable-2fa', authMiddleware, disable2FA);
router.post('/verify-2fa', verify2FA);
router.post('/verify-2fa-activation', authMiddleware, verify2FAForActivation);
router.get('/2fa-status', authMiddleware, check2FAStatus);
router.post('/verify-2fa-disable', authMiddleware, verify2FAForDisable);
router.post('/prepare-2fa', authMiddleware, prepare2FA);
router.post('/verify-and-enable-2fa', authMiddleware, verifyAndEnable2FA);

router.post('/change-password', authMiddleware, changePassword);

router.get('/user-info', authMiddleware, getUserInfo);
router.get('/user-logs', authMiddleware, getUserLogs);
router.get('/users', authMiddleware, getAllUsers);
router.delete('/users/:id', authMiddleware, deleteUser);

router.post('/disable-2fa/:id', authMiddleware, disable2FAForUser);
router.post('/reset-password/:id', authMiddleware, resetPasswordForUser);
router.get('/user-modifications', authMiddleware, getUserModifications);
router.get('/check-admin', authMiddleware, checkAdminStatus);

router.post('/users/:id/toggle-admin', authMiddleware, toggleAdminStatus);
router.get('/users/:id/check-administrator', authMiddleware, checkAdminStatusForUser);

module.exports = router;