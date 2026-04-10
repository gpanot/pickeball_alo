import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { OnboardingSlide1 } from './OnboardingSlide1';
import { OnboardingSlide2 } from './OnboardingSlide2';
import { OnboardingSlide3 } from './OnboardingSlide3';
import { OnboardingDots } from './OnboardingDots';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('left');

  const handleNext = () => {
    setDirection('left');
    setCurrentSlide((prev) => Math.min(prev + 1, 2));
  };

  const handleBack = () => {
    setDirection('right');
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  };

  const handleSkip = () => {
    setDirection('left');
    setCurrentSlide(2);
  };

  const slideVariants = {
    enter: (direction: 'left' | 'right') => ({
      x: direction === 'left' ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: 'left' | 'right') => ({
      x: direction === 'left' ? '-100%' : '100%',
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Main content area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="absolute inset-0"
          >
            {currentSlide === 0 && (
              <OnboardingSlide1 onNext={handleNext} onSkip={handleSkip} />
            )}
            {currentSlide === 1 && (
              <OnboardingSlide2 onNext={handleNext} onBack={handleBack} />
            )}
            {currentSlide === 2 && (
              <OnboardingSlide3 onComplete={onComplete} onBack={handleBack} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="py-6">
        <OnboardingDots currentSlide={currentSlide} totalSlides={3} />
      </div>
    </div>
  );
}
