# CampusEat Python API

## 파일 구조

```text
CampusEat/
├── app.py                 # 서버 실행 진입점
├── backend/
│   ├── __init__.py
│   └── app.py             # Flask API, DB 연결, 샘플 데이터 생성
├── frontend/
│   ├── index.html         # 화면 마크업
│   ├── app.js             # 화면 상태, API 호출, 이벤트 처리
│   └── styles.css         # 화면 스타일
├── database/
│   └── campus_eat_init.sql # MySQL 스키마
├── requirements.txt       # Python 의존성
├── .env.example           # DB 접속 설정 예시
└── .env                   # 로컬 DB 접속 설정, Git 제외
```

서버는 `backend/app.py`의 API를 사용하고, 브라우저 화면은 `frontend/`의 정적 파일을 서빙합니다. 루트의 `app.py`는 실행 명령을 단순하게 유지하기 위한 진입점입니다.

## 1. MySQL 스키마 생성

```bash
mysql -u root -p < database/campus_eat_init.sql
```

## 2. Python 의존성 설치

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

## 3. DB 접속 정보 설정

```bash
cp .env.example .env
```

`.env` 파일의 `DB_USER`, `DB_PASSWORD` 값을 본인 MySQL 계정에 맞게 수정하거나, 실행할 때 환경변수로 넘기면 됩니다.

## 4. 서버 실행

```bash
.venv/bin/python app.py
```

브라우저에서 `http://127.0.0.1:5000`을 열면 기존 프론트가 Python API와 MySQL을 사용합니다.

DB의 `cafeteria` 테이블이 비어 있으면 서버 시작 시 샘플 식당, 메뉴, 픽업 슬롯을 자동으로 넣습니다.
