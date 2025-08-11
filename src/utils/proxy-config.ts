import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import type { Agent } from 'http';

// Get proxy URL from environment or override
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

// Detect proxy type from URL scheme
function getProxyType(url: string): 'socks' | 'http' {
  if (url.startsWith('socks://') || url.startsWith('socks5://') || url.startsWith('socks4://')) {
    return 'socks';
  }
  return 'http';
}

// Sanitize proxy URL for logging (remove credentials)
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

// Validate proxy URL format
function isValidProxyUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

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