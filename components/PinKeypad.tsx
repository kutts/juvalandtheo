
import React from 'react';

interface PinKeypadProps {
  pin: string;
  onPinChange: (pin: string) => void;
  maxLength?: number;
  lang: 'en' | 'es';
  autoSubmit?: boolean;
  onSubmit?: () => void;
}

const PinKeypad: React.FC<PinKeypadProps> = ({
  pin,
  onPinChange,
  maxLength = 4,
  lang,
  autoSubmit = true,
  onSubmit
}) => {

  const handleKeyPress = (key: string) => {
    if (key === 'C') {
      onPinChange('');
    } else if (key === '←') {
      onPinChange(pin.slice(0, -1));
    } else if (pin.length < maxLength) {
      const newPin = pin + key;
      onPinChange(newPin);

      // Auto-submit when PIN is complete
      if (autoSubmit && newPin.length === maxLength && onSubmit) {
        // Use requestAnimationFrame to ensure state update has rendered
        requestAnimationFrame(() => {
          setTimeout(() => onSubmit(), 100);
        });
      }
    }
  };

  return (
    <div className="w-full">
      {/* PIN Dots Display */}
      <div className="flex justify-center gap-6 mb-12">
        {[...Array(maxLength)].map((_, i) => (
          <div
            key={i}
            className={`w-10 h-10 rounded-full border-[8px] border-slate-800 transition-all ${
              pin.length > i ? 'bg-slate-800 scale-125' : 'bg-white'
            }`}
          />
        ))}
      </div>

      {/* Numeric Keypad */}
      <div className="grid grid-cols-3 gap-6 max-w-sm mx-auto">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '←'].map((key) => (
          <button
            key={key}
            onClick={() => handleKeyPress(key)}
            className="aspect-square bg-white border-[6px] border-slate-800 shadow-[4px_4px_0px_#1e293b] flex items-center justify-center text-4xl font-black text-slate-800 hover:bg-amber-400 active:translate-y-1 transition-all rounded-[24px]"
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PinKeypad;
