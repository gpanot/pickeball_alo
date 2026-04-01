import { useState } from "react";

// Each court has its own time slots
const VENUES = [
  { id: 1, name: "Ông Địa Pickleball", address: "93 Nguyễn Hoàng, An Phú, Thủ Đức", price: 39000, priceRange: [39000, 55000], distance: 4.0, rating: 4.6, reviews: 128, courts: 6, available: true, lat: 10.803, lng: 106.745, tags: ["Indoor", "Lights"], amenities: ["Parking", "Water", "Locker", "Lights"], hours: "5:00 AM - 10:00 PM", phone: "0909 123 456",
    availability: [
      { court: "Court 1", type: "Indoor", note: "Best lights", slots: [
        { time: "5:00", price: 39, s: "o" }, { time: "5:30", price: 39, s: "o" }, { time: "6:00", price: 45, s: "b" }, { time: "6:30", price: 45, s: "b" }, { time: "7:00", price: 50, s: "f" }, { time: "7:30", price: 50, s: "o" }, { time: "8:00", price: 55, s: "o" }, { time: "17:00", price: 55, s: "f" }, { time: "17:30", price: 55, s: "b" }, { time: "18:00", price: 55, s: "b" },
      ]},
      { court: "Court 2", type: "Indoor", note: "", slots: [
        { time: "5:00", price: 39, s: "o" }, { time: "5:30", price: 39, s: "b" }, { time: "6:00", price: 45, s: "b" }, { time: "6:30", price: 45, s: "o" }, { time: "7:00", price: 50, s: "b" }, { time: "7:30", price: 50, s: "b" }, { time: "8:00", price: 55, s: "o" }, { time: "17:00", price: 55, s: "b" }, { time: "17:30", price: 55, s: "b" }, { time: "18:00", price: 55, s: "f" },
      ]},
      { court: "Court 3", type: "Indoor", note: "Less sun", slots: [
        { time: "5:00", price: 39, s: "o" }, { time: "5:30", price: 39, s: "o" }, { time: "6:00", price: 45, s: "o" }, { time: "6:30", price: 45, s: "o" }, { time: "7:00", price: 50, s: "f" }, { time: "7:30", price: 50, s: "o" }, { time: "8:00", price: 55, s: "o" }, { time: "17:00", price: 55, s: "o" }, { time: "17:30", price: 55, s: "f" }, { time: "18:00", price: 55, s: "o" },
      ]},
      { court: "Court 4", type: "Outdoor", note: "", slots: [
        { time: "5:00", price: 35, s: "o" }, { time: "5:30", price: 35, s: "o" }, { time: "6:00", price: 40, s: "o" }, { time: "6:30", price: 40, s: "b" }, { time: "7:00", price: 45, s: "b" }, { time: "7:30", price: 45, s: "b" }, { time: "8:00", price: 50, s: "o" }, { time: "17:00", price: 50, s: "b" }, { time: "17:30", price: 50, s: "b" }, { time: "18:00", price: 50, s: "b" },
      ]},
      { court: "Court 5", type: "Outdoor", note: "Under maintenance", slots: [] },
      { court: "Court 6", type: "Outdoor", note: "", slots: [
        { time: "5:00", price: 35, s: "o" }, { time: "5:30", price: 35, s: "o" }, { time: "6:00", price: 40, s: "f" }, { time: "6:30", price: 40, s: "o" }, { time: "7:00", price: 45, s: "b" }, { time: "7:30", price: 45, s: "o" }, { time: "8:00", price: 50, s: "o" }, { time: "17:00", price: 50, s: "f" }, { time: "17:30", price: 50, s: "o" }, { time: "18:00", price: 50, s: "o" },
      ]},
    ]
  },
  { id: 2, name: "ATC Tennis & Pickleball Thảo Điền", address: "146 Nguyễn Văn Hưởng, Thảo Điền, Q2", price: 50000, priceRange: [50000, 75000], distance: 3.9, rating: 4.8, reviews: 256, courts: 8, available: true, lat: 10.808, lng: 106.738, tags: ["Outdoor", "Lights", "Pro Shop"], amenities: ["Pro Shop", "Cafe", "Parking", "Coaching", "Lights", "Shower"], hours: "5:30 AM - 10:30 PM", phone: "0912 345 678",
    availability: [
      { court: "Court A", type: "Outdoor", note: "Premium", slots: [
        { time: "5:30", price: 50, s: "o" }, { time: "6:00", price: 55, s: "o" }, { time: "6:30", price: 60, s: "f" }, { time: "7:00", price: 65, s: "b" }, { time: "7:30", price: 65, s: "b" }, { time: "8:00", price: 60, s: "o" }, { time: "17:00", price: 70, s: "b" }, { time: "17:30", price: 75, s: "b" },
      ]},
      { court: "Court B", type: "Outdoor", note: "", slots: [
        { time: "5:30", price: 50, s: "o" }, { time: "6:00", price: 55, s: "b" }, { time: "6:30", price: 60, s: "o" }, { time: "7:00", price: 65, s: "o" }, { time: "7:30", price: 65, s: "b" }, { time: "8:00", price: 60, s: "o" }, { time: "17:00", price: 70, s: "f" }, { time: "17:30", price: 75, s: "b" },
      ]},
      { court: "Court C", type: "Outdoor", note: "", slots: [
        { time: "5:30", price: 50, s: "b" }, { time: "6:00", price: 55, s: "b" }, { time: "6:30", price: 60, s: "o" }, { time: "7:00", price: 65, s: "o" }, { time: "7:30", price: 65, s: "o" }, { time: "8:00", price: 60, s: "f" }, { time: "17:00", price: 70, s: "o" }, { time: "17:30", price: 75, s: "o" },
      ]},
      { court: "Court D", type: "Outdoor", note: "Near cafe", slots: [
        { time: "5:30", price: 50, s: "o" }, { time: "6:00", price: 55, s: "o" }, { time: "6:30", price: 60, s: "b" }, { time: "7:00", price: 65, s: "b" }, { time: "7:30", price: 65, s: "o" }, { time: "8:00", price: 60, s: "o" }, { time: "17:00", price: 70, s: "o" }, { time: "17:30", price: 75, s: "f" },
      ]},
      { court: "Court E", type: "Indoor", note: "AC", slots: [
        { time: "5:30", price: 60, s: "o" }, { time: "6:00", price: 65, s: "f" }, { time: "6:30", price: 70, s: "b" }, { time: "7:00", price: 75, s: "b" }, { time: "7:30", price: 75, s: "b" }, { time: "8:00", price: 70, s: "o" }, { time: "17:00", price: 75, s: "b" }, { time: "17:30", price: 75, s: "b" },
      ]},
      { court: "Court F", type: "Indoor", note: "AC", slots: [
        { time: "5:30", price: 60, s: "b" }, { time: "6:00", price: 65, s: "o" }, { time: "6:30", price: 70, s: "o" }, { time: "7:00", price: 75, s: "f" }, { time: "7:30", price: 75, s: "o" }, { time: "8:00", price: 70, s: "o" }, { time: "17:00", price: 75, s: "o" }, { time: "17:30", price: 75, s: "f" },
      ]},
    ]
  },
  { id: 3, name: "GG Pickle An Phú", address: "36 Thảo Điền, An Phú, Q2", price: 45000, priceRange: [45000, 60000], distance: 3.2, rating: 4.5, reviews: 89, courts: 4, available: true, lat: 10.801, lng: 106.741, tags: ["Indoor", "AC"], amenities: ["AC", "Water", "Parking"], hours: "6:00 AM - 10:00 PM", phone: "0933 456 789",
    availability: [
      { court: "Court 1", type: "Indoor", note: "", slots: [{ time: "6:00", price: 45, s: "o" }, { time: "6:30", price: 45, s: "o" }, { time: "7:00", price: 50, s: "f" }, { time: "7:30", price: 55, s: "b" }, { time: "17:00", price: 60, s: "o" }, { time: "17:30", price: 60, s: "b" }] },
      { court: "Court 2", type: "Indoor", note: "", slots: [{ time: "6:00", price: 45, s: "b" }, { time: "6:30", price: 45, s: "o" }, { time: "7:00", price: 50, s: "o" }, { time: "7:30", price: 55, s: "o" }, { time: "17:00", price: 60, s: "b" }, { time: "17:30", price: 60, s: "f" }] },
      { court: "Court 3", type: "Indoor", note: "Best AC", slots: [{ time: "6:00", price: 45, s: "o" }, { time: "6:30", price: 45, s: "f" }, { time: "7:00", price: 50, s: "o" }, { time: "7:30", price: 55, s: "o" }, { time: "17:00", price: 60, s: "f" }, { time: "17:30", price: 60, s: "o" }] },
      { court: "Court 4", type: "Indoor", note: "Maintenance", slots: [] },
    ]
  },
  { id: 4, name: "Saigon Pickleball Club", address: "15 Lê Văn Miến, Thảo Điền, Q2", price: 60000, priceRange: [60000, 90000], distance: 2.8, rating: 4.9, reviews: 342, courts: 10, available: false, lat: 10.812, lng: 106.735, tags: ["Indoor", "AC", "Pro Shop", "Cafe"], amenities: ["AC", "Pro Shop", "Cafe", "Coaching", "Parking", "Shower", "Locker", "Lights"], hours: "5:00 AM - 11:00 PM", phone: "0988 765 432",
    availability: Array.from({ length: 10 }, (_, i) => ({
      court: `Court ${i + 1}`, type: i < 6 ? "Indoor" : "Outdoor", note: i === 0 ? "VIP" : "",
      slots: [{ time: "5:00", price: 60, s: "b" }, { time: "5:30", price: 60, s: "b" }, { time: "6:00", price: 70, s: "b" }, { time: "6:30", price: 75, s: "b" }, { time: "7:00", price: 80, s: "b" }, { time: "17:00", price: 90, s: "b" }, { time: "17:30", price: 90, s: "b" }, { time: "18:00", price: 85, s: "b" }]
    }))
  },
  { id: 5, name: "PB House Bình Thạnh", address: "200 Xô Viết Nghệ Tĩnh, Bình Thạnh", price: 35000, priceRange: [35000, 50000], distance: 5.1, rating: 4.3, reviews: 67, courts: 4, available: true, lat: 10.795, lng: 106.710, tags: ["Outdoor", "Lights"], amenities: ["Lights", "Water", "Parking"], hours: "5:00 AM - 9:30 PM", phone: "0977 111 222",
    availability: [
      { court: "Court 1", type: "Outdoor", note: "", slots: [{ time: "5:00", price: 35, s: "o" }, { time: "5:30", price: 35, s: "o" }, { time: "6:00", price: 40, s: "o" }, { time: "17:00", price: 50, s: "b" }, { time: "17:30", price: 50, s: "f" }] },
      { court: "Court 2", type: "Outdoor", note: "", slots: [{ time: "5:00", price: 35, s: "o" }, { time: "5:30", price: 35, s: "o" }, { time: "6:00", price: 40, s: "f" }, { time: "17:00", price: 50, s: "o" }, { time: "17:30", price: 50, s: "o" }] },
      { court: "Court 3", type: "Outdoor", note: "", slots: [{ time: "5:00", price: 35, s: "b" }, { time: "5:30", price: 35, s: "b" }, { time: "6:00", price: 40, s: "o" }, { time: "17:00", price: 50, s: "o" }, { time: "17:30", price: 50, s: "b" }] },
      { court: "Court 4", type: "Outdoor", note: "Best lights", slots: [{ time: "5:00", price: 35, s: "o" }, { time: "5:30", price: 35, s: "o" }, { time: "6:00", price: 40, s: "o" }, { time: "17:00", price: 50, s: "f" }, { time: "17:30", price: 50, s: "o" }] },
    ]
  },
  { id: 6, name: "District 7 Pickleball", address: "45 Nguyễn Thị Thập, Q7", price: 42000, priceRange: [42000, 65000], distance: 7.2, rating: 4.7, reviews: 198, courts: 6, available: true, lat: 10.738, lng: 106.700, tags: ["Indoor", "Lights", "Parking"], amenities: ["Parking", "Lights", "Water", "Locker"], hours: "5:30 AM - 10:00 PM", phone: "0966 333 444",
    availability: Array.from({ length: 6 }, (_, i) => ({
      court: `Court ${i + 1}`, type: "Indoor", note: i === 2 ? "New surface" : "",
      slots: [
        { time: "5:30", price: 42, s: i % 2 === 0 ? "o" : "b" }, { time: "6:00", price: 48, s: "o" },
        { time: "6:30", price: 50, s: i < 3 ? "f" : "o" }, { time: "7:00", price: 55, s: i < 2 ? "b" : "o" },
        { time: "17:00", price: 65, s: i % 3 === 0 ? "b" : "f" }, { time: "17:30", price: 65, s: "b" }, { time: "18:00", price: 60, s: "o" },
      ]
    }))
  },
  { id: 7, name: "Phú Mỹ Hưng Sports", address: "12 Tôn Dật Tiên, Q7", price: 55000, priceRange: [55000, 80000], distance: 8.0, rating: 4.4, reviews: 112, courts: 5, available: true, lat: 10.729, lng: 106.702, tags: ["Outdoor", "Pool", "Gym"], amenities: ["Pool", "Gym", "Parking", "Cafe", "Shower"], hours: "6:00 AM - 9:00 PM", phone: "0955 444 555",
    availability: Array.from({ length: 5 }, (_, i) => ({
      court: `Court ${i + 1}`, type: "Outdoor", note: "",
      slots: [{ time: "6:00", price: 55, s: i < 3 ? "o" : "b" }, { time: "6:30", price: 55, s: "o" }, { time: "7:00", price: 65, s: i === 2 ? "f" : "o" }, { time: "17:00", price: 80, s: i > 2 ? "b" : "o" }, { time: "17:30", price: 75, s: "o" }]
    }))
  },
  { id: 8, name: "GoPickle Tân Bình", address: "88 Cộng Hòa, Tân Bình", price: 38000, priceRange: [38000, 50000], distance: 6.5, rating: 4.2, reviews: 54, courts: 3, available: true, lat: 10.805, lng: 106.655, tags: ["Indoor"], amenities: ["Water", "Parking"], hours: "6:00 AM - 9:00 PM", phone: "0944 555 666",
    availability: Array.from({ length: 3 }, (_, i) => ({
      court: `Court ${i + 1}`, type: "Indoor", note: "",
      slots: [{ time: "6:00", price: 38, s: "o" }, { time: "6:30", price: 38, s: i === 1 ? "b" : "o" }, { time: "7:00", price: 42, s: "o" }, { time: "17:00", price: 50, s: "f" }, { time: "17:30", price: 50, s: i === 0 ? "b" : "o" }]
    }))
  },
  { id: 9, name: "Court Kings Gò Vấp", address: "320 Nguyễn Oanh, Gò Vấp", price: 32000, priceRange: [32000, 45000], distance: 9.1, rating: 4.1, reviews: 38, courts: 4, available: true, lat: 10.838, lng: 106.670, tags: ["Outdoor", "Lights"], amenities: ["Lights", "Water"], hours: "5:30 AM - 9:30 PM", phone: "0933 666 777",
    availability: Array.from({ length: 4 }, (_, i) => ({
      court: `Court ${i + 1}`, type: "Outdoor", note: i === 2 ? "Maintenance" : "",
      slots: i === 2 ? [] : [{ time: "5:30", price: 32, s: "o" }, { time: "6:00", price: 35, s: "o" }, { time: "6:30", price: 38, s: "o" }, { time: "7:00", price: 40, s: i === 0 ? "f" : "o" }, { time: "17:00", price: 45, s: "f" }, { time: "17:30", price: 45, s: "o" }]
    }))
  },
  { id: 10, name: "Ace Pickleball D1", address: "55 Nguyễn Bỉnh Khiêm, Q1", price: 70000, priceRange: [70000, 100000], distance: 1.5, rating: 4.8, reviews: 289, courts: 4, available: true, lat: 10.787, lng: 106.705, tags: ["Indoor", "AC", "Premium"], amenities: ["AC", "Pro Shop", "Cafe", "Coaching", "Shower", "Locker", "Towel"], hours: "5:00 AM - 11:00 PM", phone: "0922 888 999",
    availability: [
      { court: "Premium 1", type: "Indoor", note: "VIP", slots: [{ time: "5:00", price: 70, s: "o" }, { time: "5:30", price: 70, s: "f" }, { time: "6:00", price: 80, s: "b" }, { time: "6:30", price: 85, s: "b" }, { time: "17:00", price: 100, s: "b" }, { time: "17:30", price: 100, s: "f" }, { time: "18:00", price: 95, s: "o" }] },
      { court: "Premium 2", type: "Indoor", note: "VIP", slots: [{ time: "5:00", price: 70, s: "b" }, { time: "5:30", price: 70, s: "o" }, { time: "6:00", price: 80, s: "o" }, { time: "6:30", price: 85, s: "b" }, { time: "17:00", price: 100, s: "f" }, { time: "17:30", price: 100, s: "b" }, { time: "18:00", price: 95, s: "o" }] },
      { court: "Premium 3", type: "Indoor", note: "", slots: [{ time: "5:00", price: 70, s: "o" }, { time: "5:30", price: 70, s: "o" }, { time: "6:00", price: 80, s: "f" }, { time: "6:30", price: 85, s: "o" }, { time: "17:00", price: 100, s: "o" }, { time: "17:30", price: 100, s: "o" }, { time: "18:00", price: 95, s: "b" }] },
      { court: "Premium 4", type: "Indoor", note: "", slots: [{ time: "5:00", price: 70, s: "o" }, { time: "5:30", price: 70, s: "b" }, { time: "6:00", price: 80, s: "o" }, { time: "6:30", price: 85, s: "o" }, { time: "17:00", price: 100, s: "b" }, { time: "17:30", price: 100, s: "o" }, { time: "18:00", price: 95, s: "f" }] },
    ]
  },
];

const DATES = (() => {
  const d = [], days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"], months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  for (let i = 0; i < 14; i++) { const dt = new Date(2026, 3, 1 + i); d.push({ label: days[dt.getDay()], date: `${months[dt.getMonth()]} ${dt.getDate()}` }); }
  return d;
})();

const DURATIONS = ["1h", "1h30", "2h", "2h30", "3h"];
const TIMES = ["Morning", "Noon", "Afternoon", "Night"];
const formatPrice = (p) => typeof p === "number" && p > 1000 ? `${(p/1000).toFixed(0)}k` : `${p}k`;
const AMENITY_ICONS = { Parking:"🅿️", Water:"💧", Locker:"🔒", Lights:"💡", AC:"❄️", "Pro Shop":"🛍️", Cafe:"☕", Coaching:"🎓", Shower:"🚿", Pool:"🏊", Gym:"🏋️", Towel:"🧺" };

// Icons
const I = {
  Search: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Pin: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Heart: ({f}) => <svg width="18" height="18" viewBox="0 0 24 24" fill={f?"currentColor":"none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  Star: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Back: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  Sun: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  Moon: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  Court: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="2" y1="12" x2="22" y2="12"/></svg>,
  X: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Locate: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/><circle cx="12" cy="12" r="9"/></svg>,
  Phone: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
  Clock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Share: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  Dir: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>,
};

export default function CourtMapApp() {
  const [dark, setDark] = useState(true);
  const [screen, setScreen] = useState("search");
  const [saved, setSaved] = useState(new Set([4, 2]));
  const [searchAnim, setSearchAnim] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [detailVenue, setDetailVenue] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState(new Set()); // "courtName|time" keys
  const [sortBy, setSortBy] = useState("distance");
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [selectedTime, setSelectedTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailTab, setDetailTab] = useState("avail");

  const toggleSaved = (id, e) => { if (e) e.stopPropagation(); setSaved(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const openDetail = (v) => { setDetailVenue(v); setSelectedSlots(new Set()); setDetailTab("avail"); setTimeout(() => setDetailVisible(true), 10); };
  const closeDetail = () => { setDetailVisible(false); setTimeout(() => setDetailVenue(null), 300); };

  const toggleSlot = (court, time) => {
    const key = `${court}|${time}`;
    setSelectedSlots(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  const sortedVenues = [...VENUES].sort((a, b) => sortBy === "price" ? a.price - b.price : sortBy === "rating" ? b.rating - a.rating : a.distance - b.distance);
  const savedVenues = VENUES.filter(v => saved.has(v.id));
  const handleSearch = () => { setSearchAnim(true); setTimeout(() => { setScreen("results"); setSearchAnim(false); }, 400); };

  const t = dark ? {
    bg:"#0a0a0a",bgCard:"#161616",bgSurface:"#111",bgInput:"#1a1a1a",border:"#2a2a2a",
    text:"#f0f0f0",textSec:"#888",textMuted:"#555",accent:"#b8f200",accentBg:"rgba(184,242,0,0.08)",accentBgStrong:"rgba(184,242,0,0.15)",
    red:"#ff4757",orange:"#ffa502",green:"#2ed573",shadow:"0 2px 20px rgba(0,0,0,0.5)",shadowSm:"0 1px 8px rgba(0,0,0,0.3)",
    pillBg:"rgba(20,20,20,0.92)",pillBorder:"#333",sheetBg:"#111",overlay:"rgba(0,0,0,0.7)",
  } : {
    bg:"#f5f5f7",bgCard:"#fff",bgSurface:"#fff",bgInput:"#f0f0f2",border:"#e0e0e0",
    text:"#1a1a1a",textSec:"#666",textMuted:"#999",accent:"#7cb300",accentBg:"rgba(124,179,0,0.06)",accentBgStrong:"rgba(124,179,0,0.12)",
    red:"#e74c3c",orange:"#e67e22",green:"#27ae60",shadow:"0 2px 20px rgba(0,0,0,0.08)",shadowSm:"0 1px 8px rgba(0,0,0,0.04)",
    pillBg:"rgba(255,255,255,0.95)",pillBorder:"#ddd",sheetBg:"#fff",overlay:"rgba(0,0,0,0.4)",
  };

  // Venue Card
  const VenueCard = ({ venue, compact }) => (
    <div onClick={() => openDetail(venue)} style={{ background:t.bgCard,borderRadius:16,overflow:"hidden",border:`1px solid ${t.border}`,cursor:"pointer",transition:"all 0.2s",...(compact?{}:{marginBottom:12}) }}>
      <div style={{ height:compact?100:140,background:`linear-gradient(135deg,${t.bgSurface},${t.bgInput})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:compact?32:44,position:"relative" }}>
        🏓
        <button onClick={e=>toggleSaved(venue.id,e)} style={{ position:"absolute",top:8,right:8,width:34,height:34,borderRadius:"50%",background:"rgba(0,0,0,0.45)",backdropFilter:"blur(8px)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:saved.has(venue.id)?t.red:"#fff" }}><I.Heart f={saved.has(venue.id)}/></button>
        <div style={{ position:"absolute",bottom:8,left:8,background:t.accent,color:"#000",fontWeight:700,fontSize:13,padding:"4px 10px",borderRadius:8 }}>{formatPrice(venue.price)}/h</div>
        {!venue.available && <div style={{ position:"absolute",bottom:8,right:8,background:t.red,color:"#fff",fontWeight:700,fontSize:11,padding:"3px 8px",borderRadius:6 }}>Fully booked</div>}
      </div>
      <div style={{ padding:compact?"10px 12px":"14px 16px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8 }}>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontWeight:700,fontSize:compact?14:16,color:t.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{venue.name}</div>
            <div style={{ fontSize:12,color:t.textSec,marginTop:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{venue.address}</div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:4,background:t.accentBg,padding:"4px 8px",borderRadius:8,flexShrink:0 }}>
            <span style={{color:t.accent}}><I.Star/></span><span style={{fontWeight:700,fontSize:13,color:t.text}}>{venue.rating}</span>
            <span style={{fontSize:11,color:t.textSec}}>({venue.reviews})</span>
          </div>
        </div>
        {!compact && <div style={{ display:"flex",gap:12,marginTop:10 }}>
          <span style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:t.textSec}}><I.Pin/> {venue.distance} km</span>
          <span style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:t.textSec}}><I.Court/> {venue.courts} courts</span>
        </div>}
        {!compact && venue.tags.length > 0 && <div style={{ display:"flex",gap:6,marginTop:8,flexWrap:"wrap" }}>
          {venue.tags.slice(0,4).map(tag=><span key={tag} style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:t.accentBg,color:t.accent,fontWeight:600,border:`1px solid ${t.accentBgStrong}`}}>{tag}</span>)}
        </div>}
      </div>
    </div>
  );

  // ── BOTTOM SHEET ──
  const Sheet = () => {
    if (!detailVenue) return null;
    const v = detailVenue;
    const selArr = [...selectedSlots].map(k => { const [c,ti] = k.split("|"); const crt = v.availability.find(a=>a.court===c); const sl = crt?.slots.find(s=>s.time===ti); return { court:c, time:ti, price:sl?.price||0 }; });
    const totalPrice = selArr.reduce((s,x)=>s+x.price,0);

    return (<>
      <div onClick={closeDetail} style={{ position:"fixed",inset:0,background:t.overlay,zIndex:300,opacity:detailVisible?1:0,transition:"opacity 0.3s",pointerEvents:detailVisible?"auto":"none" }}/>
      <div style={{ position:"fixed",bottom:0,left:0,right:0,maxWidth:430,margin:"0 auto",background:t.sheetBg,borderRadius:"24px 24px 0 0",zIndex:301,maxHeight:"92vh",display:"flex",flexDirection:"column",transform:detailVisible?"translateY(0)":"translateY(100%)",transition:"transform 0.35s cubic-bezier(0.32,0.72,0,1)",boxShadow:"0 -8px 40px rgba(0,0,0,0.3)" }}>
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 6px"}}><div style={{width:40,height:4,borderRadius:2,background:t.textMuted,opacity:0.4}}/></div>
        <div style={{ flex:1,overflowY:"auto",overflowX:"hidden" }}>
          {/* Photos */}
          <div style={{display:"flex",gap:8,padding:"8px 16px 12px",overflowX:"auto"}}>
            {[0,1,2,3].map(i=><div key={i} style={{minWidth:i===0?200:130,height:130,borderRadius:14,flexShrink:0,background:`linear-gradient(${135+i*30}deg,${t.bgSurface},${t.bgInput},${t.bgCard})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,border:`1px solid ${t.border}`}}>{["🏓","🏸","🎾","🏆"][i]}</div>)}
          </div>

          {/* Header */}
          <div style={{padding:"4px 20px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <h2 style={{fontSize:21,fontWeight:800,color:t.text,margin:0,lineHeight:1.2}}>{v.name}</h2>
                <div style={{fontSize:13,color:t.textSec,marginTop:6,display:"flex",alignItems:"center",gap:6}}><I.Pin/> {v.address}</div>
              </div>
              <div style={{display:"flex",gap:8,marginLeft:12,flexShrink:0}}>
                <button onClick={e=>toggleSaved(v.id,e)} style={{width:40,height:40,borderRadius:12,background:t.bgCard,border:`1px solid ${t.border}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:saved.has(v.id)?t.red:t.textSec}}><I.Heart f={saved.has(v.id)}/></button>
                <button style={{width:40,height:40,borderRadius:12,background:t.bgCard,border:`1px solid ${t.border}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:t.textSec}}><I.Share/></button>
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:14,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:4,background:t.accentBg,padding:"6px 12px",borderRadius:10}}><span style={{color:t.accent}}><I.Star/></span><span style={{fontWeight:700,fontSize:14,color:t.text}}>{v.rating}</span><span style={{fontSize:12,color:t.textSec}}>({v.reviews})</span></div>
              <div style={{display:"flex",alignItems:"center",gap:4,background:t.bgCard,padding:"6px 12px",borderRadius:10,border:`1px solid ${t.border}`}}><span style={{color:t.textSec}}><I.Court/></span><span style={{fontSize:13,fontWeight:600,color:t.text}}>{v.courts} courts</span></div>
              <div style={{display:"flex",alignItems:"center",gap:4,background:t.bgCard,padding:"6px 12px",borderRadius:10,border:`1px solid ${t.border}`}}><span style={{color:t.textSec}}><I.Pin/></span><span style={{fontSize:13,fontWeight:600,color:t.text}}>{v.distance} km</span></div>
            </div>
            <div style={{marginTop:14,display:"flex",alignItems:"baseline",gap:6}}>
              <span style={{fontSize:24,fontWeight:800,color:t.accent}}>{formatPrice(v.priceRange[0])}</span>
              <span style={{fontSize:14,color:t.textSec}}>to {formatPrice(v.priceRange[1])}/hour</span>
            </div>
          </div>

          {/* Tabs */}
          <div style={{display:"flex",borderBottom:`1px solid ${t.border}`,padding:"0 20px"}}>
            {[{key:"avail",label:"Availability"},{key:"info",label:"Info"}].map(tab=>(
              <button key={tab.key} onClick={()=>setDetailTab(tab.key)} style={{flex:1,padding:"12px 0",background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",color:detailTab===tab.key?t.accent:t.textSec,borderBottom:detailTab===tab.key?`2px solid ${t.accent}`:"2px solid transparent",transition:"all 0.15s"}}>{tab.label}</button>
            ))}
          </div>

          <div style={{padding:"16px 0 140px"}}>
            {/* ── AVAILABILITY TAB ── */}
            {detailTab === "avail" && (<div>
              {/* Legend */}
              <div style={{fontSize:11,color:t.textSec,padding:"0 20px 14px",display:"flex",gap:14,flexWrap:"wrap"}}>
                <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:4,background:t.green,display:"inline-block"}}/> Open</span>
                <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:4,background:t.orange,display:"inline-block"}}/> Few left</span>
                <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:4,background:t.textMuted,display:"inline-block"}}/> Booked</span>
                <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:3,border:`2px solid ${t.accent}`,display:"inline-block"}}/> Selected</span>
              </div>

              {/* Court rows */}
              {v.availability.map((crt, ci) => {
                const hasSlots = crt.slots.length > 0;
                const openCount = crt.slots.filter(s => s.s !== "b").length;
                return (
                  <div key={ci} style={{
                    padding:"12px 0",borderBottom:`1px solid ${t.border}`,
                    opacity: !hasSlots ? 0.4 : 1,
                  }}>
                    {/* Court header */}
                    <div style={{padding:"0 20px 8px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontWeight:700,fontSize:14,color:t.text}}>{crt.court}</span>
                        <span style={{fontSize:11,color:t.textSec,background:t.bgCard,padding:"2px 8px",borderRadius:6,border:`1px solid ${t.border}`}}>{crt.type}</span>
                        {crt.note && <span style={{fontSize:10,color:crt.note==="Maintenance"||crt.note==="Under maintenance"?t.orange:t.accent,fontWeight:600}}>{crt.note}</span>}
                      </div>
                      {hasSlots && <span style={{fontSize:11,color:openCount>0?t.green:t.red,fontWeight:600}}>{openCount} open</span>}
                      {!hasSlots && <span style={{fontSize:11,color:t.orange,fontWeight:600}}>Unavailable</span>}
                    </div>
                    {/* Time slots row */}
                    {hasSlots && (
                      <div style={{display:"flex",gap:6,overflowX:"auto",paddingLeft:20,paddingRight:20,paddingBottom:4}}>
                        {crt.slots.map((slot, si) => {
                          const key = `${crt.court}|${slot.time}`;
                          const isSel = selectedSlots.has(key);
                          const isBooked = slot.s === "b";
                          const isFew = slot.s === "f";
                          return (
                            <button key={si} onClick={() => !isBooked && toggleSlot(crt.court, slot.time)} disabled={isBooked} style={{
                              minWidth:68,padding:"8px 10px",borderRadius:10,border:"none",cursor:isBooked?"default":"pointer",
                              background:isSel?t.accent:isBooked?t.bgInput:t.bgCard,
                              opacity:isBooked?0.35:1,fontFamily:"inherit",transition:"all 0.15s",textAlign:"center",flexShrink:0,
                              outline:isSel?"none":`1px solid ${isFew?t.orange:t.border}`,
                              boxShadow:isSel?`0 2px 8px ${t.accent}44`:"none",
                            }}>
                              <div style={{fontSize:13,fontWeight:700,color:isSel?"#000":t.text,letterSpacing:-0.3}}>{slot.time}</div>
                              <div style={{fontSize:11,fontWeight:600,color:isSel?"rgba(0,0,0,0.6)":t.accent,marginTop:1}}>{slot.price}k</div>
                              {isFew && !isSel && <div style={{width:6,height:6,borderRadius:3,background:t.orange,margin:"3px auto 0"}}/>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>)}

            {/* ── INFO TAB ── */}
            {detailTab === "info" && (<div style={{padding:"0 20px"}}>
              <div style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><span style={{color:t.accent}}><I.Clock/></span><span style={{fontSize:14,color:t.text,fontWeight:600}}>{v.hours}</span></div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><span style={{color:t.accent}}><I.Phone/></span><span style={{fontSize:14,color:t.text,fontWeight:600}}>{v.phone}</span></div>
                <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{color:t.accent}}><I.Pin/></span><span style={{fontSize:14,color:t.text}}>{v.address}</span></div>
              </div>
              <div style={{fontSize:12,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:t.textMuted,marginBottom:12}}>Amenities</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:20}}>
                {v.amenities.map(a=><div key={a} style={{padding:"12px 8px",borderRadius:12,background:t.bgCard,textAlign:"center",border:`1px solid ${t.border}`}}><div style={{fontSize:20,marginBottom:4}}>{AMENITY_ICONS[a]||"✨"}</div><div style={{fontSize:11,fontWeight:600,color:t.text}}>{a}</div></div>)}
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {v.tags.map(tag=><span key={tag} style={{fontSize:12,padding:"6px 14px",borderRadius:20,background:t.accentBg,color:t.accent,fontWeight:600,border:`1px solid ${t.accentBgStrong}`}}>{tag}</span>)}
              </div>
            </div>)}
          </div>
        </div>

        {/* CTA */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"12px 20px 28px",background:`linear-gradient(transparent,${t.sheetBg} 25%)`,display:"flex",gap:10,alignItems:"center"}}>
          <button style={{width:50,height:50,borderRadius:14,background:t.bgCard,border:`1px solid ${t.border}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:t.accent,flexShrink:0}}><I.Dir/></button>
          <button style={{
            flex:1,padding:"16px 20px",borderRadius:14,fontFamily:"inherit",
            background:selArr.length>0?t.accent:t.textMuted,color:selArr.length>0?"#000":"#fff",
            fontWeight:800,fontSize:14,border:"none",cursor:selArr.length>0?"pointer":"default",
            letterSpacing:0.3,boxShadow:selArr.length>0?`0 4px 20px ${t.accent}55`:"none",transition:"all 0.2s",
          }}>
            {selArr.length === 0 && "SELECT COURT & TIME"}
            {selArr.length === 1 && `BOOK ${selArr[0].court} at ${selArr[0].time} · ${selArr[0].price}k`}
            {selArr.length > 1 && `BOOK ${selArr.length} SLOTS · ${totalPrice}k`}
          </button>
        </div>
      </div>
    </>);
  };

  // ── Screens (unchanged logic) ──
  const SearchScreen = () => (
    <div style={{minHeight:"100%",padding:"0 0 100px",animation:"fadeIn 0.3s ease"}}>
      <div style={{padding:"50px 20px 30px",textAlign:"center",background:`linear-gradient(180deg,${t.accentBg} 0%,transparent 100%)`}}>
        <div style={{fontFamily:"'Archivo Black','Impact',sans-serif",fontSize:28,fontWeight:900,letterSpacing:-1,color:t.text}}><span style={{color:t.accent}}>COURT</span>MAP</div>
        <div style={{fontSize:13,color:t.textSec,marginTop:4,letterSpacing:1}}>1,976 PICKLEBALL COURTS · VIETNAM</div>
      </div>
      <div style={{padding:"0 20px"}}>
        <div style={{background:t.bgCard,borderRadius:14,padding:"16px 18px",border:`1px solid ${t.border}`,marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
          <span style={{color:t.accent}}><I.Pin/></span>
          <input type="text" placeholder="Search area or venue name..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} style={{flex:1,background:"transparent",border:"none",outline:"none",color:t.text,fontSize:15,fontFamily:"inherit"}}/>
          {searchQuery && <button onClick={()=>setSearchQuery("")} style={{background:"none",border:"none",color:t.textMuted,cursor:"pointer",padding:2}}><I.X/></button>}
        </div>
        <SL label="When" t={t}/>
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4,marginBottom:20}}>
          {DATES.slice(0,7).map((d,i)=><button key={i} onClick={()=>setSelectedDate(i)} style={{...chip(t,i===selectedDate),flexDirection:"column",minWidth:70,padding:"10px 14px"}}><span style={{fontSize:11,opacity:0.7}}>{d.label}</span><span style={{fontSize:14,fontWeight:700}}>{d.date}</span></button>)}
        </div>
        <SL label="Duration" t={t}/>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>{DURATIONS.map((d,i)=><button key={d} onClick={()=>setSelectedDuration(i)} style={chip(t,i===selectedDuration)}>{d}</button>)}</div>
        <SL label="Time of Day" t={t}/>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>{TIMES.map((ti,i)=><button key={ti} onClick={()=>setSelectedTime(i)} style={chip(t,i===selectedTime)}>{ti}</button>)}</div>
        <div style={{background:t.bgCard,borderRadius:14,padding:"16px 18px",border:`1px solid ${t.border}`,marginBottom:24,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{color:t.accent}}><I.Locate/></span><div><div style={{fontSize:14,fontWeight:600,color:t.text}}>Near me</div><div style={{fontSize:12,color:t.textSec}}>Within 10 km radius</div></div></div>
          <div style={{width:44,height:26,borderRadius:13,background:t.accent,position:"relative",cursor:"pointer"}}><div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:3,right:3,boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/></div>
        </div>
      </div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,maxWidth:430,margin:"0 auto",padding:"12px 20px 28px",zIndex:100,background:`linear-gradient(transparent,${t.bg} 30%)`}}>
        <button onClick={handleSearch} style={{width:"100%",padding:"16px 20px",borderRadius:14,background:t.accent,color:"#000",fontWeight:800,fontSize:16,border:"none",cursor:"pointer",letterSpacing:0.5,display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:`0 4px 20px ${t.accent}55`,fontFamily:"inherit",transform:searchAnim?"scale(0.96)":"scale(1)",transition:"transform 0.2s"}}><I.Search/> SEARCH COURTS</button>
      </div>
    </div>
  );

  const ResultsScreen = () => (
    <div style={{minHeight:"100%",animation:"slideUp 0.35s ease"}}>
      <div style={{position:"sticky",top:0,zIndex:50,background:t.bg,borderBottom:`1px solid ${t.border}`,padding:"12px 16px 10px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <button onClick={()=>setScreen("search")} style={{background:"none",border:"none",color:t.text,cursor:"pointer",padding:4,display:"flex"}}><I.Back/></button>
          <div style={{textAlign:"center"}}><div style={{fontSize:15,fontWeight:700,color:t.text}}>{DATES[selectedDate].date} · {DURATIONS[selectedDuration]} · {TIMES[selectedTime]}</div><div style={{fontSize:12,color:t.textSec}}>{sortedVenues.length} courts found</div></div>
          <button onClick={()=>setScreen("search")} style={{background:"none",border:"none",color:t.accent,cursor:"pointer",fontSize:13,fontWeight:600,padding:4}}>Edit</button>
        </div>
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:2}}>
          {["distance","price","rating"].map(s=><button key={s} onClick={()=>setSortBy(s)} style={mini(t,sortBy===s)}>{s==="distance"?"Nearest":s==="price"?"Cheapest":"Top rated"}</button>)}
        </div>
      </div>
      <div style={{padding:"12px 16px 120px"}}>{sortedVenues.map(v=><VenueCard key={v.id} venue={v}/>)}</div>
      <Pills screen={screen} setScreen={setScreen} n={saved.size} t={t}/>
    </div>
  );

  const MapScreen = () => (
    <div style={{height:"100%",position:"relative",animation:"fadeIn 0.3s ease"}}>
      <div style={{position:"absolute",inset:0,overflow:"hidden",background:dark?"radial-gradient(ellipse at 40% 50%,#1a2235,#0d1117)":"radial-gradient(ellipse at 40% 50%,#dde5f0,#c8d4e4)"}}>
        {Array.from({length:20}).map((_,i)=><div key={`h${i}`} style={{position:"absolute",left:0,right:0,top:`${i*5}%`,height:1,background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.05)"}}/>)}
        {Array.from({length:15}).map((_,i)=><div key={`v${i}`} style={{position:"absolute",top:0,bottom:0,left:`${i*7}%`,width:1,background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.05)"}}/>)}
        <div style={{position:"absolute",top:"35%",left:"-10%",width:"120%",height:40,background:dark?"rgba(30,60,120,0.3)":"rgba(100,150,220,0.2)",transform:"rotate(-8deg)",borderRadius:20}}/>
        {VENUES.map(v=>{const x=10+((v.lng-106.65)/0.1)*80,y=10+((10.84-v.lat)/0.12)*80,sel=selectedVenue?.id===v.id;
          return <button key={v.id} onClick={()=>setSelectedVenue(v)} style={{position:"absolute",left:`${Math.min(88,Math.max(5,x))}%`,top:`${Math.min(85,Math.max(5,y))}%`,transform:`translate(-50%,-50%) ${sel?"scale(1.25)":"scale(1)"}`,background:sel?t.accent:v.available?"#fff":t.textMuted,color:"#000",border:sel?`2px solid ${t.accent}`:"2px solid transparent",borderRadius:10,padding:"5px 10px",fontWeight:800,fontSize:12,cursor:"pointer",zIndex:sel?20:10,boxShadow:sel?`0 4px 16px ${t.accent}66`:"0 2px 8px rgba(0,0,0,0.3)",transition:"all 0.2s",whiteSpace:"nowrap",fontFamily:"inherit"}}>{formatPrice(v.price)}</button>;
        })}
      </div>
      <div style={{position:"absolute",top:0,left:0,right:0,padding:"12px 16px",zIndex:30,display:"flex",gap:8}}>
        <div style={{flex:1,background:t.pillBg,backdropFilter:"blur(12px)",borderRadius:12,padding:"12px 16px",border:`1px solid ${t.pillBorder}`,display:"flex",alignItems:"center",gap:10}}><span style={{color:t.textSec}}><I.Search/></span><span style={{fontSize:14,color:t.textSec}}>Search area...</span></div>
      </div>
      {selectedVenue && <div style={{position:"absolute",bottom:80,left:12,right:12,zIndex:30,animation:"slideUp 0.25s ease"}}><VenueCard venue={selectedVenue} compact/></div>}
      <Pills screen={screen} setScreen={setScreen} n={saved.size} t={t}/>
    </div>
  );

  const SavedScreen = () => (
    <div style={{minHeight:"100%",animation:"fadeIn 0.3s ease"}}>
      <div style={{position:"sticky",top:0,zIndex:50,background:t.bg,borderBottom:`1px solid ${t.border}`,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <button onClick={()=>setScreen("results")} style={{background:"none",border:"none",color:t.text,cursor:"pointer",padding:4}}><I.Back/></button>
        <div style={{fontSize:16,fontWeight:700,color:t.text}}>Saved Courts</div><div style={{width:30}}/>
      </div>
      <div style={{padding:"12px 16px 120px"}}>
        {savedVenues.length===0?<div style={{textAlign:"center",padding:"60px 20px",color:t.textSec}}><div style={{fontSize:48,marginBottom:16}}>💚</div><div style={{fontSize:16,fontWeight:600,color:t.text,marginBottom:8}}>No saved courts yet</div><div style={{fontSize:14}}>Tap the heart on any court to save it here</div></div>
        :savedVenues.map(v=><VenueCard key={v.id} venue={v}/>)}
      </div>
      <Pills screen={screen} setScreen={setScreen} n={saved.size} t={t}/>
    </div>
  );

  return (
    <div style={{width:"100%",maxWidth:430,margin:"0 auto",height:"100vh",background:t.bg,color:t.text,fontFamily:"'DM Sans','Helvetica Neue',sans-serif",position:"relative",overflow:"hidden",transition:"background 0.3s,color 0.3s"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Archivo+Black&display=swap" rel="stylesheet"/>
      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:0;height:0}
        input::placeholder{color:${t.textMuted}}
      `}</style>
      <button onClick={()=>setDark(!dark)} style={{position:"fixed",top:12,right:12,zIndex:200,width:40,height:40,borderRadius:"50%",background:t.bgCard,border:`1px solid ${t.border}`,color:t.text,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:t.shadowSm}}>{dark?<I.Sun/>:<I.Moon/>}</button>
      <div style={{height:"100%",overflowY:"auto",overflowX:"hidden"}}>
        {screen==="search"&&<SearchScreen/>}{screen==="results"&&<ResultsScreen/>}{screen==="map"&&<MapScreen/>}{screen==="saved"&&<SavedScreen/>}
      </div>
      <Sheet/>
    </div>
  );
}

// Helpers
function SL({label,t}){return <div style={{fontSize:12,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:10,color:t.textMuted}}>{label}</div>;}
function Pills({screen,setScreen,n,t}){
  return <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",display:"flex",gap:10,zIndex:100}}>
    <button onClick={()=>setScreen(screen==="map"?"results":"map")} style={{padding:"12px 24px",borderRadius:50,background:screen==="map"?t.accent:t.pillBg,color:screen==="map"?"#000":t.text,border:screen==="map"?"none":`1px solid ${t.pillBorder}`,backdropFilter:"blur(12px)",fontWeight:700,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",gap:8,boxShadow:t.shadow,transition:"all 0.2s",fontFamily:"inherit"}}><I.Pin/> {screen==="map"?"List":"Map"}</button>
    <button onClick={()=>setScreen(screen==="saved"?"results":"saved")} style={{padding:"12px 24px",borderRadius:50,background:screen==="saved"?t.accent:t.pillBg,color:screen==="saved"?"#000":t.text,border:screen==="saved"?"none":`1px solid ${t.pillBorder}`,backdropFilter:"blur(12px)",fontWeight:700,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",gap:8,boxShadow:t.shadow,transition:"all 0.2s",position:"relative",fontFamily:"inherit"}}>
      <I.Heart f={false}/> Saved
      {n>0&&<span style={{position:"absolute",top:-4,right:-4,width:20,height:20,borderRadius:"50%",background:t.red,color:"#fff",fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{n}</span>}
    </button>
  </div>;
}
function chip(t,a){return{padding:"10px 18px",borderRadius:12,border:"none",background:a?t.accent:t.bgCard,color:a?"#000":t.text,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",flexShrink:0,outline:a?"none":`1px solid ${t.border}`};}
function mini(t,a){return{padding:"6px 14px",borderRadius:20,border:"none",background:a?t.accentBgStrong:t.bgCard,color:a?t.accent:t.textSec,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"inherit",outline:`1px solid ${a?t.accent:t.border}`,transition:"all 0.15s",flexShrink:0,whiteSpace:"nowrap"};}
