
import React, { useState, useEffect } from 'react';
import PinKeypad from './PinKeypad';
import { verifyLogin, updateUserPin } from '../services/authService';
import { Theme } from '../types';

interface SettingsPageProps {
  lang: 'en' | 'es';
  user: 'Dad' | 'Mom';
  theme: Theme;
  onBack: () => void;
}

type ChangeStep = 'verify' | 'new' | 'confirm' | 'success';

const SettingsPage: React.FC<SettingsPageProps> = ({ lang, user, theme, onBack }) => {
  const [step, setStep] = useState<ChangeStep>('verify');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const t = {
    settings: lang === 'es' ? 'Configuración' : 'Settings',
    changePin: lang === 'es' ? 'Cambiar Código Secreto' : 'Change Secret Code',
    enterCurrent: lang === 'es' ? 'Ingresa tu código actual' : 'Enter your current code',
    enterNew: lang === 'es' ? 'Ingresa tu nuevo código' : 'Enter your new code',
    confirmNew: lang === 'es' ? 'Confirma tu nuevo código' : 'Confirm your new code',
    wrongPin: lang === 'es' ? '¡Código incorrecto!' : 'Wrong code!',
    noMatch: lang === 'es' ? '¡Los códigos no coinciden!' : 'Codes do not match!',
    success: lang === 'es' ? '¡Código actualizado!' : 'Code updated!',
    back: lang === 'es' ? '← Volver' : '← Back',
  };

  const handleVerifySubmit = () => {
    if (currentPin.length !== 4) return; // Wait for complete PIN
    if (verifyLogin(user, currentPin)) {
      setCurrentPin('');
      setStep('new');
    } else {
      alert(t.wrongPin);
      setCurrentPin('');
    }
  };

  const handleNewPinSubmit = () => {
    if (currentPin.length !== 4) return; // Wait for complete PIN
    setNewPin(currentPin);
    setCurrentPin('');
    setStep('confirm');
  };

  const handleConfirmSubmit = () => {
    if (currentPin.length !== 4) return; // Wait for complete PIN
    if (currentPin === newPin) {
      updateUserPin(user, newPin);
      setStep('success');
      setTimeout(() => {
        onBack();
      }, 2000);
    } else {
      alert(t.noMatch);
      setCurrentPin('');
      setNewPin('');
      setStep('new');
    }
  };

  const handlePinSubmit = () => {
    switch(step) {
      case 'verify':
        handleVerifySubmit();
        break;
      case 'new':
        handleNewPinSubmit();
        break;
      case 'confirm':
        handleConfirmSubmit();
        break;
    }
  };

  // Auto-submit when PIN reaches 4 digits
  useEffect(() => {
    if (currentPin.length === 4) {
      const timer = setTimeout(() => {
        handlePinSubmit();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentPin]);

  const textColor = theme === 'evening' ? 'text-white' : 'text-slate-800';
  const userColor = user === 'Dad' ? 'bg-sky-500' : 'bg-rose-400';
  const userEmoji = user === 'Dad' ? '🧔' : '👩';

  if (step === 'success') {
    return (
      <div className="py-10 px-4 max-w-4xl mx-auto">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="bg-white cartoon-border p-12 rounded-[50px] text-center animate-fade-in shadow-2xl">
            <span className="text-9xl mb-6 block">✅</span>
            <h2 className="text-4xl font-black text-green-600 uppercase">{t.success}</h2>
          </div>
        </div>
      </div>
    );
  }

  const getStepTitle = () => {
    switch(step) {
      case 'verify':
        return t.enterCurrent;
      case 'new':
        return t.enterNew;
      case 'confirm':
        return t.confirmNew;
      default:
        return '';
    }
  };

  return (
    <div className="py-10 px-4 max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="bg-white text-slate-800 cartoon-border px-8 py-4 rounded-2xl font-black text-xl mb-12 cartoon-button shadow-md"
      >
        {t.back}
      </button>

      <h1 className={`text-5xl font-black ${textColor} uppercase mb-12 text-center`}>
        {t.settings}
      </h1>

      <div className={`${userColor} cartoon-border p-10 rounded-[50px] max-w-md mx-auto text-center animate-fade-in shadow-2xl`}>
        <span className="text-7xl mb-4 block">{userEmoji}</span>
        <h2 className="text-3xl font-black text-white uppercase mb-2">{t.changePin}</h2>
        <p className="text-xl font-bold text-white/80 mb-8 italic">{getStepTitle()}</p>

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

export default SettingsPage;
