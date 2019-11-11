import { ResponseError } from '../../common/apiTypes';
type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  graphql?: GraphQLOptions;
  disableCredentials?: boolean;
  raw?: object;
};
type GraphQLOptions = {
  query?: string;
  variables?: { [k: string]: unknown }; // Basically any type
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
  {
    method = 'GET',
    disableCredentials,
    graphql: { query, variables } = {},
    raw
  }: RequestOptions = {}
): Promise<T | ServerError> =>
  new Promise(async (resolve, reject) => {
    const res = await fetch((process.env.API_PATH || '/api') + path, {
      method,
      credentials: disableCredentials ? 'omit' : 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: raw
        ? JSON.stringify(raw)
        : query
        ? JSON.stringify({
            query,
            variables: variables ? JSON.stringify(variables) : undefined
          })
        : undefined
    });
    const data = await res.json();
    if (data.err) reject(data.err as ServerError);
    else resolve(data as T);
  });
export default request;
