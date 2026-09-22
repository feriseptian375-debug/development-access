import React, { useState, useEffect } from 'react';

interface CourtLogoProps {
  url?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const CourtLogo: React.FC<CourtLogoProps> = ({
  url,
  className = '',
  size = 'md',
  showText = false,
}) => {
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [url]);

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-20 h-24',
    xl: 'w-28 h-32',
  };

  const defaultUrl =
    'https://media.canva.com/v2/download/name:LOGO+PTUN+PKP+TERBARU.png/uri:ifs%3A%2F%2FM%2F1bf733e1abd446f9aed2b2ccfdec0e1e?csig=AAAAAAAAAAAAAAAAAAAAAHYjLjd8PZ86bTrKEkscibX4WCN_E_TmfdqZ2phiQ8iO&exp=1790049450&signer=media-rpc&token=AAIAAU0AIDFiZjczM2UxYWJkNDQ2ZjlhZWQyYjJjY2ZkZWMwZTFlAAAAAAGgx-fDzHYn7PAwbx-Ilh5iISgbZQRGeWSkvs2NRmgt2FeKXhlr';

  const logoSrc = url || defaultUrl;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`relative flex items-center justify-center shrink-0 ${sizeClasses[size]}`}>
        {!loadFailed && logoSrc ? (
          <img
            id="ptun-app-logo"
            src={logoSrc}
            alt="Logo PTUN Pangkalpinang"
            className="w-full h-full object-contain filter drop-shadow-xs transition-transform duration-200"
            onError={() => setLoadFailed(true)}
            referrerPolicy="no-referrer"
          />
        ) : (
          /* High-Fidelity Official Seal SVG of PTUN Pangkalpinang */
          <svg
            id="ptun-official-seal-svg"
            viewBox="0 0 200 240"
            className="w-full h-full drop-shadow-xs select-none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Oval Border */}
            <ellipse cx="100" cy="120" rx="94" ry="114" stroke="#0f172a" strokeWidth="5" fill="#ffffff" />
            <ellipse cx="100" cy="120" rx="88" ry="108" stroke="#0f172a" strokeWidth="1.5" fill="#f8fafc" />

            {/* Inner Border */}
            <ellipse cx="100" cy="120" rx="76" ry="94" stroke="#0f172a" strokeWidth="2.5" fill="#ffffff" />

            {/* Curved Text Path: PENGADILAN TATA USAHA NEGARA PANGKALPINANG */}
            <path
              id="seal-text-path"
              d="M 28 120 A 72 90 0 1 1 172 120"
              fill="none"
              stroke="none"
            />
            <text fill="#0f172a" fontSize="10.5" fontWeight="900" letterSpacing="0.5" textAnchor="middle">
              <textPath href="#seal-text-path" startOffset="50%">
                PENGADILAN TATA USAHA NEGARA PANGKALPINANG
              </textPath>
            </text>

            {/* Lotus Star Core (Cakra Mahkamah Agung) */}
            <g transform="translate(100, 105)">
              {/* Star Petals */}
              <polygon
                points="0,-36 9,-18 28,-28 18,-9 36,0 18,9 28,28 9,18 0,36 -9,18 -28,28 -18,9 -36,0 -18,-9 -28,-28 -9,-18"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2"
              />
              <circle cx="0" cy="0" r="22" stroke="#0f172a" strokeWidth="2" fill="#ffffff" />
              {/* Center Shield & Star */}
              <path
                d="M -14 -12 L 14 -12 L 14 4 Q 0 16 -14 4 Z"
                fill="#0f172a"
                stroke="#0f172a"
                strokeWidth="1"
              />
              {/* Golden/White Center Star */}
              <polygon
                points="0,-8 2,-2 8,-2 3,2 5,8 0,4 -5,8 -3,2 -8,-2 -2,-2"
                fill="#fbbf24"
              />
              {/* Scale arms inside shield */}
              <line x1="-10" y1="-2" x2="10" y2="-2" stroke="#ffffff" strokeWidth="1" />
              <line x1="0" y1="-6" x2="0" y2="4" stroke="#ffffff" strokeWidth="1" />
            </g>

            {/* Ribbon "DHARMMAYUKTI" */}
            <g transform="translate(100, 168)">
              <path
                d="M -42 -2 Q 0 -9 42 -2 L 36 8 Q 0 2 -36 8 Z"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="1.5"
              />
              <text
                x="0"
                y="5"
                textAnchor="middle"
                fontSize="6"
                fontWeight="900"
                fill="#0f172a"
                letterSpacing="1"
              >
                DHARMMAYUKTI
              </text>
            </g>

            {/* Chain Necklace Garland at Bottom */}
            <path
              d="M 50 178 Q 100 222 150 178"
              stroke="#0f172a"
              strokeWidth="2.5"
              strokeDasharray="4 3"
              fill="none"
            />
            <circle cx="70" cy="192" r="3" fill="#0f172a" />
            <circle cx="85" cy="198" r="3" fill="#0f172a" />
            <circle cx="100" cy="200" r="3.5" fill="#0f172a" />
            <circle cx="115" cy="198" r="3" fill="#0f172a" />
            <circle cx="130" cy="192" r="3" fill="#0f172a" />
          </svg>
        )}
      </div>

      {showText && (
        <div className="flex flex-col text-left">
          <span className="text-xs uppercase tracking-wider font-bold text-blue-900">
            Pengadilan Tata Usaha Negara
          </span>
          <span className="text-base font-black text-slate-900 leading-tight">
            Pangkalpinang
          </span>
        </div>
      )}
    </div>
  );
};
