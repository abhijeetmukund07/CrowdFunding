const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userRouter = express.Router();

let userCollection;

userRouter.use((req, res, next) => {
  userCollection = req.app.get("userCollection");
  next();
});

// User Creation
userRouter.post(
  "/new-user",
  expressAsyncHandler(async (req, res) => {
    const user = req.body;
    const dbUser = await userCollection.findOne({ username: user.username });

    if (user.username === process.env.ADMIN_USERNAME) {
      return res.send({ message: "Not Authorized", statusCode: 6 });
    }

    if (dbUser !== null) {
      return res.send({ message: "User Already Exists", statusCode: 1 });
    }

    const hashedPassword = await bcryptjs.hash(user.password, 7);
    user.password = hashedPassword;

    await userCollection.insertOne(user);
    res.send({ message: "User Created", statusCode: 2 });
  })
);

// User Login
userRouter.post(
  "/login",
  expressAsyncHandler(async (req, res) => {
    const user = req.body;
    const dbUser = await userCollection.findOne({ username: user.username });

    if (
      user.username === process.env.ADMIN_USERNAME &&
      user.password === process.env.ADMIN_PASSWORD
    ) {
      const token = jwt.sign(
        { username: user.username },
        process.env.SECRET_KEY,
        { expiresIn: "1d" }
      );

      delete user.password;
      res.send({
        message: "Admin Logged in",
        statusCode: 5,
        token: token,
        user: user,
      });
    }

    if (dbUser === null) {
      return res.send({ statusCode: 7, message: "Invalid Username" });
    }

    const status = await bcryptjs.compare(user.password, dbUser.password);

    if (status === false) {
      return res.send({ message: "Invalid Password", statusCode: 3 });
    }

    const token = jwt.sign(
      { username: user.username },
      process.env.SECRET_KEY,
      { expiresIn: "1d" }
    );

    delete dbUser.password;
    res.send({
      message: "Login Success",
      statusCode: 4,
      token: token,
      user: dbUser,
    });
  })
);

module.exports = userRouter;
