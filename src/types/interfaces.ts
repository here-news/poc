export interface IUser {
  _id: string
  username: string
  displayName: string
  balance: number
  reputation: number
  parent?: IUser | string
  avatar?: string
}

export interface IPost {
  _id: string
  userId: IUser
  title?: string
  text?: string
  images?: string[]
  createdAt: Date
  upvotes: string[]
  downvotes: string[]
  totalVotes: number
  totalComments?: number
  preview?: {
    url: string
    favicons?: string[]
    siteName?: string
    images?: string[]
    title?: string
    description?: string
    youtubeId?: string
  }
  repliedTo?: IPost
  replies?: IPost[]
  totalReplies?: Number
  youtubeId?: string | undefined
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

export interface ILinkDetails {
  url: string
  favicons?: string[]
  siteName?: string
  images?: string[]
  title?: string
  description?: string
  youtubeId?: string
}

export interface IUploadedStatus {
  nameArray : string[]
  sizeArray : number[]
}
