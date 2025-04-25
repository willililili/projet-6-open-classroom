const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");

// Route pour créer un nouvel utilisateur
router.post("/signup", userController.signup);

// Route pour se connecter
router.post("/login", userController.login);

module.exports = router;
