// Utility to get device information
export const getDeviceName = (): string => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Check for mobile devices
  if (/android/.test(userAgent)) {
    return "Android";
  }
  
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return "iOS";
  }
  
  // Check for desktop platforms
  if (/windows/.test(userAgent)) {
    return "Windows";
  }
  
  if (/macintosh|mac os x/.test(userAgent)) {
    return "Mac";
  }
  
  if (/linux/.test(userAgent)) {
    return "Linux";
  }
  
  // Check for browsers
  if (/chrome/.test(userAgent) && !/edge/.test(userAgent)) {
    return "Chrome Desktop";
  }
  
  if (/firefox/.test(userAgent)) {
    return "Firefox Desktop";
  }
  
  if (/safari/.test(userAgent) && !/chrome/.test(userAgent)) {
    return "Safari Desktop";
  }
  
  if (/edge/.test(userAgent)) {
    return "Edge Desktop";
  }
  
  return "Dispositivo Desconhecido";
};