const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const { uploadImage, compressImage } = require("../middleware/multer-config");
const bookController = require("../controllers/bookController");

// Obtenir la liste des livres
router.get("/", bookController.getAllBooks);

// Obtenir les livres ayant la meilleure note
router.get("/bestrating", bookController.getBooksByBestRating);

// Obtenir les détails d'un livre spécifique
router.get("/:id", bookController.getBookById);

// Créer un livre
router.post("/", auth, uploadImage, compressImage, bookController.createBook);

// Mettre à jour un livre
router.put("/:id", auth, uploadImage, compressImage, bookController.updateBook);

// Supprimer un livre
router.delete("/:id", auth, bookController.deleteBook);

//Noter un livre
router.post("/:id/rating", auth, bookController.rateBook);

module.exports = router;
