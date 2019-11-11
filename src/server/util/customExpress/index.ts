import express from 'express';
import { ResponseErrors } from '../../../common/apiTypes';
express.response.err = function(val = 'UNKNOWN') {
  const err = ResponseErrors[val];
  this.status(err.code).json({
    err: {
      code: val,
      friendly: err.friendly
    }
  });
};
express.response.success = function(val = {}) {
  this.status(200).json(val);
};
export default express;
