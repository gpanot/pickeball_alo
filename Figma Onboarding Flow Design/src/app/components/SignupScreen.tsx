import { useState } from 'react';
import { User, UserCheck, CheckCircle2 } from 'lucide-react';

interface SignupScreenProps {
  onComplete: (role: 'player' | 'coach') => void;
}

export function SignupScreen({ onComplete }: SignupScreenProps) {
  const [selectedRole, setSelectedRole] = useState<'player' | 'coach' | null>('player');

  const handleContinue = () => {
    if (selectedRole) {
      onComplete(selectedRole);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-8">
        <p className="text-[10px] font-semibold text-[#B8F200] uppercase tracking-[2px] mb-4">
          GET STARTED
        </p>
        <h1 className="text-[28px] font-bold text-[#F0F0F0] leading-tight mb-3">
          Are you a player or coach?
        </h1>
        <p className="text-[13px] text-[#888888] leading-relaxed">
          This helps us personalize your experience. You can always change this later.
        </p>
      </div>

      {/* Role selector cards */}
      <div className="flex-1 px-6 space-y-4">
        {/* Player Card */}
        <button
          onClick={() => setSelectedRole('player')}
          className={`w-full p-6 rounded-2xl border transition-all duration-300 text-left relative ${
            selectedRole === 'player'
              ? 'bg-[#B8F200]/6 border-[#B8F200] border-[1.5px]'
              : 'bg-[#161616] border-[#222] hover:border-[#333]'
          }`}
        >
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                selectedRole === 'player' ? 'bg-[#B8F200]/10' : 'bg-[#222]'
              }`}
            >
              <User
                className={`w-7 h-7 ${
                  selectedRole === 'player' ? 'text-[#B8F200]' : 'text-[#888]'
                }`}
              />
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3
                className={`text-lg font-bold mb-1 ${
                  selectedRole === 'player' ? 'text-[#F0F0F0]' : 'text-[#CCC]'
                }`}
              >
                Player
              </h3>
              <p
                className={`text-[13px] ${
                  selectedRole === 'player' ? 'text-[#999]' : 'text-[#666]'
                }`}
              >
                Find verified coaches, book sessions, track your progress
              </p>
            </div>

            {/* Checkmark */}
            {selectedRole === 'player' && (
              <CheckCircle2 className="w-6 h-6 text-[#B8F200] absolute top-5 right-5" />
            )}
          </div>
        </button>

        {/* Coach Card */}
        <button
          onClick={() => setSelectedRole('coach')}
          className={`w-full p-6 rounded-2xl border transition-all duration-300 text-left relative ${
            selectedRole === 'coach'
              ? 'bg-[#B8F200]/6 border-[#B8F200] border-[1.5px]'
              : 'bg-[#161616] border-[#222] hover:border-[#333]'
          }`}
        >
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                selectedRole === 'coach' ? 'bg-[#B8F200]/10' : 'bg-[#222]'
              }`}
            >
              <UserCheck
                className={`w-7 h-7 ${
                  selectedRole === 'coach' ? 'text-[#B8F200]' : 'text-[#888]'
                }`}
              />
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3
                className={`text-lg font-bold mb-1 ${
                  selectedRole === 'coach' ? 'text-[#F0F0F0]' : 'text-[#CCC]'
                }`}
              >
                Coach
              </h3>
              <p
                className={`text-[13px] ${
                  selectedRole === 'coach' ? 'text-[#999]' : 'text-[#666]'
                }`}
              >
                Get discovered by players, manage bookings, grow your reputation
              </p>
            </div>

            {/* Checkmark */}
            {selectedRole === 'coach' && (
              <CheckCircle2 className="w-6 h-6 text-[#B8F200] absolute top-5 right-5" />
            )}
          </div>
        </button>
      </div>

      {/* CTA at bottom */}
      <div className="px-6 pb-8 pt-6">
        <button
          onClick={handleContinue}
          disabled={!selectedRole}
          className={`w-full h-[52px] font-semibold rounded-[14px] transition-all ${
            selectedRole
              ? 'bg-[#B8F200] text-black hover:bg-[#A8E200]'
              : 'bg-[#222] text-[#555] cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
