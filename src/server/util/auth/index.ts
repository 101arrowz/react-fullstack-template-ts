import express from '../customExpress';
import argon2 from 'argon2';
import jwt, { VerifyErrors } from 'jsonwebtoken';
import uid from 'uniqid';
import { sha256 } from 'js-sha256';
import rateLimit from 'express-rate-limit';
import { userDB as db } from '../db';

import commonPasswords from './commonPasswords.json';
import { User } from '../../../common/apiTypes';

let SECRET_JWT_KEY: jwt.Secret = process.env.PKEY as string;
if (!SECRET_JWT_KEY) {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Set PKEY as environment variable');
  else SECRET_JWT_KEY = 'insecure-dev-key';
}
const REFRESH_VALID = 604800; // 1 week
const JWT_VALID = 900; // 15 minutes

const serverStartTime = Date.now();
const blacklistedRefTokens = new Set();
/**
 * Blacklists a refresh token to prevent it from being reused
 * @param id the ID of the token to blacklist
 * @param removeAt the time at which to remove the token. Used to prevent cluttering up memory with expired tokens
 */
const blacklistToken = (id: string, removeAt = 0): void => {
  blacklistedRefTokens.add(id);
  const timeout = removeAt - Date.now();
  if (timeout > 0) setTimeout(() => blacklistedRefTokens.delete(id), timeout);
};

/**
 * Generates a general type of JWT
 * @param payload the payload for the token
 * @param expiresIn how long from now the token will expire
 */
const genGenericToken = (payload: object, expiresIn: number): string =>
  jwt.sign(payload, SECRET_JWT_KEY, {
    algorithm: 'HS256',
    expiresIn,
    jwtid: uid()
  });

/**
 * Generates a refresh JWT
 * @param payload the payload for the refresh token
 */
const genRefreshToken = (payload: object): string =>
  genGenericToken(payload, REFRESH_VALID);

/**
 * Generates a standard JWT
 * @param payload the payload for the token
 */
const genToken = (payload: object): string =>
  genGenericToken(payload, JWT_VALID);

declare module 'express-serve-static-core' {
  interface Response {
    /**
     * Assigns JWTs to the client cookies
     * @param payload the payload of the token
     * @param refreshPayload the payload of the refresh token. Defaults to `payload`
     */
    assignTokens(payload: object, refreshPayload?: object): void;
  }
}
express.response.assignTokens = function(payload, refreshPayload = payload) {
  /*
  Have to also verify validity on server side because client can just ignore maxage
  However, it saves resources for the server if we do set it, because compliant browsers will follow it.   
  */
  this.cookie('token', genToken(payload), {
    maxAge: 1000 * JWT_VALID,
    httpOnly: true
  });
  this.cookie('refreshToken', genRefreshToken(refreshPayload), {
    maxAge: 1000 * REFRESH_VALID,
    httpOnly: true
  });
};
/**
 * Authorization middleware for `express` routes
 * Will only continue if the client is authorized
 */
const authorize: express.Handler = (req, res, next) => {
  const refreshVerifyCallback: jwt.CVerifyCallback = (err, decoded) => {
    if (
      err ||
      decoded.iat * 1000 < serverStartTime ||
      blacklistedRefTokens.has(decoded.jti)
    )
      res.err;
    else {
      const payload = { username: decoded.username };
      res.assignTokens(payload);
      req.jwt = payload;
      next();
    }
  };
  const verifyCallback: jwt.CVerifyCallback = (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        if (req.cookies.refreshToken) {
          jwt.verify(
            req.cookies.refreshToken,
            SECRET_JWT_KEY,
            {
              algorithms: ['HS256']
            },
            refreshVerifyCallback as jwt.VerifyCallback
          );
        } else res.err('INVALID_TOKEN');
      } else res.err('UNKNOWN');
    } else if (decoded.iat * 1000 < serverStartTime) res.err('INVALID_TOKEN');
    else {
      req.jwt = { username: decoded.username };
      next();
    }
  };
  if (!req.cookies.token)
    verifyCallback(
      { name: 'TokenExpiredError' } as VerifyErrors,
      {} as jwt.JWT
    );
  else
    jwt.verify(
      req.cookies.token,
      SECRET_JWT_KEY,
      {
        algorithms: ['HS256']
      },
      verifyCallback as jwt.VerifyCallback
    );
};

/**
 * Adds routes needed for the authentication flow to an `express` app
 * @param app the `express` application to add the routes to
 */
const addAuthRoutes = (app: express.Application): void => {
  app.post('/login', (req, res) => {
    const { username, pass } = req.body;
    if (!username) res.err('INVALID_USERNAME');
    else if (!pass) res.err('INVALID_PASSWORD');
    else
      db.findOne({ username }, async (err, doc) => {
        if (err) res.err('UNKNOWN');
        else if (!doc) res.err('USERNAME_NOT_FOUND');
        else if (!(await argon2.verify(doc.pass, pass)))
          res.err('INCORRECT_PASSWORD');
        else {
          res.assignTokens({ username }); // Change here to change data saved in token everywhere
          res.success({ username });
        }
      });
  });
  app.delete('/logout', (req, res) => {
    if (req.cookies.token) res.clearCookie('token');
    if (req.cookies.refreshToken) {
      res.clearCookie('refreshToken');
      jwt.verify(
        req.cookies.refreshToken,
        SECRET_JWT_KEY,
        {
          algorithms: ['HS256']
        },
        (((err, decoded) => {
          if (err) res.err('INVALID_REFRESH_TOKEN');
          else {
            blacklistToken(decoded.jti, decoded.exp * 1000);
            res.success();
          }
        }) as jwt.CVerifyCallback) as jwt.VerifyCallback
      );
    } else {
      res.success();
    }
  });
  app.use(
    '/manageuser',
    rateLimit({
      windowMs: 60000,
      max: 30,
      message: JSON.stringify({
        err: 'TooManyRequests'
      })
    })
  );
  app
    .route('/manageuser')
    .put((req, res) => {
      res.cookie;
      // Protect users using same password on multiple sites by hashing on client AND server
      // Pass length must be 64 after client-side HMAC-SHA256 ("salt" is username - not a true salt but it works)
      let {
        username,
        pass,
        email
      }: { username: string; pass: string; email: string } = req.body;
      if (!username) {
        username = email;
      }
      if (!pass || pass.length !== 64) res.err('INVALID_PASSWORD');
      else if (!username || username.length < 4 || username.length > 32)
        res.err('INVALID_USERNAME');
      else if (!email) res.err('INVALID_EMAIL');
      else if (commonPasswords.find(el => sha256.hmac(username, el) === pass))
        res.err('COMMON_PASSWORD');
      else
        db.findOne(
          email ? { $or: [{ email }, { username }] } : { username },
          async (err, doc) => {
            if (err) res.err('UNKNOWN');
            else if (doc) res.err('USERNAME_OR_EMAIL_ALREADY_EXISTS');
            else {
              const date = new Date();
              const newUser: User = {
                _id: uid('user'),
                username,
                name: username,
                email,
                pass: await argon2.hash(pass, {
                  type: argon2.argon2id,
                  parallelism: 2
                }),
                signedUp: date,
                lastLogin: date,
                profile: {
                  _id: uid('profile')
                },
                prefs: {
                  private: false,
                  lang: 'en-US'
                }
              };
              db.insert(newUser, err => {
                if (err) res.err('UNKNOWN');
                else {
                  res.success();
                }
              });
            }
          }
        );
    })
    .delete((req, res) => {
      const { pass, username } = req.body;
      if (!username) res.err('INVALID_USERNAME');
      else if (!pass) res.err('INVALID_PASSWORD');
      else
        db.findOne({ username }, async (err, doc) => {
          if (err) res.err('UNKNOWN');
          else if (!doc) res.err('USERNAME_NOT_FOUND');
          else if (!(await argon2.verify(doc.pass, pass)))
            res.err('INCORRECT_PASSWORD');
          else
            db.remove(doc, err => {
              if (err) res.err('UNKNOWN');
              else res.success();
            });
        });
    })
    .patch(authorize, (req, res) => {
      const oldUsername = req.jwt!;
      const { username, email } = req.body;
      if (!username && !email) res.err('NO_CHANGES');
      if (username && (username.length < 4 || username.length > 32))
        res.err('INVALID_USERNAME');
      db.findOne(
        username && email
          ? { $or: [{ username }, { email }] }
          : username
          ? { username }
          : { email },
        (err, doc) => {
          if (err) res.err('UNKNOWN');
          else if (doc) res.err('USERNAME_OR_EMAIL_ALREADY_EXISTS');
          else {
            db.update(
              { username: oldUsername },
              { ...(username && { username }), ...(email && { email }) }
            );
            res.success();
          }
        }
      );
    });
};

export { authorize, addAuthRoutes };
