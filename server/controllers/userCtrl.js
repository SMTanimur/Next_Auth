import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../model/userModel.js';
import { google } from 'googleapis';
const { OAuth2 } = google.auth;
import asyncHandler from 'express-async-handler';
import fetch from 'node-fetch';
import { sendEmail, sendPasswordResetEmail } from './sendMail.js';
import { generateActivationToken, generateIdToken, resetPasswordIdToken } from '../utils/token/index.js';


const client = new OAuth2(process.env.MAILING_SERVICE_CLIENT_ID);

const { CLIENT_URL } = process.env;


export const register = asyncHandler(async (req, res) => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password)
        return res.status(400).json({ msg: 'Please fill in all fields.' });

      if (!validateEmail(email))
        return res.status(400).json({ msg: 'Invalid emails.' });

      const user = await User.findOne({ email });
      if (user)
        return res.status(400).json({ msg: 'This email already exists.' });

      if (password.length < 6)
        return res
          .status(400)
          .json({ msg: 'Password must be at least 6 characters.' });

      const newUser = {
        name,
        email,
        password,
      };

      const activationToken = generateActivationToken(newUser)
      console.log(activationToken)

      const url = `${CLIENT_URL}/user/activation/${activationToken}`;
      sendEmail(email, url, 'Verify your email address');

      res.json({
        msg: 'Register Success! Please activate your email to start.',
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  })


  // Active User

export const activeUser = asyncHandler(async (req, res) => {
  const {activationToken} = req.body;

  // Decode token
  const decode = jwt.verify(activationToken, process.env.JWT_SECRET);
  // Check if token is not valid
  if (!decode) {
    res.status(401).json({ error: 'Activation token expired' });
  }

  const { name, email, password} = decode;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400).json({ error: 'User already exists' });
  }

  // Create new user
  const user = await User.create({ name, email, password});

  if (user) {
    res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateIdToken(user._id),
      },
      message: `Your account has been successfully activated!`,
    });
  }
});


// Request to reset password
export const requestResetPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  // Check if user exists
  const user = await User.findOne({ email });

  // Check if user does not exist
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  const token = resetPasswordIdToken(
    user._id
  )
  console.log(token);
  const url = `${process.env.CLIENT_URL}/password/reset/${token}`;

  await sendPasswordResetEmail(email, url);
  return res.status(200).json({
    message: `Password reset link has been sent to ${email}`,
  });
});

// Request to reset password
export const changePassword = asyncHandler(async (req, res) => {
  const {token, password } = req.body;

  // Verify token
  const decode = await jwt.verify(token, process.env.JWT_SECRET);
  // Check if token is valid
  if (!decode) {
    res.status(401);
    throw new Error('Invalid token');
  }

  const id = decode.id;
  // Update password

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.findByIdAndUpdate(id, {
    password: hashedPassword,
  });

  // Check if user does not exist
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  await user.save();

  return res.status(200).json({
    message: `Your password has been changed successfully`,
  });
});




// user Login 
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ msg: 'Please fill in all fields.' });

  if (!validateEmail(email))
    return res.status(400).json({ msg: 'Invalid emails.' });

  const user = await User.findOne({ email });
  if (!user)
    return res.status(400).json({ msg: 'Invalid credentials.' });

   if (user&&(await user.matchPassword(password))) {
     res.json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          token: generateIdToken(user._id),
        },
        message: `Welcome back ${user.name}`
     })
   }else {
    res.status(401);
    throw new Error('Password is incorrect');
  }

})


//update user profile

export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  console.log(req.body);
  if (user) {
    user.name = req.body.name || user.name;
    if (req.body.avatar) {
      user.avatar = req.body.avatar;
    }
    if (req.body.newPassword) {
      if (await user.matchPassword(req.body.password)) {
        user.password = req.body.newPassword;
      } else {
        res.status(400);
        throw new Error('Current password is incorrect');
      }
    }

    const updateUser = await user.save();

    res.json({
      user: {
        _id: updateUser._id,
        name: updateUser.name,
        email: updateUser.email,
        avatar: updateUser.avatar,
        token: generateIdToken(updateUser._id),
      },
      message: 'Updated successfully',
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});




// Get User Profile
export const getUserProfile = asyncHandler(async (req, res) => {

  try {
    const user = await User.findById(req.user.id).select('-password')

    res.json(user)
} catch (err) {
    return res.status(500).json({msg: err.message})
}
});

// Get All User Profile
export const getAllUserInfo = asyncHandler(async (req, res) => {

  try {
    const user = await User.findById(req.user.id).select('-password')

    res.json(user)
} catch (err) {
    return res.status(500).json({msg: err.message})
}
});
// Get user by ID
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (user) {
    res.json({ user });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

  

function validateEmail(email) {
  const re =
    /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}


