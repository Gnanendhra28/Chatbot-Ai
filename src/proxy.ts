import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - _next
     * - static files
     * - favicon
     */
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|png|gif|svg|ttf|woff2?|ico)).*)",

    /*
     * Always run for API routes
     */
    "/(api|trpc)(.*)",
  ],
};
