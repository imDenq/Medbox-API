// Import dependencies
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/userModel');
const otplib = require('otplib');
const qrcode = require('qrcode');

// Constants
const VALID_INVITATION_CODE = 't';

// User Authentication Functions

/**
 * Register a new user.
 */
const register = async (req, res) => {
    const { name, email, password, invitationCode } = req.body;

    if (invitationCode !== VALID_INVITATION_CODE) {
        return res.status(400).json({ error: 'Invalid invitation code' });
    }

    try {
        await db.createTablesIfNotExists();

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
            [name, email, hashedPassword]
        );
        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });
        res.status(201).json({ token });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Login an existing user.
 */
const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Utilisateur non trouvé' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Mot de passe incorrect' });
        }

        const ipAddress = req.headers['x-forwarded-for'] || req.ip;
        const browserInfo = req.headers['user-agent'] || 'User agent inconnu';
        const accountCreationDate = user.created_at;

        await db.query(
            `INSERT INTO userlog (user_id, ip_address, account_creation_date, browser_info, login_count) 
            VALUES ($1, $2, $3, $4, 1)`,
            [user.id, ipAddress, accountCreationDate, browserInfo]
        );

        if (user.is_2fa_enabled) {
            return res.status(200).json({ is2FAEnabled: true, userId: user.id });
        } else {
            const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({ token });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// 2FA Management Functions

/**
 * Enable 2FA for the user.
 */
const enable2FA = async (req, res) => {
    const { id } = req.user;

    try {
        const result = await db.query('SELECT email FROM users WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        const email = result.rows[0].email;

        const otpSecret = otplib.authenticator.generateSecret();
        const otpauth = otplib.authenticator.keyuri(email, 'ROSIN', otpSecret);
        const qrCodeUrl = await qrcode.toDataURL(otpauth);

        await db.query('UPDATE users SET otp_secret = $1, is_2fa_enabled = TRUE WHERE id = $2', [otpSecret, id]);

        res.status(200).json({ qrCodeUrl, otpSecret });

        console.log('OTP Auth URI:', otpauth);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur lors de l\'activation de la 2FA' });
    }
};

/**
 * Disable 2FA for the user.
 */
const disable2FA = async (req, res) => {
    const { id } = req.user;
    try {
        await db.query('UPDATE users SET otp_secret = NULL, is_2fa_enabled = FALSE WHERE id = $1', [id]);
        res.status(200).json({ message: '2FA désactivée avec succès' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la désactivation de la 2FA' });
    }
};

/**
 * Verify the 2FA token.
 */
const verify2FA = async (req, res) => {
    const { userId, token } = req.body;
    try {
        if (!userId) {
            return res.status(400).json({ error: 'User ID is missing' });
        }

        const result = await db.query('SELECT otp_secret FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];

        if (!user || !user.otp_secret) {
            return res.status(400).json({ error: '2FA non configurée ou utilisateur non trouvé' });
        }

        const isValid = otplib.authenticator.check(token, user.otp_secret);
        if (isValid) {
            const jwtToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
            return res.status(200).json({ message: 'Code 2FA valide', token: jwtToken });
        } else {
            return res.status(400).json({ error: 'Code 2FA invalide' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur lors de la vérification de la 2FA' });
    }
};

/**
 * Prepare 2FA setup by generating a QR code and secret.
 */
const prepare2FA = async (req, res) => {
    const userId = req.user.id;
    try {
        const userResult = await db.query('SELECT name, email FROM users WHERE id = $1', [userId]);
        const { name, email } = userResult.rows[0];

        const otpSecret = otplib.authenticator.generateSecret();
        const otpauth = otplib.authenticator.keyuri(email, 'ROSIN IPDS', otpSecret);
        const qrCodeUrl = await qrcode.toDataURL(otpauth);

        res.status(200).json({ qrCodeUrl, otpSecret });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur lors de la préparation de la 2FA' });
    }
};

/**
 * Verify and enable 2FA after user scans QR code.
 */
const verifyAndEnable2FA = async (req, res) => {
    const { token, otpSecret } = req.body;
    const userId = req.user.id;

    try {
        const isValid = otplib.authenticator.check(token, otpSecret);
        if (isValid) {
            await db.query('UPDATE users SET otp_secret = $1, is_2fa_enabled = TRUE WHERE id = $2', [otpSecret, userId]);
            res.status(200).json({ message: '2FA activée avec succès' });
        } else {
            res.status(400).json({ error: 'Code 2FA invalide' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur lors de la vérification et de l activation de la 2FA' });
    }
};

/**
 * Verify 2FA token for activation.
 */
const verify2FAForActivation = async (req, res) => {
    const { token } = req.body;
    const userId = req.user.id;

    try {
        const result = await db.query('SELECT otp_secret FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];

        if (!user || !user.otp_secret) {
            return res.status(400).json({ error: '2FA non configurée ou utilisateur non trouvé' });
        }

        const isValid = otplib.authenticator.check(token, user.otp_secret);
        if (isValid) {
            await db.query('UPDATE users SET is_2fa_enabled = TRUE WHERE id = $1', [userId]);
            return res.status(200).json({ message: '2FA activée avec succès' });
        } else {
            return res.status(400).json({ error: 'Code 2FA invalide' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur lors de la vérification de la 2FA' });
    }
};

/**
 * Verify 2FA token for disabling 2FA.
 */
const verify2FAForDisable = async (req, res) => {
    const { id } = req.user;
    const { token } = req.body;
    try {
        const result = await db.query('SELECT otp_secret FROM users WHERE id = $1', [id]);
        const user = result.rows[0];

        if (!user || !user.otp_secret) {
            return res.status(400).json({ error: '2FA non configurée ou utilisateur non trouvé' });
        }

        const isValid = otplib.authenticator.check(token, user.otp_secret);
        if (isValid) {
            return res.status(200).json({ message: 'Code 2FA valide' });
        } else {
            return res.status(400).json({ error: 'Code 2FA invalide' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur lors de la vérification de la 2FA pour désactivation' });
    }
};

/**
 * Check if 2FA is enabled for the user.
 */
const check2FAStatus = async (req, res) => {
    const { id } = req.user;
    try {
        const result = await db.query('SELECT is_2fa_enabled FROM users WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const is2FAEnabled = result.rows[0].is_2fa_enabled;
        res.status(200).json({ is2FAEnabled });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur lors de la récupération du statut de la 2FA' });
    }
};

// User Profile Management Functions

/**
 * Change the user's password.
 */

const changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const { id } = req.user;

    // Fonction pour valider la complexité du mot de passe
    const isPasswordStrong = (password) => {
        const minLength = 12;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
    };

    try {
        const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Ancien mot de passe incorrect' });
        }

        if (user.is_2fa_enabled) {
            const { token } = req.body;
            const isValid = otplib.authenticator.check(token, user.otp_secret);
            if (!isValid) {
                return res.status(400).json({ error: 'Code 2FA invalide' });
            }
        }

        // Vérification de la complexité du nouveau mot de passe
        if (!isPasswordStrong(newPassword)) {
            return res.status(400).json({
                error: 'Le nouveau mot de passe doit contenir au moins 12 caractères, ' +
                       'une majuscule, une minuscule, un chiffre et un caractère spécial.'
            });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNewPassword, id]);

        res.status(200).json({ message: 'Mot de passe changé avec succès' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur: ' + err.message });
    }
};


/**
 * Get user information.
 */
const getUserInfo = async (req, res) => {
    const { id } = req.user;

    try {
        const result = await db.query('SELECT name, email, created_at FROM users WHERE id = $1', [id]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        res.status(200).json({
            user: {
                name: user.name,
                email: user.email,
                createdAt: user.created_at,
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur: ' + err.message });
    }
};

// Administrative Functions

/**
 * Get information of all users.
 */
const getAllUsers = async (req, res) => {
    try {
        const result = await db.query('SELECT id, name, email, created_at FROM users');
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
    }
};

/**
 * Supprimer un utilisateur par ID (action réservée aux administrateurs).
 */
const deleteUser = async (req, res) => {
    const { id } = req.params;
    const currentUserId = req.user.id;

    try {
        // Vérifier si l'utilisateur actuel est admin
        const currentUser = await db.query('SELECT is_admin FROM users WHERE id = $1', [currentUserId]);
        if (!currentUser.rows[0]?.is_admin) {
            return res.status(403).json({ error: "Vous n'avez pas l'autorisation de supprimer des utilisateurs." });
        }

        // Supprimer les modifications associées à cet utilisateur
        await db.query('DELETE FROM user_modifications WHERE user_id = $1', [id]);

        // Supprimer l'utilisateur
        const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Utilisateur non trouvé." });
        }

        res.status(200).json({ message: "Utilisateur supprimé avec succès." });
    } catch (err) {
        console.error("Erreur lors de la suppression de l'utilisateur:", err);
        res.status(500).json({ error: "Erreur serveur." });
    }
};


/**
 * Promote or demote a user to/from admin.
 */
const toggleAdminStatus = async (req, res) => {
    const { id: targetUserId } = req.params;       // ID de l'utilisateur à modifier
    const { id: currentUserId } = req.user;       // ID de l'utilisateur courant

    try {
        // Vérifier que l'utilisateur courant est un admin
        const currentUserResult = await db.query('SELECT is_admin FROM users WHERE id = $1', [currentUserId]);
        const currentUser = currentUserResult.rows[0];
        if (!currentUser || !currentUser.is_admin) {
            return res.status(403).json({ error: 'Action réservée aux administrateurs' });
        }

        // Vérifier si l'utilisateur cible existe
        const targetUserResult = await db.query('SELECT is_admin FROM users WHERE id = $1', [targetUserId]);
        const targetUser = targetUserResult.rows[0];
        if (!targetUser) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Déterminer le nouveau statut admin
        const newAdminStatus = !targetUser.is_admin;

        // Mettre à jour le statut admin de l'utilisateur cible
        const updatedUserResult = await db.query(
            'UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING *',
            [newAdminStatus, targetUserId]
        );

        // Log de la modification
        const modificationType = newAdminStatus ? 'Promoted to Admin' : 'Demoted from Admin';
        await db.query(
            'INSERT INTO user_modifications (user_id, modified_by, modification_type) VALUES ($1, $2, $3)',
            [targetUserId, currentUserId, modificationType]
        );

        return res.status(200).json({ message: `Utilisateur ${newAdminStatus ? 'promu' : 'rétiré de'} administrateur avec succès` });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur lors de la modification du statut admin' });
    }
};

/**
 * Vérifie si un utilisateur est administrateur
 */
const checkAdminStatusForUser = async (req, res) => {
    const { id } = req.params; // ID de l'utilisateur cible

    try {
        const result = await db.query('SELECT is_admin FROM users WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        res.status(200).json({ isAdmin: result.rows[0].is_admin });
    } catch (error) {
        console.error('Erreur lors de la vérification du statut admin:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};


/**
 * Disable 2FA for a specific user.
 */
const disable2FAForUser = async (req, res) => {
    const { id } = req.params;
    const modifiedBy = req.user.id;
    try {
        await db.query('UPDATE users SET otp_secret = NULL, is_2fa_enabled = FALSE WHERE id = $1', [id]);
        await db.query('INSERT INTO user_modifications (user_id, modified_by, modification_type) VALUES ($1, $2, $3)',
            [id, modifiedBy, '2FA Disabled']);
        res.status(200).json({ message: '2FA désactivée avec succès' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la désactivation de la 2FA' });
    }
};

/**
 * Reset password for a specific user.
 */
const resetPasswordForUser = async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    const modifiedBy = req.user.id;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Le nouveau mot de passe est requis et doit contenir au moins 6 caractères.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, id]);
        await db.query('INSERT INTO user_modifications (user_id, modified_by, modification_type) VALUES ($1, $2, $3)',
            [id, modifiedBy, 'Password Reset']);
        res.status(200).json({ message: 'Mot de passe réinitialisé avec succès' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la réinitialisation du mot de passe' });
    }
};

/**
 * Get user modifications logs.
 */
const getUserModifications = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT um.user_id, u.name AS modified_user, um.modification_type, um.modified_at, mu.name AS modified_by
            FROM user_modifications um
            JOIN users u ON um.user_id = u.id
            JOIN users mu ON um.modified_by = mu.id
            ORDER BY um.modified_at DESC
        `);
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des modifications des utilisateurs' });
    }
};

/**
 * Check if the user has admin privileges.
 */
const checkAdminStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('Vérification du statut admin pour l\'utilisateur:', userId);
        const result = await db.query('SELECT is_admin FROM users WHERE id = $1', [userId]);

        if (result.rows.length > 0) {
            console.log('Statut admin:', result.rows[0].is_admin);
            res.json({ isAdmin: result.rows[0].is_admin });
        } else {
            console.log('Utilisateur non trouvé');
            res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
    } catch (error) {
        console.error('Erreur lors de la vérification du statut admin:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Logging Functions

/**
 * Get user login logs.
 */
const getUserLogs = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT userlog.*, users.name AS user_name 
            FROM userlog 
            JOIN users ON userlog.user_id = users.id
        `);
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des logs des utilisateurs.' });
    }
};

// Exported Functions

module.exports = {
    register,
    login,
    enable2FA,
    disable2FA,
    verify2FA,
    check2FAStatus,
    verify2FAForDisable,
    changePassword,
    getUserInfo,
    getAllUsers,
    getUserLogs,
    deleteUser,
    disable2FAForUser,
    resetPasswordForUser,
    getUserModifications,
    checkAdminStatus,
    verify2FAForActivation,
    prepare2FA,
    verifyAndEnable2FA,
    toggleAdminStatus,
    checkAdminStatusForUser
};
