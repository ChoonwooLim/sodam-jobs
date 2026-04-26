export const JOB_CATEGORIES = {
  hall: "홀서빙",
  kitchen: "주방",
  cvs: "편의점",
  cafe: "카페",
  delivery: "배달",
  etc: "기타",
};

export const JOB_CATEGORY_KEYS = Object.keys(JOB_CATEGORIES);

export const PAY_TYPES = {
  hourly: "시급",
  daily: "일급",
  monthly: "월급",
};

export const PAY_TYPE_KEYS = Object.keys(PAY_TYPES);

export const JOB_STATUS_LABELS = {
  active: "모집 중",
  closed: "마감",
  expired: "만료",
};

export const formatKRW = (amount) => {
  if (amount == null) return "";
  return amount.toLocaleString("ko-KR") + "원";
};

export const formatDistance = (distance_m) => {
  if (distance_m == null) return "";
  if (distance_m < 1000) return `${Math.round(distance_m)}m`;
  return `${(distance_m / 1000).toFixed(1)}km`;
};
