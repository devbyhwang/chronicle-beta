import { NextResponse } from "next/server";
import { debugAllPosts, getAllPostsData } from "@/server/inmemory";

export async function GET() {
  try {
    // Call the debug function to log all posts
    debugAllPosts();
    
    // Return the data as JSON for client-side debugging
    const allPosts = getAllPostsData();
    
    return NextResponse.json({ 
      message: "Debug info logged to server console. Check terminal for details.",
      timestamp: new Date().toISOString(),
      posts: allPosts
    });
  } catch (e) {
    return NextResponse.json({ error: "Debug failed" }, { status: 500 });
  }
}
