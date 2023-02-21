import SocketIO, { Socket } from 'socket.io-client'
import { store } from 'store'
import { setNewPosts } from 'store/slices/notification.slice'
import { ENV } from './env'

let conn: Socket | null
let socketConnected: boolean
let isCreatingConnection: boolean

async function ioConnect() {
  if (!conn) {
    conn = SocketIO(ENV.WS_URL)
    conn.connect()
  }

  conn.on('connect', () => {
    console.log('WS Connnected!')
    socketConnected = true
  })

  conn.on('NEW_POST', data => {
    if (!data.user || !data.postId) return
    store.dispatch(setNewPosts(data))
  })

  conn.on('disconnect', () => {
    console.log('WS Disconnected!')
  })
}

const io = {
  getSocket: () => conn,
  disconnectSocket: () => {
    if (conn) {
      conn.disconnect()
    }
  },
  connect: () => {
    if (!isCreatingConnection) {
      conn && conn.disconnect()
      conn = null
      socketConnected = false
      isCreatingConnection = true

      setTimeout(() => {
        ioConnect()
      }, 200)
      return true
    }
  }
}

export default io
