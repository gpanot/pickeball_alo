'use client';

import { useCallback, useEffect, useState } from 'react';
import { darkTheme } from '@/lib/theme';
import { readAdminSession, clearAdminSession } from '@/lib/admin-storage';
import { adminAuthHeaders, withVenueQuery } from '@/lib/admin-api';
import { buildVietQrImageUrl, pickDynamicQrPayment } from '@/lib/vietqr';
import { useRouter } from 'next/navigation';

const t = darkTheme;

type PaymentRow = {
  id: string;
  bank: string;
  accountName: string;
  accountNumber: string;
  qrImageUrl: string | null;
  bankBin: string | null;
  isDefaultForDynamicQr: boolean;
  sortOrder: number;
};

type BankOpt = { id: string; name: string; bin: string };

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [banks, setBanks] = useState<BankOpt[]>([]);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<PaymentRow, 'id' | 'sortOrder'>>({
    bank: '',
    accountName: '',
    accountNumber: '',
    qrImageUrl: null,
    bankBin: null,
    isDefaultForDynamicQr: false,
  });

  const reload = useCallback(() => {
    const s = readAdminSession();
    if (!s) { router.replace('/admin'); return; }
    fetch(withVenueQuery('/api/admin/payments', s.venueId), {
      headers: adminAuthHeaders(s.token),
    })
      .then((r) => {
        if (r.status === 401) { clearAdminSession(); router.replace('/admin'); return null; }
        return r.json();
      })
      .then((rows) => {
        if (Array.isArray(rows)) {
          setPayments(
            rows.map((r) => ({
              ...r,
              bankBin: r.bankBin ?? null,
              isDefaultForDynamicQr: Boolean(r.isDefaultForDynamicQr),
            })),
          );
        }
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    fetch('/api/banks')
      .then((r) => r.json())
      .then((rows: BankOpt[]) => (Array.isArray(rows) ? setBanks(rows) : setBanks([])))
      .catch(() => setBanks([]));
  }, []);

  const startAdd = () => {
    setEditingId('__new__');
    setDraft({
      bank: '',
      accountName: '',
      accountNumber: '',
      qrImageUrl: null,
      bankBin: null,
      isDefaultForDynamicQr: payments.length === 0,
    });
  };

  const startEdit = (p: PaymentRow) => {
    setEditingId(p.id);
    setDraft({
      bank: p.bank,
      accountName: p.accountName,
      accountNumber: p.accountNumber,
      qrImageUrl: p.qrImageUrl,
      bankBin: p.bankBin,
      isDefaultForDynamicQr: p.isDefaultForDynamicQr,
    });
  };

  const applyBankPick = (name: string) => {
    const match = banks.find((b) => b.name.toLowerCase() === name.trim().toLowerCase());
    setDraft((d) => ({
      ...d,
      bank: name,
      bankBin: match ? match.bin : d.bankBin,
    }));
  };

  const previewUrl =
    draft.bankBin &&
    draft.bankBin.length === 6 &&
    draft.accountNumber.trim() &&
    draft.accountName.trim()
      ? buildVietQrImageUrl({
          bankBin: draft.bankBin,
          accountNumber: draft.accountNumber.trim(),
          accountName: draft.accountName.trim(),
          amountVnd: 1000,
          orderId: 'preview000000',
        })
      : null;

  const hasDynamicVenue =
    pickDynamicQrPayment(
      payments.map((p) => ({
        bankBin: p.bankBin,
        accountName: p.accountName,
        accountNumber: p.accountNumber,
        isDefaultForDynamicQr: p.isDefaultForDynamicQr,
        sortOrder: p.sortOrder,
      })),
    ) != null;

  const cancel = () => setEditingId(null);

  const save = async () => {
    const s = readAdminSession();
    if (!s) return;
    if (!draft.bank.trim() || !draft.accountName.trim() || !draft.accountNumber.trim()) {
      alert('Bank, account name, and account number are required');
      return;
    }
    setBusy(true);
    try {
      if (editingId === '__new__') {
        const res = await fetch(withVenueQuery('/api/admin/payments', s.venueId), {
          method: 'POST',
          headers: adminAuthHeaders(s.token),
          body: JSON.stringify(draft),
        });
        if (!res.ok) throw new Error();
      } else {
        const res = await fetch(withVenueQuery(`/api/admin/payments/${editingId}`, s.venueId), {
          method: 'PUT',
          headers: adminAuthHeaders(s.token),
          body: JSON.stringify(draft),
        });
        if (!res.ok) throw new Error();
      }
      setEditingId(null);
      reload();
    } catch {
      alert('Save failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this payment method?')) return;
    const s = readAdminSession();
    if (!s) return;
    setBusy(true);
    try {
      await fetch(withVenueQuery(`/api/admin/payments/${id}`, s.venueId), {
        method: 'DELETE',
        headers: adminAuthHeaders(s.token),
      });
      if (editingId === id) setEditingId(null);
      reload();
    } catch {
      alert('Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const handleQrFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((d) => ({ ...d, qrImageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${t.border}`,
    background: t.bgInput,
    color: t.text,
    fontSize: 14,
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: t.textSec,
    marginBottom: 4,
    marginTop: 10,
  };

  const cardStyle: React.CSSProperties = {
    background: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  };

  return (
    <div>
      <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>Payment methods</h1>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: t.textSec, maxWidth: 720 }}>
        Bank accounts and QR codes shown to players when they book a court. Players will transfer to one of these accounts to complete their booking.
      </p>

      <datalist id="courtmap-banks">
        {banks.map((b) => (
          <option key={b.id} value={b.name} />
        ))}
      </datalist>

      {!hasDynamicVenue && payments.length > 0 ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 10,
            background: `${t.orange}18`,
            border: `1px solid ${t.orange}55`,
            color: t.text,
            fontSize: 14,
          }}
        >
          Add a valid 6-digit bank BIN and mark one account as default for dynamic VietQR so players get a prefilled payment QR.
        </div>
      ) : null}

      {payments.map((p) => (
        <div key={p.id} style={cardStyle}>
          {editingId === p.id ? (
            <div>
              <label style={labelStyle}>Bank</label>
              <input
                style={inputStyle}
                value={draft.bank}
                list="courtmap-banks"
                onChange={(e) => applyBankPick(e.target.value)}
                placeholder="e.g. Techcombank"
              />
              <label style={labelStyle}>Bank BIN (6 digits, VietQR)</label>
              <input
                style={inputStyle}
                value={draft.bankBin ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    bankBin: e.target.value.replace(/\D/g, '').slice(0, 6) || null,
                  })
                }
                placeholder="970436"
                inputMode="numeric"
                maxLength={6}
              />
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={draft.isDefaultForDynamicQr}
                  onChange={(e) => setDraft({ ...draft, isDefaultForDynamicQr: e.target.checked })}
                />
                Default account for dynamic VietQR (one per venue)
              </label>
              {previewUrl ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ ...labelStyle, marginTop: 0 }}>Test QR (1.000 ₫, ref CM-PREVIEW)</div>
                  <a href={previewUrl} target="_blank" rel="noreferrer" style={{ color: t.blue, fontSize: 13 }}>
                    Open VietQR preview image
                  </a>
                </div>
              ) : null}
              <label style={labelStyle}>Account name</label>
              <input
                style={inputStyle}
                value={draft.accountName}
                onChange={(e) => setDraft({ ...draft, accountName: e.target.value })}
                placeholder="e.g. NGUYEN VAN A"
              />
              <label style={labelStyle}>Account number</label>
              <input
                style={inputStyle}
                value={draft.accountNumber}
                onChange={(e) => setDraft({ ...draft, accountNumber: e.target.value })}
                placeholder="e.g. 123456789"
              />
              <label style={labelStyle}>QR code image</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                {draft.qrImageUrl && (
                  <img
                    src={draft.qrImageUrl}
                    alt="QR"
                    style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 8, border: `1px solid ${t.border}` }}
                  />
                )}
                <div>
                  <input type="file" accept="image/*" onChange={handleQrFile} style={{ fontSize: 12, color: t.textSec }} />
                  {draft.qrImageUrl && (
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, qrImageUrl: null })}
                      style={{ display: 'block', marginTop: 4, background: 'none', border: 'none', color: t.red, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
                    >
                      Remove image
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button
                  type="button" disabled={busy} onClick={save}
                  style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: t.blue, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Save
                </button>
                <button
                  type="button" onClick={cancel}
                  style={{ padding: '10px 18px', borderRadius: 10, border: `1px solid ${t.border}`, background: 'transparent', color: t.textSec, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
                <button
                  type="button" onClick={() => remove(p.id)}
                  style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: `${t.red}22`, color: t.red, cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{p.bank}</div>
                {p.bankBin ? (
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>BIN {p.bankBin}</div>
                ) : null}
                {p.isDefaultForDynamicQr ? (
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.accent, marginTop: 4 }}>Default VietQR</div>
                ) : null}
                <div style={{ fontSize: 14, color: t.textSec, marginTop: 4 }}>{p.accountName}</div>
                <div style={{ fontSize: 14, color: t.text, marginTop: 2, fontFamily: 'monospace' }}>{p.accountNumber}</div>
              </div>
              {p.qrImageUrl && (
                <img
                  src={p.qrImageUrl}
                  alt="QR"
                  style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 8, border: `1px solid ${t.border}`, flexShrink: 0 }}
                />
              )}
              <button
                type="button" onClick={() => startEdit(p)}
                style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${t.blue}`, background: 'transparent', color: t.blue, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
              >
                Edit
              </button>
            </div>
          )}
        </div>
      ))}

      {editingId === '__new__' ? (
        <div style={cardStyle}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>New payment method</div>
          <label style={labelStyle}>Bank</label>
          <input
            style={inputStyle}
            value={draft.bank}
            list="courtmap-banks"
            onChange={(e) => applyBankPick(e.target.value)}
            placeholder="e.g. Techcombank"
          />
          <label style={labelStyle}>Bank BIN (6 digits, VietQR)</label>
          <input
            style={inputStyle}
            value={draft.bankBin ?? ''}
            onChange={(e) =>
              setDraft({
                ...draft,
                bankBin: e.target.value.replace(/\D/g, '').slice(0, 6) || null,
              })
            }
            placeholder="970436"
            inputMode="numeric"
            maxLength={6}
          />
          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={draft.isDefaultForDynamicQr}
              onChange={(e) => setDraft({ ...draft, isDefaultForDynamicQr: e.target.checked })}
            />
            Default account for dynamic VietQR (one per venue)
          </label>
          {previewUrl ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ ...labelStyle, marginTop: 0 }}>Test QR (1.000 ₫, ref CM-PREVIEW)</div>
              <a href={previewUrl} target="_blank" rel="noreferrer" style={{ color: t.blue, fontSize: 13 }}>
                Open VietQR preview image
              </a>
            </div>
          ) : null}
          <label style={labelStyle}>Account name</label>
          <input
            style={inputStyle}
            value={draft.accountName}
            onChange={(e) => setDraft({ ...draft, accountName: e.target.value })}
            placeholder="e.g. NGUYEN VAN A"
          />
          <label style={labelStyle}>Account number</label>
          <input
            style={inputStyle}
            value={draft.accountNumber}
            onChange={(e) => setDraft({ ...draft, accountNumber: e.target.value })}
            placeholder="e.g. 123456789"
          />
          <label style={labelStyle}>QR code image</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            {draft.qrImageUrl && (
              <img
                src={draft.qrImageUrl}
                alt="QR"
                style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 8, border: `1px solid ${t.border}` }}
              />
            )}
            <div>
              <input type="file" accept="image/*" onChange={handleQrFile} style={{ fontSize: 12, color: t.textSec }} />
              {draft.qrImageUrl && (
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, qrImageUrl: null })}
                  style={{ display: 'block', marginTop: 4, background: 'none', border: 'none', color: t.red, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
                >
                  Remove image
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              type="button" disabled={busy} onClick={save}
              style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: t.blue, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Save
            </button>
            <button
              type="button" onClick={cancel}
              style={{ padding: '10px 18px', borderRadius: 10, border: `1px solid ${t.border}`, background: 'transparent', color: t.textSec, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button" disabled={busy} onClick={startAdd}
          style={{
            width: '100%', padding: 12, borderRadius: 10,
            border: `1px dashed ${t.border}`, background: 'transparent',
            color: t.blue, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          + Add payment method
        </button>
      )}
    </div>
  );
}
