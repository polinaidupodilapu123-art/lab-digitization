import aknuLogo from "../assets/aknu_logo.png";
import nannayaLogo from "../assets/nannaya_logo.png";

const Header = () => {
  return (
    <header className="bg-teal-900 text-white flex flex-col md:flex-row items-center justify-evenly p-4 md:p-6">
      <div>
        <img
          src={aknuLogo}
          alt="AKNU"
          className="w-20 h-20 md:w-24 md:h-24 object-contain"
        />
      </div>
      <div className="py-3 text-center">
        <h1 className="text-xl sm:text-2xl md:text-3xl leading-tight text-[#fcc203] font-bold font-[cennerik] break-normal whitespace-normal mx-auto sm:mx-0 max-w-[18ch] sm:max-w-none">
          ADIKAVI NANNAYA UNIVERSITY
        </h1>
        <h1 className="text-xl sm:text-2xl md:text-3xl leading-tight font-bold break-normal whitespace-normal mx-auto sm:mx-0 max-w-[18ch] sm:max-w-none">
          ఆదికవి నన్నయ విశ్వవిద్యాలయం
        </h1>

        <p className="text-xs mt-2 font-bold text-[#fcc203]">
          RAJAMAHENDRAVARAM, ANDHRA PRADESH INDIA - 533296
        </p>

        <div className="mt-2 flex flex-col items-center">
          {/* Accreditation container with width control */}
          <div className="w-fit px-4">
            {/* Top line */}
            <div className="h-px bg-gradient-to-r from-transparent via-[#fcc203] to-transparent mb-2"></div>

            {/* Content */}
            <div className="flex flex-wrap gap-4 justify-center items-center">
              <p className="text-xs font-bold text-white">
                Accredited by NAAC with 'B+' Grade
              </p>
              <div className="w-1 h-1 rounded-full bg-[#fcc203]"></div>
              <p className="text-xs font-bold text-white">
                ISO 9001:2025 Certified
              </p>
              <div className="w-1 h-1 rounded-full bg-[#fcc203]"></div>
              <p className="text-xs font-bold text-white">5 Star Rated</p>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-[#fcc203] to-transparent mt-2 mb-2"></div>
            <div className="text-[10px] sm:text-xs mt-2 font-bold text-white  tracking-wider">
              Largest State University in Andhra Pradesh in terms of Affiliation
            </div>

            {/* Bottom line */}
            <div className="h-px bg-gradient-to-r from-transparent via-[#fcc203] to-transparent mt-2"></div>
          </div>
        </div>
      </div>

      <div>
        {" "}
        {/* <Link to="/" className="hidden sm:block -ml-2 md:-ml-4"> */}
        {/* </Link> */}
        <img
          src={nannayaLogo}
          alt="Nannaya"
          className="w-20 h-20 md:w-24 md:h-24 object-contain"
        />
      </div>
    </header>
  );
};

export default Header;
