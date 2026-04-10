import { useTranslation } from 'react-i18next';
import { Users, Clock } from 'lucide-react';

interface OnboardingSlide1Props {
  onNext: () => void;
  onSkip: () => void;
}

export function OnboardingSlide1({ onNext, onSkip }: OnboardingSlide1Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full">
      {/* Photo Background with Chat Overlay - Top 55% */}
      <div className="flex-[55] relative overflow-hidden">
        {/* Background photo */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1770064319607-f869d94d4ec3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaWNrbGViYWxsJTIwcGxheWVycyUyMGdyb3VwJTIwYXNpYW4lMjBvdXRkb29yJTIwY291cnR8ZW58MXx8fHwxNzc1NjA2MTk3fDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Pickleball players on court"
            className="w-full h-full object-cover"
          />
          {/* Dark gradient overlay for better chat overlay visibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0A0A0A]/90" />
        </div>

        {/* Chat overlay card - positioned at bottom 40% of photo */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
          <div className="bg-[#161616]/80 backdrop-blur-md rounded-xl p-4 border border-[#222]">
            {/* Chat header */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#222]">
              <Users className="w-4 h-4 text-[#888]" />
              <span className="text-sm text-[#F0F0F0]">Pickleball Players</span>
            </div>

            {/* Chat messages */}
            <div className="space-y-3">
              {/* First outgoing message */}
              <div className="flex justify-end">
                <div className="bg-[#2D5016] text-[#E5FFB8] rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%]">
                  <p className="text-sm leading-relaxed">
                    Anyone know a good coach near here?
                  </p>
                </div>
              </div>

              {/* Timestamp and status */}
              <div className="flex items-center justify-end gap-2 text-xs text-[#555]">
                <Clock className="w-3 h-3" />
                <span>3 hours ago · No replies yet</span>
              </div>

              {/* Second outgoing message */}
              <div className="flex justify-end">
                <div className="bg-[#2D5016] text-[#E5FFB8] rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%]">
                  <p className="text-sm leading-relaxed">
                    Really need a coach...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Bottom 45% */}
      <div className="flex-[45] flex flex-col justify-between px-6 pb-8 pt-6">
        <div className="space-y-4">
          {/* Tagline */}
          <p className="text-[10px] font-semibold text-[#B8F200] uppercase tracking-[2px]">
            {t('onboarding.slide1.tagline')}
          </p>

          {/* Headline */}
          <h1 className="text-[22px] font-bold text-[#F0F0F0] leading-tight whitespace-pre-line">
            {t('onboarding.slide1.headline')}
          </h1>

          {/* Subtext */}
          <p className="text-[13px] text-[#888888] leading-relaxed">
            {t('onboarding.slide1.subtext')}
          </p>
        </div>

        {/* CTA Section */}
        <div className="space-y-3 pt-4">
          <button
            onClick={onNext}
            className="w-full h-[52px] bg-[#B8F200] text-black font-semibold rounded-[14px] hover:bg-[#A8E200] transition-colors"
          >
            {t('onboarding.slide1.cta')}
          </button>

          <button
            onClick={onSkip}
            className="w-full text-[#555555] text-xs hover:text-[#B8F200] transition-colors"
          >
            {t('onboarding.slide1.skip')}
          </button>
        </div>
      </div>
    </div>
  );
}
