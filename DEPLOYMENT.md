# Chronicle Vercel 배포 가이드

## 🚀 Vercel 배포 설정

### 1. GitHub 저장소 생성 및 연결

```bash
# GitHub에서 새 저장소 생성 후
git remote add origin https://github.com/YOUR_USERNAME/chronicle-0.1.git
git push -u origin main
```

### 2. 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수들을 설정하세요:

#### 필수 환경 변수
```
DATABASE_URL=postgresql://username:password@host:port/database
OPENAI_API_KEY=sk-your-openai-api-key
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=your-random-secret-key
NODE_ENV=production
```

#### 선택적 환경 변수
```
VERCEL_URL=https://your-app-name.vercel.app
```

### 2. Vercel CLI 설치 및 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 루트에서 로그인
vercel login

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

### 3. GitHub 연동 (권장)

1. GitHub에 코드 푸시
2. Vercel 대시보드에서 GitHub 저장소 연결
3. 자동 배포 설정

### 4. 현재 제한사항

- **데이터 저장**: 현재 in-memory 저장소 사용 (서버 재시작 시 데이터 손실)
- **파일 업로드**: 로컬 파일 시스템 사용 (Vercel에서는 작동하지 않음)

### 5. 프로덕션 준비 필요사항

#### 데이터베이스 마이그레이션
```bash
# Vercel Postgres 또는 다른 클라우드 DB 사용
# 현재 Prisma 스키마는 있지만 사용하지 않음
```

#### 파일 저장소 마이그레이션
```bash
# AWS S3, Cloudinary, 또는 Vercel Blob 사용
# 현재는 로컬 파일 시스템 사용
```

### 6. 배포 후 확인사항

- [ ] 환경 변수 설정 확인
- [ ] OpenAI API 연결 테스트
- [ ] 기본 페이지 로딩 확인
- [ ] 채팅 기능 테스트
- [ ] 게시글 생성 테스트
- [ ] AI 기능 테스트

### 7. 문제 해결

#### 빌드 오류
```bash
# 로컬에서 빌드 테스트
npm run build
npm run type-check
```

#### 환경 변수 오류
- Vercel 대시보드에서 환경 변수 재설정
- `vercel env pull` 명령어로 로컬 확인

#### API 타임아웃
- Vercel Pro 플랜 필요 (무료 플랜은 10초 제한)
- 또는 API 로직 최적화

### 8. 모니터링

- Vercel 대시보드에서 함수 로그 확인
- OpenAI API 사용량 모니터링
- 에러 로그 추적


