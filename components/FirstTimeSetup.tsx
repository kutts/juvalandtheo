
import React, { useState, useEffect } from 'react';
import PinKeypad from './PinKeypad';
import { initializeAuth } from '../services/authService';
import { Theme } from '../types';

interface FirstTimeSetupProps {
  lang: 'en' | 'es';
  onComplete: () => void;
  theme: Theme;
}

type SetupStep = 'welcome' | 'dad-pin' | 'dad-confirm' | 'mom-pin' | 'mom-confirm' | 'complete';

const FirstTimeSetup: React.FC<FirstTimeSetupProps> = ({ lang, onComplete, theme }) => {
  const [step, setStep] = useState<SetupStep>('welcome');
  const [dadPin, setDadPin] = useState('');
  const [dadConfirm, setDadConfirm] = useState('');
  const [momPin, setMomPin] = useState('');
  const [momConfirm, setMomConfirm] = useState('');
  const [currentPin, setCurrentPin] = useState('');

  const t = {
    welcome: lang === 'es' ? '¡Bienvenidos!' : 'Welcome!',
    setupMessage: lang === 'es'
      ? 'Vamos a crear códigos secretos para el álbum familiar'
      : "Let's create secret codes for your family album",
    dadTurn: lang === 'es' ? 'Papá: Elige tu código' : 'Dad: Choose your code',
    momTurn: lang === 'es' ? 'Mamá: Elige tu código' : 'Mom: Choose your code',
    confirmPin: lang === 'es' ? 'Confirma tu código' : 'Confirm your code',
    continue: lang === 'es' ? 'Continuar' : 'Continue',
    error: lang === 'es' ? '¡Los códigos no coinciden!' : 'Codes do not match!',
    success: lang === 'es' ? '¡Códigos guardados!' : 'Codes saved!',
    skip: lang === 'es' ? 'Usar códigos por defecto (0000 y 5555)' : 'Use default codes (0000 & 5555)',
  };

  const handlePinSubmit = () => {
    if (currentPin.length !== 4) return; // Wait for complete PIN

    switch(step) {
      case 'dad-pin':
        setDadPin(currentPin);
        setCurrentPin('');
        setStep('dad-confirm');
        break;
      case 'dad-confirm':
        if (currentPin === dadPin) {
          setDadConfirm(currentPin);
          setCurrentPin('');
          setStep('mom-pin');
        } else {
          alert(t.error);
          setCurrentPin('');
          setStep('dad-pin');
        }
        break;
      case 'mom-pin':
        setMomPin(currentPin);
        setCurrentPin('');
        setStep('mom-confirm');
        break;
      case 'mom-confirm':
        if (currentPin === momPin) {
          setMomConfirm(currentPin);
          // Initialize auth system
          initializeAuth(dadPin, momPin);
          setStep('complete');
          setTimeout(() => onComplete(), 2000);
        } else {
          alert(t.error);
          setCurrentPin('');
          setStep('mom-pin');
        }
        break;
    }
  };

  const handleSkip = () => {
    initializeAuth('0000', '5555');
    onComplete();
  };

  // Auto-submit when PIN reaches 4 digits
  useEffect(() => {
    if (currentPin.length === 4 && step !== 'welcome' && step !== 'complete') {
      const timer = setTimeout(() => {
        handlePinSubmit();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentPin, step]);

  const textColor = theme === 'evening' ? 'text-white' : 'text-slate-800';

  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-white cartoon-border p-12 rounded-[50px] text-center animate-fade-in shadow-2xl max-w-2xl">
          <h1 className="text-5xl font-black text-slate-800 mb-6 uppercase">{t.welcome}</h1>
          <p className="text-2xl text-slate-600 mb-12 italic">{t.setupMessage}</p>
          <button
            onClick={() => setStep('dad-pin')}
            className="bg-amber-400 text-slate-800 cartoon-border px-12 py-6 rounded-3xl font-black text-2xl uppercase cartoon-button mb-4"
          >
            {t.continue}
          </button>
          <button
            onClick={handleSkip}
            className="block mx-auto text-slate-400 font-bold text-sm uppercase hover:text-slate-600 transition-colors mt-6"
          >
            {t.skip}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-white cartoon-border p-12 rounded-[50px] text-center animate-fade-in shadow-2xl">
          <span className="text-9xl mb-6 block">✨</span>
          <h2 className="text-4xl font-black text-green-600 uppercase">{t.success}</h2>
        </div>
      </div>
    );
  }

  const getStepInfo = () => {
    switch(step) {
      case 'dad-pin':
        return { title: t.dadTurn, emoji: '🧔', color: 'bg-sky-500' };
      case 'dad-confirm':
        return { title: t.confirmPin, emoji: '🧔', color: 'bg-sky-500' };
      case 'mom-pin':
        return { title: t.momTurn, emoji: '👩', color: 'bg-rose-400' };
      case 'mom-confirm':
        return { title: t.confirmPin, emoji: '👩', color: 'bg-rose-400' };
      default:
        return { title: '', emoji: '', color: '' };
    }
  };

  const stepInfo = getStepInfo();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className={`${stepInfo.color} cartoon-border p-10 rounded-[50px] w-full max-w-md text-center animate-fade-in shadow-2xl`}>
        <span className="text-9xl mb-6 block">{stepInfo.emoji}</span>
        <h3 className="text-3xl font-black mb-8 uppercase text-white">{stepInfo.title}</h3>
        <PinKeypad
          pin={currentPin}
          onPinChange={setCurrentPin}
          lang={lang}
          autoSubmit={false}
        />
      </div>
    </div>
  );
};

export default FirstTimeSetup;
