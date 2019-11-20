// All of these are examples. Feel free to make these what you need them to be!
// Prefer types to interfaces because it should not be extendable (unless general form of other types)
export type Identifier<T = string> = string | T; // Allow either a string ID or the object itself
export interface Identifiable {
  readonly _id: Identifier; // Never changes for an element - can be used for shortlinking
}
export type RestrictionLevel = 'all' | 'friends' | 'owner';
export interface Visible {
  // User set restriction level - by default, only the author
  restrictedTo?: RestrictionLevel;
}
export interface Expirable {
  expiresAt?: Date;
}
export interface Owned {
  owner: Identifier<User>;
}
export type User = Identifiable &
  Visible & {
    username: string; // Can be changed - unique among users
    email: string;
    pass: string; // Argon2 hash of password, of course
    profile: Profile;
    prefs: Preferences;
  };
export type Profile = Visible & {
  name: string; // Freely changeable
  bio: string;
  icon?: string; // A URL
  signedUp: Date;
  lastLogin: Date;
  friends: Identifier<User>[];
  friendRequests: FriendRequests;
  posts: Identifier<Post>[];
  comments: Identifier<Comment>[];
  likedPosts: Identifier<Post>[];
  conversations: Conversations;
};
export type FriendRequests = {
  incoming: Identifier<DM>[];
  outgoing: Identifier<DM>[];
};
export type Edit<T> = Visible & {
  value: T;
  date: Date;
};
export type EditHistory<T> = Edit<T>[];
export type Preferences = {
  private: boolean;
  lang: 'en-US' | 'en-GB'; // Add more if your audience needs more
};
export interface Content<T = string> extends Identifiable, Owned, Visible {
  content: EditHistory<T>;
}
export type DM = Content &
  Identifiable &
  Expirable & {
    restrictedTo: 'all';
    read: boolean;
  };
export type Conversations = [Identifier<User>, DM[]][];
export type Post = Content<[string, string]> & {
  title: string;
  likes: number;
  comments: Comment[];
};
export type Comment = Content & {
  likes: number;
};

// Can't set type for this one if we want to use as enum-like structure
export const ResponseErrors = {
  USERNAME_PASSWORD_MISMATCH: {
    // Prevent attackers from checking if an account exists
    code: 404,
    friendly: 'The credentials provided do not match or do not exist.'
  },
  USERNAME_OR_EMAIL_ALREADY_EXISTS: {
    code: 409,
    friendly: 'The requested username already exists.'
  },
  USERNAME_NOT_FOUND: {
    code: 404,
    friendly: 'The requested username was not found.'
  },
  INVALID_REFRESH_TOKEN: {
    code: 401,
    friendly: 'The login credentials have expired.'
  },
  INVALID_TOKEN: {
    code: 401,
    friendly: 'The login session has expired.'
  },
  INVALID_USERNAME: {
    code: 400,
    friendly: 'The username is invalid.'
  },
  INVALID_EMAIL: {
    code: 400,
    friendly: 'The email is invalid.'
  },
  INVALID_PASSWORD: {
    code: 400,
    friendly: 'The password is invalid.'
  },
  INVALID_IDENTIFIER: {
    code: 400,
    friendly: 'The provided item identifier is invalid.'
  },
  FORBIDDEN: {
    code: 403,
    friendly: 'This action is not allowed.'
  },
  COMMON_PASSWORD: {
    code: 403,
    friendly:
      'The password provided is too common. Pick a more secure password.'
  },
  NO_CHANGES: {
    code: 400,
    friendly: 'No changes were made.'
  },
  UNKNOWN: {
    code: 500,
    friendly: 'An unknown error occurred. Please try again later.'
  },
  OFFLINE: {
    code: 503,
    friendly: 'Cannot access online content because the network request failed.'
  },
  TOO_MANY_REQUESTS: {
    code: 403,
    friendly: 'Requests are being sent too quickly. Please try again later.'
  }
};
export type ResponseError = keyof typeof ResponseErrors;
