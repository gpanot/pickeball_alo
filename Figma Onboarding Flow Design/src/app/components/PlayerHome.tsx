import { Search, MapPin, Clock } from 'lucide-react';

export function PlayerHome() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-[#161616] border-b border-[#222] px-6 py-4">
        <h1 className="text-xl font-bold text-[#F0F0F0]">CourtMap</h1>
        <p className="text-sm text-[#888] mt-1">Find your perfect coach</p>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#888]" />
          <input
            type="text"
            placeholder="Search coaches or locations..."
            className="w-full bg-[#161616] border border-[#222] rounded-xl pl-12 pr-4 py-3.5 text-[#F0F0F0] placeholder:text-[#555] focus:outline-none focus:border-[#B8F200]"
          />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-4">
          <button className="bg-[#161616] border border-[#222] rounded-xl p-6 text-left hover:border-[#B8F200] transition-colors">
            <MapPin className="w-6 h-6 text-[#B8F200] mb-3" />
            <h3 className="text-sm font-semibold text-[#F0F0F0] mb-1">Near me</h3>
            <p className="text-xs text-[#888]">Find nearby coaches</p>
          </button>

          <button className="bg-[#161616] border border-[#222] rounded-xl p-6 text-left hover:border-[#B8F200] transition-colors">
            <Clock className="w-6 h-6 text-[#B8F200] mb-3" />
            <h3 className="text-sm font-semibold text-[#F0F0F0] mb-1">My sessions</h3>
            <p className="text-xs text-[#888]">View bookings</p>
          </button>
        </div>

        {/* Welcome message */}
        <div className="bg-[#B8F200]/6 border border-[#B8F200]/20 rounded-xl p-6">
          <h2 className="text-base font-bold text-[#F0F0F0] mb-2">
            Welcome, Player! 🎾
          </h2>
          <p className="text-sm text-[#888] leading-relaxed">
            You're all set to discover verified pickleball coaches. Start exploring to book your first session.
          </p>
        </div>
      </div>
    </div>
  );
}
