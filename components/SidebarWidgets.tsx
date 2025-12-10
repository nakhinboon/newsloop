"use client";

export function SocialLinks() {
  return (
    <div className="mb-8">
      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-4 border-l-4 border-black dark:border-white pl-3">
        Social Network
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <a href="#" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <span className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path></svg>
          </span>
          <span className="text-xs font-semibold">Facebook</span>
        </a>
        <a href="#" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <span className="w-8 h-8 flex items-center justify-center bg-sky-500 text-white rounded-full">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path></svg>
          </span>
          <span className="text-xs font-semibold">Twitter</span>
        </a>
        <a href="#" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <span className="w-8 h-8 flex items-center justify-center bg-pink-600 text-white rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeWidth="2"></rect><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" strokeWidth="2"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeWidth="2"></line></svg>
          </span>
          <span className="text-xs font-semibold">Instagram</span>
        </a>
        <a href="#" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <span className="w-8 h-8 flex items-center justify-center bg-red-600 text-white rounded-full">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path></svg>
          </span>
          <span className="text-xs font-semibold">YouTube</span>
        </a>
      </div>
    </div>
  );
}

export function Newsletter() {
  return (
    <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-center">
      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-2">
        Newsletter
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        Get all the latest news, reviews, and exclusive offers straight to your inbox.
      </p>
      <form className="space-y-2">
        <input 
          type="email" 
          placeholder="Email..." 
          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button 
          type="submit" 
          className="w-full px-3 py-2 text-sm font-semibold text-white bg-black dark:bg-white dark:text-black rounded hover:opacity-90 transition-opacity"
        >
          SUBSCRIBE
        </button>
      </form>
    </div>
  );
}
