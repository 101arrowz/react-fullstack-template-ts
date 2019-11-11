import { ResponseError } from '../../../common/apiTypes';
import { VerifyErrors } from 'jsonwebtoken';
declare module 'express-serve-static-core' {
  interface Request {
    /**
     * The payload of the JSON Web Token used in the request.
     */
    jwt?: { [k: string]: unknown };
  }

  interface Response {
    /**
     * Respond to the request with an error
     * @param val the name of the error to return. Must exist in ResponseError
     */
    err(val?: ResponseError): void;

    /**
     * Respond to the request successfully
     * @param data the data to return back to the client
     */
    success(data?: object): void;
  }
}
declare module 'jsonwebtoken' {
  /**
   * A JSON Web Token, containing at least:
   * - jti: the ID of the JWT
   * - iat: the time at which the JWT was issued
   * - exp: the time at which the JWT will expire
   *
   * It may also contain other custom parameters.
   */
  interface JWT {
    jti: string;
    iat: number;
    exp: number;
    [k: string]: unknown;
  }
  /**
   * A modified VerifyCallback that uses a JWT instead of a plain object
   */
  type CVerifyCallback = (err: VerifyErrors, decoded: JWT) => void;
}
