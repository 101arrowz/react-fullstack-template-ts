// All of these are examples. Feel free to make these what you need them to be!
// Prefer types to interfaces because it should not be extendable (unless general form of other types)
export type Identifier = string;
export interface Identifiable {
  _id: Identifier; // Never changes for an element - can be used for shortlinking
}
export interface Visible {
  // User set restriction level - by default, only the author
  restrictedTo?: 'all' | 'friends' | 'owner';
}
export interface Expirable {
  expiresAt?: Date;
}
export type User = Identifiable &
  Visible & {
    username: string; // Can be changed - unique among users
    name: string; // Freely changeable
    email: string;
    pass: string; // Argon2 hash of password, of course
    signedUp: Date;
    lastLogin: Date;
    profile: Profile;
    prefs: Preferences;
    friends?: User['_id'][];
    friendRequests?: FriendRequests;
    posts?: Post['_id'][];
    comments?: Comment['_id'][];
    likedPosts?: Post['_id'][];
    conversations?: Conversations;
  };
export type Profile = Identifiable &
  Visible & {
    bio?: string;
    icon?: string;
    comments?: Comment[];
  };
export type FriendRequests = {
  incoming: DM['_id'][];
  outgoing: DM['_id'][];
};
export type Edit<T> = {
  value: T;
  date: Date;
};
export type EditHistory<T> = Array<Edit<T>>;
export type Preferences = {
  private: boolean;
  lang: 'en-US' | 'en-GB'; // Add more if your audience needs more
};
export interface Content extends Identifiable {
  content: EditHistory<string>;
  owner: User['_id'];
}
export type DM = Content &
  Identifiable &
  Expirable & {
    read: boolean;
  };
export type Conversations = { [id in Identifier]: DM['_id'][] };
export type Post = Content &
  Visible & {
    title: string;
    likes: number;
    comments: Comment[];
  };
export type Comment = Content & {
  likes: number;
};
