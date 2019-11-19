import { ResponseError } from '../../common/apiTypes';
type RequestOptions<T> = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: RequestBody<T>;
  credentialsNeeded?: boolean;
  raw?: object;
};
type RequestBody<T> = {
  resolve?: (keyof T)[];
};
type ServerError = {
  code: ResponseError;
  friendly: string;
};
/**
 * Make a request to the server
 * @param path the path to make the request to
 * @param opts the options for the request
 */
const request = <T = unknown>(
  path: string,
  { method = 'GET', credentialsNeeded = true, body }: RequestOptions<T> = {}
): Promise<T | ServerError> =>
  new Promise(async (resolve, reject) => {
    const res = await fetch(`/api/${path}`, {
      method,
      credentials: credentialsNeeded ? 'include' : 'omit',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: typeof body === 'undefined' ? undefined : JSON.stringify(body)
    });
    const data = await res.json();
    if (data.err) reject(data.err as ServerError);
    else resolve(data as T);
  });
export default request;
