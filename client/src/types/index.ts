export interface SearchedUser {
  _id: string;
  userName: string;
  firstName: string;
  lastName: string;
}

export interface SearchResponse {
  success: boolean;
  users: SearchedUser[];
}
