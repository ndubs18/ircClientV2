const express = require("express");

// creating a router
const router = express.Router();

// configuring routes
router.get("/", (req, res) => {
  res.render('index');
});
module.exports = router;