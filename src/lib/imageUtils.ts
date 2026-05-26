// ===== IMAGE UTILITIES =====
// Helper functions for handling images from different sources

import { BASE_URL } from './api';

/**
 * Normalizes image URL to work with Next.js Image component
 * Handles both Cloudinary URLs and legacy Heroku paths
 * 
 * @param imageUrl - The image URL from API (could be relative or absolute)
 * @param baseUrl - Optional base URL for relative paths (defaults to Heroku backend)
 * @returns Normalized absolute URL
 */
export function normalizeImageUrl(
  imageUrl: any,
  baseUrl: string = BASE_URL
): string {
  // Return placeholder if no image
  if (!imageUrl) {
    return '/images/carousel1.webp'; // Default placeholder
  }

  // Handle media objects returned from the backend (e.g. { url: 'https://...', type: 'image' })
  let url = imageUrl;
  if (typeof imageUrl === 'object') {
    url = imageUrl.url || imageUrl.image_url || null;
  }

  if (typeof url !== 'string') {
    console.warn('normalizeImageUrl received non-string:', imageUrl);
    return '/images/carousel1.webp';
  }

  // Already a full Cloudinary URL
  if (url.startsWith('https://res.cloudinary.com/')) {
    return url;
  }

  // Already a full HTTP/HTTPS URL (including backend)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Relative path - prepend base URL
  if (url.startsWith('/')) {
    return `${baseUrl}${url}`;
  }

  // No leading slash - add it
  return `${baseUrl}/${url}`;
}

/**
 * Normalizes an array of image URLs
 * 
 * @param images - Array of image URLs from API
 * @param baseUrl - Optional base URL for relative paths
 * @returns Array of normalized URLs
 */
export function normalizeImageUrls(
  images: (string | undefined | null)[] | undefined | null,
  baseUrl?: string
): string[] {
  if (!images || !Array.isArray(images)) {
    return ['/images/carousel1.webp']; // Return default placeholder
  }

  const normalized = images
    .filter((img): img is string => Boolean(img))
    .map(img => normalizeImageUrl(img, baseUrl));

  // If no valid images, return placeholder
  return normalized.length > 0 ? normalized : ['/images/carousel1.webp'];
}

/**
 * Get the first image from an array, normalized
 * 
 * @param images - Array of image URLs
 * @param baseUrl - Optional base URL
 * @returns First image URL or placeholder
 */
export function getFirstImage(
  images: (string | undefined | null)[] | undefined | null,
  baseUrl?: string
): string {
  const normalized = normalizeImageUrls(images, baseUrl);
  return normalized[0];
}

/**
 * Check if URL is from Cloudinary
 * 
 * @param url - Image URL to check
 * @returns true if URL is from Cloudinary
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com');
}

/**
 * Check if URL is from Heroku backend
 * 
 * @param url - Image URL to check
 * @returns true if URL is from Heroku
 */
export function isHerokuUrl(url: string): boolean {
  return url.includes('daffa-e0870d98592a.herokuapp.com') || url.includes('127.0.0.1:5000') || url.startsWith('/static/');
}

/**
 * Get optimized Cloudinary URL with transformations
 * 
 * @param url - Original Cloudinary URL
 * @param options - Transformation options
 * @returns Optimized URL with transformations
 */
export function getOptimizedCloudinaryUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
  } = {}
): string {
  if (!isCloudinaryUrl(url)) {
    return url;
  }

  const { width, height, quality = 'auto', format = 'auto' } = options;
  
  // Build transformation string
  const transformations: string[] = [];
  
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  transformations.push(`q_${quality}`);
  transformations.push(`f_${format}`);
  
  const transformString = transformations.join(',');
  
  // Insert transformations into URL
  // URL format: https://res.cloudinary.com/[cloud_name]/image/upload/[transformations]/[version]/[public_id]
  const parts = url.split('/upload/');
  if (parts.length === 2) {
    return `${parts[0]}/upload/${transformString}/${parts[1]}`;
  }
  
  return url;
}

// Export all utilities
export default {
  normalizeImageUrl,
  normalizeImageUrls,
  getFirstImage,
  isCloudinaryUrl,
  isHerokuUrl,
  getOptimizedCloudinaryUrl
};
