import React, { useCallback } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import VenueDetailScreen from '@/components/venue/VenueDetailScreen';
import { useCourtMap } from '@/context/CourtMapContext';

export default function VenueRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ctx = useCourtMap();
  const {
    t,
    detailVenue,
    detailJumpToConfirm,
    selectedSlots,
    savedIds,
    searchDate,
    selectedDate,
    detailRefreshing,
    selectedTime,
    userId,
    userName,
    userPhone,
    closeDetail,
    toggleSlot,
    toggleSaved,
    handleDetailAvailabilityDateChange,
    goMyBookingsTab,
    resetVenueDetail,
    setDetailVenue,
    bookingBeingEdited,
    loadBookings,
    persistPlayerProfileFromBooking,
  } = ctx;

  useFocusEffect(
    useCallback(() => {
      return () => {
        resetVenueDetail();
      };
    }, [resetVenueDetail]),
  );

  const venueId = typeof id === 'string' ? id : id?.[0] ?? '';

  const bookingForThisVenue =
    bookingBeingEdited?.venueId === venueId ? bookingBeingEdited : null;
  const displayUserName = bookingForThisVenue?.userName?.trim() || userName;
  const displayUserPhone = bookingForThisVenue?.userPhone?.trim() || userPhone;

  const onVenueLoaded = useCallback(
    (v: import('@/lib/types').VenueResult) => setDetailVenue(v),
    [setDetailVenue],
  );

  const onViewBookings = useCallback(() => goMyBookingsTab(), [goMyBookingsTab]);

  return (
    <VenueDetailScreen
      venueId={venueId}
      initialVenue={detailVenue?.id === venueId ? detailVenue : null}
      visible={Boolean(venueId)}
      initialJumpToBooking={detailJumpToConfirm}
      selectedSlots={selectedSlots}
      isSaved={savedIds.has(venueId)}
      searchDate={searchDate}
      selectedDateIndex={selectedDate}
      onAvailabilityDateChange={handleDetailAvailabilityDateChange}
      detailDateLoading={detailRefreshing}
      selectedTimeIndex={selectedTime}
      userId={userId}
      userName={displayUserName}
      userPhone={displayUserPhone}
      onPersistPlayerProfile={persistPlayerProfileFromBooking}
      onClose={closeDetail}
      onToggleSlot={toggleSlot}
      onToggleSaved={toggleSaved}
      onBookingComplete={() => {
        void loadBookings();
      }}
      onViewBookings={onViewBookings}
      onVenueLoaded={onVenueLoaded}
      editBookingId={bookingBeingEdited?.id ?? null}
      t={t}
    />
  );
}
