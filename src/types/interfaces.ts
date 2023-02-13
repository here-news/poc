export interface IUser {
  _id: string
  username: string
  displayName: string
  balance: number
  reputation: number
  parent: IUser | string
}

export interface IPost {
  _id: string
  userId: IUser
  title: string
  text?: string
  images?: string[]
  createdAt: Date
  upvotes: string[]
  downvotes: string[]
  totalVotes: number
  totalComments?: number
}

export interface IComment {
  _id: string
  user: IUser
  post: IPost
  text: string
  createdAt: Date
  replyTo?: IComment
  replies?: IComment[]
}
