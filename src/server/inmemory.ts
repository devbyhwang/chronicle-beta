import crypto from "node:crypto";

type User = {
  id: string;
  email: string;
  name?: string;
  passwordHash: string;
  createdAt: Date;
};

type Session = {
  token: string;
  userId: string;
  createdAt: Date;
};

const users = new Map<string, User>(); // key: email
const usersById = new Map<string, User>();
const sessions = new Map<string, Session>(); // key: token

const SECRET = process.env.AUTH_SECRET || "dev_secret";

export function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password + ":" + SECRET).digest("hex");
}

export function createUser(input: { email: string; name?: string; password: string }) {
  const email = input.email.toLowerCase();
  if (users.has(email)) throw new Error("이미 가입된 이메일입니다.");
  const id = "user_" + crypto.randomUUID();
  const user: User = {
    id,
    email,
    name: input.name?.trim() || email.split("@")[0],
    passwordHash: hashPassword(input.password),
    createdAt: new Date(),
  };
  users.set(email, user);
  usersById.set(id, user);
  return user;
}

export function findUserByEmail(email: string) {
  return users.get(email.toLowerCase()) || null;
}

export function createSession(userId: string) {
  const token = crypto.randomUUID().replace(/-/g, "");
  const session: Session = { token, userId, createdAt: new Date() };
  sessions.set(token, session);
  return session;
}

export function getSessionByToken(token?: string | null) {
  if (!token) return null;
  return sessions.get(token) || null;
}

export function deleteSession(token?: string | null) {
  if (!token) return;
  sessions.delete(token);
}

export function getUserById(id: string) {
  return usersById.get(id) || null;
}

export type { User };

// ------------------------------
// Rooms & Messages (in-memory)
// ------------------------------

export type Visibility = "public" | "private" | "invite";

export type Room = {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  rules?: string;
  visibility?: Visibility;
  starred?: boolean;
  createdAt: Date;
};

export type Message = {
  id: string;
  roomId: string;
  seq: number;
  kind: "user" | "ai" | "summary" | "system";
  author?: string;
  text?: string;
  summary?: string;
  createdAt: Date;
};

const roomsById = new Map<string, Room>();
const roomsList: Room[] = [];
const messagesByRoom = new Map<string, Message[]>();
const lastSeqByRoom = new Map<string, number>();
const roomCategories = new Map<string, Set<string>>(); // post category presets per room

function slugify(input: string) {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 32) || "room";
  return base;
}

export function createRoom(input: {
  name: string;
  description?: string;
  tags?: string[];
  rules?: string;
  visibility?: Visibility;
  starred?: boolean;
}) {
  const name = input.name.trim();
  const id = `${slugify(name)}-${crypto.randomUUID().slice(0, 8)}`;
  const room: Room = {
    id,
    name,
    description: input.description,
    tags: input.tags?.slice(0, 8),
    rules: input.rules,
    visibility: input.visibility ?? "public",
    starred: input.starred ?? false,
    createdAt: new Date(),
  };
  roomsById.set(id, room);
  roomsList.unshift(room);
  if (!roomCategories.has(id)) roomCategories.set(id, new Set<string>());
  return room;
}

export function listRooms(): Room[] {
  return roomsList.slice(0, 200);
}

export function getRoom(id: string): Room | null {
  return roomsById.get(id) ?? null;
}

export function addMessage(roomId: string, input: { text?: string; author?: string; kind?: Message["kind"] }) {
  if (!roomsById.has(roomId)) {
    // Auto-create a placeholder room if not exists (dev convenience)
    createRoom({ name: roomId });
  }
  const arr = messagesByRoom.get(roomId) ?? [];
  const lastSeq = lastSeqByRoom.get(roomId) ?? 0;
  const nextSeq = lastSeq + 1;
  const msg: Message = {
    id: "msg_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12),
    roomId,
    seq: nextSeq,
    kind: input.kind ?? "user",
    author: input.author ?? "anon",
    text: input.text,
    createdAt: new Date(),
  };
  arr.push(msg);
  messagesByRoom.set(roomId, arr);
  lastSeqByRoom.set(roomId, nextSeq);
  return msg;
}

export function listMessages(roomId: string, opts?: { cursor?: number; limit?: number }) {
  const arr = messagesByRoom.get(roomId) ?? [];
  const limit = Math.max(1, Math.min(200, opts?.limit ?? 50));
  const cursor = opts?.cursor;
  if (!cursor) {
    // return last N by default
    return arr.slice(-limit);
  }
  return arr.filter((m) => m.seq > cursor).slice(0, limit);
}

// ------------------------------
// Posts (community-style) per room (in-memory)
// ------------------------------

export type Post = {
  id: string;
  roomId: string;
  title: string;
  content: string;
  author?: string;
  createdAt: Date;
  views?: number;
  likes?: number;
  comments?: number;
};

const postsByRoom = new Map<string, Post[]>();

// Track AI sync timestamps per room to avoid processing same messages
const aiSyncTimestamps = new Map<string, number>();

// Initialize with some sample data to prevent empty state
if (postsByRoom.size === 0) {
  console.log('[INIT] Initializing sample data...');
  const sampleRoomId = 'afd-d94e93e2';
  const samplePosts: Post[] = [
    {
      id: 'post_sample_1',
      roomId: sampleRoomId,
      title: '샘플 게시글 1',
      content: '이것은 샘플 게시글입니다.',
      author: 'admin',
      createdAt: new Date(),
      views: 0,
      likes: 0,
      comments: 0,
    }
  ];
  postsByRoom.set(sampleRoomId, samplePosts);
  console.log(`[INIT] Created ${samplePosts.length} sample posts in room ${sampleRoomId}`);
}

// Debug: Add a function to check all posts across all rooms
export function debugAllPosts() {
  console.log('[DEBUG] All posts across all rooms:');
  for (const [roomId, posts] of postsByRoom.entries()) {
    console.log(`  Room ${roomId}: ${posts.length} posts`);
    posts.forEach(p => console.log(`    - ${p.id}: ${p.title}`));
  }
}

// Debug: Export posts data for API access
export function getAllPostsData() {
  const result: Record<string, any[]> = {};
  for (const [roomId, posts] of postsByRoom.entries()) {
    result[roomId] = posts.map(p => ({
      id: p.id,
      title: p.title,
      author: p.author,
      createdAt: p.createdAt,
      views: p.views,
      likes: p.likes,
      comments: p.comments
    }));
  }
  return result;
}

// AI sync functions
export function recordAISync(roomId: string) {
  aiSyncTimestamps.set(roomId, Date.now());
  console.log(`[AI SYNC] Recorded sync timestamp for room ${roomId}: ${new Date().toISOString()}`);
}

export function getMessagesAfterLastSync(roomId: string, userId: string) {
  const lastSync = aiSyncTimestamps.get(roomId) || 0;
  const messages = listMessages(roomId, { limit: 100 });
  
  // If no previous sync, get all user messages
  if (lastSync === 0) {
    const allUserMessages = messages
      .filter(msg => msg.author === userId)
      .map(msg => msg.text);
    console.log(`[AI SYNC] First sync - found ${allUserMessages.length} total messages from ${userId}`);
    return allUserMessages;
  }
  
  // Filter messages after last sync and from specific user
  const recentUserMessages = messages
    .filter(msg => {
      const msgTime = new Date(msg.createdAt || 0).getTime();
      return msgTime > lastSync && msg.author === userId;
    })
    .map(msg => msg.text);
    
  console.log(`[AI SYNC] Found ${recentUserMessages.length} new messages from ${userId} after last sync`);
  return recentUserMessages;
}

export function hasPreviousSync(roomId: string): boolean {
  return aiSyncTimestamps.has(roomId);
}

export function createPost(roomId: string, input: { title: string; content: string; author?: string }) {
  if (!roomsById.has(roomId)) {
    createRoom({ name: roomId });
  }
  const posts = postsByRoom.get(roomId) ?? [];
  const post: Post = {
    id: "post_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12),
    roomId,
    title: input.title.trim(),
    content: input.content.trim(),
    author: input.author ?? "anon",
    createdAt: new Date(),
    views: 0,
    likes: 0,
    comments: 0,
  };
  posts.unshift(post);
  postsByRoom.set(roomId, posts);
  
  // Debug logging (simplified)
  console.log(`[CREATE POST] Created post: ${post.id} in room: ${roomId}`);
  
  return post;
}

export function listPosts(roomId: string, opts?: { limit?: number }) {
  const limit = Math.max(1, Math.min(200, opts?.limit ?? 20));
  const posts = postsByRoom.get(roomId) ?? [];
  return posts.slice(0, limit);
}

export function getPost(roomId: string, postId: string): Post | null {
  console.log(`[GET POST] Looking for post: "${postId}" in room: "${roomId}"`);
  
  const posts = postsByRoom.get(roomId) ?? [];
  console.log(`[GET POST] Posts in room: ${posts.length}`);
  console.log(`[GET POST] Post IDs: ${posts.map(p => p.id).join(', ')}`);
  
  const p = posts.find((x) => x.id === postId) || null;
  console.log(`[GET POST] Found: ${p ? 'YES' : 'NO'}`);
  
  return p ?? null;
}

export function incrementPostViews(roomId: string, postId: string) {
  const p = getPost(roomId, postId);
  if (p) {
    p.views = (p.views ?? 0) + 1;
  }
  return p;
}

// ------------------------------
// Comments system
// ------------------------------

export type Comment = {
  id: string;
  postId: string;
  roomId: string;
  parentId?: string; // for nested comments
  content: string;
  author?: string;
  createdAt: Date;
  updatedAt?: Date;
  likes?: number;
  isDeleted?: boolean;
};

const commentsByPost = new Map<string, Comment[]>();

export function createComment(roomId: string, postId: string, input: { 
  content: string; 
  author?: string; 
  parentId?: string 
}) {
  const comments = commentsByPost.get(postId) ?? [];
  const comment: Comment = {
    id: "comment_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12),
    postId,
    roomId,
    parentId: input.parentId,
    content: input.content.trim(),
    author: input.author ?? "anon",
    createdAt: new Date(),
    likes: 0,
    isDeleted: false,
  };
  comments.push(comment);
  commentsByPost.set(postId, comments);
  
  // Update post comment count
  const post = getPost(roomId, postId);
  if (post) {
    post.comments = (post.comments ?? 0) + 1;
  }
  
  return comment;
}

export function listComments(postId: string, opts?: { includeDeleted?: boolean }) {
  const comments = commentsByPost.get(postId) ?? [];
  if (opts?.includeDeleted) {
    return comments;
  }
  return comments.filter(c => !c.isDeleted);
}

export function getComment(postId: string, commentId: string): Comment | null {
  const comments = commentsByPost.get(postId) ?? [];
  return comments.find(c => c.id === commentId) ?? null;
}

export function updateComment(postId: string, commentId: string, content: string) {
  const comment = getComment(postId, commentId);
  if (!comment) return null;
  
  comment.content = content.trim();
  comment.updatedAt = new Date();
  return comment;
}

export function deleteComment(postId: string, commentId: string) {
  const comment = getComment(postId, commentId);
  if (!comment) return null;
  
  comment.isDeleted = true;
  comment.updatedAt = new Date();
  
  // Update post comment count
  const post = getPost(comment.roomId, postId);
  if (post) {
    post.comments = Math.max(0, (post.comments ?? 0) - 1);
  }
  
  return comment;
}

export function likeComment(postId: string, commentId: string) {
  const comment = getComment(postId, commentId);
  if (!comment) return null;
  
  comment.likes = (comment.likes ?? 0) + 1;
  return comment;
}

// ------------------------------
// Room categories (post prefixes)
// ------------------------------
export function getRoomCategories(roomId: string): string[] {
  return Array.from(roomCategories.get(roomId) ?? new Set<string>());
}

export function addRoomCategory(roomId: string, name: string) {
  const n = name.trim();
  if (!n) return getRoomCategories(roomId);
  let set = roomCategories.get(roomId);
  if (!set) {
    set = new Set<string>();
    roomCategories.set(roomId, set);
  }
  set.add(n);
  return getRoomCategories(roomId);
}

export function removeRoomCategory(roomId: string, name: string) {
  const set = roomCategories.get(roomId);
  if (set) set.delete(name);
  return getRoomCategories(roomId);
}
