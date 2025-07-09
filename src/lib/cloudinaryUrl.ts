// This is a client-safe way to generate Cloudinary URLs without the Node.js SDK
export function getCloudinaryUrl(publicId: string, options: {
  width?: number;
  height?: number;
  format?: string;
} = {}) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    console.error('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not defined');
    return '';
  }

  const transformations = [];
  
  if (options.width || options.height) {
    transformations.push(`c_fit${options.width ? `,w_${options.width}` : ''}${options.height ? `,h_${options.height}` : ''}`);
  }

  const transformationString = transformations.length > 0 
    ? transformations.join(',') + '/'
    : '';

  const format = options.format ? `.${options.format}` : '';
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformationString}${publicId}${format}`;
}

// Pre-generated placeholder URLs
export const PLACEHOLDER_URLS = {
  svg: getCloudinaryUrl('placeholders/blank', { format: 'svg' }),
  png: getCloudinaryUrl('placeholders/blank', { format: 'png' })
}; 