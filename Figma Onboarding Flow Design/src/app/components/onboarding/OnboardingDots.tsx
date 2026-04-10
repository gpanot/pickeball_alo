interface OnboardingDotsProps {
  currentSlide: number;
  totalSlides: number;
}

export function OnboardingDots({ currentSlide, totalSlides }: OnboardingDotsProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSlides }).map((_, index) => (
        <div
          key={index}
          className={`transition-all duration-300 ${
            index === currentSlide
              ? 'w-5 h-1.5 rounded-full bg-[#B8F200]'
              : 'w-1.5 h-1.5 rounded-full bg-[#333333]'
          }`}
        />
      ))}
    </div>
  );
}
