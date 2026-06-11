# NewsAutoTikTok

Aplicație de automatizare pentru redacții de presă: preia știri din RSS, generează script video, subtitrări, voice-over și clipuri verticale TikTok, apoi publică pe conturi oficiale conectate prin OAuth.

## Cerințe

- Node.js 18+
- npm
- FFmpeg (pentru generare video)

### Instalare FFmpeg

**Windows:** Descarcă de la [ffmpeg.org](https://ffmpeg.org/download.html) și adaugă în PATH.

**macOS:** `brew install ffmpeg`

**Linux:** `sudo apt install ffmpeg`

## Instalare

```bash
# 1. Clonează / intră în folderul proiectului
cd newsautotiktok

# 2. Instalează dependențele
npm install

# 3. Configurează variabilele de mediu
cp .env.example .env
# Editează .env cu cheile tale (opțional pentru development)

# 4. Generează clientul Prisma
npx prisma generate

# 5. Creează baza de date
npx prisma db push

# 6. Populează cu admin default
npx prisma db seed

# 7. Pornește serverul de development
npm run dev
```

Deschide [http://localhost:3000](http://localhost:3000)

### Credențiale default

- **Email:** `admin@newsauto.local`
- **Parolă:** `admin123`

## Module

| Modul | Descriere |
|-------|-----------|
| **Auth/Admin** | Login, roluri ADMIN/EDITOR, dashboard protejat |
| **Sources** | Surse RSS, fetch știri, evitare duplicate |
| **Articles** | Pipeline articole cu statusuri complete |
| **AI Script** | Hook, script, titlu, descriere, hashtag-uri, subtitrări |
| **Video** | Clip vertical 1080x1920 via FFmpeg |
| **TTS** | Voice-over pregătit pentru ElevenLabs/OpenAI |
| **TikTok** | OAuth + Content Posting API |
| **Jobs** | Coadă FETCH_NEWS, GENERATE_SCRIPT, GENERATE_VIDEO, POST_TO_TIKTOK |
| **Settings** | Redacție, logo, auto-approve, auto-posting |
| **Analytics** | Statistici dashboard |

## Flux de lucru

1. Adaugă surse RSS în **Sources**
2. Apasă **Fetch latest news** sau **Run automation now**
3. Sistemul generează script (mock AI dacă nu ai OPENAI_API_KEY)
4. Dacă `autoApprove` e dezactivat, aprobă manual în **Articles**
5. Generează video (necesită FFmpeg)
6. Conectează cont TikTok oficial în **TikTok Accounts**
7. Postează manual sau activează `autoPosting` în **Settings**

## Variabile de mediu

Vezi `.env.example` pentru lista completă. Fără chei API, aplicația funcționează în mod mock:
- Scripturi generate local (fără OpenAI)
- Voice-over skipped (fără TTS)
- TikTok posting returnează „TikTok API not configured"

## Structură proiect

```
src/
  app/           # Next.js App Router (pages + API routes)
  components/    # UI components
  lib/
    ai/          # generateScript.ts
    tts/         # generateVoiceover.ts
    video/       # generateTikTokVideo.ts
    tiktok/      # postVideo.ts
    jobs/        # queue + processor
    rss/         # fetchNews.ts
prisma/
  schema.prisma  # Modele DB
  seed.ts        # Admin default
public/
  generated/     # Video-uri și audio generate
  uploads/       # Logo redacție
```

## Comenzi utile

```bash
npm run dev          # Development server
npm run build        # Build producție
npm run db:push      # Sync schema DB
npm run db:seed      # Reseed admin
npm run db:studio    # Prisma Studio GUI
```

## Securitate

- Token-urile TikTok sunt criptate în DB (AES-256-GCM)
- Doar conturi oficiale prin OAuth/API
- Fără metode neautorizate sau conturi false
- Schimbă `JWT_SECRET` și `ENCRYPTION_SECRET` în producție

## Licență

Proprietar — pentru uz intern redacții de presă.
