import Image from 'next/image';

const AboutApp = () => {
  return (
    <section className="py-8 sm:py-20">
      <div className="text-center mb-8 sm:mb-16">
        <p className="text-4xl sm:text-4xl lg:text-5xl font-signpainter text-[#927C4E] mb-2 sm:mb-4">
          What is DAFFA
        </p>
        <h2 className="text-5xl sm:text-5xl lg:text-6xl font-bold text-black font-poppins mb-4 sm:mb-6">
          About us
        </h2>
        <p className="text-base sm:text-xl text-gray-400 font-poppins max-w-4xl mx-auto leading-relaxed">
          Discover the soul of Egypt&apos;s waters with DAFFA. We connect you with authentic local captains and unforgettable journeys across the country&apos;s seas and rivers.
        </p>
      </div>

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-start">
          {/* Left Side: Text Content */}
          <div>
            <h2 className="text-[#072D5B] text-3xl sm:text-4xl lg:text-5xl font-semibold font-poppins mb-6 sm:mb-8 leading-tight">
              Providing a large fleet of Boats for a perfect and dreamy experience
            </h2>

            <p className="text-[#093B77] text-base sm:text-lg font-normal font-poppins leading-7 sm:leading-9 mb-6 sm:mb-8">
              Born in Aswan, DAFFA offers authentic experiences across Egypt&apos;s prime waters.
              We connect you to a network of vetted, professional boat owners and captains on the
              Nile River, the Red Sea, and the Mediterranean Sea. You&apos;re not just renting a boat;
              you&apos;re gaining access to expert local knowledge for a safe and unforgettable journey.
            </p>

            <ul className="space-y-2 sm:space-y-3">
              <li className="text-[#093B77] text-base sm:text-lg font-semibold font-poppins leading-7 sm:leading-9 flex items-start">
                <Image src="/icons/tick.svg" alt="check" width={24} height={24} className="w-5 h-5 sm:w-6 sm:h-6 mr-3 mt-1 flex-shrink-0" />
                Premium Boats & Yachts
              </li>
              <li className="text-[#093B77] text-base sm:text-lg font-semibold font-poppins leading-7 sm:leading-9 flex items-start">
                <Image src="/icons/tick.svg" alt="check" width={24} height={24} className="w-5 h-5 sm:w-6 sm:h-6 mr-3 mt-1 flex-shrink-0" />
                Our Professional Approach
              </li>
              <li className="text-[#093B77] text-base sm:text-lg font-semibold font-poppins leading-7 sm:leading-9 flex items-start">
                <Image src="/icons/tick.svg" alt="check" width={24} height={24} className="w-5 h-5 sm:w-6 sm:h-6 mr-3 mt-1 flex-shrink-0" />
                AR/VR Experience
              </li>
              <li className="text-[#093B77] text-base sm:text-lg font-semibold font-poppins leading-7 sm:leading-9 flex items-start">
                <Image src="/icons/tick.svg" alt="check" width={24} height={24} className="w-5 h-5 sm:w-6 sm:h-6 mr-3 mt-1 flex-shrink-0" />
                360 Video Experience
              </li>
              <li className="text-[#093B77] text-base sm:text-lg font-semibold font-poppins leading-7 sm:leading-9 flex items-start">
                <Image src="/icons/tick.svg" alt="check" width={24} height={24} className="w-5 h-5 sm:w-6 sm:h-6 mr-3 mt-1 flex-shrink-0" />
                AI Chatbot
              </li>
            </ul>

            <div className="mt-6 sm:mt-8">
              <Image
                src="/images/image 2.webp"
                alt="App Store"
                width={208}
                height={44}
                className="w-40 h-9 sm:w-52 sm:h-11"
              />
            </div>
            <div className="pl-3 sm:pl-4 mb-6 sm:mb-8">
              <p className="text-black text-xs sm:text-sm font-normal font-poppins leading-6 sm:leading-9">
                Founder, DAFFA App
              </p>
            </div>
          </div>

          {/* Right Side: Image */}
          <div className="flex justify-center lg:justify-end mt-6 lg:mt-0">
            <Image
              src="/images/image 1.png"
              alt="Boat Image"
              width={640}
              height={661}
              className="w-full max-w-md sm:max-w-lg lg:max-w-[640px] h-auto rounded-lg"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutApp;