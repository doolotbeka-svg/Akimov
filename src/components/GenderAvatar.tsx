import React, { useEffect, useState } from 'react';
import { Gender } from '../types/family';

interface GenderAvatarProps {
  src?: string;
  gender: Gender;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<GenderAvatarProps['size']>, string> = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
  xl: 'w-28 h-28',
};

export const GenderAvatar: React.FC<GenderAvatarProps> = ({
  src,
  gender,
  alt,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  // Reset error state when a new image source is provided (e.g. after re-upload)
  useEffect(() => {
    setImgError(false);
  }, [src]);

  const sizeClass = SIZE_CLASSES[size];
  const hasValidImage = Boolean(src) && !imgError;

  if (hasValidImage) {
    return (
      <div
        className={`${sizeClass} rounded-full overflow-hidden shrink-0 bg-[#F3EFE8] ring-1 ring-[#E6E0D5] ${className}`}
      >
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const isFemale = gender === 'female';

  return (
    <div
      className={`${sizeClass} rounded-full overflow-hidden shrink-0 flex items-center justify-center ring-1 ${
        isFemale
          ? 'bg-[#F6EAE4] text-[#B85D3B] ring-[#E8CFC4]'
          : 'bg-[#E9EFEA] text-[#2D5A4C] ring-[#CEDBD4]'
      } ${className}`}
      aria-label={alt}
    >
      {isFemale ? (
        <svg viewBox="0 0 64 64" className="w-[72%] h-[72%]" fill="none" aria-hidden="true">
          <path
            d="M32 11C24.5 11 19 16.5 19 24.5C19 29.5 17 34 15 37C17.5 38.2 20 38.5 22 38.5C22.5 34.5 24.2 31.5 26 29.5C27.8 30.8 29.8 31.5 32 31.5C34.2 31.5 36.2 30.8 38 29.5C39.8 31.5 41.5 34.5 42 38.5C44 38.5 46.5 38.2 49 37C47 34 45 29.5 45 24.5C45 16.5 39.5 11 32 11Z"
            fill="currentColor"
            fillOpacity="0.22"
          />
          <circle cx="32" cy="24" r="9.5" fill="currentColor" fillOpacity="0.82" />
          <path
            d="M14 55C14 45.6 22.1 39 32 39C41.9 39 50 45.6 50 55"
            fill="currentColor"
            fillOpacity="0.82"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 64 64" className="w-[72%] h-[72%]" fill="none" aria-hidden="true">
          <circle cx="32" cy="23.5" r="9.5" fill="currentColor" fillOpacity="0.82" />
          <path
            d="M15 55C15 45.2 22.6 39 32 39C41.4 39 49 45.2 49 55"
            fill="currentColor"
            fillOpacity="0.82"
          />
        </svg>
      )}
    </div>
  );
};
