import { useState, useEffect } from 'react';
import '../i18n';
import { OnboardingScreen } from './components/onboarding/OnboardingScreen';
import { SignupScreen } from './components/SignupScreen';
import { PlayerHome } from './components/PlayerHome';
import { CoachHome } from './components/CoachHome';

const ONBOARDING_KEY = '@courtmap_onboarding_complete';
const USER_ROLE_KEY = '@courtmap_user_role';

export default function App() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [userRole, setUserRole] = useState<'player' | 'coach' | null>(null);

  useEffect(() => {
    // Check if onboarding is complete on mount
    const onboardingStatus = localStorage.getItem(ONBOARDING_KEY);
    const savedRole = localStorage.getItem(USER_ROLE_KEY) as 'player' | 'coach' | null;
    
    if (onboardingStatus === 'true' && savedRole) {
      setIsOnboardingComplete(true);
      setUserRole(savedRole);
    } else {
      setIsOnboardingComplete(false);
    }
  }, []);

  const handleOnboardingComplete = () => {
    // Mark onboarding as complete and show signup screen
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsOnboardingComplete(true);
    setShowSignup(true);
  };

  const handleSignupComplete = (role: 'player' | 'coach') => {
    // Save role and show home screen
    localStorage.setItem(USER_ROLE_KEY, role);
    setUserRole(role);
    setShowSignup(false);
  };

  // Loading state
  if (isOnboardingComplete === null) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#B8F200] text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  // Show onboarding if not complete
  if (!isOnboardingComplete) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  // Show signup if onboarding complete but no role selected
  if (showSignup || !userRole) {
    return <SignupScreen onComplete={handleSignupComplete} />;
  }

  // Show appropriate home screen based on role
  if (userRole === 'coach') {
    return <CoachHome />;
  }

  return <PlayerHome />;
}
