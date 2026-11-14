/**
 * Web apps (Google sign-in, Cloudflare-protected AI chats, WhatsApp) refuse or degrade
 * when they see "Electron" in the user agent. We present as the matching stock Chrome.
 */
const platformToken = (): string => {
  switch (process.platform) {
    case 'darwin':
      return 'Macintosh; Intel Mac OS X 10_15_7'
    case 'win32':
      return 'Windows NT 10.0; Win64; x64'
    default:
      return 'X11; Linux x86_64'
  }
}

export const chromeUserAgent = (): string => {
  const major = process.versions.chrome.split('.')[0]
  return `Mozilla/5.0 (${platformToken()}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`
}

/**
 * Google's account pages block embedded Chromium ("This browser may not be secure").
 * A Firefox UA on accounts.google.com only is the widely used workaround.
 */
export const firefoxUserAgent = (): string => {
  const plat =
    process.platform === 'darwin'
      ? 'Macintosh; Intel Mac OS X 10.15'
      : process.platform === 'win32'
        ? 'Windows NT 10.0; Win64; x64'
        : 'X11; Linux x86_64'
  return `Mozilla/5.0 (${plat}; rv:140.0) Gecko/20100101 Firefox/140.0`
}

export const isGoogleAuth = (url: string): boolean => {
  try {
    return new URL(url).hostname === 'accounts.google.com'
  } catch {
    return false
  }
}
