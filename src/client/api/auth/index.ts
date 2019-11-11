import { sha256 } from 'js-sha256';
const getLoginCredentials = (
  username: string,
  pass: string
): { username: string; pass: string } => ({
  username,
  pass: sha256.hmac
    .create(username)
    .update(pass)
    .hex()
});
export { getLoginCredentials };
