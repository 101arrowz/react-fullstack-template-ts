import {
  Visible,
  User,
  RestrictionLevel,
  Owned,
  Identifier
} from '../../../common/apiTypes';
import { userDB } from '../db';
type LocalRestrictionLevel = RestrictionLevel | 'unset';
type Restricter = <T extends Owned>(
  data: T,
  requester: Identifier
) => Promise<boolean>;
const accessibleData: { [k in LocalRestrictionLevel]: Restricter } = {
  async all() {
    return true;
  },
  async friends(data, requester) {
    return new Promise<User>((resolve, reject) =>
      userDB.findOne(
        {
          _id: data.owner
        },
        (err, doc) => (err ? reject(err) : resolve(doc))
      )
    ).then(doc => {
      return !!doc.profile.friends && doc.profile.friends.includes(requester);
    });
  },
  async owner(data, requester) {
    return data.owner === requester;
  },
  async unset(data, requester) {
    return new Promise<User>((resolve, reject) =>
      userDB.findOne(
        {
          _id: data.owner
        },
        (err, doc) => (err ? reject(err) : resolve(doc))
      )
    ).then(doc =>
      doc.prefs.private
        ? this.owner(data, requester)
        : this.all(data, requester)
    );
  }
};
const allowed = async <T extends Visible & Owned>(
  data: T,
  requester: Identifier<User>
): Promise<T | void> => {
  if (typeof requester !== 'string') requester = requester._id;
  const { restrictedTo, ...newData } = data;
  const isAllowed = accessibleData[restrictedTo || 'unset'](newData, requester);
  if (isAllowed) {
    for (const kv of Object.entries(newData).filter(
      el =>
        el[1] instanceof Object &&
        el[1].hasOwnProperty('restrictedTo') &&
        el[1].hasOwnProperty('owner')
    ) as [keyof typeof newData, Visible & Owned][]) {
      // Assume that all required properties will not have a restriction level
      const newValue = await allowed(kv[1], requester);
      if (!newValue) delete newData[kv[0]];
      else
        newData[
          kv[0]
        ] = (newValue as unknown) as typeof newData[keyof typeof newData];
    }
    return newData as T;
  }
};
export default allowed;
