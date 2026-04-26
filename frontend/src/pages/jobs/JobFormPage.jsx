import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  JOB_CATEGORIES,
  PAY_TYPES,
  JOB_CATEGORY_KEYS,
  PAY_TYPE_KEYS,
} from "../../lib/jobConstants";
import LocationPicker, { saveLocation } from "../../components/jobs/LocationPicker";
import styles from "./JobFormPage.module.css";

export default function JobFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    business_name: "",
    address: "",
    lat: "",
    lng: "",
    pay_type: "hourly",
    pay_amount: "",
    category: "hall",
    starts_at: "",
    ends_at: "",
  });
  const [images, setImages] = useState([]);  // for edit mode
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showLocPicker, setShowLocPicker] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/api/jobs/${id}`).then((r) => {
      const j = r.data;
      setForm({
        title: j.title,
        description: j.description || "",
        business_name: j.business_name,
        address: j.address,
        lat: "",  // server doesn't return lat/lng directly; user may re-pick
        lng: "",
        pay_type: j.pay_type,
        pay_amount: String(j.pay_amount),
        category: j.category,
        starts_at: j.starts_at ? j.starts_at.slice(0, 16) : "",
        ends_at: j.ends_at ? j.ends_at.slice(0, 16) : "",
      });
      setImages(j.images || []);
    }).catch(() => setError("불러오기 실패"));
  }, [id, isEdit]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const payload = {
      title: form.title,
      description: form.description,
      business_name: form.business_name,
      address: form.address,
      pay_type: form.pay_type,
      pay_amount: Number(form.pay_amount),
      category: form.category,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    };

    // lat/lng required for create; optional for edit (only sent if both provided)
    const latNum = form.lat === "" ? null : Number(form.lat);
    const lngNum = form.lng === "" ? null : Number(form.lng);

    if (!isEdit && (latNum == null || lngNum == null)) {
      setError("위치(lat, lng)를 입력하거나 위치 선택 버튼을 사용하세요.");
      return;
    }
    if (latNum != null && lngNum != null) {
      payload.lat = latNum;
      payload.lng = lngNum;
    } else if ((latNum != null) !== (lngNum != null)) {
      setError("lat과 lng는 함께 입력해야 합니다.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/api/jobs/${id}`, payload);
        navigate(`/jobs/${id}`);
      } else {
        const res = await api.post("/api/jobs", payload);
        const newId = res.data.id;
        navigate(`/jobs/${newId}/edit`);  // go to edit so they can upload images
      }
    } catch (err) {
      setError(err.response?.data?.detail || "저장 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !isEdit) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.post(`/api/jobs/${id}/images`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImages((prev) => [...prev, res.data]);
    } catch (err) {
      setError(err.response?.data?.detail || "이미지 업로드 실패");
    }
    e.target.value = "";
  };

  const handleImageDelete = async (imageId) => {
    if (!confirm("이미지를 삭제하시겠습니까?")) return;
    await api.delete(`/api/jobs/${id}/images/${imageId}`);
    setImages((prev) => prev.filter((i) => i.id !== imageId));
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{isEdit ? "알바 수정" : "알바 등록"}</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>제목 *</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update({ title: e.target.value })}
            required
          />
        </label>

        <label className={styles.field}>
          <span>사업장명 *</span>
          <input
            type="text"
            value={form.business_name}
            onChange={(e) => update({ business_name: e.target.value })}
            required
          />
        </label>

        <label className={styles.field}>
          <span>주소 *</span>
          <input
            type="text"
            value={form.address}
            onChange={(e) => update({ address: e.target.value })}
            placeholder="서울 강남구 역삼동 123-45"
            required
          />
        </label>

        <div className={styles.locRow}>
          <label className={styles.field}>
            <span>위도 (lat) {isEdit ? "(변경 시에만 입력)" : "*"}</span>
            <input
              type="number"
              step="any"
              value={form.lat}
              onChange={(e) => update({ lat: e.target.value })}
              placeholder="37.5012"
              required={!isEdit}
            />
          </label>
          <label className={styles.field}>
            <span>경도 (lng) {isEdit ? "(변경 시에만 입력)" : "*"}</span>
            <input
              type="number"
              step="any"
              value={form.lng}
              onChange={(e) => update({ lng: e.target.value })}
              placeholder="127.0396"
              required={!isEdit}
            />
          </label>
          <button type="button" onClick={() => setShowLocPicker(true)} className={styles.locBtn}>
            지도/현재위치
          </button>
        </div>

        <div className={styles.payRow}>
          <label className={styles.field}>
            <span>급여 종류 *</span>
            <select value={form.pay_type} onChange={(e) => update({ pay_type: e.target.value })}>
              {PAY_TYPE_KEYS.map((k) => (
                <option key={k} value={k}>{PAY_TYPES[k]}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>금액 (원) *</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={form.pay_amount}
              onChange={(e) => update({ pay_amount: e.target.value })}
              required
            />
          </label>
          <label className={styles.field}>
            <span>카테고리 *</span>
            <select value={form.category} onChange={(e) => update({ category: e.target.value })}>
              {JOB_CATEGORY_KEYS.map((k) => (
                <option key={k} value={k}>{JOB_CATEGORIES[k]}</option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.dateRow}>
          <label className={styles.field}>
            <span>근무 시작 (선택)</span>
            <input
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => update({ starts_at: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span>근무 종료 (선택)</span>
            <input
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => update({ ends_at: e.target.value })}
            />
          </label>
        </div>

        <label className={styles.field}>
          <span>상세 설명 (Markdown)</span>
          <textarea
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
            rows={10}
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button type="button" onClick={() => navigate(-1)} className={styles.btn}>취소</button>
          <button type="submit" disabled={submitting} className={`${styles.btn} ${styles.primary}`}>
            {submitting ? "저장 중..." : (isEdit ? "수정" : "등록")}
          </button>
        </div>
      </form>

      {isEdit && (
        <section className={styles.imagesSection}>
          <h2 className={styles.sectionTitle}>이미지 ({images.length})</h2>
          <div className={styles.imageList}>
            {images.map((img) => (
              <div key={img.id} className={styles.imageItem}>
                <img src={img.stored_path} alt={img.original_name} />
                <button type="button" onClick={() => handleImageDelete(img.id)} className={styles.removeBtn}>
                  삭제
                </button>
              </div>
            ))}
            <label className={styles.uploadBox}>
              <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
              + 이미지 추가
            </label>
          </div>
        </section>
      )}

      {showLocPicker && (
        <LocationPicker
          initial={{ lat: form.lat ? Number(form.lat) : null, lng: form.lng ? Number(form.lng) : null }}
          onClose={() => setShowLocPicker(false)}
          onSave={(loc) => {
            update({ lat: String(loc.lat), lng: String(loc.lng) });
            saveLocation(loc);  // also save as user's default
            setShowLocPicker(false);
          }}
        />
      )}
    </div>
  );
}
