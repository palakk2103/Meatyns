import React from "react";

/**
 * FishEmptyCartIllustration
 * A modern, delightful fish-themed empty cart illustration for Meatyns.
 * Features a cute fresh catch fish with brand color tones (golden yellow #FDCE04, coral, soft blush),
 * water ripples, bubbles, and sparkle accents.
 */
const FishEmptyCartIllustration = ({ className = "w-60 h-52 sm:w-72 sm:h-64 mx-auto select-none" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 240 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        <defs>
          {/* Fish Body Gradient (Warm Coral-Salmon to Golden Yellow) */}
          <linearGradient id="meatynsFishGrad" x1="180" y1="75" x2="50" y2="135" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF8B3D" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="85%" stopColor="#FDCE04" />
            <stop offset="100%" stopColor="#E5B800" />
          </linearGradient>

          {/* Belly Gradient (Soft Creamy Blush) */}
          <linearGradient id="fishBellyGrad" x1="140" y1="105" x2="100" y2="138" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFF0F2" />
            <stop offset="100%" stopColor="#FED2D8" />
          </linearGradient>

          {/* Fins Gradient */}
          <linearGradient id="fishFinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFA3AF" />
            <stop offset="100%" stopColor="#D9384E" />
          </linearGradient>

          {/* Soft Aura Radial Glow */}
          <radialGradient id="fishAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF0EF" stopOpacity="1" />
            <stop offset="70%" stopColor="#FFE4E7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>

          {/* Water Ripple Gradient */}
          <linearGradient id="waterRippleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F87171" stopOpacity="0" />
            <stop offset="50%" stopColor="#F87171" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#F87171" stopOpacity="0" />
          </linearGradient>
        </defs>

        <style>
          {`
            @keyframes gentleFishFloat {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-5px) rotate(-1deg); }
            }
            @keyframes bubbleRise {
              0%, 100% { transform: translateY(0px); opacity: 0.6; }
              50% { transform: translateY(-4px); opacity: 1; }
            }
            @keyframes finWave {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(4deg); }
            }
            .fish-float-group {
              animation: gentleFishFloat 3.8s ease-in-out infinite;
              transform-origin: 120px 105px;
            }
            .bubble-anim-1 {
              animation: bubbleRise 3s ease-in-out infinite;
            }
            .bubble-anim-2 {
              animation: bubbleRise 2.5s ease-in-out infinite 0.6s;
            }
            .bubble-anim-3 {
              animation: bubbleRise 3.2s ease-in-out infinite 1.2s;
            }
            .fin-anim {
              animation: finWave 2.8s ease-in-out infinite;
              transform-origin: 120px 115px;
            }
          `}
        </style>

        {/* Soft Background Aura */}
        <circle cx="120" cy="100" r="74" fill="url(#fishAura)" />

        {/* Water Splash & Ripples Base */}
        <ellipse cx="120" cy="162" rx="64" ry="9" fill="url(#waterRippleGrad)" />
        <path
          d="M72 161 C94 167, 146 167, 168 161"
          stroke="#E27380"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />
        <path
          d="M86 168 C102 173, 138 173, 154 168"
          stroke="#FDA4AF"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />

        {/* Small Water Splash Droplets */}
        <circle cx="68" cy="154" r="2" fill="#E27380" opacity="0.6" />
        <circle cx="174" cy="156" r="2.5" fill="#E27380" opacity="0.6" />
        <circle cx="182" cy="148" r="1.8" fill="#F43F5E" opacity="0.5" />

        {/* Sparkle Pluses / Stars around */}
        {/* Top Left Sparkle */}
        <g opacity="0.8">
          <path d="M52 68 Q52 74 46 74 Q52 74 52 80 Q52 74 58 74 Q52 74 52 68 Z" fill="#FDCE04" />
        </g>
        {/* Top Right Sparkle */}
        <g opacity="0.7">
          <path d="M196 52 Q196 57 191 57 Q196 57 196 62 Q196 57 201 57 Q196 57 196 52 Z" fill="#E11D48" />
        </g>
        {/* Mid Left Tiny Plus */}
        <g stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" opacity="0.7">
          <line x1="42" y1="112" x2="42" y2="120" />
          <line x1="38" y1="116" x2="46" y2="116" />
        </g>

        {/* Floating Air/Water Bubbles */}
        <g className="bubble-anim-1">
          {/* Main big bubble near fish mouth */}
          <circle cx="188" cy="74" r="7.5" fill="#FFFFFF" stroke="#38BDF8" strokeWidth="1.8" fillOpacity="0.75" />
          <path d="M185 70 A4 4 0 0 1 191 71" stroke="#38BDF8" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <circle cx="189" cy="71" r="1.2" fill="#FFFFFF" />
        </g>
        <g className="bubble-anim-2">
          {/* Middle bubble */}
          <circle cx="200" cy="58" r="5" fill="#FFFFFF" stroke="#38BDF8" strokeWidth="1.6" fillOpacity="0.7" />
          <path d="M198 56 A2.5 2.5 0 0 1 202 57" stroke="#38BDF8" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        </g>
        <g className="bubble-anim-3">
          {/* Small high bubble */}
          <circle cx="184" cy="46" r="3.2" fill="#FFFFFF" stroke="#38BDF8" strokeWidth="1.4" fillOpacity="0.75" />
        </g>

        {/* ─── Fish Main Group ──────────────────────── */}
        <g className="fish-float-group">
          {/* Back Tail Fin */}
          <path
            d="M62 105 C46 86, 26 84, 28 103 C20 116, 36 132, 60 114 Z"
            fill="url(#fishFinGrad)"
            stroke="#500E16"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Tail Fin Inner Rays */}
          <path
            d="M56 107 C44 98, 35 96, 33 100 M54 110 C42 110, 34 114, 33 112"
            stroke="#500E16"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.4"
          />

          {/* Top Dorsal Fin */}
          <path
            d="M96 74 C112 50, 144 54, 154 75 C136 71, 114 71, 96 74 Z"
            fill="url(#fishFinGrad)"
            stroke="#500E16"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M112 70 C120 59, 130 58, 136 67"
            stroke="#500E16"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
            opacity="0.4"
          />

          {/* Fish Main Body */}
          <path
            d="M58 108 C68 76, 126 64, 172 88 C188 96, 192 105, 183 113 C166 128, 120 144, 58 108 Z"
            fill="url(#meatynsFishGrad)"
            stroke="#500E16"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />

          {/* Fish Belly Highlight / Curved Patch */}
          <path
            d="M82 118 C115 138, 154 128, 172 110 C162 121, 124 135, 82 118 Z"
            fill="url(#fishBellyGrad)"
            opacity="0.9"
          />

          {/* Decorative Fish Scales */}
          <g stroke="#FFA3AF" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.85">
            <path d="M96 92 A9 9 0 0 1 96 108" />
            <path d="M109 88 A9 9 0 0 1 109 104" />
            <path d="M109 103 A9 9 0 0 1 109 119" />
            <path d="M122 93 A9 9 0 0 1 122 109" />
            <path d="M135 91 A9 9 0 0 1 135 107" />
          </g>

          {/* Cute Rosy Cheek Blush */}
          <ellipse cx="152" cy="107" rx="7" ry="4" fill="#FF4D6D" opacity="0.45" />

          {/* Big Adorable Expressive Eye */}
          {/* Eye White Sclera */}
          <circle cx="163" cy="94" r="9.5" fill="#FFFFFF" stroke="#500E16" strokeWidth="2.5" />
          {/* Pupil */}
          <circle cx="165" cy="94" r="5.5" fill="#1E293B" />
          {/* Big Light Catch (sparkle) */}
          <circle cx="167" cy="92" r="2.2" fill="#FFFFFF" />
          <circle cx="163.5" cy="96" r="1.1" fill="#FFFFFF" />

          {/* Happy Mouth */}
          <path
            d="M182 103 C179 108, 174 108, 171 106"
            stroke="#500E16"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Front Pectoral Fin (Waving / Flapping) */}
          <g className="fin-anim">
            <path
              d="M112 106 C128 107, 138 122, 129 131 C116 136, 108 122, 112 106 Z"
              fill="url(#fishFinGrad)"
              stroke="#500E16"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <path
              d="M117 112 C124 117, 126 124, 123 127"
              stroke="#500E16"
              strokeWidth="1.4"
              strokeLinecap="round"
              fill="none"
              opacity="0.4"
            />
          </g>

          {/* Subtle Chef Hat / Fresh Tag or Little Sparkle on Head */}
          <path
            d="M148 67 L152 72 L146 73 Z"
            fill="#FFFFFF"
            opacity="0.8"
          />
        </g>
      </svg>
    </div>
  );
};

export default FishEmptyCartIllustration;
