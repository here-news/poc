export interface IUser {
  _id: string
  username: string
  displayName: string
  reputation: number
  parent: IUser | string
}

export interface IPost {
  _id: string
  userId: IUser | string
  text?: string
  images?: string[]
  createdAt: Date
}
