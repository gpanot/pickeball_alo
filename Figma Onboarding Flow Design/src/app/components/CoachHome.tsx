import { Calendar, Users, TrendingUp } from 'lucide-react';

export function CoachHome() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-[#161616] border-b border-[#222] px-6 py-4">
        <h1 className="text-xl font-bold text-[#F0F0F0]">CourtMap</h1>
        <p className="text-sm text-[#888] mt-1">Coach Dashboard</p>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#161616] border border-[#222] rounded-xl p-4 text-center">
            <Calendar className="w-5 h-5 text-[#B8F200] mx-auto mb-2" />
            <p className="text-2xl font-bold text-[#F0F0F0]">0</p>
            <p className="text-xs text-[#888] mt-1">Sessions</p>
          </div>

          <div className="bg-[#161616] border border-[#222] rounded-xl p-4 text-center">
            <Users className="w-5 h-5 text-[#B8F200] mx-auto mb-2" />
            <p className="text-2xl font-bold text-[#F0F0F0]">0</p>
            <p className="text-xs text-[#888] mt-1">Students</p>
          </div>

          <div className="bg-[#161616] border border-[#222] rounded-xl p-4 text-center">
            <TrendingUp className="w-5 h-5 text-[#B8F200] mx-auto mb-2" />
            <p className="text-2xl font-bold text-[#F0F0F0]">-</p>
            <p className="text-xs text-[#888] mt-1">Rating</p>
          </div>
        </div>

        {/* Welcome message */}
        <div className="bg-[#B8F200]/6 border border-[#B8F200]/20 rounded-xl p-6">
          <h2 className="text-base font-bold text-[#F0F0F0] mb-2">
            Welcome, Coach! 🏆
          </h2>
          <p className="text-sm text-[#888] leading-relaxed mb-4">
            Complete your profile to start getting discovered by players looking for coaching in your area.
          </p>
          <button className="w-full py-3 bg-[#B8F200] text-black font-semibold rounded-lg hover:bg-[#A8E200] transition-colors">
            Complete Profile
          </button>
        </div>

        {/* Quick actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#F0F0F0]">Quick Actions</h3>
          
          <button className="w-full bg-[#161616] border border-[#222] rounded-xl p-4 text-left hover:border-[#B8F200] transition-colors flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-[#F0F0F0] mb-1">Set Availability</h4>
              <p className="text-xs text-[#888]">Update your coaching schedule</p>
            </div>
            <Calendar className="w-5 h-5 text-[#888]" />
          </button>

          <button className="w-full bg-[#161616] border border-[#222] rounded-xl p-4 text-left hover:border-[#B8F200] transition-colors flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-[#F0F0F0] mb-1">View Bookings</h4>
              <p className="text-xs text-[#888]">See upcoming sessions</p>
            </div>
            <Users className="w-5 h-5 text-[#888]" />
          </button>
        </div>
      </div>
    </div>
  );
}
