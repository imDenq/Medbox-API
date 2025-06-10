// services/emailService.js - Service d'envoi d'emails pour notifications MEDBOX (VERSION CORRIGÉE)

const nodemailer = require('nodemailer');
const db = require('../models/userModel');

// Configuration du transporteur email avec gestion d'erreurs améliorée
const createEmailTransporter = () => {
  try {
    // Vérifier que les variables d'environnement sont définies
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Variables EMAIL_USER et EMAIL_PASS non définies dans .env');
    }

    // Configuration pour Gmail (vous pouvez adapter selon votre fournisseur)
    const config = {
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      // Configuration pour debug si nécessaire
      debug: process.env.EMAIL_DEBUG === 'true',
      logger: process.env.EMAIL_DEBUG === 'true'
    };

    // CORRECTION: utiliser createTransport au lieu de createTransporter
    const transporter = nodemailer.createTransport(config);

    // Vérifier la configuration au démarrage
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Erreur configuration email:', error.message);
      } else {
        console.log('✅ Configuration email validée - Prêt à envoyer des notifications');
      }
    });

    return transporter;

  } catch (error) {
    console.error('❌ Erreur lors de la création du transporteur email:', error.message);
    throw error;
  }
};

// Template HTML pour email de notification
const generateEmailTemplate = (deviceName, deviceId, newStatus, timestamp, previousStatus, ownerName) => {
  const statusColor = newStatus === 'online' ? '#28a745' : '#dc3545';
  const statusIcon = newStatus === 'online' ? '🟢' : '🔴';
  const statusText = newStatus === 'online' ? 'EN LIGNE' : 'HORS LIGNE';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; margin: 10px 0; background-color: ${statusColor}; }
        .info-grid { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
        .info-label { font-weight: bold; color: #495057; }
        .info-value { color: #6c757d; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px; }
        .alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${statusIcon} MEDBOX™ - Notification de Statut</h1>
        </div>
        
        <div class="content">
          <h2>Changement de statut détecté</h2>
          <p>Bonjour ${ownerName},</p>
          <p>Votre appareil MEDBOX a changé de statut :</p>
          
          <div class="status-badge">${statusText}</div>
          
          <div class="info-grid">
            <div class="info-row">
              <span class="info-label">Nom de l'appareil :</span>
              <span class="info-value">${deviceName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">ID de l'appareil :</span>
              <span class="info-value">${deviceId}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Statut précédent :</span>
              <span class="info-value">${previousStatus}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Nouveau statut :</span>
              <span class="info-value">${newStatus}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Horodatage :</span>
              <span class="info-value">${new Date(timestamp).toLocaleString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}</span>
            </div>
          </div>
          
          ${newStatus === 'offline' ? `
          <div class="alert">
            <strong>⚠️ Attention :</strong> Votre appareil MEDBOX est maintenant hors ligne. 
            Vérifiez la connexion Wi-Fi et l'alimentation de l'appareil.
          </div>
          ` : `
          <div class="alert" style="background: #d1edff; border-color: #bee5eb;">
            <strong>✅ Excellent :</strong> Votre appareil MEDBOX est maintenant en ligne et fonctionnel.
          </div>
          `}
          
          <p>
            <strong>Que faire si votre appareil est hors ligne ?</strong><br>
            • Vérifiez l'alimentation électrique<br>
            • Contrôlez la connexion Wi-Fi<br>
            • Redémarrez l'appareil si nécessaire<br>
            • Contactez le support si le problème persiste
          </p>
        </div>
        
        <div class="footer">
          <p>
            Cette notification a été envoyée automatiquement par votre système MEDBOX™.<br>
            Pour des questions, contactez-nous à <a href="mailto:admin@medbox.eu">admin@medbox.eu</a>
          </p>
          <p style="margin-top: 15px;">
            <strong>MEDBOX™</strong> - Système intelligent de distribution de médicaments
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Fonction pour envoyer une notification par email avec gestion d'erreurs renforcée
const sendStatusNotification = async (deviceId, newStatus, previousStatus, timestamp) => {
  try {
    // Vérifier les variables d'environnement avant de continuer
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('⚠️ Variables EMAIL non configurées - notification email ignorée');
      return false;
    }

    // Récupérer les informations de l'appareil et du propriétaire
    const deviceResult = await db.query(
      `SELECT d.device_name, d.device_id, d.owner_id, u.email, u.name
       FROM medbox_devices d
       JOIN users u ON d.owner_id = u.id
       WHERE d.device_id = $1`,
      [deviceId]
    );

    if (deviceResult.rows.length === 0) {
      console.log(`ℹ️ Aucun propriétaire trouvé pour l'appareil ${deviceId} - email non envoyé`);
      return false;
    }

    const { device_name, owner_id, email, name } = deviceResult.rows[0];

    // Créer le transporteur email
    const transporter = createEmailTransporter();

    // Générer le contenu de l'email
    const htmlContent = generateEmailTemplate(
      device_name,
      deviceId,
      newStatus,
      timestamp,
      previousStatus,
      name
    );

    // Préparer l'email
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'MEDBOX System',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: `🏥 MEDBOX - ${device_name} est ${newStatus === 'online' ? 'EN LIGNE' : 'HORS LIGNE'}`,
      html: htmlContent,
      // Version texte simple pour les clients qui ne supportent pas HTML
      text: `
MEDBOX - Notification de Statut

Bonjour ${name},

Votre appareil MEDBOX "${device_name}" (${deviceId}) a changé de statut :
- Statut précédent : ${previousStatus}
- Nouveau statut : ${newStatus}
- Horodatage : ${new Date(timestamp).toLocaleString('fr-FR')}

${newStatus === 'offline' ? 
  'Attention : Votre appareil est maintenant hors ligne. Vérifiez la connexion Wi-Fi et l\'alimentation.' :
  'Votre appareil est maintenant en ligne et fonctionnel.'
}

Pour toute question, contactez admin@medbox.eu

MEDBOX™ - Système intelligent de distribution de médicaments
      `
    };

    // Envoyer l'email
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`📧 Email de notification envoyé à ${email} pour ${device_name} (${deviceId})`);
    if (process.env.EMAIL_DEBUG === 'true') {
      console.log(`📨 Message ID: ${info.messageId}`);
    }

    // Logger l'envoi de l'email dans la base de données
    await db.query(
      `INSERT INTO medbox_device_logs (device_id, log_level, message)
       VALUES ($1, 'INFO', $2)`,
      [deviceId, `Email de notification envoyé à ${email} - Statut: ${newStatus}`]
    );

    return true;

  } catch (error) {
    console.error(`❌ Erreur lors de l'envoi de l'email pour ${deviceId}:`, error.message);
    
    // Logger l'erreur dans la base de données
    try {
      await db.query(
        `INSERT INTO medbox_device_logs (device_id, log_level, message)
         VALUES ($1, 'ERROR', $2)`,
        [deviceId, `Erreur envoi email: ${error.message}`]
      );
    } catch (dbError) {
      console.error('❌ Erreur lors du logging en base:', dbError.message);
    }

    return false;
  }
};

// Fonction pour envoyer des notifications de résumé quotidien (optionnel)
const sendDailySummary = async (ownerId) => {
  try {
    // Vérifier les variables d'environnement
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('⚠️ Variables EMAIL non configurées - résumé quotidien ignoré');
      return false;
    }

    // Récupérer les statistiques des dernières 24h pour un utilisateur
    const statsResult = await db.query(
      `SELECT 
         COUNT(*) as total_devices,
         COUNT(CASE WHEN status = 'online' THEN 1 END) as online_devices,
         COUNT(CASE WHEN status = 'offline' THEN 1 END) as offline_devices
       FROM medbox_devices 
       WHERE owner_id = $1`,
      [ownerId]
    );

    const userResult = await db.query(
      'SELECT email, name FROM users WHERE id = $1',
      [ownerId]
    );

    if (userResult.rows.length === 0) return false;

    const { email, name } = userResult.rows[0];
    const stats = statsResult.rows[0];

    console.log(`📊 Résumé quotidien préparé pour ${name} (${email}) - ${stats.total_devices} appareils`);
    return true;

  } catch (error) {
    console.error('❌ Erreur lors de la génération du résumé quotidien:', error.message);
    return false;
  }
};

// Fonction pour tester la configuration email
const testEmailConfiguration = async () => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('⚠️ Variables EMAIL_USER et EMAIL_PASS non définies');
      return false;
    }

    const transporter = createEmailTransporter();
    await transporter.verify();
    console.log('✅ Configuration email validée avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur de configuration email:', error.message);
    return false;
  }
};

module.exports = {
  sendStatusNotification,
  sendDailySummary,
  generateEmailTemplate,
  testEmailConfiguration
};