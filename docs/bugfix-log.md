# 버그수정 로그

| 날짜 | 버그 | 원인 | 수정 내용 | 관련 파일 |
|------|------|------|-----------|-----------|
| 2026-04-26 | (Pre-emptive) JWT sub 디코딩 실패 | python-jose가 `sub` 클레임을 문자열로 검증 | `str(to_encode["sub"])` + `int(payload.get("sub"))` 변환 | `auth_service.py`, `deps.py` |
| 2026-04-26 | (Pre-emptive) 로그인 리다이렉트 루프 | 401 인터셉터가 auth 엔드포인트도 처리 | `/api/auth/` URL 제외 + 이미 로그인 시 리다이렉트 | `api.js`, `LoginPage.jsx` |
| 2026-04-26 | (Pre-emptive) UPLOAD_DIR 빈 문자열 | `Path("")`가 CWD로 해석되어 소스 디렉토리를 uploads로 착각 | `.strip()` 후 falsy 체크 | `main.py`, `routers/files.py` |
| 2026-04-26 | (Pre-emptive) /uploads 서빙 404 | StaticFiles mount가 Docker VOLUME과 충돌 | 명시적 API 라우트 사용 | `main.py` |
| 2026-04-26 | (Pre-emptive) Vite dev에서 이미지가 HTML로 응답 | 프록시 누락 | `/api`, `/uploads`, `/health` 프록시 설정 | `vite.config.js` |
