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
  requester: Identifier,
  owner?: User
) => Promise<boolean>;
const accessibleData: { [k in LocalRestrictionLevel]: Restricter } = {
  async all() {
    return true;
  },
  async friends(data, requester, owner) {
    const doc = owner || await userDB.resolve(data.owner);
    return !!doc && !!doc.profile.friends && doc.profile.friends.includes(requester);
  },
  async owner(data, requester) {
    return data.owner === requester;
  },
  async unset(data, requester, owner) {
    const doc = owner || await userDB.resolve(data.owner);
    return !!doc && doc.prefs.private ? this.owner(data, requester, owner) : this.all(data, requester, owner);
  }
};
const allowed = async <T extends Visible & Owned>(
  data: T,
  requester: Identifier<User>,
  owner?: User
): Promise<T | void> => {
  if (typeof requester !== 'string') requester = requester._id;
  const { restrictedTo, ...newData } = data;
  if (owner && owner._id !== data.owner)
    owner = undefined;
  const isAllowed = accessibleData[restrictedTo || 'unset'](newData, requester, owner);
  if (isAllowed) {
    for (const kv of Object.entries(newData).filter(
      el =>
        el[1] instanceof Object &&
        el[1].hasOwnProperty('restrictedTo') &&
        el[1].hasOwnProperty('owner')
    ) as [keyof typeof newData, Visible & Owned][]) {
      // Assume that all required properties will not have a restriction level
      const newValue = await allowed(kv[1], requester, owner);
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
