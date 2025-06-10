// index.js - Version mise à jour avec support MEDBOX, monitoring ET médicaments

const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const chalk = require("chalk");

// Vérifier la présence de fichiers critiques avant de lancer l'appli
function checkFileExists(filePath) {
  if (fs.existsSync(filePath)) {
    console.log(chalk.blueBright(`✔  ${filePath} chargé avec succès.`));
  } else {
    console.log(chalk.redBright(`✖  ${filePath} introuvable !`));
  }
}

const criticalFiles = [
  path.join(__dirname, "routes", "authRoutes.js"),
  path.join(__dirname, "controllers", "authController.js"),
  path.join(__dirname, "middlewares", "authMiddleware.js"),
  path.join(__dirname, "routes", "medboxRoutes.js"),
  path.join(__dirname, "controllers", "medboxController.js"),
  // NOUVEAUX FICHIERS: Routes et contrôleur pour les médicaments
  path.join(__dirname, "routes", "medicineRoutes.js"),
  path.join(__dirname, "controllers", "medicineController.js"),
];

// Vérification de la présence des fichiers
for (const file of criticalFiles) {
  checkFileExists(file);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration logs (identique)
const logDir = "/var/rosin/backend/logs";
const logFileName = `logs-${new Date()
  .toISOString()
  .replace(/T/, "-")
  .replace(/:/g, "-")
  .slice(0, 16)}.log`;
const logFilePath = path.join(logDir, logFileName);

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logStream = fs.createWriteStream(logFilePath, { flags: "a" });

const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function (...args) {
  const logMessage = `[${new Date().toISOString()}] LOG: ${args.join(" ")}\n`;
  logStream.write(logMessage);
  originalConsoleLog.apply(console, args);
};

console.error = function (...args) {
  const errorMessage = `[${new Date().toISOString()}] ERROR: ${args.join(" ")}\n`;
  logStream.write(errorMessage);
  originalConsoleError.apply(console, args);
};

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: ["http://localhost", "http://localhost:3000", "http://192.168.1.100:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Logs des requêtes
app.use((req, res, next) => {
  console.log(`Requête reçue : ${req.method} ${req.url}`);
  next();
});

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, "public")));

// Import routes
const authRoutes = require("./routes/authRoutes");
const medboxRoutes = require("./routes/medboxRoutes");
const medicineRoutes = require("./routes/medicineRoutes"); // NOUVEAU

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/medbox", medboxRoutes);
app.use("/api/medicines", medicineRoutes); // NOUVEAU: Routes pour la gestion des médicaments
app.use("/files", express.static(path.join(__dirname, "folders")));

// Route pour servir l'interface MEDBOX
app.get("/medbox", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "medbox.html"));
});

// NOUVEAU: Route pour servir l'interface de gestion des médicaments
app.get("/medicines", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "medicines.html"));
});

// Démarrer le monitoring automatique
const { startDeviceMonitoring } = require("./controllers/medboxController");
const { testEmailConfiguration } = require('./services/emailService');
testEmailConfiguration();

function printStartupMessage() {
  console.log('\n'.repeat(50));
  console.log(chalk.gray("====================================="));
  console.log(chalk.blueBright("   Démarrage de MedboxTM Backend   "));
  console.log(chalk.gray("====================================="));
  console.log(chalk.greenBright("all services are up and running..."));
  console.log(chalk.greenBright(`Service running on localhost:${PORT}`));
  console.log(chalk.yellowBright("🏥 MEDBOX API disponible sur /api/medbox"));
  console.log(chalk.yellowBright("📱 Interface MEDBOX disponible sur /medbox"));
  console.log(chalk.yellowBright("💊 API Médicaments disponible sur /api/medicines")); // NOUVEAU
  console.log(chalk.yellowBright("🔬 Interface Médicaments disponible sur /medicines")); // NOUVEAU
  console.log(chalk.cyanBright("🔍 Monitoring des appareils MEDBOX activé"));
  console.log(chalk.greenBright("any issue must be reported at admin@medbox.eu"));
  console.log(chalk.gray("====================================="));
}

// Démarrer le serveur
app.listen(PORT, () => {
  printStartupMessage();
  
  // Démarrer le monitoring automatique après le démarrage du serveur
  try {
    startDeviceMonitoring();
    console.log(chalk.cyanBright("🔍 Système de monitoring MEDBOX démarré avec succès"));
  } catch (error) {
    console.error(chalk.redBright("❌ Erreur lors du démarrage du monitoring:"), error);
  }
});

// Gestion du processus d'arrêt
process.on("SIGINT", () => {
  console.log("Arrêt des services backend...");
  logStream.end();
  process.exit();
});

process.on("SIGTERM", () => {
  console.log("Arrêt des services backend...");
  logStream.end();
  process.exit();
});