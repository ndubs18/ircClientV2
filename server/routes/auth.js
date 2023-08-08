const express = require("express");
const router = express.Router();

//used to verify refresh token
const {verify} = require("jsonwebtoken");

//import bcrypt hashing module
const { hash, compare } = require("bcrypt");

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

//refresh access token
router.post('/refreshtoken', async(req, res) => {

  let id;

  try {
    const {refreshtoken} = req.cookies;
    
    if(!refreshtoken) {
      res.status(500).json({
        message: 'No refresh token 👎',
        type: 'error'
      })
    }

    //if we have a refresh token, verify it
    // !TODO what does this verify function return? is it the payload?
    // !TODO if it is the payload where does id come from?

    try {
      id = verify(refreshtoken, process.env.REFRESH_TOKEN_SECRED).id;
    } catch(error) {
      return res.status(500).json({
        message: 'refresh token is invalid',
        type: 'error'
      });
    }

  if(!id) {
    res.status(500).json({
      message: 'refresh token is invalid',
      type: 'error'
    });
  }

  //if the refresh token is valid, check to see if the user exists
    const user = User.findById(id);

    if(!user) {
      res.status(500).json({
        message: 'user does not exist',
        type: 'error'
      })
    }

    if(user.refreshtoken !== refreshtoken) {
      return res.status(500).json({
        message: 'invalid refresh token',
        type: 'error'
      });
    }
    // if the refresh token is correct, create the new tokens
    const accessToken = createAccessToken(user._id);
    const refreshToken = createRefreshToken(user._id);
    // update the refresh token in the database
    user.refreshtoken = refreshToken;
    // send the new tokes as response
    sendRefreshToken(res, refreshToken);
  }

  catch {

  }
})

//endpoint for when a user wants to logout
router.post('/logout', (req, res) => {
  res.clearCookie('refreshtoken');

  return res.json({
    message: 'logged out successfully',
    type: 'success'
  });
})
  module.exports = router;