import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface BadgeService {
  service_id: number;
  service: {
    id: number;
    name: string;
    description: string | null;
    icon_url: string | null;
    price_mode: string;
  } | null;
  price: number | null;
  is_badge: boolean;
  badge_display_name: string | null;
}

interface BoatCardProps {
  boatId?: number;
  imageUrl: string;
  name: string;
  category?: string;
  price: string;
  location: string;
  guests: number;
  status: string;
  rooms: number;
  rating?: number;
  reviewsCount?: number;
  guestCount?: number;
  priceMode?: string;
  badgeServices?: BadgeService[];
  showGuestsBadge?: boolean;
  maxGuests?: number;
}

const BoatCard = ({ boatId, imageUrl, name, category, price, location, guests, status, rooms, rating = 0, reviewsCount = 0, guestCount, priceMode = 'per_time', badgeServices, showGuestsBadge = false, maxGuests }: BoatCardProps) => {
  // Determine label based on priceMode
  let priceUnit = ' /Hour';
  if (priceMode === 'per_person') {
    priceUnit = ' /Person';
  } else if (priceMode === 'per_person_per_time') {
    priceUnit = ' /Person/Hr';
  } else if (priceMode === 'per_day') {
    // Handling per_day explicit mode if it exists, or fallback
    priceUnit = ' /Day';
  }

  // Build effective badges list: prepend guests badge if enabled, then service badges
  const effectiveBadges: Array<{ type: 'guests' | 'service'; badge?: BadgeService }> = [];
  if (showGuestsBadge) {
    effectiveBadges.push({ type: 'guests' });
  }
  if (badgeServices) {
    badgeServices.forEach(badge => {
      effectiveBadges.push({ type: 'service', badge });
    });
  }
  const hasBadges = effectiveBadges.length > 0;

  // Tooltip state: render as fixed overlay so it escapes the card's overflow-hidden
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = useCallback((e: React.MouseEvent, text: string) => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
      text,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }, []);

  const hideTooltip = useCallback(() => {
    tooltipTimeout.current = setTimeout(() => setTooltip(null), 100);
  }, []);

  const cardContent = (
    <div className="relative z-0 w-96 h-[473px] mb-2 bg-white rounded-2xl shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] overflow-hidden hover:shadow-xl transition-shadow" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Image Container with Rating Overlay */}
      <div className="relative w-full h-64 overflow-hidden rounded-lg">
        <Image
          className="w-full h-full object-cover rounded-lg"
          src={imageUrl}
          alt={name}
          width={384}
          height={256}
        />

        {/* Rating Overlay */}
        <div className="absolute top-1 right-1 bg-white rounded-tr-lg rounded-bl-lg px-3 py-2 flex items-center gap-2 shadow-lg">
          {/* Rating Stars */}
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Image
                key={i}
                src="/icons/Star Icon.svg"
                alt="Star"
                width={16}
                height={16}
                className={`w-4 h-4 ${i < Math.round(rating) ? 'opacity-100' : 'opacity-30'}`}
              />
            ))}
            <span className="text-sm font-medium text-gray-700 ml-1">{rating.toFixed(1)}</span>
            {reviewsCount > 0 && (
              <span className="text-xs text-gray-500 ml-1">({reviewsCount})</span>
            )}
          </div>

          {/* Thumbs Up Icon */}
          <div className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-orange-500 transition-colors cursor-pointer">
            <Image
              src="/icons/thumb_up.svg"
              alt="Thumbs Up"
              width={16}
              height={16}
              className="w-4 h-4"
            />
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6">
        {/* Boat Category */}
        {category && (
          <div className="text-center mb-1">
            <span className="text-[#C5A44E] text-lg italic font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {category}
            </span>
          </div>
        )}

        {/* Decorative Line */}
        <div className="flex justify-center mb-2">
          <Image
            src="/icons/Line 74.svg"
            alt="Decorative line"
            width={56}
            height={4}
            className="w-15 pt-1"
          />
        </div>

        {/* Boat Name */}
        <div className="text-black text-xl font-semibold text-center mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
          {name}
        </div>

        {/* Location and Price Row */}
        <div className="flex justify-between items-center mb-4">
          {/* Location */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center">
              <Image
                src="/icons/location_on.svg"
                alt="Location"
                width={20}
                height={20}
                className="w-6 h-6"
              />
            </div>
            <span className="text-black text-base font-normal" style={{ fontFamily: 'Poppins, sans-serif' }}>{location}</span>
          </div>

          {/* Price */}
          <div className="text-right">
            <span className="text-sky-900 text-2xl font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>{price}</span>
            <span className="text-sky-900 text-sm font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}> EGP</span>
            <span className="text-sky-900 text-sm font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>{priceUnit}</span>
          </div>
        </div>

        {/* Separator Line + Amenities / Badge Row - only show if there are badges */}
        {hasBadges && (
          <>
            <div className="w-full h-px bg-stone-300 mb-4"></div>
            {/* Amenities / Badge Row */}
            <div className="flex justify-between items-center">
              {effectiveBadges.slice(0, 3).map((item) => {
                if (item.type === 'guests') {
                  return (
                    <div key="guests-badge" className="flex items-center gap-1">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center">
                        <Image
                          src="/icons/groups_2.svg"
                          alt="Guests"
                          width={20}
                          height={20}
                          className="w-7 h-6"
                        />
                      </div>
                      <span className="text-black text-sm font-normal" style={{ fontFamily: 'Poppins, sans-serif' }}>{maxGuests ?? guests} Guests</span>
                    </div>
                  );
                }
                const badge = item.badge!;
                return (
                  <div
                    key={badge.service_id}
                    className="flex items-center gap-1 relative cursor-default"
                    onMouseEnter={(e) => badge.service?.description && showTooltip(e, badge.service.description)}
                    onMouseLeave={hideTooltip}
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden relative">
                      {badge.service?.icon_url ? (
                        <Image
                          src={badge.service.icon_url}
                          alt={badge.badge_display_name || badge.service?.name || ''}
                          width={20}
                          height={20}
                          className="w-7 h-6 object-contain"
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">●</span>
                      )}
                    </div>
                    <span className="text-black text-sm font-normal" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {badge.badge_display_name || badge.service?.name || 'Service'}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Fixed Tooltip — portaled to document.body so it escapes overflow-hidden */}
      {tooltip && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed px-3 py-2 bg-gray-900 text-white text-xs rounded-lg text-center pointer-events-none"
          style={{
            zIndex: 99999,
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%) translateY(-8px)',
            maxWidth: 220,
            wordBreak: 'break-word',
          }}
        >
          {tooltip.text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>,
        document.body
      )}
    </div>
  );

  const href = boatId ? `/boat-details/${boatId}${guestCount ? `?guest_count=${guestCount}` : ''}` : '#';

  return boatId ? (
    <Link href={href} className="block cursor-pointer">
      {cardContent}
    </Link>
  ) : (
    cardContent
  );
};

export default BoatCard;