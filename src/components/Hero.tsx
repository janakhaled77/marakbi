"use client"
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { clientApi, City } from '@/lib/api';
import toast from 'react-hot-toast';

const Hero = () => {
  const router = useRouter();
  const [city, setCity] = useState('');
  const [voyageType, setVoyageType] = useState(''); // 'hourly_daily' or 'trip_based'
  const [passengers, setPassengers] = useState(1);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Hero carousel background images
  const backgroundImages = [
    "/images/hero-1.webp",
    "/images/hero-2.webp",
    "/images/hero-3.webp"
  ];

  // Load cities on mount (no auth required)
  useEffect(() => {
    const fetchCities = async () => {
      try {
        setLoadingCities(true);
        const response = await clientApi.getCities();
        if (response.success && response.data) {
          setCities(response.data.cities);
        }
      } catch (error) {
        console.error('Error fetching cities:', error);
      } finally {
        setLoadingCities(false);
      }
    };
    fetchCities();
  }, []);

  // Timer for image gallery animation - slower (5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveImageIndex((prevIndex) => (prevIndex + 1) % 3);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Function to handle manual image selection
  const handleImageClick = (index: number) => {
    setActiveImageIndex(index);
  };

  // Handle Book Now button
  const handleBookNow = () => {
    if (!city || !voyageType) {
      toast.error("Please select both a City and a Voyage Type to proceed.");
      return;
    }

    const params = new URLSearchParams();
    if (city) params.append('city_id', city);
    if (passengers > 0) params.append('min_passengers', passengers.toString());

    if (voyageType === 'trip_based') {
      router.push(`/trip-listing${params.toString() ? `?${params.toString()}` : ''}`);
    } else {
      // Default to boat listing for hourly/daily
      router.push(`/boat-listing${params.toString() ? `?${params.toString()}` : ''}`);
    }
  };

  // Handle Explore Now button
  const handleExploreNow = () => {
    router.push('/boat-listing');
  };

  return (
    <section className="relative w-full h-auto sm:h-240 overflow-hidden sm:overflow-visible">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src={backgroundImages[activeImageIndex]}
          alt="Hero Background"
          fill
          className="object-cover transition-all duration-1000 ease-in-out"
          priority
          quality={90}
        />
      </div>

      {/* Content */}
      <div className="relative w-full h-auto sm:h-200 flex items-start sm:items-center px-0 sm:px-4 pt-30 pb-8 sm:pt-0 sm:pb-0">
        <div className="w-full px-4 sm:px-8 md:px-16 flex flex-col lg:flex-row justify-between items-center lg:items-start gap-6 sm:gap-8 lg:gap-32">
          {/* Left Side: Text Content */}
          <div className="flex flex-col text-left w-full lg:w-auto">
            <div className="text-orange-300 text-3xl sm:text-3xl lg:text-4xl font-normal font-['SignPainter'] capitalize leading-tight">
              With DAFFA
            </div>
            <div className="text-white text-2xl sm:text-2xl lg:text-3xl font-medium font-poppins capitalize mb-4 sm:mb-6">
              Your Dream Boats
            </div>
            <div className="text-white text-3xl sm:text-4xl lg:text-6xl font-bold font-poppins capitalize leading-tight sm:leading-tight lg:leading-[68px] mb-6 sm:mb-12 lg:mb-16">
              <span className="text-white">Most Reliable<br /></span>
              <span className="text-white">Luxury Boats </span>
              <span className="text-orange-300">Rentals</span>
            </div>
            <button
              onClick={handleExploreNow}
              className="hidden sm:flex w-56 h-12 px-6 py-2.5 bg-[#0C4A8C] rounded-lg justify-center items-center gap-2.5 text-white text-base font-normal font-poppins mx-auto lg:mx-0 clickable hover:bg-[#0A3D7A] transition-colors"
            >
              Explore Now
            </button>
          </div>

          {/* Right Side: Booking Form */}
          <div className="w-full sm:w-80 bg-white/20 backdrop-blur-md rounded-2xl overflow-hidden flex flex-col justify-start items-center p-5 sm:p-6 shadow-2xl border border-white/30 space-y-3 sm:space-y-4">

            {/* City Dropdown */}
            <div className="w-full">
              <p className="text-white text-sm sm:text-base font-normal font-poppins mb-2">Choose Your City</p>
              <select
                className="w-full h-11 sm:h-12 py-3 pl-3 pr-10 appearance-none bg-white/30 backdrop-blur-sm rounded-lg text-gray-700 text-sm font-normal font-poppins capitalize border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23555%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[position:right_12px_center] bg-no-repeat"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loadingCities}
              >
                <option value="">{loadingCities ? 'Loading...' : 'Select City'}</option>
                {cities.map((cityOption) => (
                  <option key={cityOption.id} value={cityOption.id}>
                    {cityOption.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Voyage Type Dropdown */}
            <div className="w-full">
              <p className="text-white text-sm sm:text-base font-normal font-poppins mb-2">Voyage Type</p>
              <select
                className="w-full h-11 sm:h-12 py-3 pl-3 pr-10 appearance-none bg-white/30 backdrop-blur-sm rounded-lg text-gray-700 text-sm font-normal font-poppins capitalize border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23555%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[position:right_12px_center] bg-no-repeat"
                value={voyageType}
                onChange={(e) => setVoyageType(e.target.value)}
              >
                <option value="">Select Voyage Type</option>
                <option value="hourly_daily">Hourly / Daily</option>
                <option value="trip_based">Trip Based</option>
              </select>
            </div>

            {/* Number of Passengers */}
            <div className="w-full">
              <p className="text-white text-sm sm:text-base font-normal font-poppins mb-2">Number of Passengers</p>
              <div className="w-full h-11 sm:h-12 bg-white/30 backdrop-blur-sm rounded-lg border border-white/20 flex items-center justify-between px-2">
                <button
                  onClick={() => setPassengers(Math.max(1, passengers - 1))}
                  className="w-8 h-8 flex items-center justify-center bg-white/40 hover:bg-white/60 text-white rounded-md transition-colors"
                  type="button"
                >
                  <span className="text-xl font-medium leading-none mb-1">−</span>
                </button>
                <input
                  type="text"
                  readOnly
                  className="w-full bg-transparent text-center text-gray-800 text-base font-medium font-poppins focus:outline-none"
                  value={passengers}
                />
                <button
                  onClick={() => setPassengers(passengers + 1)}
                  className="w-8 h-8 flex items-center justify-center bg-white/40 hover:bg-white/60 text-white rounded-md transition-colors"
                  type="button"
                >
                  <span className="text-xl font-medium leading-none mb-1">+</span>
                </button>
              </div>
            </div>

            {/* Book now Button */}
            <button
              onClick={handleBookNow}
              disabled={!city || !voyageType}
              className={`w-full h-11 sm:h-12 px-6 py-2.5 rounded-lg flex justify-center items-center gap-2.5 text-white text-base font-medium font-poppins shadow-lg mt-2 sm:mt-4 transition-all duration-300 ${(!city || !voyageType)
                ? 'bg-gray-400 cursor-not-allowed opacity-70'
                : 'bg-[#0C4A8C] backdrop-blur-sm hover:bg-[#0A3D7A] clickable'}`}
            >
              Book now
            </button>
          </div>
        </div>
      </div>

      {/* Wave transition — blends hero bottom into the white section below */}
      <div className="hidden sm:block absolute bottom-0 left-0 w-full z-10">
        <svg
          className="w-full block"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          style={{ height: '80px' }}
        >
          <path
            d="M0,80 L0,80 C200,80 380,80 500,40 C580,15 650,0 720,0 C790,0 860,15 940,40 C1060,80 1240,80 1440,80 L1440,80 Z"
            fill="white"
          />
        </svg>
      </div>

      {/* Featured Activities Section - Hidden on Mobile */}
      <div className="hidden sm:block absolute -bottom-12 left-1/2 transform -translate-x-1/2 max-w-5xl w-[600px] px-4 z-20">
        <div className="bg-white rounded-t-[28px]">
          <div className="p-4 min-h-[200px] overflow-hidden">
            <h2 className="text-blue-700 text-lg font-medium font-poppins capitalize mb-4">
              Featured Activities
            </h2>

            {/* Image Gallery */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 h-40">
              {/* Image 1: Felucca */}
              <div
                className="relative transition-all duration-500 ease-in-out cursor-pointer hover:scale-110"
                onClick={() => handleImageClick(0)}
              >
                <Image
                  src="/images/f1.webp"
                  alt="Felucca"
                  width={176}
                  height={160}
                  className={`rounded-lg transition-all duration-500 ease-in-out ${activeImageIndex === 0
                    ? 'w-44 h-40 scale-105'
                    : 'w-40 h-36'
                    }`}
                  quality={85}
                />
                <div className="absolute top-4 left-4 w-8 h-8 bg-black/30 rounded-full flex items-center justify-center text-white text-lg font-medium font-poppins">
                  01
                </div>
              </div>

              {/* Image 2: Fishing */}
              <div
                className="relative transition-all duration-500 ease-in-out cursor-pointer hover:scale-110"
                onClick={() => handleImageClick(1)}
              >
                <Image
                  src="/images/f2.webp"
                  alt="Fishing"
                  width={176}
                  height={160}
                  className={`rounded-lg transition-all duration-500 ease-in-out ${activeImageIndex === 1
                    ? 'w-44 h-40 scale-105'
                    : 'w-40 h-36'
                    }`}
                  quality={85}
                />
                <div className="absolute top-4 left-4 w-8 h-8 bg-black/30 rounded-full flex items-center justify-center text-white text-lg font-medium font-poppins">
                  02
                </div>
              </div>

              {/* Image 3: Kayak */}
              <div
                className="relative transition-all duration-500 ease-in-out cursor-pointer hover:scale-110"
                onClick={() => handleImageClick(2)}
              >
                <Image
                  src="/images/f3.webp"
                  alt="Kayak"
                  width={176}
                  height={160}
                  className={`rounded-lg transition-all duration-500 ease-in-out ${activeImageIndex === 2
                    ? 'w-44 h-40 scale-105'
                    : 'w-40 h-36'
                    }`}
                  quality={85}
                />
                <div className="absolute top-4 left-4 w-8 h-8 bg-black/30 rounded-full flex items-center justify-center text-white text-lg font-medium font-poppins">
                  03
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;