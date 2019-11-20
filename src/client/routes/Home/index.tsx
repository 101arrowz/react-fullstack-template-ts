import React, { useState } from 'react';
import request from '../../api';
import { getLoginCredentials } from '../../api/auth';
const login = (username: string, fullPass: string): Promise<object> => {
  const { pass } = getLoginCredentials(username, fullPass);
  return request<object>('/login', {
    method: 'POST',
    body: {
      username,
      pass
    }
  }).catch(v => v);
};
const signUp = (
  username: string,
  email: string,
  fullPass: string
): Promise<object> => {
  const { pass } = getLoginCredentials(username, fullPass);
  return request<object>('/manage/user', {
    method: 'PUT',
    body: {
      username,
      email,
      pass
    }
  }).catch(v => v);
};
const Home: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [text, setText] = useState('Send a request!');
  const tmpUpdateText = (r: object): void => setText(JSON.stringify(r));
  const [password, setPassword] = useState('');
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '200px',
        margin: '0 auto',
        height: '200px',
        justifyContent: 'space-around',
        whiteSpace: 'pre-wrap'
      }}
    >
      <div>
        <label>Username</label>
        <input
          value={username}
          onChange={({ target: { value } }) => setUsername(value)}
        />
      </div>
      <div>
        <label>Email</label>
        <input
          value={email}
          onChange={({ target: { value } }) => setEmail(value)}
        />
      </div>
      <div>
        <label>Password</label>
        <input
          value={password}
          onChange={({ target: { value } }) => setPassword(value)}
          type="password"
        />
      </div>
      <button onClick={() => login(username, password).then(tmpUpdateText)}>
        Login
      </button>
      <button
        onClick={() => signUp(username, email, password).then(tmpUpdateText)}
      >
        Sign Up
      </button>
      <button onClick={() => request<object>('/').then(tmpUpdateText)}>
        API Test
      </button>
      {text}
    </div>
  );
};
export default Home;
