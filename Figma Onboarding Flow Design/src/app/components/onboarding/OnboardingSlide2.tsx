import { useTranslation } from 'react-i18next';
import { CheckCircle2, Lock } from 'lucide-react';

interface OnboardingSlide2Props {
  onNext: () => void;
  onBack: () => void;
}

export function OnboardingSlide2({ onNext, onBack }: OnboardingSlide2Props) {
  const { t } = useTranslation();

  const ratings = [
    { label: 'On time', value: 4.6 },
    { label: 'Friendly', value: 4.8 },
    { label: 'Professional', value: 4.4 },
    { label: 'Recommend', value: 5.0 },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Illustration Area - Top 55% */}
      <div className="flex-[55] flex items-center justify-center px-6 pt-12">
        <div className="w-full max-w-md space-y-4">
          {/* Coach profile card */}
          <div className="bg-[#161616] rounded-2xl border border-[#2A2A2A] p-4 shadow-xl">
            {/* Coach header with real photo */}
            <div className="flex items-center gap-4 mb-6">
              {/* Real coach photo - circular */}
              <div className="w-16 h-16 rounded-full overflow-hidden bg-[#222] flex-shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1660463528633-aaa173d83fe4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaWNrbGViYWxsJTIwY29hY2glMjBhc2lhbiUyMHBvcnRyYWl0JTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc3NTYwNjE5OHww&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Coach"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-[15px] font-bold text-[#F0F0F0]">Coach Nguyen Van A</h3>
                <p className="text-xs text-[#888] mt-1">
                  IPTPA Level 2 · 47 sessions completed
                </p>
              </div>
            </div>

            {/* Rating bars */}
            <div className="space-y-3 mb-4">
              {ratings.map((rating, index) => (
                <div key={index} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-[#888] uppercase tracking-wide">
                      {rating.label}
                    </span>
                    <span className="text-sm font-bold text-[#B8F200]">
                      {rating.value.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#B8F200] rounded-full transition-all duration-500"
                      style={{ width: `${(rating.value / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Verified badge */}
            <div className="flex items-center gap-2 bg-[#B8F200]/10 rounded-full px-3 py-2 border border-[#B8F200]/20">
              <CheckCircle2 className="w-4 h-4 text-[#B8F200]" />
              <span className="text-xs text-[#B8F200] font-semibold">
                Verified · 3+ sessions confirmed
              </span>
            </div>
          </div>

          {/* Trust indicators below card */}
          <div className="space-y-2 px-2">
            <div className="flex items-center gap-2 text-[11px] text-[#555555]">
              <Lock className="w-3.5 h-3.5 text-[#B8F200]" />
              <span>{t('onboarding.slide2.trustNote')}</span>
            </div>
            <p className="text-[11px] text-[#555555] pl-5">
              {t('onboarding.slide2.noFakeStars')}
            </p>
          </div>
        </div>
      </div>

      {/* Content Area - Bottom 45% */}
      <div className="flex-[45] flex flex-col justify-between px-6 pb-8">
        <div className="space-y-4">
          {/* Tagline */}
          <p className="text-[10px] font-semibold text-[#B8F200] uppercase tracking-[2px]">
            {t('onboarding.slide2.tagline')}
          </p>

          {/* Headline */}
          <h1 className="text-[22px] font-bold text-[#F0F0F0] leading-tight">
            {t('onboarding.slide2.headline')}
          </h1>

          {/* Subtext */}
          <p className="text-[13px] text-[#888888] leading-relaxed">
            {t('onboarding.slide2.subtext')}
          </p>
        </div>

        {/* CTA Section */}
        <div className="space-y-3 pt-4">
          <button
            onClick={onNext}
            className="w-full h-[52px] bg-[#B8F200] text-black font-semibold rounded-[14px] hover:bg-[#A8E200] transition-colors"
          >
            {t('onboarding.slide2.cta')}
          </button>

          <button
            onClick={onBack}
            className="w-full text-[#555555] text-xs hover:text-[#B8F200] transition-colors"
          >
            {t('onboarding.slide2.back')}
          </button>
        </div>
      </div>
    </div>
  );
}
