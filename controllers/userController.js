const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: ".env.local" });
const User = require("../models/User");

// Regex pour les formats d'emails et de mots de passe
const emailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordFormat = /^(?=.*\d).{8,}$/;

// Fonction pour créer un nouvel utilisateur
exports.signup = (req, res) => {
    const errorMessages = [];

    // Vérifie le format de l'email
    if (!emailFormat.test(req.body.email)) {
        errorMessages.push("Format de l'email invalide.");
    }
    // Vérifie le format du mot de passe
    if (!passwordFormat.test(req.body.password)) {
        errorMessages.push(
            "Format du mot de passe invalide. Le mot de passe doit contenir au moins 8 caractères et au moins 1 chiffre."
        );
    }
    // Renvoie l'erreur
    if (errorMessages.length > 0) {
        return res.status(400).json({ messages: errorMessages });
    }

    // Logique pour créer un nouvel utilisateur
    bcrypt
        .hash(req.body.password, 10)
        .then((hash) => {
            const user = new User({
                email: req.body.email,
                password: hash,
            });
            user.save()
                .then(() =>
                    res.status(201).json({ message: "Utilisateur créé !" })
                )
                .catch((error) => res.status(400).json({ error }));
        })
        .catch((error) => res.status(500).json({ error }));
};

// Fonction pour se connecter
exports.login = (req, res) => {
    // Logique pour se connecter
    User.findOne({ email: req.body.email })
        .then((user) => {
            if (!user) {
                return res
                    .status(401)
                    .json({ message: "Paire login/mot de passe incorrecte" });
            }
            bcrypt
                .compare(req.body.password, user.password)
                .then((valid) => {
                    if (!valid) {
                        return res.status(401).json({
                            message: "Paire login/mot de passe incorrecte",
                        });
                    }
                    res.status(200).json({
                        userId: user._id,
                        token: jwt.sign(
                            { userId: user._id },
                            process.env.TOKEN_SECRET,
                            { expiresIn: "24h" }
                        ),
                    });
                })
                .catch((error) => {
                    if (error instanceof bcrypt.BCryptError) {
                        return res.status(401).json({
                            message:
                                "Erreur lors de la comparaison des mots de passe",
                        });
                    } else {
                        return res.status(500).json({
                            message:
                                "Une erreur est survenue lors de la connexion",
                        });
                    }
                });
        })
        .catch((error) => res.status(500).json({ error }));
};
