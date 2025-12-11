# AI Grading System - Setup Guide

## 🚀 Phase 4 & 5 Implementation Complete!

All missing features have been implemented. Here's what was added:

### New Files Created:

1. **`src/pages/user/UploadAnswerSheet.jsx`** - Answer sheet upload page
   - Class/Subject/Student selection
   - Question paper selection
   - File upload with drag & drop
   - SHA-256 hash for duplicate detection
   - Automatic AI grading trigger

2. **`src/pages/user/GradingResults.jsx`** - Grading results page
   - View all uploaded answer sheets
   - Real-time status updates via Supabase subscriptions
   - Detailed grading modal (scores, remarks, issues)
   - Re-evaluation feature (max 3 times)
   - Download original file

3. **`src/pages/user/Reports.jsx`** - User status reports
   - Personal grading statistics
   - Class & subject breakdown
   - Recent activity table
   - CSV export functionality
   - Date range filtering

4. **`src/lib/grading-service.js`** - AI grading helper functions
   - Gemini API integration
   - Prompt building with strictness levels
   - Grade calculation
   - Error handling

5. **`supabase/functions/grade-answer-sheet/index.ts`** - Edge Function
   - Deno-based Supabase Edge Function
   - Gemini 1.5 Flash API integration
   - Processes answer sheets asynchronously
   - Updates database with results

---

## 📋 Setup Instructions

### 1. Environment Variables

Add these to your `.env` file:

```env
# Supabase (already configured)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Gemini API (NEW)
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 2. Supabase Storage Buckets

Create these storage buckets in Supabase Dashboard:

1. Go to **Storage** in Supabase Dashboard
2. Create bucket: `question-papers` (public)
3. Create bucket: `answer-sheets` (public)

Add bucket policies for authenticated users:
```sql
-- For question-papers bucket
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'question-papers');

CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'question-papers');

-- For answer-sheets bucket
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'answer-sheets');

CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'answer-sheets');
```

### 3. Deploy Supabase Edge Function

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Set secrets for the Edge Function
supabase secrets set GEMINI_API_KEY=your_gemini_api_key

# Deploy the function
supabase functions deploy grade-answer-sheet
```

### 4. Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to both:
   - `.env` file as `VITE_GEMINI_API_KEY`
   - Supabase secrets as `GEMINI_API_KEY`

---

## 🧪 Testing the System

1. **Login as Admin:**
   - Create a user with role 'user'
   - Assign them to classes/subjects
   - Upload question papers

2. **Login as User:**
   - Go to "Upload Answer Sheets"
   - Select class, subject, student, question paper
   - Upload an answer sheet image/PDF
   - Watch the status change from "pending" → "processing" → "graded"

3. **View Results:**
   - Go to "Grading Results"
   - Click on a graded sheet to see details
   - Try re-evaluation if needed

---

## 📊 AI Grading Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI GRADING WORKFLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User uploads answer sheet (PDF/Image)                       │
│              │                                                   │
│              ▼                                                   │
│  2. System checks file hash for duplicates ✅                   │
│              │                                                   │
│              ▼                                                   │
│  3. File stored in Supabase Storage ✅                          │
│              │                                                   │
│              ▼                                                   │
│  4. Supabase Edge Function triggered ✅                         │
│              │                                                   │
│              ▼                                                   │
│  5. Fetch Question Paper + Weightage + Strictness ✅            │
│              │                                                   │
│              ▼                                                   │
│  6. Send to Gemini API with grading prompt ✅                   │
│     (includes strictness level, max marks, weightage)           │
│              │                                                   │
│              ▼                                                   │
│  7. AI returns: Grade, Marks, Detailed Remarks ✅               │
│              │                                                   │
│              ▼                                                   │
│  8. Store results in answer_sheets table ✅                     │
│              │                                                   │
│              ▼                                                   │
│  9. Real-time update to user dashboard ✅                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Feature Checklist

### Phase 1: Foundation ✅
- [x] Supabase project setup
- [x] Database schema with RLS policies
- [x] Authentication (Admin/User roles)
- [x] Basic layout with Sidebar & Header

### Phase 2: Admin Module ✅
- [x] Branch, Class, Subject CRUD
- [x] User management
- [x] Academic levels configuration
- [x] Weightage & Max marks settings
- [x] Strictness settings

### Phase 3: Assignment & Permissions ✅
- [x] User-Class-Subject assignments
- [x] Page permissions system
- [x] Question paper upload with tagging
- [x] Student master table

### Phase 4: User Module & AI Grading ✅
- [x] User dashboard with assigned classes/subjects
- [x] Answer sheet upload with duplicate detection
- [x] AI grading integration (Gemini API)
- [x] Re-evaluation feature

### Phase 5: Reports & Polish ✅
- [x] Admin summary reports (branch/class/subject wise)
- [x] User status reports (pending/completed)
- [x] Export functionality (CSV)
- [x] UI polish

---

## 🎉 Project Status: 100% Complete!

All phases have been implemented. The AI Grading System is now fully functional!
