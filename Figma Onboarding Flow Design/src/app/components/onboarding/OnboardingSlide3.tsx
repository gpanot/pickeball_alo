import { useTranslation } from 'react-i18next';
import { Star, Clock } from 'lucide-react';

interface OnboardingSlide3Props {
  onComplete: () => void;
  onBack: () => void;
}

export function OnboardingSlide3({ onComplete, onBack }: OnboardingSlide3Props) {
  const { t } = useTranslation();

  // Calendar data - showing scarcity (most slots booked)
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const timeSlots = [
    ['Booked', 'Booked', 'Booked'],
    ['Booked', '6pm', 'Booked'],
    ['Booked', 'Booked', 'Booked'],
    ['Booked', 'Booked', 'Booked'],
    ['Booked', 'Booked', 'Booked'],
    ['Booked', 'Booked', '4pm'],
    ['Booked', 'Booked', 'Booked'],
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Coach Hero Photo with Calendar Overlay - Top 55% */}
      <div className="flex-[55] relative overflow-hidden">
        {/* Background hero photo */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1737229471661-78a6a16f33bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaWNrbGViYWxsJTIwY29hY2glMjBhY3Rpb24lMjB0ZWFjaGluZyUyMGFzaWFufGVufDF8fHx8MTc3NTYwNjE5OHww&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Coach in action"
            className="w-full h-full object-cover"
          />
          {/* Dark gradient overlay for calendar readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0A0A]/40 to-[#0A0A0A]/95" />
        </div>

        {/* Coach identity chip - overlaid on photo */}
        <div className="absolute top-6 left-6">
          <div className="bg-[#0A0A0A]/75 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
            <Star className="w-4 h-4 text-[#B8F200] fill-[#B8F200]" />
            <span className="text-[13px] text-[#F0F0F0] font-semibold">
              4.8 Coach Minh
            </span>
          </div>
        </div>

        {/* Availability calendar card - positioned at bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
          <div className="bg-[#161616] rounded-2xl border border-[#2A2A2A] p-4">
            {/* Calendar header */}
            <div className="mb-3">
              <p className="text-xs text-[#888]">This week</p>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1.5 mb-3">
              {weekDays.map((day, dayIndex) => (
                <div key={dayIndex} className="space-y-1.5">
                  {/* Day label */}
                  <div className="text-[10px] text-[#666] text-center font-medium">
                    {day}
                  </div>
                  
                  {/* Time slots for this day */}
                  <div className="space-y-1">
                    {timeSlots[dayIndex].map((slot, slotIndex) => (
                      <div
                        key={slotIndex}
                        className={`text-[9px] font-semibold text-center py-1.5 rounded ${
                          slot === 'Booked'
                            ? 'bg-[#222] text-[#555]'
                            : 'bg-[#B8F200] text-black'
                        }`}
                      >
                        {slot}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Urgency pill */}
            <div className="flex items-center justify-center gap-2 bg-[#B8F200]/10 rounded-full px-4 py-2 border border-[#B8F200]/20">
              <Clock className="w-3.5 h-3.5 text-[#B8F200]" />
              <span className="text-xs text-[#B8F200] font-semibold">
                {t('onboarding.slide3.urgencyNote')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Bottom 45% */}
      <div className="flex-[45] flex flex-col justify-between px-6 pb-8 pt-6">
        <div className="space-y-4">
          {/* Tagline */}
          <p className="text-[10px] font-semibold text-[#B8F200] uppercase tracking-[2px]">
            {t('onboarding.slide3.tagline')}
          </p>

          {/* Headline */}
          <h1 className="text-[22px] font-bold text-[#F0F0F0] leading-tight">
            {t('onboarding.slide3.headline')}
          </h1>

          {/* Subtext */}
          <p className="text-[13px] text-[#888888] leading-relaxed">
            {t('onboarding.slide3.subtext')}
          </p>
        </div>

        {/* CTA Section - No Skip on this slide */}
        <div className="space-y-3 pt-4">
          <button
            onClick={onComplete}
            className="w-full h-[52px] bg-[#B8F200] text-black font-semibold rounded-[14px] hover:bg-[#A8E200] transition-colors"
          >
            {t('onboarding.slide3.cta')}
          </button>

          <button
            onClick={onBack}
            className="w-full text-[#555555] text-xs hover:text-[#B8F200] transition-colors"
          >
            {t('onboarding.slide3.back')}
          </button>
        </div>
      </div>
    </div>
  );
}
