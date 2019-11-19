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
async function allowed<T extends Visible>(
  data: T,
  requester: Identifier<User>,
  owner?: User
): Promise<T | void> {
  if (typeof requester !== 'string') requester = requester._id;
  const newData = {...data} as unknown as T & Owned;
  if (!(newData as Object).hasOwnProperty('owner') && owner)
    newData.owner = owner._id;
  if (!newData.owner) return;
  if (owner && owner._id !== newData.owner)
    owner = undefined;
  const isAllowed = await accessibleData[newData.restrictedTo || 'unset'](newData, requester, owner);
  if (isAllowed) {
    for (const kv of Object.entries(newData).filter(el => el instanceof Object && el.hasOwnProperty('restrictedTo')) as [keyof typeof newData, Visible][]) {
      // Assume that all required properties will not have a restriction level
      const newValue = await allowed({...owner && { owner: newData.owner || owner._id }, ...kv[1]} as Owned & Visible, requester, owner as User);
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
