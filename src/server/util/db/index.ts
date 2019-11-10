import DataStore from 'nedb';
import { resolve } from 'path';
import { User, Post, Comment, DM } from '../../../common/types';
const createDB = <T>(name: string): DataStore<T> =>
  new DataStore<T>({
    filename: resolve(__dirname, `${name}.db`),
    autoload: true
  });

// Node.js modules are only loaded once, so doing this is OK
const userDB = createDB<User>('user');
const postDB = createDB<Post>('post');
const commentDB = createDB<Comment>('comment');
const DMDB = createDB<DM>('dm');

export { userDB, postDB, commentDB, DMDB };
