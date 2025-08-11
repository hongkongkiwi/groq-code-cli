import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import type { Agent } from 'http';

/**
 * Resolves the proxy URL to use from an explicit override or environment variables.
 *
 * If `proxyOverride` is provided it is returned directly. Otherwise the function
 * returns the first non-empty environment variable found in priority order:
 * HTTPS_PROXY/https_proxy then HTTP_PROXY/http_proxy. If none are set, returns undefined.
 *
 * @param proxyOverride - Optional explicit proxy URL that takes precedence over env vars.
 * @returns The resolved proxy URL string, or `undefined` if no proxy is configured.
 */
function getProxyUrl(proxyOverride?: string): string | undefined {
  if (proxyOverride) {
    return proxyOverride;
  }
  
  // Check for proxy environment variables (in order of priority)
  // Standard environment variables: HTTPS_PROXY, HTTP_PROXY
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  
  // Priority: HTTPS_PROXY > HTTP_PROXY
  return httpsProxy || httpProxy;
}

/**
 * Determine whether a proxy URL refers to a SOCKS proxy or an HTTP(S) proxy.
 *
 * Recognizes `socks://`, `socks5://`, and `socks4://` schemes as SOCKS; any other scheme is treated as HTTP.
 *
 * @param url - The proxy URL or scheme string to inspect.
 * @returns `'socks'` if the URL uses a SOCKS scheme, otherwise `'http'`.
 */
function getProxyType(url: string): 'socks' | 'http' {
  if (url.startsWith('socks://') || url.startsWith('socks5://') || url.startsWith('socks4://')) {
    return 'socks';
  }
  return 'http';
}

/**
 * Returns a proxy URL safe for logging by removing any embedded credentials.
 *
 * Attempts to parse the input as a URL and, if username or password are present,
 * returns a sanitized string with credentials removed. If parsing fails and the
 * input appears to contain credentials (contains '@'), returns the literal
 * "[proxy with credentials]" to avoid exposing secrets; otherwise returns the
 * original input unchanged.
 *
 * @param url - The proxy URL to sanitize; may include credentials (e.g., `user:pass@host`).
 * @returns A sanitized URL string suitable for logging or the original input when no sanitization is needed.
 */
function sanitizeProxyUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) {
      parsed.username = '';
      parsed.password = '';
      return parsed.toString().replace('@', '');
    }
    return url;
  } catch {
    // If URL parsing fails, return a safe message
    return url.includes('@') ? '[proxy with credentials]' : url;
  }
}

/**
 * Checks whether a string is a valid URL suitable for a proxy.
 *
 * Attempts to parse the provided `url` using the WHATWG URL parser and
 * returns true if parsing succeeds, false otherwise.
 *
 * @param url - The candidate proxy URL string to validate.
 * @returns True when `url` can be parsed as a valid URL; otherwise false.
 */
function isValidProxyUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates an HTTP/SOCKS proxy agent based on an explicit override or environment variables.
 *
 * Resolves a proxy URL (override -> HTTPS_PROXY/https_proxy -> HTTP_PROXY/http_proxy). If no proxy is configured, returns `undefined`. If the resolved URL is not a valid URL, the function logs an error and returns `undefined`. Otherwise it returns a `SocksProxyAgent` for SOCKS schemes (`socks://`, `socks5://`, `socks4://`) or an `HttpsProxyAgent` for other schemes. If agent construction fails the error is logged and `undefined` is returned.
 *
 * @param proxyOverride - Optional explicit proxy URL to use instead of environment variables.
 * @returns A Node `Agent` configured for the proxy, or `undefined` when no valid proxy is available or agent creation fails.
 */
export function getProxyAgent(proxyOverride?: string): Agent | undefined {
  const proxyUrl = getProxyUrl(proxyOverride);
  
  if (!proxyUrl) {
    return undefined;
  }
  
  if (!isValidProxyUrl(proxyUrl)) {
    console.error(`Invalid proxy URL: ${sanitizeProxyUrl(proxyUrl)}`);
    return undefined;
  }
  
  try {
    // Create appropriate agent based on proxy type
    if (getProxyType(proxyUrl) === 'socks') {
      return new SocksProxyAgent(proxyUrl);
    } else {
      return new HttpsProxyAgent(proxyUrl);
    }
  } catch (error) {
    console.error(`Failed to create proxy agent: ${sanitizeProxyUrl(proxyUrl)}`);
    return undefined;
  }
}

/**
 * Returns information about the configured proxy (from an explicit override or environment).
 *
 * If a proxy URL is found returns an object with `enabled: true`, a sanitized `url` (credentials removed or obfuscated) and the proxy `type` (`'socks'` or `'http'`). If no proxy is configured returns `{ enabled: false }`.
 *
 * The function does not validate the URL before returning info — even invalid URLs are sanitized and included to aid debugging.
 *
 * @param proxyOverride - Optional explicit proxy URL to use instead of environment variables.
 */
export function getProxyInfo(proxyOverride?: string): { enabled: boolean; url?: string; type?: string } {
  const proxyUrl = getProxyUrl(proxyOverride);
  
  if (!proxyUrl) {
    return { enabled: false };
  }
  
  // Even if URL is invalid, still return info for debugging
  return {
    enabled: true,
    url: sanitizeProxyUrl(proxyUrl),
    type: getProxyType(proxyUrl)
  };
}