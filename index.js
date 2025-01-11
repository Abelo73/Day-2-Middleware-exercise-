const express = require("express");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY;

let books = [
  { id: 1, title: "1984", author: "George Orwell" },
  { id: 2, title: "To Kill a Mockingbird", author: "Harper Lee" },
];

// Middleware to authenticate JWT

const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token)
    return res.status(401).json({
      message: "Access token is missing",
    });

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid Token" });

    req.user = user;
    next();
  });
};

// Middleware for role-based access control

function authorizeRole(role) {
  return (req, res, next) => {
    console.log("User Role:", req.user.role); // Debug user role

    if (req.user.role !== role) {
      return res.status(403).json({ message: "Forbidden: Access denied" });
    }

    next();
  };
}

app.post("/api/login", (req, res) => {
  const { username, role } = req.body;

  if (!username || !role) {
    return res.status(400).json({ message: "Username and role are required" });
  }

  const payload = { username, role }; // Include role in the payload
  const token = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: "1h" });

  res.json({ token });
});

// Get all books (public endpoint)
app.get("/api/books", (req, res) => {
  res.json(books);
});

// Add a new book (admin only)

app.post(
  "/api/books",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    const { title, author } = req.body;
    const newBook = { id: books.length + 1, title, author };
    books.push(newBook);
    res.status(201).json(newBook);
  }
);

// Update books endpoint

app.put(
  "/api/books/:id",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    const id = req.params.id;
    const { title, author } = req.body;
    // const bookIndex = books.indexOf((book)=>book.id === parseInt(id))

    const bookIndex = books.findIndex((book) => book.id === parseInt(id));
    if (bookIndex === -1) {
      return res.status(404).json({ message: "Books with id not found" });
    }
    books[bookIndex].title = title;
    books[bookIndex].author = author;
    res.json(books[bookIndex]);
  }
);

// Delete a book (only admin)

app.delete(
  "/api/books/:id",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    const id = req.params.id;

    const filteredBooks = books.filter((book) => book.id !== parseInt(id));

    if (filteredBooks.length === books.length) {
      return res
        .status(404)
        .json({ message: "Books not found", status: false });
    }

    books = filteredBooks;
    res
      .status(200)
      .json({ message: "Book deleted successfully", status: true });
  }
);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
