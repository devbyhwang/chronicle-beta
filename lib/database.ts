import { prisma } from './db'

// Room operations
export async function createRoom(data: {
  name: string;
  description?: string;
  tags?: string[];
  rules?: string;
}) {
  return await prisma.room.create({
    data: {
      name: data.name,
      description: data.description,
      tags: data.tags || [],
      rules: data.rules,
    },
  })
}

export async function getRoom(id: string) {
  return await prisma.room.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 100,
      },
      posts: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  })
}

export async function listRooms() {
  return await prisma.room.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
}

// Message operations
export async function createMessage(data: {
  roomId: string;
  text: string;
  author: string;
  userId?: string;
}) {
  return await prisma.message.create({
    data: {
      roomId: data.roomId,
      text: data.text,
      author: data.author,
      userId: data.userId,
    },
  })
}

export async function listMessages(roomId: string, options: { limit?: number } = {}) {
  return await prisma.message.findMany({
    where: { roomId },
    orderBy: { createdAt: 'asc' },
    take: options.limit || 100,
  })
}

// Post operations
export async function createPost(data: {
  roomId: string;
  title: string;
  content: string;
  author: string;
  userId?: string;
}) {
  return await prisma.post.create({
    data: {
      roomId: data.roomId,
      title: data.title,
      content: data.content,
      author: data.author,
      userId: data.userId,
    },
  })
}

export async function getPost(roomId: string, postId: string) {
  return await prisma.post.findFirst({
    where: {
      id: postId,
      roomId: roomId,
    },
  })
}

export async function listPosts(roomId: string, options: { limit?: number } = {}) {
  return await prisma.post.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    take: options.limit || 50,
  })
}

export async function incrementPostViews(roomId: string, postId: string) {
  return await prisma.post.updateMany({
    where: {
      id: postId,
      roomId: roomId,
    },
    data: {
      views: {
        increment: 1,
      },
    },
  })
}

// Comment operations
export async function createComment(data: {
  postId: string;
  roomId: string;
  content: string;
  author: string;
  userId?: string;
}) {
  return await prisma.comment.create({
    data: {
      postId: data.postId,
      roomId: data.roomId,
      content: data.content,
      author: data.author,
      userId: data.userId,
    },
  })
}

export async function listComments(postId: string) {
  return await prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: 'asc' },
  })
}

// AI Sync operations
export async function recordAISync(roomId: string, userId: string) {
  return await prisma.aISync.upsert({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
    update: {
      timestamp: new Date(),
    },
    create: {
      roomId,
      userId,
      timestamp: new Date(),
    },
  })
}

export async function getLastAISync(roomId: string, userId: string) {
  const sync = await prisma.aISync.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
  })
  return sync?.timestamp || new Date(0)
}

export async function getMessagesAfterLastSync(roomId: string, userId: string) {
  const lastSync = await getLastAISync(roomId, userId)
  
  const messages = await prisma.message.findMany({
    where: {
      roomId,
      author: userId,
      createdAt: {
        gt: lastSync,
      },
    },
    orderBy: { createdAt: 'asc' },
  })
  
  return messages.map(msg => msg.text)
}

export async function hasPreviousSync(roomId: string) {
  const sync = await prisma.aISync.findFirst({
    where: { roomId },
  })
  return !!sync
}

// User operations
export async function createUser(data: {
  name: string;
  email?: string;
  avatar?: string;
}) {
  return await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      avatar: data.avatar,
    },
  })
}

export async function getUser(id: string) {
  return await prisma.user.findUnique({
    where: { id },
  })
}

export async function getUserByEmail(email: string) {
  return await prisma.user.findUnique({
    where: { email },
  })
}
