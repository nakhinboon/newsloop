"use client";

import { localeNativeNames, type Locale } from "@/lib/i18n/config";

export interface LocaleFallbackNoticeProps {
  requestedLocale: Locale;
  fallbackLocale: Locale;
  onDismiss?: () => void;
}

/**
 * LocaleFallbackNotice component displays a notice when content is shown in a fallback language.
 * Requirements: 9.5
 */
export function LocaleFallbackNotice({
  requestedLocale,
  fallbackLocale,
  onDismiss,
}: LocaleFallbackNoticeProps) {
  const requestedLanguage = localeNativeNames[requestedLocale];
  const fallbackLanguage = localeNativeNames[fallbackLocale];

  return (
    <div
      role="alert"
      className="mb-6 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800"
    >
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            This content is not available in{" "}
            <span className="font-medium">{requestedLanguage}</span>. You are
            viewing the{" "}
            <span className="font-medium">{fallbackLanguage}</span> version.
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="flex-shrink-0 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 transition-colors"
            aria-label="Dismiss notice"
          >
            <svg
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default LocaleFallbackNotice;
