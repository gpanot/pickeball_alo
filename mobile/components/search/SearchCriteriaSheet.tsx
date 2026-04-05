import React from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CourtIcon, SearchIcon } from '@/components/Icons';
import SearchFormFields from '@/components/search/SearchFormFields';
import { getBookTimeShortLabel } from '@/lib/formatters';
import type { ThemeTokens } from '@/lib/theme';
import type { SearchFormFieldsProps } from '@/components/search/SearchFormFields';

type FieldsProps = Omit<SearchFormFieldsProps, 't'>;

interface SearchCriteriaSheetProps extends FieldsProps {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
  applying?: boolean;
  t: ThemeTokens;
  bookAtVenueName?: string | null;
}

export default function SearchCriteriaSheet({
  open,
  onClose,
  onApply,
  applying,
  t,
  bookAtVenueName = null,
  ...fields
}: SearchCriteriaSheetProps) {
  const insets = useSafeAreaInsets();
  const bookFlow = Boolean(bookAtVenueName);
  const bookTimePhrase = getBookTimeShortLabel(fields.selectedTime);
  const primaryLabel = bookFlow
    ? bookTimePhrase
      ? `Book for ${bookTimePhrase}`
      : 'Book court'
    : 'UPDATE SEARCH';

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: t.overlay }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: t.sheetBg, paddingBottom: Math.max(16, insets.bottom) }]}>
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: t.textMuted }]} />
        </View>
        <View style={[styles.header, { borderBottomColor: t.border }]}>
          <Text style={[styles.title, { color: t.text }]}>
            {bookFlow ? `Book · ${bookAtVenueName}` : 'Edit search'}
          </Text>
          <Text style={[styles.sub, { color: t.textSec }]}>
            {bookFlow
              ? 'Choose date, duration, and start time for this court.'
              : 'Update filters and search again'}
          </Text>
        </View>
        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          <SearchFormFields t={t} {...fields} />
        </ScrollView>
        <View style={[styles.footer, { borderTopColor: t.border, backgroundColor: t.sheetBg }]}>
          <Pressable
            onPress={onApply}
            disabled={applying}
            style={[
              styles.cta,
              { backgroundColor: t.accent, opacity: applying ? 0.75 : 1 },
            ]}
          >
            {applying ? (
              <ActivityIndicator color="#000" />
            ) : bookFlow ? (
              <CourtIcon size={18} color="#000" />
            ) : (
              <SearchIcon size={18} color="#000" />
            )}
            <Text style={styles.ctaText}>
              {applying ? (bookFlow ? 'OPENING…' : 'SEARCHING…') : primaryLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  handle: { width: 40, height: 4, borderRadius: 2, opacity: 0.45 },
  header: { paddingHorizontal: 20, paddingBottom: 8, borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: '800' },
  sub: { marginTop: 6, fontSize: 13 },
  body: { flexGrow: 0, maxHeight: '55%', paddingHorizontal: 20, paddingVertical: 16 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  ctaText: { color: '#000', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
});
