const express = require("express");
const router = express.Router();

//used to verify refresh token
const {verify} = require("jsonwebtoken");

//import bcrypt hashing module
const { hash, compare } = require("bcrypt");

const {
  createAccessToken, 
  createRefreshToken, 
  sendAccessToken, 
  sendRefreshToken, 
  createPasswordResetToken} = require('../../utils/token');

const {
  transporter,
  createPasswordResetUrl,
  passwordResetTemplate,
  passwordResetConfirmationTemplate,
} = require("../../utils/email");

const User = require('../../models/user.js')

//middleware function for protected routes
const { protected } = require("../../utils/protected");

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
router.post('/refreshtoken', async (req, res) => {

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
    //verify function returns the payload as an object with the propery id
    //which you can see in the function definitnion - parameter to sign() function.
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
    return res.json({
      message: 'refreshed successfully',
      type: 'success',
      accessToken
    });
  }

  catch(error) {
    res.status(500).json({
      message: 'There was an error when refreshing the token!',
      type: 'error',
      error
    });
  }
})

// protected route
router.get("/chat", protected, async (req, res) => {
  try {
    // if user exists in the request, send the data
    if (req.user)
      return res.json({
        message: "You are logged in! 🤗",
        type: "success",
        user: req.user,
      });
    // if user doesn't exist, return error
    return res.status(500).json({
      message: "You are not logged in! 😢",
      type: "error",
    });
  } catch (error) {
    res.status(500).json({
      type: "error",
      message: "Error getting protected route!",
      error,
    });
  }
});

// send password reset email
router.post("/send-password-reset-email", async (req, res) => {
  try {
    // get the user from the request body
    const { email } = req.body;
    // find the user by email
    const user = await User.findOne({ email });
    // if the user doesn't exist, return error
    if (!user)
      return res.status(500).json({
        message: "User doesn't exist! 😢",
        type: "error",
      });
    // create a password reset token
    const token = createPasswordResetToken({ ...user, createdAt: Date.now() });
    // create the password reset url
    const url = createPasswordResetUrl(user._id, token);
    // send the email
    const mailOptions = passwordResetTemplate(user, url);
    transporter.sendMail(mailOptions, (err, info) => {
      console.log(info);
      if (err) 
        return res.status(500).json({
          message: "Error sending email! 😢",
          type: "error",
        });
      return res.json({
        message: "Password reset link has been sent to your email! 📧",
        type: "success",
      });
    });
  } catch (error) {
    res.status(500).json({
      type: "error",
      message: "Error sending email!",
      error,
    });
  }
});

// reset password
router.post("/reset-password/:id/:token", async (req, res) => {
  try {
    // get the user details from the url
    const { id, token } = req.params;
    // get the new password the request body
    const { newPassword } = req.body;
    // find the user by id
    const user = await User.findById(id);
    // if the user doesn't exist, return error
    if (!user)
      return res.status(500).json({
        message: "User doesn't exist! 😢",
        type: "error",
      });
    // verify if the token is valid
    const isValid = verify(token, user.password);
    // if the password reset token is invalid, return error
    if (!isValid)
      return res.status(500).json({
        message: "Invalid token! 😢",
        type: "error",
      });
    // set the user's password to the new password
    user.password = await hash(newPassword, 10);
    // save the user
    await user.save();
    // send the email
    const mailOptions = passwordResetConfirmationTemplate(user);
    transporter.sendMail(mailOptions, (err, info) => {
      if (err)
        return res.status(500).json({
          message: "Error sending email! 😢",
          type: "error",
        });
      return res.json({
        message: "Email sent! 📧",
        type: "success",
      });
    });
  } catch (error) {
    res.status(500).json({
      type: "error",
      message: "Error sending email!",
      error,
    });
  }
});

//endpoint for when a user wants to logout
router.post('/logout', (req, res) => {
  res.clearCookie('refreshtoken');

  return res.json({
    message: 'logged out successfully',
    type: 'success'
  });
})
  module.exports = router;