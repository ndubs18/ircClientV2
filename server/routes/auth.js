const express = require("express");
const router = express.Router();
//import bcrypt hashing module
const { hash } = require("bcrypt");

const {createAccessToken, createRefreshToken, sendAccessToken, sendRefreshToken} = require('../../utils/token');

const User = require('../../models/user.js')

router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    // 1. check if user already exists
    const user = await User.findOne({ email: email });

    // if user exists already, return error
    if (user)
      return res.status(500).json({
        message: "User already exists! Try logging in. 😄",
        type: "warning",
      });
    // 2. if user doesn't exist, create a new user
    // hashing the password
    const passwordHash = await hash(password, 10);
    const newUser = new User({
      email: email,
      password: passwordHash,
    });
    // 3. save the user to the database
    await newUser.save();
    // 4. send the response
    res.status(200).json({
      message: "User created successfully! 🥳",
      type: "success",
    });
  } catch (error) {
    res.status(500).json({
      type: "error",
      message: "Error creating user!",
      error,
    });
  }
  });

 // Sign In request
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    // 1. check if user exists
    const user = await User.findOne({ email: email });

    // if user doesn't exist, return error
    if (!user)
      return res.status(500).json({
        message: "User doesn't exist! 😢",
        type: "error",
      });
    // 2. if user exists, check if password is correct
    const isMatch = await compare(password, user.password);

    // if password is incorrect, return error
    if (!isMatch)
      return res.status(500).json({
        message: "Password is incorrect! ⚠️",
        type: "error",
      });

    // 3. if password is correct, create the tokens
    const accessToken = createAccessToken(user._id);
    const refreshToken = createRefreshToken(user._id);

    // 4. put refresh token in database
    user.refreshtoken = refreshToken;
    await user.save();

    // 5. send the response
    sendRefreshToken(res, refreshToken);
    sendAccessToken(req, res, accessToken);
  } catch (error) {
    res.status(500).json({
      type: "error",
      message: "Error signing in!",
      error,
    });
  }
});
  module.exports = router;