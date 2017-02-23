import bcrypt from 'bcrypt-nodejs';
import * as jwt from 'jsonwebtoken';

import * as auth from '../helpers/AuthHelper';
import db from '../models/index';


const userLogin = (req, res) => {
  db.User.findOne({
    where: { $or: {
      username: req.body.username, email: req.body.email
    } }
  }).then((user) => {
    if (!user) {
      return res.status(400).send({
        message: 'User does not exist'
      });
    }
    if (bcrypt.compareSync(req.body.password, user.password)) {
      const token = jwt.sign(user.get({ plain: true }), 'secret', {
        expiresIn: '14 days'
      });
      return res.status(200).json({
        success: true,
        message: 'Login Successful',
        email: user.email,
        userId: user.id,
        token
      });
    }
    return res.status(502).send({
      message: 'unauthorized access'
    });
  })
    .catch((error) => {
      return res.status(400).send(error.message);
    });
};

const userLogout = (req, res) => {
  res.status(200).json({
    // Blacklist the token here
    success: true,
    message: 'Logout successful'
  });
};

const createUser = (req, res) => {
  db.User
    .create({
      username: req.body.username,
      password: req.body.password,
      email: req.body.email,
      firstname: req.body.firstname,
      lastname: req.body.lastname
    })
    .then((user) => {
      const token = jwt.sign(user.get({ plain: true }), 'secret', {
        expiresIn: '14 days'
      });
      return res.status(201).json({
        success: true,
        message: 'User account created',
        email: user.email,
        roleId: user.role,
        token
      });
    })
    .catch(error =>
      res.status(500).json({ success: false, message: error.message })
    );
};

const getUsers = (req, res) => {
  if (!auth.userIsAdmin(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'unauthorized access'
    });
  }
  db.User.findAll()
    .then((data) => {
      if (data.length) {
        res.status(200).json(data);
      } else {
        return res.status(200).json({
          success: true
        });
      }
    })
    .catch((error) => {
      res.status(500).json({
        success: false,
        message: error.message
      });
    });
};

const findUserById = (req, res) => {
  const dataId = req.params.id;
  if (!auth.userHasPermission(req.user, dataId)) {
    return res.status(502).send({
      message: 'You have no permission to view'
    });
  }
  db.User
    .findById(dataId)
    .then((data) => {
      if (!data) {
        res.status(404).send({
          message: 'User not found'
        });
      }
      res.status(200).send({
        username: data.username,
        email: data.email,
        firstname: data.firstname,
        lastname: data.lastname,
        joined: data.createdAt
      });
    })
    .catch((error) => {
      res.status(400).send({ message: error });
    });
};

const updateUserData = (req, res) => {
  const dataId = req.params.id;
  if (!auth.userHasPermission(req.user, dataId)) {
    return res.status(401).json({
      success: false,
      message: 'unauthorized access'
    });
  }
  db.User.findById(dataId)
    .then((data) => {
      if (!data) {
        res.status(404).json({
          success: false,
          message: 'not found'
        });
      }
      data.update({
        username: req.body.username || data.username,
        password: req.body.password || data.password,
        email: req.body.email || data.email,
        firstname: req.body.firstname || data.firstname,
        lastname: req.body.lastname || data.lastname
      })
        .then((result) => {
          if (!result) {
            res.status(400).json({
              success: false,
              message: 'Unable to modify'
            });
          }
          res.status(201).json(
            data
          );
        })
        .catch((error) => {
          res.status(400).json({
            success: false,
            message: error
          });
        });
    })
    .catch((error) => {
      res.status(400).json({
        success: false,
        message: error
      });
    });
};

const deleteUser = (req, res) => {
  const dataId = req.params.id;
  if (!auth.userHasPermission(req.user, dataId)) {
    return res.status(401).json({
      success: false,
      message: 'unauthorized access'
    });
  }
  db.User.findById(dataId)
    .then((data) => {
      if (!data) {
        res.status(404).json({
          success: false,
          message: 'not found'
        });
      }
      data.destroy()
        .then(() => {
          res.status(201).json({
            success: true,
            message: 'User account has been deleted'
          });
        })
        .catch((error) => {
          res.status(400).json({
            success: false,
            message: error
          });
        });
    });
};

const getUserDocumentById = (req, res) => {
  const userId = req.user.userId;
  const requestId = req.params.id;
  const query = {
    where: {
      owner: requestId
    }
  };
  if (userId == String(requestId) || auth.userIsAdmin(req.user.role)) {
    db.Document
      .findAll(query)
      .then((data) => {
        return res.status(200).json(data);
      })
      .catch((error) => {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      });
  } else {
    db.Document
      .findAll({
        where: {
          owner: requestId,
          $and: {
            access: 'public'
          }
        }
      })
      .then((data) => {
        if (data.length) {
          res.status(200).json(data);
        } else {
          return res.status(404).json({
            success: false,
            message: 'no data'
          });
        }
      })
      .catch((error) => {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      });
  }
};

export {
  userLogin,
  userLogout,
  createUser,
  getUsers,
  findUserById,
  updateUserData,
  deleteUser,
  getUserDocumentById
};
