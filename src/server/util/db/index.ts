import DataStore from 'nedb';
import { resolve } from 'path';
import {
  User,
  Post,
  Comment,
  DM,
  Identifiable,
  Identifier
} from '../../../common/apiTypes';
import uid from 'uniqid';

/**
 * A wrapped NeDB database
 * @param name The name of the database
 */
export class DB<G extends Identifiable> extends DataStore<G> {
  private static promisify<T>(
    action: (cb: (err: Error, val: T) => void) => void
  ): Promise<T> {
    return new Promise((resolve, reject) =>
      action((err, val) => (err ? reject(err) : resolve(val)))
    );
  }

  private name: string;

  constructor(name: string) {
    super({
      filename: resolve(__dirname, `${name}.db`),
      autoload: true
    });
    this.name = name;
  }

  /**
   * Creates a new item with an auto-generated identifier
   * @param newItem The new item to insert
   * @returns A promise with the new item
   */
  async createItem(newItem: Omit<G, '_id'> | G): Promise<G> {
    return DB.promisify<G>(cb =>
      super.insert(
        {
          _id: uid(this.name + '-'),
          ...newItem
        } as G,
        cb
      )
    );
  }

  /**
   * Deletes an item from the database
   * @param item The identifier of the item to remove
   * @returns A promise with whether or not the document was found and deleted
   */
  async deleteItem(item: Identifier<G>): Promise<boolean> {
    const numDeleted = await DB.promisify<number>(cb =>
      super.remove(
        {
          _id: typeof item === 'string' ? item : item._id
        },
        { multi: false },
        cb
      )
    );
    return numDeleted > 0;
  }

  /**
   * Resolves an identifier to its full document.
   * @param item The identififer of the element to resolve
   * @returns A promise with the document whose identifier was provided, or void if the identifier was invalid
   */
  async resolve(item: Identifier<G>): Promise<G | void> {
    if (typeof item !== 'string') return item;
    return this.search({
      _id: item
    });
  }

  /**
   * Searches for documents in the database using a query
   * @param query The MongoDB-style query to search with
   * @param multi Whether or not to search for multiple documents
   * @returns The document(s) found, or void if none were found
   */
  async search<B extends boolean>(
    query: unknown,
    multi: B
  ): Promise<(B extends true ? G[] : G) | void>;
  async search(query: unknown): Promise<G | void>;
  async search(query: unknown, multi = false): Promise<G | G[] | void> {
    if (multi) {
      const docs = await DB.promisify<G[]>(cb => super.find(query, cb));
      if (docs.length > 0) return docs;
    } else {
      const doc = await DB.promisify<G>(cb => super.findOne(query, cb));
      if (doc !== null) return doc;
    }
  }

  /**
   * Replaces a document with a new one
   * @param item The identifier of the document to replace
   * @param newItem The new document to replace the old documents with, or the MongoDB-like replacement query
   * @returns Whether the document was found and overwritten or not
   */
  async overwrite(item: Identifier<G>, newItem: unknown): Promise<boolean> {
    const numUpdated = await DB.promisify<number>(cb =>
      super.update(
        {
          _id: typeof item === 'string' ? item : item._id
        },
        newItem,
        { multi: false, upsert: false, returnUpdatedDocs: false },
        cb
      )
    );
    return numUpdated > 0;
  }

  /**
   * Performs a mass, general form of update using a query and replacement query
   * @param query The query for items to replace
   * @param updateQuery The new document to replace the old documents with, or the MongoDB-like replacement query
   * @returns The number of documents replaced
   */
  async massUpdate(query: unknown, updateQuery: unknown): Promise<number> {
    return DB.promisify<number>(cb =>
      super.update(
        query,
        updateQuery,
        { multi: true, upsert: false, returnUpdatedDocs: false },
        cb
      )
    );
  }
}

// Node.js modules are only loaded once, so doing this is OK
const allDB = {
  user: new DB<User>('user'),
  post: new DB<Post>('post'),
  comment: new DB<Comment>('comment'),
  dm: new DB<DM>('dm')
}

const userDB = allDB.user;
const postDB = allDB.post;
const commentDB = allDB.comment;
const DMDB = allDB.dm;

export default allDB;
export { userDB, postDB, commentDB, DMDB };
