const { sign } = require("jsonwebtoken");

// create the access token
const createAccessToken = (id) => {
  return sign({ id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: 15 * 60,
  });
};

// create the refresh token
const createRefreshToken = (id) => {
  return sign({ id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "90d",
  });
};

//create the reset email token
const createPasswordResetToken = ({ _id, email, password }) => {
  const secret = password;
  return sign({ id: _id, email }, secret, {
    expiresIn: 15 * 60, // 15 minutes
  });
};
// sending the access token to the client
const sendAccessToken = (req, res, accesstoken) => {
  res.json({
    accesstoken,
    message: "Sign in Successful 🥳",
    type: "success",
  });
};

// sending the refresh token to the client as a cookie
const sendRefreshToken = (res, refreshtoken) => {
  res.cookie("refreshtoken", refreshtoken, {
    httpOnly: true,
  });
};

module.exports = {
  createAccessToken,
  createRefreshToken,
  sendAccessToken,
  sendRefreshToken,
};