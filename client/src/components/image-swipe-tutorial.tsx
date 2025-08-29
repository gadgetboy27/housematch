import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ImageSwipeTutorialProps {
  isVisible: boolean;
  onComplete: () => void;
  imageCount: number;
}

export default function ImageSwipeTutorial({ isVisible, onComplete, imageCount }: ImageSwipeTutorialProps) {
  const [step, setStep] = useState(0);
  const [showHandAnimation, setShowHandAnimation] = useState(true);

  const steps = [
    {
      title: "Tap to explore images",
      description: `This property has ${imageCount} photos`,
      highlight: "left", // highlight left side first
    },
    {
      title: "Tap right side for next",
      description: "Tap left side for previous",
      highlight: "both",
    },
    {
      title: "Dots show your progress",
      description: "Each dot represents a photo",
      highlight: "dots",
    }
  ];

  const currentStep = steps[step];

  useEffect(() => {
    if (!isVisible) return;
    
    const timer = setTimeout(() => {
      if (step < steps.length - 1) {
        setStep(prev => prev + 1);
        setShowHandAnimation(true);
      } else {
        // Tutorial complete after showing all steps
        setTimeout(() => onComplete(), 1500);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [step, isVisible, onComplete, steps.length]);

  useEffect(() => {
    if (showHandAnimation) {
      const timer = setTimeout(() => setShowHandAnimation(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [showHandAnimation, step]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-testid="image-swipe-tutorial"
      >
        {/* Left highlight zone */}
        <AnimatePresence>
          {(currentStep.highlight === "left" || currentStep.highlight === "both") && (
            <motion.div
              className="absolute top-0 left-0 w-[30%] h-full bg-white/20 border-2 border-white rounded-r-lg"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </AnimatePresence>

        {/* Right highlight zone */}
        <AnimatePresence>
          {(currentStep.highlight === "right" || currentStep.highlight === "both") && (
            <motion.div
              className="absolute top-0 right-0 w-[30%] h-full bg-white/20 border-2 border-white rounded-l-lg"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </AnimatePresence>

        {/* Dots highlight */}
        <AnimatePresence>
          {currentStep.highlight === "dots" && (
            <motion.div
              className="absolute bottom-40 left-1/2 transform -translate-x-1/2 bg-white/20 border-2 border-white rounded-full px-4 py-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex space-x-2">
                {Array.from({ length: imageCount }).map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      index === 0 ? 'bg-white shadow-lg scale-110' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated hand gesture */}
        <AnimatePresence>
          {showHandAnimation && (currentStep.highlight === "left" || currentStep.highlight === "right") && (
            <motion.div
              className={`absolute top-1/2 transform -translate-y-1/2 pointer-events-none ${
                currentStep.highlight === "left" ? "left-[15%]" : "right-[15%]"
              }`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ 
                opacity: [0, 1, 1, 0], 
                scale: [0.5, 1, 1, 0.5],
                y: [0, -10, 0, -10]
              }}
              transition={{ 
                duration: 1, 
                times: [0, 0.3, 0.7, 1],
                repeat: 2
              }}
            >
              <div className="text-4xl">👆</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tutorial text */}
        <motion.div
          className="text-center text-white px-8"
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="text-xl font-bold mb-2">{currentStep.title}</h3>
          <p className="text-white/80">{currentStep.description}</p>
          
          {/* Progress dots */}
          <div className="flex justify-center space-x-2 mt-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === step ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </motion.div>

        {/* Skip button */}
        <button
          className="absolute top-4 right-4 text-white/70 hover:text-white text-sm px-3 py-1 rounded-full bg-black/30 backdrop-blur-sm border border-white/20"
          onClick={onComplete}
          data-testid="button-skip-tutorial"
        >
          Skip
        </button>

        {/* Development reset button */}
        {process.env.NODE_ENV === 'development' && (
          <button
            className="absolute bottom-4 left-4 text-white/70 hover:text-white text-xs px-2 py-1 rounded bg-red-500/20"
            onClick={() => {
              localStorage.removeItem('image-swipe-tutorial-seen');
              window.location.reload();
            }}
            data-testid="button-reset-tutorial"
          >
            Reset Tutorial
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}