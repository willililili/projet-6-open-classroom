const Book = require("../models/Book");
const fs = require("fs");

// Obtenir la liste des livres
exports.getAllBooks = (req, res, next) => {
    // Logique pour obtenir la liste des livres depuis la base de données
    Book.find()
        .then((books) => {
            if (books.length === 0) {
                return res.status(404).json({
                    message: "Aucun livre trouvé.",
                });
            }

            res.status(200).json(books);
        })
        .catch((error) => {
            res.status(500).json({
                message:
                    "Une erreur est survenue lors de la récupération des livres.",
                error: error,
            });
        });
};

// Obtenir les détails d'un livre spécifique
exports.getBookById = (req, res, next) => {
    const bookId = req.params.id;
    // Logique pour obtenir les détails du livre depuis la base de données
    Book.findById(bookId)
        .then((book) => {
            if (!book) {
                return res.status(404).json({
                    message: "Livre non trouvé.",
                    error: error,
                });
            }

            res.status(200).json(book);
        })
        .catch((error) => {
            res.status(500).json({
                message:
                    "Une erreur est survenue lors de la récupération du livre.",
                error: error,
            });
        });
};

// Obtenir les livres ayant la meilleure note
exports.getBooksByBestRating = (req, res, next) => {
    Book.find()
        .sort({ averageRating: -1 })
        .limit(3)
        .then((books) => {
            res.status(200).json(books);
        })
        .catch((error) => {
            res.status(500).json({
                message:
                    "Une erreur est survenue lors de la récupération des livres avec la meilleure note.",
                error: error,
            });
        });
};

//Vérifie le format des inputs du livre
const checkBookInputsFormat = (title, author, genre, year) => {
    const errors = [];

    const titleRegex = /^[a-zA-Z0-9\sÀ-ÿ.,:;!?¿$¥€+/\-_'&@+" ]{3,200}$/; // Alphanumérique, espaces et caractères spéciaux
    const textOnlyRegex = /^[a-zA-Z\sÀ-ÿ.,:;!?¿$¥€+/\-_'&@+" ]{3,50}$/; // Alphabet, espaces et accents
    const yearRegex = /^\d{4}$/; // Format YYYY

    if (title && !titleRegex.test(title)) {
        errors.push("Le format du titre est invalide.");
    }

    if (author && !textOnlyRegex.test(author)) {
        errors.push("Le format de l'auteur est invalide.");
    }

    if (year && !yearRegex.test(year)) {
        errors.push("L'année doit être au format YYYY.");
    }

    if (genre && !textOnlyRegex.test(genre)) {
        errors.push("Le format du genre est invalide.");
    }

    return errors;
};

// Fonction utilitaire pour supprimer une image
const deleteImage = (imagePath) => {
    try {
        fs.unlinkSync(imagePath);
    } catch (error) {
        console.error("Erreur lors de la suppression de l'image", error);
    }
};

// Créer un livre
exports.createBook = async (req, res, next) => {
    try {
        const bookData = JSON.parse(req.body.book);

        delete bookData._id;
        delete bookData._userId;

        const { title, author, genre, year } = bookData;

        const trimmedTitle = title.trim();
        const trimmedAuthor = author.trim();
        const trimmedGenre = genre.trim();
        const trimmedYear = year.trim();

        const errors = checkBookInputsFormat(
            trimmedTitle,
            trimmedAuthor,
            trimmedGenre,
            trimmedYear
        );

        if (errors.length > 0) {
            // Supprime l'image si les inputs sont pas corrects
            if (req.file) {
                deleteImage(req.file.path);
            }
            return res.status(400).json({ message: errors.join(" ") });
        }

        // Vérifie si le livre existe déjà en vérifiant le titre et l'auteur
        const existingBook = await Book.findOne({
            title: trimmedTitle,
            author: trimmedAuthor,
        });

        if (existingBook) {
            // Supprime l'image si le livre existe déjà
            if (req.file) {
                deleteImage(req.file.path);
            }
            throw new Error("Ce livre existe déjà.");
        }

        // Vérifie si la note est nulle et force "ratings" à être vide
        if (
            bookData.ratings &&
            bookData.ratings.length === 1 &&
            bookData.ratings[0].grade === 0
        ) {
            bookData.ratings = [];
            bookData.averageRating = 0;
        }

        const book = new Book({
            ...bookData,
            title: trimmedTitle,
            author: trimmedAuthor,
            genre: trimmedGenre,
            year: trimmedYear,
            userId: req.auth.userId,
            imageUrl: `${req.protocol}://${req.get("host")}/images/${
                req.file.filename
            }`,
        });

        await book.save();

        res.status(201).json({
            message: "Livre créé avec succès !",
        });
    } catch (error) {
        // Supprime l'image en cas d'erreur
        if (req.file) {
            deleteImage(req.file.path);
        }
        res.status(400).json({
            error: error.message,
        });
    }
};

// Modifier un livre
exports.updateBook = async (req, res, next) => {
    let book;
    let oldImageUrl;
    try {
        // Vérifie si une image a été téléchargée, si oui on traite l'image sinon on traite l'objet
        const bookData = req.file
            ? { ...JSON.parse(req.body.book) }
            : { ...req.body };
        delete bookData._userId;

        // Recherche le livre en fonction de l'id
        book = await Book.findOne({ _id: req.params.id });

        // Vérifie si le livre a été trouvé
        if (!book) {
            return res.status(404).json({
                message: "Livre non trouvé.",
            });
        }

        // Vérifie que l'utilisateur est le créateur du livre
        if (book.userId.toString() !== req.auth.userId) {
            return res.status(403).json({
                message: "Vous n'êtes pas autorisé à modifier ce livre.",
            });
        }

        // Sauvegarde l'ancienne image
        oldImageUrl = book.imageUrl;

        // Vérifie le format des champs
        const { title, author, genre, year } = bookData;

        const trimmedTitle = title.trim();
        const trimmedAuthor = author.trim();
        const trimmedGenre = genre.trim();

        const errors = checkBookInputsFormat(
            trimmedTitle,
            trimmedAuthor,
            trimmedGenre,
            year
        );
        if (errors.length > 0) {
            throw new Error(`INPUTS_NOT_VALID: ${errors.join(" ")}`);
        }

        // Récupère le nom du fichier de l'ancienne image
        const oldFilename = book.imageUrl.split("/images/")[1];

        // si un fichier a été chargé
        if (req.file) {
            // Met à jour l'URL de la nouvelle image
            const newImageUrl = `${req.protocol}://${req.get("host")}/images/${
                req.file.filename
            }`;
            book.imageUrl = newImageUrl;
        }

        // Mettre à jour les données du livre
        await book.updateOne({
            title: trimmedTitle,
            author: trimmedAuthor,
            genre: trimmedGenre,
            year: year,
            imageUrl: req.file ? book.imageUrl : oldImageUrl,
        });

        // Supprime l'ancienne image si un fichier a été chargé
        if (req.file) {
            deleteImage(`images/${oldFilename}`);
        }

        res.status(200).json({
            message: "Livre modifié avec succès !",
        });
    } catch (error) {
        // Supprime la nouvelle image en cas d'erreur
        if (req.file) {
            deleteImage(req.file.path);
            try {
                // Restaure l'ancienne image
                await book.updateOne({ imageUrl: oldImageUrl });
            } catch (error) {
                console.error(
                    "Erreur lors de la restauration de l'image :",
                    error
                );
            }
        }

        res.status(400).json({ error: error.message });
    }
};

// Supprimer un livre
exports.deleteBook = (req, res, next) => {
    // Recherche l'id du livre à supprimer dans la base de données
    const bookId = req.params.id;
    Book.findOne({ _id: bookId })
        .then((book) => {
            // Vérifie si le livre a été trouvé
            if (!book) {
                res.status(404).json({
                    message: "Livre non trouvé.",
                });
                // Vérifie que l'utilisateur est le créateur du livre
            } else if (book.userId.toString() !== req.auth.userId) {
                res.status(403).json({
                    message: "Vous n'êtes pas autorisé à supprimer ce livre.",
                });
            } else {
                // Récupère le nom du fichier
                const filename = book.imageUrl.split("/images/")[1];
                // Supprime le livre de la base de données
                Book.deleteOne({ _id: bookId })
                    .then(() => {
                        // Supprime l'image
                        deleteImage(`images/${filename}`);
                        res.status(200).json({
                            message: "Livre supprimé avec succès !",
                        });
                    })
                    .catch((error) => res.status(400).json({ error }));
            }
        })
        .catch((error) => res.status(500).json({ error }));
};

//Notation des livres

//Noter un livre
exports.rateBook = (req, res, next) => {
    const bookId = req.params.id;
    const { userId, rating } = req.body;

    // Vérifie que la note est comprise entre 0 et 5
    if (rating < 0 || rating > 5) {
        return res.status(400).json({
            error: "INVALID_RATING",
            message: "La note doit être un chiffre entre 0 et 5.",
        });
    }

    Book.findById(bookId)
        // Vérifie si le livre existe
        .then((book) => {
            if (!book) {
                throw new Error("BOOK_NOT_FOUND");
            }

            //Vérifie si l'utilisateur a déjà noté le livre
            return Book.findOne({ _id: bookId, "ratings.userId": userId }).then(
                (alreadyRated) => {
                    if (alreadyRated) {
                        throw new Error("ALREADY_RATED");
                    }

                    // Met à jour la moyenne des notations
                    const grades = book.ratings.map((rating) => rating.grade);
                    const sumRatings = grades.reduce(
                        (total, grade) => total + grade,
                        0
                    );

                    const newTotalRating = sumRatings + rating;
                    const newAverageRating = Number(
                        (newTotalRating / (book.ratings.length + 1)).toFixed(2)
                    );

                    // Mise à jour des données du livre
                    book.ratings.push({ userId, grade: rating });
                    book.averageRating = newAverageRating;

                    // Sauvegarde les modifications du livre dans la base de données
                    return book.save().then((updatedBook) => {
                        res.status(201).json({
                            ...updatedBook._doc,
                            id: updatedBook._doc._id,
                        });
                    });
                }
            );
        })

        // Une erreur s'est produite lors de la notation du livre
        .catch((error) => {
            if (error.message === "BOOK_NOT_FOUND") {
                return res.status(404).json({
                    error: error.message,
                    message: "Livre introuvable.",
                });
            } else if (error.message === "ALREADY_RATED") {
                return res.status(403).json({
                    error: error.message,
                    message: "Vous avez déjà noté ce livre.",
                });
            } else {
                return res.status(500).json({
                    error: error.message,
                    message:
                        "Une erreur est survenue lors de la notation du livre.",
                });
            }
        });
};
